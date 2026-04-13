// ============================================
// 4대보험 신고 CSV 포맷 정의
// 국민연금, 건강보험, 고용보험, 산재보험 자격취득/상실/변경 신고
// ============================================

// ============================================
// 신고 유형 정의
// ============================================

export type InsuranceReportType =
  | "national-pension-acquisition"
  | "national-pension-loss"
  | "national-pension-change"
  | "health-insurance-acquisition"
  | "health-insurance-loss"
  | "health-insurance-change"
  | "employment-insurance-acquisition"
  | "employment-insurance-loss"
  | "industrial-accident-acquisition"
  | "industrial-accident-loss"
  | "monthly-report";

export type ReportTypeCategory = "acquisition" | "loss" | "change";

// ============================================
// 국민연금 신고 Row 인터페이스
// ============================================

export interface NationalPensionAcquisitionRow {
  사업장관리번호: string; // 12자리
  주민등록번호: string; // 13자리 (숫자만)
  성명: string;
  취득일자: string; // YYYYMMDD
  취득월납부예정금액: number;
  소득월액: number;
  취득부호: string; // '1': 취업, '2': 사업장변경, '3': 사업장추가
  휴대폰?: string;
  이메일?: string;
}

export interface NationalPensionLossRow {
  사업장관리번호: string;
  주민등록번호: string;
  성명: string;
  상실일자: string; // YYYYMMDD
  상실부호: string; // '1': 퇴직, '2': 사업장변경, '3': 사업장추가상실
  휴대폰?: string;
}

// ============================================
// 건강보험 신고 Row 인터페이스
// ============================================

export interface HealthInsuranceAcquisitionRow {
  사업장기호: string; // 10자리
  자격취득일: string; // YYYYMMDD
  주민등록번호: string;
  성명: string;
  월보수월액: number;
  취득부호: string; // '11': 취업, '12': 사업장변경, '21': 자격변경
  등록외국인여부: string; // '0': 내국인, '1': 외국인
  체류자격?: string;
  결혼이민자여부?: string; // '0': 아님, '1': 결혼이민자
}

export interface HealthInsuranceLossRow {
  사업장기호: string;
  자격상실일: string; // YYYYMMDD
  주민등록번호: string;
  성명: string;
  상실부호: string; // '01': 퇴직, '02': 사업장변경, '03': 자격상실
}

// ============================================
// 고용보험 신고 Row 인터페이스
// ============================================

export interface EmploymentInsuranceAcquisitionRow {
  사업장관리번호: string;
  근로자주민등록번호: string;
  근로자성명: string;
  자격취득일: string; // YYYYMMDD
  월평균보수: number;
  취득부호: string; // '1': 취업, '2': 사업장변경
  비고?: string;
}

export interface EmploymentInsuranceLossRow {
  사업장관리번호: string;
  근로자주민등록번호: string;
  근로자성명: string;
  자격상실일: string; // YYYYMMDD
  상실부호: string; // '1': 퇴직, '2': 사업장변경, '3': 자격상실
  상실사유?: string;
}

// ============================================
// 산재보험 신고 Row 인터페이스
// ============================================

export interface IndustrialAccidentAcquisitionRow {
  사업장관리번호: string;
  피보험자주민등록번호: string;
  피보험자성명: string;
  자격취득일: string; // YYYYMMDD
  소득월액: number;
  취득부호: string; // '1': 취업, '2': 사업장변경
  비고?: string;
}

export interface IndustrialAccidentLossRow {
  사업장관리번호: string;
  피보험자주민등록번호: string;
  피보험자성명: string;
  자격상실일: string; // YYYYMMDD
  상실부호: string; // '1': 퇴직, '2': 사업장변경
  비고?: string;
}

// ============================================
// Union 타입
// ============================================

export type InsuranceReportRow =
  | NationalPensionAcquisitionRow
  | NationalPensionLossRow
  | HealthInsuranceAcquisitionRow
  | HealthInsuranceLossRow
  | EmploymentInsuranceAcquisitionRow
  | EmploymentInsuranceLossRow
  | IndustrialAccidentAcquisitionRow
  | IndustrialAccidentLossRow;

// ============================================
// CSV 헤더 정의
// ============================================

