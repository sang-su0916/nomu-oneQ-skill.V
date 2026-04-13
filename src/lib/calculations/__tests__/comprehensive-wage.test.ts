import {
  calculateComprehensiveWage,
  calculateDailyNightHours,
} from "../comprehensive-wage";
import type { ComprehensiveWageInput } from "../comprehensive-wage";

// ============================================
// 야간근로시간 계산 테스트
// ============================================

describe("calculateDailyNightHours - 일 야간근로시간 계산", () => {
  it("주간 근무(09:00~18:00)는 야간시간 0", () => {
    expect(calculateDailyNightHours("09:00", "18:00")).toBe(0);
  });

  it("09:00~22:00 근무는 야간시간 0 (22시 정각 퇴근)", () => {
    expect(calculateDailyNightHours("09:00", "22:00")).toBe(0);
  });

  it("09:00~23:00 근무는 야간 1시간", () => {
    expect(calculateDailyNightHours("09:00", "23:00")).toBe(1);
  });

  it("14:00~24:00 근무는 야간 2시간 (22:00~24:00)", () => {
    expect(calculateDailyNightHours("14:00", "24:00")).toBe(2);
  });

  it("22:00~06:00 야간 전일 근무는 8시간", () => {
    expect(calculateDailyNightHours("22:00", "06:00")).toBe(8);
  });

  it("20:00~04:00 근무는 야간 6시간 (22:00~04:00)", () => {
    expect(calculateDailyNightHours("20:00", "04:00")).toBe(6);
  });

  it("야간 휴게시간 30분 차감", () => {
    // 22:00~06:00 = 8시간 - 30분 = 7.5시간
    expect(calculateDailyNightHours("22:00", "06:00", 30)).toBe(7.5);
  });

  it("야간 휴게시간 60분 차감", () => {
    // 09:00~23:00 = 야간 1시간 - 60분 = 0시간
    expect(calculateDailyNightHours("09:00", "23:00", 60)).toBe(0);
  });

  it("야간 휴게가 야간시간보다 길면 0", () => {
    // 09:00~23:00 = 야간 1시간, 휴게 120분 → 0
    expect(calculateDailyNightHours("09:00", "23:00", 120)).toBe(0);
  });
});

// ============================================
// 포괄임금 역산 기본 테스트
// ============================================

