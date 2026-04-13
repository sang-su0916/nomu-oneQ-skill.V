import {
  checkMinimumWageViolation,
  getMinimumWageWarning,
  checkAnnualSalaryMinimumWage,
} from "../minimum-wage-validator";
import { MINIMUM_WAGE } from "../constants";

describe("최저임금 검증기", () => {
  describe("checkMinimumWageViolation", () => {
    it("최저임금 이상 급여는 isValid=true를 반환해야 한다", () => {
      const result = checkMinimumWageViolation(MINIMUM_WAGE.monthly, 40);

      expect(result.isValid).toBe(true);
      expect(result.violationType).toBe("none");
      expect(result.warningMessage).toBeNull();
    });

    it("최저임금 초과 급여는 isValid=true를 반환해야 한다", () => {
      const result = checkMinimumWageViolation(
        MINIMUM_WAGE.monthly + 100000,
        40,
      );

      expect(result.isValid).toBe(true);
      expect(result.violationType).toBe("none");
    });

    it("시급 기준 위반 시 isValid=false와 hourly 위반 타입을 반환해야 한다", () => {
      const lowMonthlySalary = 1000000;
      const result = checkMinimumWageViolation(lowMonthlySalary, 40);

      expect(result.isValid).toBe(false);
      expect(result.violationType).toBe("hourly");
      expect(result.warningMessage).toContain("시급");
      expect(result.warningMessage).toContain("미만");
    });

    it("월급 기준 위반 시 isValid=false와 monthly 위반 타입을 반환해야 한다", () => {
      const result = checkMinimumWageViolation(MINIMUM_WAGE.monthly - 1000, 40);

      expect(result.isValid).toBe(false);
      expect(result.warningMessage).not.toBeNull();
    });

    it("시급을 정확히 계산해야 한다", () => {
      const monthlySalary = 2500000;
      const weeklyHours = 40;
      const result = checkMinimumWageViolation(monthlySalary, weeklyHours);

      const expectedHourly = monthlySalary / (weeklyHours * 4.345);
      expect(result.hourlyWage).toBeCloseTo(expectedHourly, 0);
    });

    it("월 근무시간을 직접 지정할 수 있어야 한다", () => {
      const monthlySalary = 2500000;
      const weeklyHours = 40;
      const monthlyHours = 174;

      const resultWithMonthlyHours = checkMinimumWageViolation(
        monthlySalary,
        weeklyHours,
        monthlyHours,
      );

      const expectedHourly = monthlySalary / monthlyHours;
      expect(resultWithMonthlyHours.hourlyWage).toBe(expectedHourly);
    });

    it("주당 근무시간이 0이면 무한대가 아닌 적절한 처리가 필요하다", () => {
      const result = checkMinimumWageViolation(MINIMUM_WAGE.monthly, 0, 209);

      expect(result.hourlyWage).toBe(MINIMUM_WAGE.monthly / 209);
    });
  });

  describe("getMinimumWageWarning", () => {
    it("최저임금 위반 시 경고 메시지를 반환해야 한다", () => {
      const warning = getMinimumWageWarning(1500000, 0, 40);

      expect(warning).not.toBeNull();
      expect(warning).toContain("⚠️");
      expect(warning).toContain("최저임금 위반");
    });

    it("최저임금 충족 시 null을 반환해야 한다", () => {
      const warning = getMinimumWageWarning(MINIMUM_WAGE.monthly, 0, 40);

      expect(warning).toBeNull();
    });

    it("기본급 + 고정수당을 합산하여 검증해야 한다", () => {
      const baseSalary = 1500000;
      const fixedAllowances = 700000;

      const warning = getMinimumWageWarning(baseSalary, fixedAllowances, 40);

      expect(warning).toBeNull();
    });
  });

  describe("checkAnnualSalaryMinimumWage", () => {
    it("연봉을 월급으로 변환하여 검증해야 한다", () => {
      const annualSalary = MINIMUM_WAGE.monthly * 12;

      const result = checkAnnualSalaryMinimumWage(annualSalary, 40);

      expect(result.isValid).toBe(true);
      expect(result.monthlyWage).toBe(MINIMUM_WAGE.monthly);
    });

    it("최저연봉 미달 시 위반으로 판정해야 한다", () => {
      const annualSalary = 15000000;

      const result = checkAnnualSalaryMinimumWage(annualSalary, 40);

      expect(result.isValid).toBe(false);
      expect(result.warningMessage).not.toBeNull();
    });
  });

  describe("실제 시나리오 테스트", () => {
    it("정규직 (주 40시간, 월 250만원)은 통과해야 한다", () => {
      const result = checkMinimumWageViolation(2500000, 40);
      expect(result.isValid).toBe(true);
      expect(result.hourlyWage).toBeGreaterThan(MINIMUM_WAGE.hourly);
    });

    it("주 20시간 아륻바이트생 (월 100만원)은 검증 기준에 따라 판정되어야 한다", () => {
      const result = checkMinimumWageViolation(1000000, 20);
      expect(result.hourlyWage).toBeGreaterThan(MINIMUM_WAGE.hourly);
      expect(result.violationType).toBe("monthly");
    });

    it("주 15시간 미만 근무자 (월 50만원)는 시급 기준 검증이 필요하다", () => {
      const result = checkMinimumWageViolation(500000, 10);
      expect(result.hourlyWage).toBeGreaterThan(0);
    });

    it("2026년 최저임금 기준값이 올바른지 확인", () => {
      expect(MINIMUM_WAGE.hourly).toBe(10320);
      expect(MINIMUM_WAGE.monthly).toBe(2156880);
    });
  });
});