export const CSV_HEADERS: Record<InsuranceReportType, string[]> = {
  "national-pension-acquisition": [
    "사업장관리번호",
    "주민등록번호",
    "성명",
    "취득일자",
    "취득월납부예정금액",
    "소득월액",
    "취득부호",
    "휴  대폰",
    "이메일",
  ],
  "national-pension-loss": [
    "사업장관리번호",
    "주민등록번호",
    "성명",
    "상실일자",
    "상실부호",
    "휴  대폰",
  ],
  "national-pension-change": [
    "사업장관리번호",
    "주민등록번호",
    "성명",
    "변경적용일",
    "변경후소득월액",
    "휴  대폰",
  ],
  "health-insurance-acquisition": [
    "사업장기호",
    "자격취득일",
    "주민등록번호",
    "성명",
    "월보수월액",
    "취득부호",
    "등록외국인여부",
    "체류자격",
    "결혼이민자여부",
  ],
  "health-insurance-loss": [
    "사업장기호",
    "자격상실일",
    "주민등록번호",
    "성명",
    "상실부호",
  ],
  "health-insurance-change": [
    "사업장기호",
    "변경적용일",
    "주민등록번호",
    "성명",
    "변경후월보수월액",
  ],
  "employment-insurance-acquisition": [
    "사업장관리번호",
    "근로자주민등록번호",
    "근로자성명",
    "자격취득일",
    "월평균보수",
    "취득부호",
    "비고",
  ],
  "employment-insurance-loss": [
    "사업장관리번호",
    "근로자주민등록번호",
    "근로자성명",
    "자격상실일",
    "상실부호",
    "상실사유",
  ],
  "industrial-accident-acquisition": [
    "사업장관리번호",
    "피보험자주민등록번호",
    "피보험자성명",
    "자격취득일",
    "소득월액",
    "취득부호",
    "비고",
  ],
  "industrial-accident-loss": [
    "사업장관리번호",
    "피보험자주민등록번호",
    "피보험자성명",
    "자격상실일",
    "상실부호",
    "비고",
  ],
  "monthly-report": [
    "사업장관리번호",
    "주민등록번호",
    "성명",
    "신고월",
    "보수총액",
  ],
};

// ============================================
// CSV 유틸리티 함수
// ============================================

