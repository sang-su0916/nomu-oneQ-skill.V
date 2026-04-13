import {
  calculateAnnualLeave,
  calcByHireDate,
  calcByFiscalYear,
} from "../annual-leave";

describe("연차유급휴가 계산 (근로기준법 제60조)", () => {
  describe("입사일 기준", () => {
    it("1년 미만: 1개월 개근 시 1일 (최대 11일)", () => {
      // 2026-06-01 입사, 2026년 조회 → 6개월 → 6일
      const result = calcByHireDate("2026-06-01", 2026);
      expect(result.totalDays).toBe(6);
      expect(result.breakdown).toContain("②항");
    });

    it("1년 미만: 최대 11일 제한", () => {
      // 2026-01-01 입사, 2026년 조회 → 11개월 → 11일 (12개월이 아닌 11개월)
      const result = calcByHireDate("2026-01-15", 2026);
      expect(result.totalDays).toBeLessThanOrEqual(11);
    });

    it("1년 근속: 15일", () => {
      const result = calcByHireDate("2025-03-15", 2026);
      expect(result.totalDays).toBe(15);
      expect(result.serviceYears).toBe(1);
    });

    it("2년 근속: 15일", () => {
      const result = calcByHireDate("2024-03-15", 2026);
      expect(result.totalDays).toBe(15);
    });

    it("3년 근속: 16일 (가산 1일)", () => {
      const result = calcByHireDate("2023-03-15", 2026);
      expect(result.totalDays).toBe(16);
      expect(result.breakdown).toContain("④항");
    });

    it("5년 근속: 17일 (가산 2일)", () => {
      const result = calcByHireDate("2021-03-15", 2026);
      expect(result.totalDays).toBe(17);
    });

    it("21년 이상 근속: 최대 25일", () => {
      const result = calcByHireDate("2005-01-01", 2026);
      expect(result.totalDays).toBe(25);
    });

    it("25년 근속도 최대 25일", () => {
      const result = calcByHireDate("2000-01-01", 2026);
      expect(result.totalDays).toBe(25);
    });
  });

  describe("회계연도 기준", () => {
    it("입사년도: 월할 계산", () => {
      // 2026-07-01 입사 → 12/31까지 만 5개월 → 5일
      const result = calcByFiscalYear("2026-07-01", 2026);
      expect(result.totalDays).toBe(5);
      expect(result.basis).toBe("fiscal_year");
    });

    it("2차년도: 비례배분", () => {
      // 2025-07-01 입사 → 2026년 조회
      // 전년도 재직: 6개월 → ceil(15 × 6/12) = ceil(7.5) = 8일
      const result = calcByFiscalYear("2025-07-01", 2026);
      expect(result.totalDays).toBeGreaterThanOrEqual(8);
    });

    it("3차년도 이후: 정상 적용", () => {
      // 2023-01-01 입사 → 2026년 조회 → 3년 근속 → 16일
      const result = calcByFiscalYear("2023-01-01", 2026);
      expect(result.totalDays).toBeGreaterThanOrEqual(16);
    });

    it("유리한 조건 원칙: 입사일 기준이 유리하면 그쪽 적용", () => {
      // 입사일 기준과 회계연도 기준 중 유리한 쪽
      const fiscal = calcByFiscalYear("2024-06-01", 2026);
      const hire = calcByHireDate("2024-06-01", 2026);
      expect(fiscal.totalDays).toBeGreaterThanOrEqual(hire.totalDays);
    });
  });

  describe("calculateAnnualLeave 통합", () => {
    it("입사일 미입력 시 기본 15일", () => {
      const result = calculateAnnualLeave("", 2026);
      expect(result.totalDays).toBe(15);
    });

    it("basis 파라미터에 따라 다른 계산 수행", () => {
      const hire = calculateAnnualLeave("2025-07-01", 2026, "hire_date");
      const fiscal = calculateAnnualLeave("2025-07-01", 2026, "fiscal_year");
      expect(hire.basis).toBe("hire_date");
      expect(fiscal.basis).toBe("fiscal_year");
    });
  });

  describe("근속년수별 연차일수 정확성 (제60조 ④항)", () => {
    // 근속년수 → 예상 연차 매핑 테이블
    const expectedTable: [number, number][] = [
      [1, 15],
      [2, 15],
      [3, 16],
      [4, 16],
      [5, 17],
      [6, 17],
      [7, 18],
      [8, 18],
      [9, 19],
      [10, 19],
      [11, 20],
      [12, 20],
      [13, 21],
      [14, 21],
      [15, 22],
      [16, 22],
      [17, 23],
      [18, 23],
      [19, 24],
      [20, 24],
      [21, 25],
      [22, 25],
      [23, 25], // 25일 한도
    ];

    expectedTable.forEach(([years, expected]) => {
      it(`${years}년 근속 → ${expected}일`, () => {
        const hireYear = 2026 - years;
        const result = calcByHireDate(`${hireYear}-01-01`, 2026);
        expect(result.totalDays).toBe(expected);
      });
    });
  });
});
