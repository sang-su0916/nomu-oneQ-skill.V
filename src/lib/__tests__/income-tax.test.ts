import { calculateIncomeTax, calculateLocalIncomeTax } from "@/lib/constants";

describe("calculateIncomeTax - 간이세액표 기반 소득세", () => {
  describe("월 과세급여 77만원 이하: 소득세 0원", () => {
    it("77만원은 0원", () => {
      expect(calculateIncomeTax(770_000, 1)).toBe(0);
    });

    it("50만원은 0원", () => {
      expect(calculateIncomeTax(500_000, 1)).toBe(0);
    });

    it("0원은 0원", () => {
      expect(calculateIncomeTax(0, 1)).toBe(0);
    });
  });

  describe("106만원 이하도 소득세 0원 (간이세액표 기준)", () => {
    it("106만원은 0원", () => {
      expect(calculateIncomeTax(1_060_000, 1)).toBe(0);
    });

    it("100만원은 0원", () => {
      expect(calculateIncomeTax(1_000_000, 1)).toBe(0);
    });
  });

  describe("월 과세급여 200만원, 1인", () => {
    it("간이세액표에서 해당 구간 세액이 조회되어야 한다", () => {
      const tax = calculateIncomeTax(2_000_000, 1);

      // 2,000,000~2,010,000 구간, 1인(index 0) = 19,520원
      // 10원 미만 절사 적용
      expect(tax).toBe(Math.floor(19_520 / 10) * 10);
    });

    it("부양가족 2인이면 세액이 감소해야 한다", () => {
      const tax1 = calculateIncomeTax(2_000_000, 1);
      const tax2 = calculateIncomeTax(2_000_000, 2);

      // 2인(index 1) = 14,750원
      expect(tax2).toBe(Math.floor(14_750 / 10) * 10);
      expect(tax2).toBeLessThan(tax1);
    });
  });

  describe("월 과세급여 300만원, 부양가족 4인", () => {
    it("1인 대비 세액이 감소해야 한다", () => {
      const tax1 = calculateIncomeTax(3_000_000, 1);
      const tax4 = calculateIncomeTax(3_000_000, 4);

      // 3,000,000~3,020,000 구간
      // 1인(index 0) = 84,850
      // 4인(index 3) = 26,690
      expect(tax1).toBe(Math.floor(84_850 / 10) * 10);
      expect(tax4).toBe(Math.floor(26_690 / 10) * 10);
      expect(tax4).toBeLessThan(tax1);
    });

    it("부양가족이 많을수록 세액이 감소한다", () => {
      const taxes = [1, 2, 3, 4, 5].map((dep) =>
        calculateIncomeTax(3_000_000, dep),
      );

      for (let i = 1; i < taxes.length; i++) {
        expect(taxes[i]).toBeLessThanOrEqual(taxes[i - 1]);
      }
    });
  });

  describe("1000만원 초과 고소득 계산", () => {
    it("10,000,000원 초과 시 공식 계산으로 전환된다", () => {
      const tax = calculateIncomeTax(12_000_000, 1);

      // 10,000천원 구간(9,980~10,000) 1인 기준세액: 1,548,990
      // 초과액: 12,000,000 - 10,000,000 = 2,000,000
      // 추가세액: 2,000,000 × 98% × 35% = 686,000
      // 합계: 1,548,990 + 686,000 = 2,234,990
      // 10원 미만 절사: 2,234,990
      expect(tax).toBe(Math.floor(2_234_990 / 10) * 10);
    });

    it("15,000,000원 고소득 계산", () => {
      const tax = calculateIncomeTax(15_000_000, 1);

      // 기준세액: 1,548,990
      // 14,000천원 이하 구간: 1,548,990 + (14,000,000 - 10,000,000) × 0.98 × 0.35
      //                     = 1,548,990 + 1,372,000 = 2,920,990
      // 14,000~28,000 구간: 2,920,990 + (15,000,000 - 14,000,000) × 0.98 × 0.38
      //                    = 2,920,990 + 372,400 = 3,293,390 (정확히는 floor 적용)
      // 실제: baseTax + 1,372,000 + floor(1,000,000 × 0.98 × 0.38)
      //     = 1,548,990 + 1,372,000 + floor(372,400)
      //     = 1,548,990 + 1,372,000 + 372,400 = 3,293,390
      expect(tax).toBe(Math.floor(3_293_390 / 10) * 10);
    });
  });

  describe("20세 이하 자녀 세액공제", () => {
    it("자녀 1명: 월 12,500원 공제", () => {
      const taxNoChild = calculateIncomeTax(3_000_000, 1, 0);
      const taxChild1 = calculateIncomeTax(3_000_000, 1, 1);

      // 84,850 - 12,500 = 72,350 → 72,350
      expect(taxChild1).toBe(Math.floor(72_350 / 10) * 10);
      expect(taxNoChild - taxChild1).toBe(
        Math.floor(84_850 / 10) * 10 - Math.floor(72_350 / 10) * 10,
      );
    });

    it("자녀 2명: 월 29,160원 공제", () => {
      const taxChild2 = calculateIncomeTax(3_000_000, 1, 2);

      // 84,850 - 29,160 = 55,690 → 55,690
      expect(taxChild2).toBe(Math.floor(55_690 / 10) * 10);
    });

    it("자녀 3명: 29,160 + 25,000 = 54,160원 공제", () => {
      const taxChild3 = calculateIncomeTax(3_000_000, 1, 3);

      // 84,850 - 54,160 = 30,690 → 30,690
      expect(taxChild3).toBe(Math.floor(30_690 / 10) * 10);
    });

    it("세액공제가 세액보다 크면 0원", () => {
      // 낮은 과세급여에 자녀 다수: 세액이 0 이하가 되면 0
      const tax = calculateIncomeTax(1_100_000, 1, 3);
      // 1,100,000~1,105,000 구간 1인: 1,600원
      // 자녀 3명 공제: 54,160원
      // 1,600 - 54,160 < 0 → 0
      expect(tax).toBe(0);
    });
  });

  describe("지방소득세 = 소득세의 10%", () => {
    it("소득세 84,850원의 지방소득세", () => {
      const incomeTax = Math.floor(84_850 / 10) * 10; // 84,850
      const localTax = calculateLocalIncomeTax(incomeTax);

      // 84,850 × 10% = 8,485 → 10원 미만 절사 → 8,480
      expect(localTax).toBe(Math.floor((84_850 * 0.1) / 10) * 10);
    });

    it("소득세 0원이면 지방소득세도 0원", () => {
      expect(calculateLocalIncomeTax(0)).toBe(0);
    });

    it("소득세 19,520원의 지방소득세", () => {
      const localTax = calculateLocalIncomeTax(19_520);

      // 19,520 × 10% = 1,952 → 10원 미만 절사 → 1,950
      expect(localTax).toBe(1_950);
    });

    it("실제 흐름: 과세급여 → 소득세 → 지방소득세", () => {
      const incomeTax = calculateIncomeTax(3_000_000, 1);
      const localTax = calculateLocalIncomeTax(incomeTax);

      expect(incomeTax).toBeGreaterThan(0);
      expect(localTax).toBe(Math.floor((incomeTax * 0.1) / 10) * 10);
    });
  });

  describe("부양가족 수 경계값", () => {
    it("부양가족 0명 → 최소 1명으로 보정", () => {
      const tax0 = calculateIncomeTax(3_000_000, 0);
      const tax1 = calculateIncomeTax(3_000_000, 1);

      expect(tax0).toBe(tax1);
    });

    it("부양가족 12명 → 최대 11명으로 보정", () => {
      const tax12 = calculateIncomeTax(3_000_000, 12);
      const tax11 = calculateIncomeTax(3_000_000, 11);

      expect(tax12).toBe(tax11);
    });
  });
});
