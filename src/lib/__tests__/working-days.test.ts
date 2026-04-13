import { getWorkingDays, getKoreanHolidays } from "@/lib/constants";

describe("getWorkingDays - 근로일수 계산", () => {
  // 2026년 공휴일 참조 (constants.ts):
  // 고정: 1/1, 3/1, 5/1, 5/5, 6/6, 8/15, 10/3, 10/9, 12/25
  // 음력(2026): 설날 2/16~18, 석가탄신일 5/24~25, 추석 9/24~26,28

  describe("2026년 1월 근로일수 (주5일)", () => {
    it("1월 1일(신정) 제외한 근로일수", () => {
      const result = getWorkingDays(2026, 1);

      // 2026년 1월: 31일
      // 주5일(월~금) 총일수: 1/1(목)~1/31(토)
      // 평일: 1,2,5,6,7,8,9,12,13,14,15,16,19,20,21,22,23,26,27,28,29,30 = 22일
      // 공휴일: 1/1(목, 신정) = 1일
      // 근로일: 22 - 1 = 21일
      expect(result.days).toBe(21);
      expect(result.hours).toBe(21 * 8);
    });
  });

  describe("2026년 5월 근로일수 (근로자의날, 어린이날 포함)", () => {
    it("5/1(근로자의날), 5/5(어린이날), 5/24~25(석가탄신일+대체) 제외", () => {
      const result = getWorkingDays(2026, 5);

      // 2026년 5월: 31일, 5/1(금)
      // 평일(월~금): 1,4,5,6,7,8,11,12,13,14,15,18,19,20,21,22,25,26,27,28,29 = 21일
      // 공휴일: 5/1(금, 근로자의날), 5/5(화, 어린이날), 5/25(월, 석가탄신일 대체)
      //         5/24(일)은 일요일이므로 주5일에 영향 없음
      // 근로일: 21 - 3 = 18일
      expect(result.days).toBe(18);
      expect(result.hours).toBe(18 * 8);
    });
  });

  describe("2026년 설날 연휴 반영", () => {
    it("2월 설날 2/16(월)~18(수) 제외", () => {
      const result = getWorkingDays(2026, 2);

      // 2026년 2월: 28일, 2/1(일)
      // 평일(월~금): 2,3,4,5,6,9,10,11,12,13,16,17,18,19,20,23,24,25,26,27 = 20일
      // 공휴일: 2/16(월), 2/17(화), 2/18(수) = 3일 (설날)
      // 근로일: 20 - 3 = 17일
      expect(result.days).toBe(17);
    });
  });

  describe("2026년 추석 연휴 반영", () => {
    it("9월 추석 9/24~26, 9/28(대체) 제외", () => {
      const result = getWorkingDays(2026, 9);

      // 2026년 9월: 30일, 9/1(화)
      // 평일(월~금): 1,2,3,4,7,8,9,10,11,14,15,16,17,18,21,22,23,24,25,28,29,30 = 22일
      // 공휴일: 9/24(목), 9/25(금), 9/26(토→주5일 영향없음), 9/28(월, 대체)
      // 평일 공휴일: 9/24(목), 9/25(금), 9/28(월) = 3일
      // 근로일: 22 - 3 = 19일
      expect(result.days).toBe(19);
    });
  });

  describe("주6일 근무자의 근로일수", () => {
    it("토요일도 근무일에 포함", () => {
      const result = getWorkingDays(2026, 1, [
        "월",
        "화",
        "수",
        "목",
        "금",
        "토",
      ]);

      // 2026년 1월: 평일+토 = 27일
      // 공휴일: 1/1(목) = 1일
      // 근로일: 27 - 1 = 26일
      expect(result.days).toBe(26);
      expect(result.hours).toBe(26 * 8);
    });
  });

  describe("일 소정근로시간 변경 시 총시간 계산", () => {
    it("일 6시간 근무 시 총시간이 정확해야 한다", () => {
      const result = getWorkingDays(2026, 1, ["월", "화", "수", "목", "금"], 6);

      expect(result.days).toBe(21); // 일수는 동일
      expect(result.hours).toBe(21 * 6);
    });

    it("일 4시간 근무 시 총시간", () => {
      const result = getWorkingDays(2026, 3, ["월", "화", "수", "목", "금"], 4);

      // 2026년 3월: 31일, 3/1(일)
      // 평일: 2,3,4,5,6,9,10,11,12,13,16,17,18,19,20,23,24,25,26,27,30,31 = 22일
      // 공휴일: 3/1(일, 삼일절) → 일요일이므로 주5일 영향 없음
      // 근로일: 22일
      expect(result.days).toBe(22);
      expect(result.hours).toBe(22 * 4);
    });
  });
});

describe("getKoreanHolidays - 공휴일 데이터", () => {
  it("2026년 고정 공휴일이 포함되어야 한다", () => {
    const holidays = getKoreanHolidays(2026);

    expect(holidays.has("2026-01-01")).toBe(true); // 신정
    expect(holidays.has("2026-03-01")).toBe(true); // 삼일절
    expect(holidays.has("2026-05-01")).toBe(true); // 근로자의날
    expect(holidays.has("2026-05-05")).toBe(true); // 어린이날
    expect(holidays.has("2026-06-06")).toBe(true); // 현충일
    expect(holidays.has("2026-08-15")).toBe(true); // 광복절
    expect(holidays.has("2026-10-03")).toBe(true); // 개천절
    expect(holidays.has("2026-10-09")).toBe(true); // 한글날
    expect(holidays.has("2026-12-25")).toBe(true); // 크리스마스
  });

  it("2026년 설날 연휴가 포함되어야 한다", () => {
    const holidays = getKoreanHolidays(2026);

    expect(holidays.has("2026-02-16")).toBe(true);
    expect(holidays.has("2026-02-17")).toBe(true);
    expect(holidays.has("2026-02-18")).toBe(true);
  });

  it("2026년 추석 연휴가 포함되어야 한다", () => {
    const holidays = getKoreanHolidays(2026);

    expect(holidays.has("2026-09-24")).toBe(true);
    expect(holidays.has("2026-09-25")).toBe(true);
    expect(holidays.has("2026-09-26")).toBe(true);
    expect(holidays.has("2026-09-28")).toBe(true); // 대체공휴일
  });
});
