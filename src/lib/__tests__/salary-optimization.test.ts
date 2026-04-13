import {
  optimizeSalary,
  MINIMUM_WAGE,
  TAX_EXEMPTION_LIMITS,
} from "@/lib/constants";

describe("optimizeSalary - 급여 비과세 최적화", () => {
  describe("기본 최적화 (식대 20만 분리)", () => {
    it("식대 20만원이 비과세로 분리되어야 한다", () => {
      const result = optimizeSalary(3_000_000);

      expect(result.mealAllowance).toBe(200_000);
      expect(result.carAllowance).toBe(0);
      expect(result.childcareAllowance).toBe(0);
      expect(result.baseSalary).toBe(2_800_000);
      expect(result.taxableIncome).toBe(2_800_000);
      expect(result.totalGross).toBe(3_000_000);
    });

    it("절감액이 양수여야 한다", () => {
      const result = optimizeSalary(3_000_000);

      expect(result.savings.insurance).toBeGreaterThan(0);
      expect(result.savings.total).toBeGreaterThan(0);
    });
  });

  describe("차량 보유 시 자가운전보조금 20만 추가 분리", () => {
    it("식대 + 자가운전보조금 = 40만원 비과세", () => {
      const result = optimizeSalary(3_000_000, { hasOwnCar: true });

      expect(result.mealAllowance).toBe(200_000);
      expect(result.carAllowance).toBe(200_000);
      expect(result.baseSalary).toBe(2_600_000);
      expect(result.taxableIncome).toBe(2_600_000);
    });

    it("차량 미보유 시 자가운전보조금 0", () => {
      const result = optimizeSalary(3_000_000, { hasOwnCar: false });

      expect(result.carAllowance).toBe(0);
    });
  });

  describe("6세 이하 자녀 있을 때 보육수당 분리", () => {
    it("자녀 1명: 보육수당 20만원 분리", () => {
      const result = optimizeSalary(3_000_000, { hasChildUnder6: true });

      expect(result.childcareAllowance).toBe(200_000);
      expect(result.baseSalary).toBe(2_600_000);
    });

    it("childrenUnder6=1 지정 시 동일하게 20만원", () => {
      const result = optimizeSalary(3_000_000, { childrenUnder6: 1 });

      expect(result.childcareAllowance).toBe(200_000);
    });
  });

  describe("자녀 2명일 때 보육수당 40만원", () => {
    it("2026년 개정: 자녀 1인당 20만원 × 2 = 40만원", () => {
      const result = optimizeSalary(3_000_000, { childrenUnder6: 2 });

      expect(result.childcareAllowance).toBe(400_000);
      // 식대 20만 + 보육 40만 = 60만 비과세
      expect(result.baseSalary).toBe(2_400_000);
      expect(result.taxableIncome).toBe(2_400_000);
    });
  });

  describe("모든 비과세 항목 적용 시", () => {
    it("식대 + 차량 + 보육수당 2명 = 80만원 비과세", () => {
      const result = optimizeSalary(4_000_000, {
        hasOwnCar: true,
        childrenUnder6: 2,
      });

      expect(result.mealAllowance).toBe(200_000);
      expect(result.carAllowance).toBe(200_000);
      expect(result.childcareAllowance).toBe(400_000);
      expect(result.baseSalary).toBe(3_200_000);
      expect(result.totalGross).toBe(4_000_000);
    });
  });

  describe("최저임금 미달 경고", () => {
    it("시급이 최저임금 미달 시 경고 메시지가 포함되어야 한다", () => {
      // 총급여가 최저임금 미만인 경우
      const result = optimizeSalary(1_500_000);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("최저임금 미달");
    });

    it("최저임금 이상이면 경고가 없어야 한다", () => {
      const result = optimizeSalary(3_000_000);

      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("총급여가 비과세 한도보다 작을 때", () => {
    it("식대가 총급여 이하로 제한되어야 한다", () => {
      const result = optimizeSalary(150_000);

      expect(result.mealAllowance).toBe(150_000);
      expect(result.baseSalary).toBe(0);
      expect(result.totalGross).toBe(150_000);
    });

    it("비과세 합계가 총급여를 초과하지 않아야 한다", () => {
      const result = optimizeSalary(300_000, {
        hasOwnCar: true,
        childrenUnder6: 2,
      });

      const totalNonTax =
        result.mealAllowance + result.carAllowance + result.childcareAllowance;
      expect(totalNonTax).toBeLessThanOrEqual(result.totalGross);
      expect(result.baseSalary).toBeGreaterThanOrEqual(0);
    });
  });
});
