import {
  calculateSeverancePay,
  calculateServiceDays,
  calculateAverageDailyWage,
  formatSeveranceAmount,
} from "@/lib/calculations/severance-pay";
import type { MonthlyWage, SeveranceInput } from "@/types/severance";

// 테스트용 과거 날짜 헬퍼 (UTC)
function utcDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

// 3개월간 동일 임금 생성 헬퍼
function makeWages(
  baseSalary: number,
  fixedAllowances = 0,
  bonus = 0,
  overtimePay = 0,
  nonTaxable = 0,
): MonthlyWage[] {
  const wage: MonthlyWage = {
    baseSalary,
    fixedAllowances,
    bonus,
    overtimePay,
    nonTaxable,
  };
  return [wage, wage, wage];
}

// 기본 입력 생성 헬퍼
function makeInput(overrides: Partial<SeveranceInput> = {}): SeveranceInput {
  return {
    employeeId: "EMP001",
    startDate: utcDate(2024, 1, 1),
    endDate: utcDate(2026, 1, 1),
    lastThreeMonthsWages: makeWages(2_500_000, 500_000),
    ...overrides,
  };
}

describe("calculateSeverancePay - 퇴직금 계산", () => {
  describe("정상 퇴직금 계산 (2년 근속, 월 300만)", () => {
    it("공식: 평균임금 × 30 × (근속일수/365)로 계산되어야 한다", () => {
      const startDate = utcDate(2024, 1, 1);
      const endDate = utcDate(2026, 1, 1);
      const wages = makeWages(3_000_000); // baseSalary만, 월 300만

      const result = calculateSeverancePay({
        employeeId: "EMP001",
        startDate,
        endDate,
        lastThreeMonthsWages: wages,
      });

      expect(result.isEligible).toBe(true);

      // 근속일수: 2024-01-01 ~ 2026-01-01 = 731일 (2024 윤년)
      expect(result.serviceDays).toBe(731);

      // 3개월 임금 총액: 3,000,000 × 3 = 9,000,000
      expect(result.calculationBreakdown.threeMonthsTotalWage).toBe(9_000_000);

      // 3개월 일수 계산 (endDate 기준 3개월 전)
      const threeMonthsDays = result.calculationBreakdown.threeMonthsDays;
      expect(threeMonthsDays).toBeGreaterThan(0);

      // 1일 평균임금: 9,000,000 / threeMonthsDays
      const expectedDailyWage = Math.round(9_000_000 / threeMonthsDays);
      expect(result.averageDailyWage).toBe(expectedDailyWage);

      // 퇴직금: 평균임금 × 30 × (731/365)
      const expectedAmount = Math.round(
        (9_000_000 / threeMonthsDays) * 30 * (731 / 365),
      );
      expect(result.totalAmount).toBe(expectedAmount);
    });
  });

  describe("1년 미만 근속 시 퇴직금 0원", () => {
    it("isEligible이 false이고 totalAmount가 0이어야 한다", () => {
      const result = calculateSeverancePay(
        makeInput({
          startDate: utcDate(2025, 6, 1),
          endDate: utcDate(2025, 12, 1),
        }),
      );

      expect(result.isEligible).toBe(false);
      expect(result.totalAmount).toBe(0);
      expect(result.serviceDays).toBeLessThan(365);
    });
  });

  describe("4주 15시간 미만 근무자 퇴직금 예외", () => {
    it("weeklyWorkingHours < 15이면 isEligible이 false", () => {
      const result = calculateSeverancePay(
        makeInput({
          weeklyWorkingHours: 14,
        }),
      );

      expect(result.isEligible).toBe(false);
      expect(result.totalAmount).toBe(0);
    });

    it("weeklyWorkingHours = 15이면 정상 자격", () => {
      const result = calculateSeverancePay(
        makeInput({
          weeklyWorkingHours: 15,
        }),
      );

      expect(result.isEligible).toBe(true);
      expect(result.totalAmount).toBeGreaterThan(0);
    });

    it("weeklyWorkingHours 미지정 시 예외 적용 안함", () => {
      const result = calculateSeverancePay(makeInput());

      expect(result.isEligible).toBe(true);
    });
  });

  describe("중간정산 1년 미만 에러", () => {
    it("1년 미만 근속에서 중간정산 요청 시 에러", () => {
      expect(() => {
        calculateSeverancePay(
          makeInput({
            startDate: utcDate(2025, 6, 1),
            endDate: utcDate(2026, 1, 1),
            isMidTermSettlement: true,
          }),
        );
      }).toThrow("중간정산은 1년 이상 근속자만 가능합니다.");
    });

    it("1년 이상 근속이면 중간정산 가능", () => {
      expect(() => {
        calculateSeverancePay(
          makeInput({
            startDate: utcDate(2024, 1, 1),
            endDate: utcDate(2026, 1, 1),
            isMidTermSettlement: true,
          }),
        );
      }).not.toThrow();
    });
  });

  describe("입사일/퇴직일 역전 에러", () => {
    it("입사일이 퇴직일보다 늦으면 에러", () => {
      expect(() => {
        calculateSeverancePay(
          makeInput({
            startDate: utcDate(2026, 6, 1),
            endDate: utcDate(2024, 1, 1),
          }),
        );
      }).toThrow("입사일은 퇴직일보다 늦을 수 없습니다.");
    });
  });

  describe("미래 날짜 에러", () => {
    it("미래 날짜가 포함되면 에러", () => {
      expect(() => {
        calculateSeverancePay(
          makeInput({
            startDate: utcDate(2024, 1, 1),
            endDate: utcDate(2030, 1, 1),
          }),
        );
      }).toThrow("미래 날짜는 허용되지 않습니다.");
    });
  });

  describe("최저임금 위반 에러", () => {
    it("baseSalary + fixedAllowances가 최저임금 미만이면 에러", () => {
      expect(() => {
        calculateSeverancePay(
          makeInput({
            lastThreeMonthsWages: makeWages(1_000_000), // 최저임금 2,156,880 미만
          }),
        );
      }).toThrow("최저임금 위반");
    });

    it("bonus/overtimePay는 최저임금 비교 대상이 아니다", () => {
      // baseSalary 100만 + fixedAllowances 0 = 100만 (최저임금 미만)
      // bonus 200만 있어도 최저임금 위반
      expect(() => {
        calculateSeverancePay(
          makeInput({
            lastThreeMonthsWages: makeWages(1_000_000, 0, 2_000_000),
          }),
        );
      }).toThrow("최저임금 위반");
    });
  });

  describe("10년 근속 퇴직금 계산", () => {
    it("장기 근속자 퇴직금이 정확해야 한다", () => {
      const startDate = utcDate(2016, 3, 1);
      const endDate = utcDate(2026, 3, 1);
      const wages = makeWages(3_000_000, 500_000); // 월 350만 (base 300 + fixed 50)

      const result = calculateSeverancePay({
        employeeId: "EMP002",
        startDate,
        endDate,
        lastThreeMonthsWages: wages,
      });

      expect(result.isEligible).toBe(true);
      // 약 3653일 (윤년 포함)
      expect(result.serviceDays).toBeGreaterThanOrEqual(3650);
      expect(result.serviceYears).toBeCloseTo(10, 0);

      // 퇴직금은 약 10년치
      const threeMonthsDays = result.calculationBreakdown.threeMonthsDays;
      const dailyWage = (3_500_000 * 3) / threeMonthsDays;
      const expectedApprox = dailyWage * 30 * (result.serviceDays / 365);
      expect(result.totalAmount).toBe(Math.round(expectedApprox));
    });
  });
});

