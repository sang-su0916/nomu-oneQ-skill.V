import {
  calculateWorkMinutes,
  calculateNightMinutes,
  calculateOvertimeMinutes,
  calculateWeeklyOvertime,
  validateBreakTime,
  createAttendanceRecord,
  minutesToHoursString,
} from "../attendance";
import type { AttendanceRecord } from "../attendance";

describe("근태관리 모듈", () => {
  describe("calculateWorkMinutes", () => {
    it("09:00~18:00, 점심 60분 → 8시간(480분)", () => {
      expect(calculateWorkMinutes("09:00", "18:00", 60)).toBe(480);
    });

    it("09:00~21:00, 점심 60분 → 11시간(660분)", () => {
      expect(calculateWorkMinutes("09:00", "21:00", 60)).toBe(660);
    });

    it("22:00~06:00 야간근무, 30분 휴게 → 7.5시간(450분)", () => {
      expect(calculateWorkMinutes("22:00", "06:00", 30)).toBe(450);
    });
  });

  describe("calculateNightMinutes", () => {
    it("09:00~18:00 → 야간 0분", () => {
      expect(calculateNightMinutes("09:00", "18:00", 60)).toBe(0);
    });

    it("18:00~23:00, 0분 휴게 → 야간 60분 (22:00~23:00)", () => {
      expect(calculateNightMinutes("18:00", "23:00", 0)).toBe(60);
    });

    it("22:00~06:00 야간전일 → 대부분 야간", () => {
      const night = calculateNightMinutes("22:00", "06:00", 30);
      expect(night).toBeGreaterThan(400); // 거의 전부 야간
    });
  });

  describe("calculateOvertimeMinutes", () => {
    it("480분 근무 → 연장 0분", () => {
      expect(calculateOvertimeMinutes(480)).toBe(0);
    });

    it("600분 근무 → 연장 120분(2시간)", () => {
      expect(calculateOvertimeMinutes(600)).toBe(120);
    });
  });

  describe("calculateWeeklyOvertime", () => {
    it("주 5일 8시간 → 연장 0, 한도 미초과", () => {
      const records: AttendanceRecord[] = [];
      for (let i = 0; i < 5; i++) {
        const date = `2026-03-${String(9 + i).padStart(2, "0")}`;
        records.push(
          createAttendanceRecord("emp1", date, "09:00", "18:00", 60),
        );
      }
      const result = calculateWeeklyOvertime(records, "2026-03-09");
      expect(result.overtimeMinutes).toBe(0);
      expect(result.isOverLimit).toBe(false);
    });

    it("주 5일 11시간 → 연장 15시간, 한도 초과", () => {
      const records: AttendanceRecord[] = [];
      for (let i = 0; i < 5; i++) {
        const date = `2026-03-${String(9 + i).padStart(2, "0")}`;
        records.push(
          createAttendanceRecord("emp1", date, "09:00", "21:00", 60),
        );
      }
      const result = calculateWeeklyOvertime(records, "2026-03-09");
      expect(result.overtimeMinutes).toBeGreaterThan(12 * 60);
      expect(result.isOverLimit).toBe(true);
      expect(result.warning).toContain("초과");
    });
  });

  describe("validateBreakTime", () => {
    it("8시간 근무, 60분 휴게 → 적법", () => {
      const result = validateBreakTime(480, 60);
      expect(result.isValid).toBe(true);
    });

    it("8시간 근무, 0분 휴게 → 위반", () => {
      const result = validateBreakTime(480, 0);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain("§54");
    });

    it("5시간 근무, 20분 휴게 → 위반 (30분 필요)", () => {
      const result = validateBreakTime(300, 20);
      expect(result.isValid).toBe(false);
      expect(result.requiredMinutes).toBe(30);
    });

    it("4시간 이하 → 휴게 불필요", () => {
      const result = validateBreakTime(240, 0);
      expect(result.isValid).toBe(true);
    });
  });

  describe("minutesToHoursString", () => {
    it("150분 → 2시간 30분", () => {
      expect(minutesToHoursString(150)).toBe("2시간 30분");
    });

    it("60분 → 1시간 0분", () => {
      expect(minutesToHoursString(60)).toBe("1시간 0분");
    });
  });
});