describe("calculateComprehensiveWage - 포괄임금 역산", () => {
  const baseInput: ComprehensiveWageInput = {
    totalMonthlyPay: 3000000,
    weeklyWorkHours: 48,
    weeklyWorkDays: 6,
    dailyWorkHours: 8,
    workStartTime: "09:00",
    workEndTime: "18:00",
    breakMinutes: 60,
    hasNightWork: false,
  };

  describe("주 48시간 (주 6일제) 근로자 - 야간 없음", () => {
    it("기본급 + 연장수당 = 월 고정급", () => {
      const result = calculateComprehensiveWage(baseInput);
      expect(result.totalPay).toBe(3000000);
    });

    it("주당 연장시간이 8시간이어야 한다", () => {
      const result = calculateComprehensiveWage(baseInput);
      expect(result.breakdown.weeklyOvertimeHours).toBe(8);
    });

    it("월 연장시간이 약 34.76시간이어야 한다", () => {
      const result = calculateComprehensiveWage(baseInput);
      expect(result.breakdown.monthlyOvertimeHours).toBeCloseTo(34.76, 0);
    });

    it("연장 환산시간이 약 52시간이어야 한다 (34.76 × 1.5)", () => {
      const result = calculateComprehensiveWage(baseInput);
      expect(result.breakdown.overtimeEquivalentHours).toBeCloseTo(52.14, 0);
    });

    it("시급 = 월급 ÷ (209 + 52.14)", () => {
      const result = calculateComprehensiveWage(baseInput);
      const expectedHourly = Math.floor(
        3000000 / (209 + result.breakdown.overtimeEquivalentHours),
      );
      expect(result.hourlyWage).toBe(expectedHourly);
    });

    it("기본급 = 시급 × 209 (반올림 보정 포함)", () => {
      const result = calculateComprehensiveWage(baseInput);
      // 기본급은 시급×209에 반올림 잔차가 더해질 수 있음
      expect(result.basePay).toBeGreaterThan(result.hourlyWage * 209 - 100);
      expect(result.basePay).toBeLessThan(result.hourlyWage * 209 + 1000);
    });

    it("야간수당이 0이어야 한다", () => {
      const result = calculateComprehensiveWage(baseInput);
      expect(result.fixedNightPay).toBe(0);
    });
  });

  describe("주 48시간 + 야간근로 포함 (14:00~23:00)", () => {
    const nightInput: ComprehensiveWageInput = {
      ...baseInput,
      workStartTime: "14:00",
      workEndTime: "23:00",
      hasNightWork: true,
      nightBreakMinutes: 0,
    };

    it("기본급 + 연장 + 야간 = 월 고정급", () => {
      const result = calculateComprehensiveWage(nightInput);
      expect(result.totalPay).toBe(3000000);
    });

    it("일 야간시간이 1시간이어야 한다 (22:00~23:00)", () => {
      const result = calculateComprehensiveWage(nightInput);
      expect(result.breakdown.dailyNightHours).toBe(1);
    });

    it("주 야간시간이 6시간이어야 한다 (1시간 × 6일)", () => {
      const result = calculateComprehensiveWage(nightInput);
      expect(result.breakdown.weeklyNightHours).toBe(6);
    });

    it("야간수당이 0보다 커야 한다", () => {
      const result = calculateComprehensiveWage(nightInput);
      expect(result.fixedNightPay).toBeGreaterThan(0);
    });

    it("야간 환산시간이 월 야간시간 × 0.5배여야 한다", () => {
      const result = calculateComprehensiveWage(nightInput);
      expect(result.breakdown.nightEquivalentHours).toBeCloseTo(
        result.breakdown.monthlyNightHours * 0.5,
        1,
      );
    });
  });

  describe("야간 휴게시간 토글", () => {
    it("야간 휴게 30분 적용 시 야간시간 감소", () => {
      const withBreak: ComprehensiveWageInput = {
        ...baseInput,
        workStartTime: "14:00",
        workEndTime: "23:00",
        hasNightWork: true,
        nightBreakMinutes: 30,
      };

      const withoutBreak: ComprehensiveWageInput = {
        ...withBreak,
        nightBreakMinutes: 0,
      };

      const resultWith = calculateComprehensiveWage(withBreak);
      const resultWithout = calculateComprehensiveWage(withoutBreak);

      expect(resultWith.breakdown.dailyNightHours).toBeLessThan(
        resultWithout.breakdown.dailyNightHours,
      );
      expect(resultWith.fixedNightPay).toBeLessThan(
        resultWithout.fixedNightPay,
      );
    });
  });

  describe("주 40시간 이하 (연장 없음)", () => {
    it("연장수당이 0이어야 한다", () => {
      const regularInput: ComprehensiveWageInput = {
        ...baseInput,
        weeklyWorkHours: 40,
        weeklyWorkDays: 5,
      };

      const result = calculateComprehensiveWage(regularInput);
      expect(result.fixedOvertimePay).toBe(0);
      expect(result.breakdown.weeklyOvertimeHours).toBe(0);
      expect(result.basePay).toBe(3000000); // 전액 기본급
    });
  });

  describe("검증 (Validation)", () => {
    it("최저임금 미달 시 경고", () => {
      const lowPay: ComprehensiveWageInput = {
        ...baseInput,
        totalMonthlyPay: 1500000, // 150만원
      };

      const result = calculateComprehensiveWage(lowPay);
      expect(result.validation.meetsMinimumWage).toBe(false);
      expect(result.validation.warnings.length).toBeGreaterThan(0);
      expect(result.validation.warnings[0]).toContain("최저시급");
    });

    it("주 12시간 초과 연장 경고", () => {
      const overLimit: ComprehensiveWageInput = {
        ...baseInput,
        weeklyWorkHours: 56, // 연장 16시간 > 12시간 한도
      };

      const result = calculateComprehensiveWage(overLimit);
      expect(result.validation.exceedsWeeklyOvertimeLimit).toBe(true);
      expect(
        result.validation.warnings.some((w) => w.includes("법정 한도")),
      ).toBe(true);
    });

    it("주 52시간 초과 경고", () => {
      const over52: ComprehensiveWageInput = {
        ...baseInput,
        weeklyWorkHours: 55,
      };

      const result = calculateComprehensiveWage(over52);
      expect(
        result.validation.warnings.some((w) => w.includes("법정 최대")),
      ).toBe(true);
    });

    it("정상 범위에서는 경고 없음", () => {
      const result = calculateComprehensiveWage(baseInput);
      // 300만원 / 261시간 ≈ 11,494원 > 최저시급 10,320원
      expect(result.validation.meetsMinimumWage).toBe(true);
      // 주 48시간 = 연장 8시간 ≤ 12시간
      expect(result.validation.exceedsWeeklyOvertimeLimit).toBe(false);
    });
  });

  describe("경계값 테스트", () => {
    it("주 40시간 정확히는 연장 0", () => {
      const input: ComprehensiveWageInput = {
        ...baseInput,
        weeklyWorkHours: 40,
        weeklyWorkDays: 5,
      };
      const result = calculateComprehensiveWage(input);
      expect(result.breakdown.weeklyOvertimeHours).toBe(0);
    });

    it("주 40.5시간은 연장 0.5시간", () => {
      const input: ComprehensiveWageInput = {
        ...baseInput,
        weeklyWorkHours: 40.5,
      };
      const result = calculateComprehensiveWage(input);
      expect(result.breakdown.weeklyOvertimeHours).toBe(0.5);
    });

    it("주 52시간 (법정 최대) 정상 처리", () => {
      const input: ComprehensiveWageInput = {
        ...baseInput,
        weeklyWorkHours: 52,
        totalMonthlyPay: 4000000,
      };
      const result = calculateComprehensiveWage(input);
      expect(result.totalPay).toBe(4000000);
      expect(result.validation.exceedsWeeklyOvertimeLimit).toBe(false);
    });
  });
});
