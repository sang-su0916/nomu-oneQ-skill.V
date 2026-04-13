// 회사 정보
export interface CompanyInfo {
  name: string; // 상호
  ceoName: string; // 대표자명
  businessNumber: string; // 사업자등록번호
  address: string; // 주소
  phone: string; // 전화번호
}

// 근로자 기본 정보
export interface EmployeeInfo {
  name: string; // 성명
  residentNumber: string; // 주민등록번호
  address: string; // 주소
  phone: string; // 연락처
}

// ============================================
// 직원 관리 시스템
// ============================================

// 직원 고용 유형
export type EmploymentType = "fulltime" | "parttime" | "freelancer";

// 직원 상태
export type EmployeeStatus = "active" | "resigned" | "pending" | "on_leave";

// 등록된 직원 (연동 시스템용)
export interface Employee {
  id: string; // 고유 ID
  info: EmployeeInfo; // 기본 정보
  employmentType: EmploymentType; // 고용 유형
  status: EmployeeStatus; // 상태
  hireDate: string; // 입사일
  resignDate?: string; // 퇴사일
  department?: string; // 부서
  position?: string; // 직위

  // 급여 정보 (계약서에서 가져옴)
  salary: {
    type: "monthly" | "hourly"; // 월급/시급
    baseSalary: number; // 기본급
    hourlyWage?: number; // 시급 (파트타임)
    mealAllowance: number; // 식대 (비과세)
    carAllowance: number; // 자가운전보조금 (비과세)
    childcareAllowance: number; // 보육수당 (비과세)
    researchAllowance: number; // 연구보조비 (비과세)
    otherAllowances: {
      // 기타 수당
      name: string;
      amount: number;
      taxable: boolean; // 과세 여부
    }[];
    bonusInfo?: string; // 상여금 정보
  };

  // 근무 조건
  workCondition: {
    weeklyHours: number; // 주 소정근로시간
    workDays: string[]; // 근무요일
    workStartTime: string; // 출근시간
    workEndTime: string; // 퇴근시간
    breakTime: number; // 휴게시간(분)
  };

  // 4대보험 가입
  insurance: {
    national: boolean;
    health: boolean;
    employment: boolean;
    industrial: boolean;
  };

  // 부양가족 정보 (간이세액표용)
  taxDependents: {
    dependents: number; // 공제대상 부양가족 수 (본인 포함, 기본값 1)
    childrenUnder20: number; // 20세 이하 자녀 수 (자녀세액공제용)
  };

  // 비과세 옵션
  taxExemptOptions: {
    hasOwnCar: boolean; // 본인 차량 보유
    hasChildUnder6: boolean; // 6세 이하 자녀 유무
    childrenUnder6Count?: number; // 6세 이하 자녀 수 (2026년 개정: 1인당 월 20만원 비과세)
    isResearcher: boolean; // 연구원 여부
  };

  // 메타 정보
  createdAt: string;
  updatedAt: string;
  contractId?: string; // 연결된 계약서 ID
}

// 급여 지급 기록
export interface PaymentRecord {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  paymentDate: string;

  // 지급 내역
  earnings: {
    baseSalary: number;
    overtime: number;
    nightWork: number;
    holidayWork: number;
    bonus: number;
    mealAllowance: number;
    carAllowance: number;
    childcareAllowance: number;
    researchAllowance: number;
    otherAllowances: { name: string; amount: number; taxable: boolean }[];
  };

  // 공제 내역
  deductions: {
    nationalPension: number;
    healthInsurance: number;
    longTermCare: number;
    employmentInsurance: number;
    incomeTax: number;
    localTax: number;
    otherDeductions: { name: string; amount: number }[];
  };

  // 계산 결과
  summary: {
    totalEarnings: number; // 총 지급액
    totalTaxable: number; // 과세 소득
    totalNonTaxable: number; // 비과세 소득
    totalDeductions: number; // 총 공제액
    netPay: number; // 실수령액
  };

  status: "pending" | "paid";
  paidAt?: string;
  createdAt: string;
}

// 근로계약서 공통
export interface ContractBase {
  company: CompanyInfo;
  employee: EmployeeInfo;
  contractDate: string; // 계약 체결일
  startDate: string; // 근무 시작일
  endDate?: string; // 근무 종료일 (무기한인 경우 비워둠)
  workplace: string; // 근무장소
  jobDescription: string; // 업무내용
}

// 정규직 근로계약서
export interface FulltimeContract extends ContractBase {
  type: "fulltime";
  workStartTime: string; // 업무 시작 시간
  workEndTime: string; // 업무 종료 시간
  breakTime: number; // 휴게시간 (분)
  workDays: string[]; // 근무요일
  baseSalary: number; // 기본급
  allowances: {
    // 수당
    name: string;
    amount: number;
  }[];
  paymentDate: number; // 급여 지급일
  annualLeave: number; // 연차휴가 일수
  insurance: {
    // 4대보험
    national: boolean; // 국민연금
    health: boolean; // 건강보험
    employment: boolean; // 고용보험
    industrial: boolean; // 산재보험
  };
}

// 파트타임 근로계약서
export interface ParttimeContract extends ContractBase {
  type: "parttime";
  workStartTime: string;
  workEndTime: string;
  breakTime: number;
  workDays: string[];
  weeklyHours: number; // 주 소정근로시간
  hourlyWage: number; // 시급
  weeklyAllowance: boolean; // 주휴수당 지급 여부
  paymentDate: number;
  insurance: {
    national: boolean;
    health: boolean;
    employment: boolean;
    industrial: boolean;
  };
}

// 프리랜서 계약서
export interface FreelancerContract {
  type: "freelancer";
  company: CompanyInfo;
  contractor: EmployeeInfo; // 수급인 정보
  contractDate: string;
  startDate: string;
  endDate: string;
  projectName: string; // 프로젝트명
  projectDescription: string; // 업무 내용
  deliverables: string; // 납품물
  totalFee: number; // 총 계약금액
  paymentSchedule: {
    // 지급 일정
    description: string;
    amount: number;
    dueDate: string;
  }[];
  taxWithholding: number; // 원천징수 비율 (보통 3.3%)
}

// 직원 급여 정보 (기존)
export interface EmployeeSalary {
  id: string;
  employee: EmployeeInfo;
  baseSalary: number;
  allowances: { name: string; amount: number }[];
  deductions: {
    nationalPension: number; // 국민연금
    healthInsurance: number; // 건강보험
    longTermCare: number; // 장기요양
    employmentInsurance: number; // 고용보험
    incomeTax: number; // 소득세
    localTax: number; // 지방소득세
    otherDeductions: number; // 기타공제
  };
}

// 급여명세서
export interface Payslip {
  year: number;
  month: number;
  employee: EmployeeInfo;
  company: CompanyInfo;
  paymentDate: string;
  earnings: {
    baseSalary: number;
    overtime: number;
    bonus: number;
    allowances: { name: string; amount: number }[];
  };
  deductions: {
    nationalPension: number;
    healthInsurance: number;
    longTermCare: number;
    employmentInsurance: number;
    incomeTax: number;
    localTax: number;
    otherDeductions: { name: string; amount: number }[];
  };
}

// 임금대장
export interface WageLedger {
  year: number;
  month: number;
  company: CompanyInfo;
  employees: EmployeeSalary[];
}

export * from "./severance";
