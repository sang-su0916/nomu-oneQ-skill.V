/**
 * 유틸리티 함수 모음
 * localStorage CRUD는 Supabase로 전환됨 (useEmployees, useCompanyInfo, usePaymentRecords 훅 사용)
 */

// ============================================
// ID 생성
// ============================================
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

// ============================================
// 포맷팅 유틸리티
// ============================================
export const formatNumber = (num: number): string => {
  return num.toLocaleString("ko-KR");
};

export const formatCurrency = (amount: number): string => {
  return `${formatNumber(amount)}원`;
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${Number(parts[0])}년 ${Number(parts[1])}월 ${Number(parts[2])}일`;
};

export const formatDateShort = (dateStr: string): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[0]}.${parts[1].padStart(2, "0")}.${parts[2].padStart(2, "0")}`;
};

export const formatResidentNumber = (num: string, mask = true): string => {
  const cleaned = num.replace(/[^0-9]/g, "");
  if (cleaned.length !== 13) return num;
  if (mask) {
    return `${cleaned.slice(0, 6)}-${cleaned.slice(6, 7)}******`;
  }
  return `${cleaned.slice(0, 6)}-${cleaned.slice(6)}`;
};

export const formatBusinessNumber = (num: string): string => {
  const cleaned = num.replace(/[^0-9]/g, "");
  if (cleaned.length !== 10) return num;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
};

export const formatPhoneNumber = (num: string): string => {
  const cleaned = num.replace(/[^0-9]/g, "");
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return num;
};

// 입력 중 자동 대시 삽입 (주민번호: 6자리-7자리)
export const autoFormatResidentNumber = (value: string): string => {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 13);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
};

// 입력 중 자동 대시 삽입 (전화번호: 010-1234-5678)
export const autoFormatPhone = (value: string): string => {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

// 금액 입력 중 콤마 자동 포맷 (예: 3000000 → "3,000,000")
export const formatNumberInput = (value: string): string => {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
};

export const parseNumberInput = (formatted: string): number => {
  return parseInt(formatted.replace(/[^0-9]/g, "")) || 0;
};

// 입력 중 자동 대시 삽입 (외국인등록번호: 6자리-7자리, 주민번호와 동일 형식)
export const autoFormatForeignRegNumber = (value: string): string => {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 13);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
};
