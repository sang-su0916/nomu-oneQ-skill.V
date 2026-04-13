import {
  classifyWageComponent,
  calculateOrdinaryAndAverageWage,
  calculateOvertimePayByOrdinaryWage,
} from "../ordinary-wage";
import type { WageComponent } from "../ordinary-wage";

describe("통상임금 판단 모듈", () => {
  describe("classifyWageComponent", () => {
    it("기본급은 통상임금으로 분류", () => {
      const result = classifyWageComponent("baseSalary", 2500000);
      expect(result.classification).toBe("ordinary");
      expect(result.criteria.regularity).toBe(true);
      expect(result.criteria.uniformity).toBe(true);
      expect(result.criteria.fixedness).toBe(true);
    });

    it("연장근로수당은 평균임금으로 분류", () => {
      const result = classifyWageComponent("overtimePay", 300000);
      expect(result.classification).toBe("average");
    });

    it("성과급은 평균임금으로 분류", () => {
      const result = classifyWageComponent("performanceBonus", 1000000);
      expect(result.classification).toBe("average");
    });

    it("실비변상은 양쪽 모두 제외", () => {
      const result = classifyWageComponent("expenseReimbursement", 100000);
      expect(result.classification).toBe("excluded");
    });

    it("사용자 정의 수당: 3요건 충족 시 통상임금", () => {
      const result = classifyWageComponent("customAllowance", 200000, {
        isPaidRegularly: true,
        isPaidToAll: true,
        isFixedAmount: true,
      });
      expect(result.classification).toBe("ordinary");
    });

    it("사용자 정의 수당: 고정성 미충족 시 평균임금", () => {
      const result = classifyWageComponent("customBonus", 500000, {
        isPaidRegularly: true,
        isPaidToAll: true,
        isFixedAmount: false,
      });
      expect(result.classification).toBe("average");
    });
  });

  describe("calculateOrdinaryAndAverageWage", () => {
    it("통상임금 월액 및 시급 계산", () => {
      const components: WageComponent[] = [
        classifyWageComponent("baseSalary", 2500000),
        classifyWageComponent("positionAllowance", 200000),
        classifyWageComponent("mealAllowance", 200000),
        classifyWageComponent("overtimePay", 300000),
      ];

      const result = calculateOrdinaryAndAverageWage(components);

      // 통상임금: 2,500,000 + 200,000 + 200,000 = 2,900,000
      expect(result.monthlyOrdinaryWage).toBe(2900000);
      // 통상시급: 2,900,000 / 209 = 약 13,876
      expect(result.hourlyOrdinaryWage).toBe(Math.round(2900000 / 209));
    });

    it("평균임금이 통상임금보다 낮으면 경고", () => {
      const components: WageComponent[] = [
        classifyWageComponent("baseSalary", 3000000),
      ];

      // 3개월 임금 총액이 매우 낮은 경우
      const result = calculateOrdinaryAndAverageWage(components, 6000000, 90);
      // 평균임금: 6,000,000/90 = 66,667
      // 통상임금: 3,000,000/30 = 100,000
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("통상임금을 평균임금으로 적용");
    });

    it("제외 항목은 양쪽 합산에서 제외", () => {
      const components: WageComponent[] = [
        classifyWageComponent("baseSalary", 2500000),
        classifyWageComponent("expenseReimbursement", 100000),
      ];

      const result = calculateOrdinaryAndAverageWage(components);
      expect(result.monthlyOrdinaryWage).toBe(2500000);
    });
  });

  describe("calculateOvertimePayByOrdinaryWage", () => {
    it("연장근로수당 계산 (1.5배)", () => {
      const rate = 15000; // 통상시급
      const result = calculateOvertimePayByOrdinaryWage(rate, 10, 0, 0, 0);
      expect(result.overtimePay).toBe(Math.round(15000 * 1.5 * 10));
      expect(result.total).toBe(result.overtimePay);
    });

    it("휴일근로 8시간 초과분 (2.0배)", () => {
      const rate = 15000;
      const result = calculateOvertimePayByOrdinaryWage(rate, 0, 0, 8, 4);
      // 8h이내: 15000 × 1.5 × 8 = 180,000
      // 8h초과: 15000 × 2.0 × 4 = 120,000
      expect(result.holidayPay).toBe(180000 + 120000);
    });
  });
});
