import {
  calculateDCContribution,
  calculateDBReserve,
  comparePensionTypes,
  generateMonthlyDCContributions,
} from "../retirement-pension";

describe("퇴직연금 DC/DB 계산 모듈", () => {
  describe("calculateDCContribution", () => {
    it("연 3600만원 → 최소 부담금 300만원 (1/12)", () => {
      const result = calculateDCContribution(36000000);
      expect(result.minimumAnnualContribution).toBe(3000000);
      expect(result.minimumMonthlyContribution).toBe(250000);
      expect(result.meetsMinimum).toBe(true);
    });

    it("부담금률이 1/12 미만이면 경고", () => {
      const result = calculateDCContribution(36000000, 0.05);
      expect(result.meetsMinimum).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("법정 최소");
    });

    it("부담금률 10%로 설정 시 정상", () => {
      const result = calculateDCContribution(36000000, 0.1);
      expect(result.actualAnnualContribution).toBe(3600000);
      expect(result.meetsMinimum).toBe(true);
    });
  });

  describe("calculateDBReserve", () => {
    it("적립비율 60% 이상이면 충족", () => {
      const result = calculateDBReserve(10000000, 7000000);
      expect(result.meetsFundingRequirement).toBe(true);
      expect(result.additionalReserveNeeded).toBe(0);
    });

    it("적립비율 60% 미만이면 미충족 + 경고", () => {
      const result = calculateDBReserve(10000000, 4000000);
      expect(result.meetsFundingRequirement).toBe(false);
      expect(result.additionalReserveNeeded).toBe(2000000); // 6000000 - 4000000
      expect(result.warnings[0]).toContain("60%");
    });
  });

  describe("comparePensionTypes", () => {
    it("DB vs DC 비교 결과를 반환", () => {
      const result = comparePensionTypes(
        100000, // 평균임금 일액 10만원
        10, // 10년 근속
        36000000, // 연간 3600만원
      );
      // DB: 100000 × 30 × 10 = 30,000,000
      expect(result.dbEstimate).toBe(30000000);
      expect(result.dcEstimate).toBeGreaterThan(0);
      expect(result.analysis.length).toBeGreaterThan(0);
      expect(result.recommendation).toBeTruthy();
    });
  });

  describe("generateMonthlyDCContributions", () => {
    it("12개월 부담금 생성", () => {
      const wages = Array(12).fill(3000000);
      const result = generateMonthlyDCContributions("emp1", 2026, wages);
      expect(result.length).toBe(12);
      expect(result[0].employerContribution).toBe(250000); // 3000000 / 12
      expect(result[0].status).toBe("pending");
    });
  });
});