export function escapeCSVField(value: string | number | undefined): string {
  if (value === undefined || value === null) {
    return "";
  }

  const str = String(value);

  // 쉼표, 큰따옴표, 줄바꿈이 포함된 경우 큰따옴표로 감싸기
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function addBOM(csvContent: string): string {
  // UTF-8 BOM 추가 (한글 깨짐 방지)
  return "\uFEFF" + csvContent;
}

export function validateCSVRow(
  row: Record<string, string | number>,
  _reportType: InsuranceReportType,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 주민등록번호 검증 (13자리 숫자)
  const residentNumber =
    row["주민등록번호"] ||
    row["근로자주민등록번호"] ||
    row["피보험자주민등록번호"];
  if (residentNumber) {
    const cleaned = String(residentNumber).replace(/-/g, "");
    if (!/^\d{13}$/.test(cleaned)) {
      errors.push("주민등록번호는 13자리 숫자여야 합니다.");
    }
  }

  // 날짜 형식 검증 (YYYYMMDD)
  const dateFields = [
    "취득일자",
    "상실일자",
    "자격취득일",
    "자격상실일",
    "변경적용일",
  ];
  for (const field of dateFields) {
    if (row[field]) {
      const dateStr = String(row[field]);
      if (!/^\d{8}$/.test(dateStr)) {
        errors.push(`${field}는 YYYYMMDD 형식이어야 합니다.`);
      }
    }
  }

  // 금액 필드 검증
  const amountFields = [
    "소득월액",
    "월보수월액",
    "월평균보수",
    "취득월납부예정금액",
  ];
  for (const field of amountFields) {
    if (row[field] !== undefined && row[field] !== "") {
      const amount = Number(row[field]);
      if (Number.isNaN(amount) || amount < 0) {
        errors.push(`${field}는 유효한 금액이어야 합니다.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// CSV 생성 함수
// ============================================

export function generateNationalPensionAcquisitionCSV(
  rows: NationalPensionAcquisitionRow[],
): string {
  const headers = CSV_HEADERS["national-pension-acquisition"];
  const lines: string[] = [headers.join(",")];

  for (const row of rows) {
    const values = headers.map((header) => {
      const key = header.replace(
        /\s/g,
        "",
      ) as keyof NationalPensionAcquisitionRow;
      return escapeCSVField(row[key]);
    });
    lines.push(values.join(","));
  }

  return addBOM(lines.join("\n"));
}

export function generateNationalPensionLossCSV(
  rows: NationalPensionLossRow[],
): string {
  const headers = CSV_HEADERS["national-pension-loss"];
  const lines: string[] = [headers.join(",")];

  for (const row of rows) {
    const values = headers.map((header) => {
      const key = header.replace(/\s/g, "") as keyof NationalPensionLossRow;
      return escapeCSVField(row[key]);
    });
    lines.push(values.join(","));
  }

  return addBOM(lines.join("\n"));
}

export function generateHealthInsuranceAcquisitionCSV(
  rows: HealthInsuranceAcquisitionRow[],
): string {
  const headers = CSV_HEADERS["health-insurance-acquisition"];
  const lines: string[] = [headers.join(",")];

  for (const row of rows) {
    const values = headers.map((header) => {
      const key = header as keyof HealthInsuranceAcquisitionRow;
      return escapeCSVField(row[key]);
    });
    lines.push(values.join(","));
  }

  return addBOM(lines.join("\n"));
}

export function generateHealthInsuranceLossCSV(
  rows: HealthInsuranceLossRow[],
): string {
  const headers = CSV_HEADERS["health-insurance-loss"];
  const lines: string[] = [headers.join(",")];

  for (const row of rows) {
    const values = headers.map((header) => {
      const key = header as keyof HealthInsuranceLossRow;
      return escapeCSVField(row[key]);
    });
    lines.push(values.join(","));
  }

  return addBOM(lines.join("\n"));
}

export function generateEmploymentInsuranceAcquisitionCSV(
  rows: EmploymentInsuranceAcquisitionRow[],
): string {
  const headers = CSV_HEADERS["employment-insurance-acquisition"];
  const lines: string[] = [headers.join(",")];

  for (const row of rows) {
    const values = headers.map((header) => {
      const key = header as keyof EmploymentInsuranceAcquisitionRow;
      return escapeCSVField(row[key]);
    });
    lines.push(values.join(","));
  }

  return addBOM(lines.join("\n"));
}

export function generateEmploymentInsuranceLossCSV(
  rows: EmploymentInsuranceLossRow[],
): string {
  const headers = CSV_HEADERS["employment-insurance-loss"];
  const lines: string[] = [headers.join(",")];

  for (const row of rows) {
    const values = headers.map((header) => {
      const key = header as keyof EmploymentInsuranceLossRow;
      return escapeCSVField(row[key]);
    });
    lines.push(values.join(","));
  }

  return addBOM(lines.join("\n"));
}

export function generateIndustrialAccidentAcquisitionCSV(
  rows: IndustrialAccidentAcquisitionRow[],
): string {
  const headers = CSV_HEADERS["industrial-accident-acquisition"];
  const lines: string[] = [headers.join(",")];

  for (const row of rows) {
    const values = headers.map((header) => {
      const key = header as keyof IndustrialAccidentAcquisitionRow;
      return escapeCSVField(row[key]);
    });
    lines.push(values.join(","));
  }

  return addBOM(lines.join("\n"));
}

export function generateIndustrialAccidentLossCSV(
  rows: IndustrialAccidentLossRow[],
): string {
  const headers = CSV_HEADERS["industrial-accident-loss"];
  const lines: string[] = [headers.join(",")];

  for (const row of rows) {
    const values = headers.map((header) => {
      const key = header as keyof IndustrialAccidentLossRow;
      return escapeCSVField(row[key]);
    });
    lines.push(values.join(","));
  }

  return addBOM(lines.join("\n"));
}

// ============================================
// 통합 CSV 생성 함수
// ============================================

export function generateInsuranceReportCSV(
  reportType: InsuranceReportType,
  rows: InsuranceReportRow[],
): string {
  switch (reportType) {
    case "national-pension-acquisition":
      return generateNationalPensionAcquisitionCSV(
        rows as NationalPensionAcquisitionRow[],
      );
    case "national-pension-loss":
      return generateNationalPensionLossCSV(rows as NationalPensionLossRow[]);
    case "health-insurance-acquisition":
      return generateHealthInsuranceAcquisitionCSV(
        rows as HealthInsuranceAcquisitionRow[],
      );
    case "health-insurance-loss":
      return generateHealthInsuranceLossCSV(rows as HealthInsuranceLossRow[]);
    case "employment-insurance-acquisition":
      return generateEmploymentInsuranceAcquisitionCSV(
        rows as EmploymentInsuranceAcquisitionRow[],
      );
    case "employment-insurance-loss":
      return generateEmploymentInsuranceLossCSV(
        rows as EmploymentInsuranceLossRow[],
      );
    case "industrial-accident-acquisition":
      return generateIndustrialAccidentAcquisitionCSV(
        rows as IndustrialAccidentAcquisitionRow[],
      );
    case "industrial-accident-loss":
      return generateIndustrialAccidentLossCSV(
        rows as IndustrialAccidentLossRow[],
      );
    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }
}