describe("calculateServiceDays - 근속일수 계산", () => {
  it("동일 날짜면 0일", () => {
    expect(calculateServiceDays(utcDate(2024, 1, 1), utcDate(2024, 1, 1))).toBe(
      0,
    );
  });

  it("1년 = 365일 (비윤년)", () => {
    // 2025-01-01 ~ 2026-01-01 = 365일
    expect(calculateServiceDays(utcDate(2025, 1, 1), utcDate(2026, 1, 1))).toBe(
      365,
    );
  });

  it("윤년 포함 시 366일", () => {
    // 2024-01-01 ~ 2025-01-01 = 366일 (2024 윤년)
    expect(calculateServiceDays(utcDate(2024, 1, 1), utcDate(2025, 1, 1))).toBe(
      366,
    );
  });

  it("시작일이 종료일 이후면 0", () => {
    expect(calculateServiceDays(utcDate(2026, 1, 1), utcDate(2024, 1, 1))).toBe(
      0,
    );
  });
});

describe("calculateAverageDailyWage - 1일 평균임금", () => {
  it("3개월 동일 급여 300만 기준 평균임금", () => {
    const wages = makeWages(3_000_000);
    const refDate = utcDate(2026, 1, 1);

    const result = calculateAverageDailyWage(wages, refDate);

    // 3개월 총액: 9,000,000
    // 3개월 일수: 2025-10-01 ~ 2026-01-01 = 92일
    // 평균임금: 9,000,000 / 92 ≈ 97,826
    expect(result).toBeGreaterThan(0);
    expect(result).toBeCloseTo(9_000_000 / 92, 0);
  });

  it("급여에 bonus, overtimePay 포함", () => {
    const wages = makeWages(2_500_000, 200_000, 300_000, 100_000, 200_000);
    const refDate = utcDate(2026, 1, 1);

    const result = calculateAverageDailyWage(wages, refDate);

    // 포함 총액: (2,500,000 + 200,000 + 300,000 + 100,000) × 3 = 9,300,000
    // nonTaxable은 제외됨
    const totalIncluded = (2_500_000 + 200_000 + 300_000 + 100_000) * 3;
    expect(result).toBeGreaterThan(0);
  });

  it("wages가 3개가 아니면 0 반환", () => {
    expect(calculateAverageDailyWage([], utcDate(2026, 1, 1))).toBe(0);
    expect(
      calculateAverageDailyWage(
        makeWages(3_000_000).slice(0, 2),
        utcDate(2026, 1, 1),
      ),
    ).toBe(0);
  });
});

describe("formatSeveranceAmount - 퇴직금 포맷팅", () => {
  it("한국 원화 형식으로 포맷해야 한다", () => {
    const formatted = formatSeveranceAmount(6_000_000);
    // ₩6,000,000 형식
    expect(formatted).toContain("6,000,000");
    expect(formatted).toMatch(/₩/);
  });

  it("0원", () => {
    const formatted = formatSeveranceAmount(0);
    expect(formatted).toContain("0");
  });

  it("소수점은 반올림하여 정수로 표시", () => {
    const formatted = formatSeveranceAmount(1_234_567.89);
    expect(formatted).toContain("1,234,568");
  });

  it("Infinity는 ₩0으로 표시", () => {
    expect(formatSeveranceAmount(Infinity)).toBe("₩0");
  });

  it("NaN은 ₩0으로 표시", () => {
    expect(formatSeveranceAmount(NaN)).toBe("₩0");
  });
});
