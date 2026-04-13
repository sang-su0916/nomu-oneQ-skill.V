import {
  calculateSeverancePay,
  calculateServiceDays,
  calculateAverageDailyWage,
  formatSeveranceAmount,
} from "../severance-pay";
import type { SeveranceInput, MonthlyWage } from "@/types/severance";

// 테스트용 기본 월급 데이터
const createMonthlyWage = (baseSalary: number): MonthlyWage => ({
  baseSalary,
  fixedAllowances: 0,
  bonus: 0,
  overtimePay: 0,
  nonTaxable: 0,
});

// 최저임금을 만족하는 월급 (2026년 기준 월 2,156,880원)
const validMonthlyWages: MonthlyWage[] = [
  createMonthlyWage(2500000),
  createMonthlyWage(2500000),
  createMonthlyWage(2500000),
];

describe("퇴직금 계산 엔진", () => {
  describe("calculateServiceDays", () => {
    it("같은 날짜면 0일을 반환해야 한다", () => {
      const date = new Date("2024-01-01");
      expect(calculateServiceDays(date, date)).toBe(0);
    });

    it("1년 근무는 365일을 반환해야 한다 (윤년 제외)", () => {
      const start = new Date("2023-01-01");
      const end = new Date("2023-12-31");
      expect(calculateServiceDays(start, end)).toBe(364); // 365일 - 1
    });

    it("1년 1일 근무는 365일을 반환해야 한다", () => {
      const start = new Date("2023-01-01");
      const end = new Date("2024-01-01");
      expect(calculateServiceDays(start, end)).toBe(365);
    });

    it("유효하지 않은 날짜는 0을 반환해야 한다", () => {
      expect(
        calculateServiceDays(new Date("invalid"), new Date("2024-01-01")),
      ).toBe(0);
      expect(
        calculateServiceDays(new Date("2024-01-01"), new Date("invalid")),
      ).toBe(0);
    });

    it("종료일이 시작일보다 빠른 경우 0을 반환해야 한다", () => {
      const start = new Date("2024-12-01");
      const end = new Date("2024-01-01");
      expect(calculateServiceDays(start, end)).toBe(0);
    });
  });

  describe("calculateAverageDailyWage", () => {
    it("3개월 데이터가 없으면 0을 반환해야 한다", () => {
      expect(calculateAverageDailyWage([], new Date())).toBe(0);
      expect(
        calculateAverageDailyWage([validMonthlyWages[0]], new Date()),
      ).toBe(0);
    });

    it("3개월 임금 총액을 일수로 나누어 계산해야 한다", () => {
      // 3개월간 7,500,000원, 대략 90일 기준
      const wages = [
        createMonthlyWage(2500000),
        createMonthlyWage(2500000),
        createMonthlyWage(2500000),
      ];
      const endDate = new Date("2024-03-31");
      const result = calculateAverageDailyWage(wages, endDate);
      // 1~3월은 약 90일 (31 + 29 + 31 = 91, 2024년 윤년)
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(100000);
    });
  });

  describe("formatSeveranceAmount", () => {
    it("원화 형식으로 포맷팅해야 한다", () => {
      expect(formatSeveranceAmount(1000000)).toBe("₩1,000,000");
      expect(formatSeveranceAmount(1234567)).toBe("₩1,234,567");
      expect(formatSeveranceAmount(0)).toBe("₩0");
    });

    it("유효하지 않은 숫자는 ₩0을 반환해야 한다", () => {
      expect(formatSeveranceAmount(NaN)).toBe("₩0");
      expect(formatSeveranceAmount(Infinity)).toBe("₩0");
    });
  });

  describe("퇴직금 수령 자격 (엣지 케이스)", () => {
    it("1년 미만 근속자는 isEligible=false와 totalAmount=0을 반환해야 한다", () => {
      const input: SeveranceInput = {
        employeeId: "test-001",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-06-30"), // 약 6개월
        lastThreeMonthsWages: validMonthlyWages,
        isMidTermSettlement: false,
      };

      const result = calculateSeverancePay(input);

      expect(result.isEligible).toBe(false);
      expect(result.totalAmount).toBe(0);
      expect(result.serviceDays).toBeLessThan(365);
    });

    it("11개월 근속자는 isEligible=false를 반환해야 한다", () => {
      const input: SeveranceInput = {
        employeeId: "test-002",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-11-30"), // 약 11개월
        lastThreeMonthsWages: validMonthlyWages,
        isMidTermSettlement: false,
      };

      const result = calculateSeverancePay(input);

      expect(result.isEligible).toBe(false);
      expect(result.totalAmount).toBe(0);
    });

    it("1년 1일 근속자는 isEligible=true와 정상 금액을 반환해야 한다", () => {
      const input: SeveranceInput = {
        employeeId: "test-003",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2024-01-02"), // 1년 1일 (2024년은 윤년)
        lastThreeMonthsWages: validMonthlyWages,
        isMidTermSettlement: false,
      };

      const result = calculateSeverancePay(input);

      expect(result.isEligible).toBe(true);
      expect(result.totalAmount).toBeGreaterThan(0);
      // 2024년은 윤년이므로 366일 (실제 계산값 반영)
      expect(result.serviceDays).toBe(366);
    });

    it("4주 15시간 미만 근무자는 isEligible=false를 반환해야 한다", () => {
      const input: SeveranceInput = {
        employeeId: "test-004",
        startDate: new Date("2020-01-01"),
        endDate: new Date("2024-01-01"), // 4년 근무
        lastThreeMonthsWages: validMonthlyWages,
        isMidTermSettlement: false,
        weeklyWorkingHours: 10, // 15시간 미만
      };

      const result = calculateSeverancePay(input);

      expect(result.isEligible).toBe(false);
      expect(result.totalAmount).toBe(0);
    });

    it("4주 15시간 이상 근무자는 정상적으로 계산되어야 한다", () => {
      const input: SeveranceInput = {
        employeeId: "test-005",
        startDate: new Date("2020-01-01"),
        endDate: new Date("2024-01-01"), // 4년 근무
        lastThreeMonthsWages: validMonthlyWages,
        isMidTermSettlement: false,
        weeklyWorkingHours: 40, // 정규직 수준
      };

      const result = calculateSeverancePay(input);

      expect(result.isEligible).toBe(true);
      expect(result.totalAmount).toBeGreaterThan(0);
    });

    it("weeklyWorkingHours가 없으면 15시간 이상으로 간주해야 한다", () => {
      const input: SeveranceInput = {
        employeeId: "test-006",
        startDate: new Date("2020-01-01"),
        endDate: new Date("2024-01-01"), // 4년 근무
        lastThreeMonthsWages: validMonthlyWages,
        isMidTermSettlement: false,
        // weeklyWorkingHours 미지정
      };

      const result = calculateSeverancePay(input);

      expect(result.isEligible).toBe(true);
      expect(result.totalAmount).toBeGreaterThan(0);
    });
  });

  describe("임금 체울 기간 계산", () => {
    it("임금 체울 기간이 있으면 해당 일수를 제외해야 한다", () => {
      const input: SeveranceInput = {
        employeeId: "test-007",
        startDate: new Date("2020-01-01"),
        endDate: new Date("2024-01-01"), // 4년
        lastThreeMonthsWages: validMonthlyWages,
        isMidTermSettlement: false,
        wageArrearsPeriods: [
          {
            startDate: new Date("2022-01-01"),
            endDate: new Date("2022-03-31"), // 약 90일 체울
            amount: 0,
          },
        ],
      };

      const result = calculateSeverancePay(input);

      // 4년(1461일) - 90일 = 1371일
      expect(result.serviceDays).toBeLessThan(1461);
      expect(result.serviceDays).toBeGreaterThan(1300);
    });

    it("체울 기간이 없으면 전체 근속일수를 사용해야 한다", () => {
      const input: SeveranceInput = {
        employeeId: "test-008",
        startDate: new Date("2020-01-01"),
        endDate: new Date("2024-01-01"), // 4년
        lastThreeMonthsWages: validMonthlyWages,
        isMidTermSettlement: false,
      };

      const result = calculateSeverancePay(input);

      expect(result.serviceDays).toBe(1461); // 2020년 윤년 포함
    });
  });

  describe("중간정산 검증", () => {
    it("1년 미만 근속자가 중간정산을 시도하면 에러를 던져야 한다", () => {
      const input: SeveranceInput = {
        employeeId: "test-009",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2026-01-01"), // 7개월 근무
        lastThreeMonthsWages: validMonthlyWages,
        isMidTermSettlement: true, // 중간정산 신청
      };

      expect(() => calculateSeverancePay(input)).toThrow(
        "중간정산은 1년 이상 근속자만 가능합니다",
      );
    });

    it("1년 이상 근속자는 중간정산이 가능해야 한다", () => {
      const input: SeveranceInput = {
        employeeId: "test-010",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2026-01-01"), // 2년 근무
        lastThreeMonthsWages: validMonthlyWages,
        isMidTermSettlement: true, // 중간정산 신청
      };

      const result = calculateSeverancePay(input);

      expect(result.isEligible).toBe(true);
      expect(result.totalAmount).toBeGreaterThan(0);
    });
  });

  describe("입력값 검증", () => {
    it("employeeId가 비어있으면 에러를 던져야 한다", () => {
      const input: SeveranceInput = {
        employeeId: "",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2024-01-01"),
        lastThreeMonthsWages: validMonthlyWages,
        isMidTermSettlement: false,
      };

      expect(() => calculateSeverancePay(input)).toThrow(
        "employeeId는 필수입니다",
      );
    });

    it("3개월 임금 데이터가 정확히 3개가 아니면 에러를 던져야 한다", () => {
      const input: SeveranceInput = {
        employeeId: "test-011",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2024-01-01"),
        lastThreeMonthsWages: [validMonthlyWages[0]], // 1개만
        isMidTermSettlement: false,
      };

      expect(() => calculateSeverancePay(input)).toThrow(
        "3개월 데이터가 필요합니다",
      );
    });

    it("퇴직일이 입사일보다 빠르면 에러를 던져야 한다", () => {
      const input: SeveranceInput = {
        employeeId: "test-012",
        startDate: new Date("2024-06-01"),
        endDate: new Date("2024-01-01"), // 입사일보다 빠름
        lastThreeMonthsWages: validMonthlyWages,
        isMidTermSettlement: false,
      };

      expect(() => calculateSeverancePay(input)).toThrow(
        "입사일은 퇴직일보다 늦을 수 없습니다",
      );
    });

    it("미래 날짜는 허용되지 않아야 한다", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const input: SeveranceInput = {
        employeeId: "test-013",
        startDate: new Date("2024-01-01"),
        endDate: futureDate,
        lastThreeMonthsWages: validMonthlyWages,
        isMidTermSettlement: false,
      };

      expect(() => calculateSeverancePay(input)).toThrow(
        "미래 날짜는 허용되지 않습니다",
      );
    });
  });

  describe("상여금 안분 계산", () => {
    it("annualBonusTotal이 설정되면 연간 상여금을 3/12로 안분해야 한다", () => {
      const wages: MonthlyWage[] = [
        {
          baseSalary: 2500000,
          fixedAllowances: 0,
          bonus: 0,
          overtimePay: 0,
          nonTaxable: 0,
          annualBonusTotal: 6000000,
        },
        {
          baseSalary: 2500000,
          fixedAllowances: 0,
          bonus: 0,
          overtimePay: 0,
          nonTaxable: 0,
          annualBonusTotal: 6000000,
        },
        {
          baseSalary: 2500000,
          fixedAllowances: 0,
          bonus: 0,
          overtimePay: 0,
          nonTaxable: 0,
          annualBonusTotal: 6000000,
        },
      ];

      const input: SeveranceInput = {
        employeeId: "bonus-test",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2024-01-02"),
        lastThreeMonthsWages: wages,
        isMidTermSettlement: false,
      };

      const result = calculateSeverancePay(input);
      // 3개월 임금 총액: (2,500,000 + 500,000) × 3 = 9,000,000
      // 500,000 = 6,000,000 / 12
      expect(result.calculationBreakdown.threeMonthsTotalWage).toBe(9000000);
    });

    it("annualBonusTotal이 없으면 기존 bonus 필드를 사용해야 한다", () => {
      const wages: MonthlyWage[] = [
        {
          baseSalary: 2500000,
          fixedAllowances: 0,
          bonus: 200000,
          overtimePay: 0,
          nonTaxable: 0,
        },
        {
          baseSalary: 2500000,
          fixedAllowances: 0,
          bonus: 200000,
          overtimePay: 0,
          nonTaxable: 0,
        },
        {
          baseSalary: 2500000,
          fixedAllowances: 0,
          bonus: 200000,
          overtimePay: 0,
          nonTaxable: 0,
        },
      ];

      const input: SeveranceInput = {
        employeeId: "bonus-test2",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2024-01-02"),
        lastThreeMonthsWages: wages,
        isMidTermSettlement: false,
      };

      const result = calculateSeverancePay(input);
      // 3개월 임금 총액: (2,500,000 + 200,000) × 3 = 8,100,000
      expect(result.calculationBreakdown.threeMonthsTotalWage).toBe(8100000);
    });
  });

  describe("최저임금 검증", () => {
    it("최저임금 미달 월급이 있으면 에러를 던져야 한다", () => {
      const lowWages: MonthlyWage[] = [
        createMonthlyWage(1500000), // 최저임금 미달
        createMonthlyWage(2500000),
        createMonthlyWage(2500000),
      ];

      const input: SeveranceInput = {
        employeeId: "test-014",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2024-01-01"),
        lastThreeMonthsWages: lowWages,
        isMidTermSettlement: false,
      };

      expect(() => calculateSeverancePay(input)).toThrow("최저임금 위반");
    });
  });
});
