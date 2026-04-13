/**
 * 2026년 기준 노무 관련 상수
 * 매년 업데이트 필요
 *
 * 📅 최종 업데이트: 2026-02-04
 * 📌 출처: 국민건강보험공단, 국민연금공단, 고용노동부
 */

// ============================================
// 최저임금 (2026년)
// ============================================
export const MINIMUM_WAGE = {
  year: 2026,
  hourly: 10320, // 시급 (2026년 확정)
  monthly: 2156880, // 월급 (209시간 기준: 10,320 × 209 = 2,156,880원)
  weeklyHours: 40,
  monthlyHours: 209, // 주 40시간 × 4.345주
};

// ============================================
// 근로시간 상한 (근로기준법 제53조)
// ============================================
export const WORK_HOUR_LIMITS = {
  year: 2026,
  weeklyStandard: 40, // 법정 소정근로시간
  weeklyOvertimeMax: 12, // 연장근로 주 최대 12시간
  weeklyMaximum: 52, // 소정(40) + 연장(12) = 52시간
  monthlyOvertimeEstimate: 52, // 월 환산 약 52시간 (12h × 4.345주)
};

// ============================================
// 4대보험료율 (2026년) ⭐ 업데이트
// 근로자 부담분
// ============================================
export const INSURANCE_RATES = {
  year: 2026,

  // 국민연금: 9.5% (사용자 4.75% + 근로자 4.75%) ⬆️ 2025년 9%에서 인상
  nationalPension: {
    employee: 0.0475, // 4.75%
    employer: 0.0475, // 4.75%
    total: 0.095, // 9.5%
    // 기준소득월액: 2026.7.1부터 상한 659만원 / 하한 41만원으로 인상
    // getNationalPensionBase(date) 함수로 날짜별 자동 적용
    maxBase: 6370000, // 2026.1~6월 (직접 참조 시 사용)
    minBase: 400000,
    // 2026.7월~ 변경값
    maxBaseJuly2026: 6590000,
    minBaseJuly2026: 410000,
  },

  // 건강보험: 7.19% (사용자 3.595% + 근로자 3.595%) ⬆️ 2025년 7.09%에서 인상
  healthInsurance: {
    employee: 0.03595, // 3.595%
    employer: 0.03595, // 3.595%
    total: 0.0719,
    // 보험료액 상한액: 900만 8,340원
    maxPremium: 9008340,
  },

  // 장기요양보험: 건강보험료의 13.14% ⬆️ (0.9448% ÷ 7.19% = 13.14%)
  // 출처: 보건복지부 고시 (2026년 장기요양보험료율 0.9448%)
  longTermCare: {
    rate: 0.1314, // 건강보험료의 13.14% (2025년 12.95%에서 인상)
  },

  // 고용보험 (2026년 동결)
  // 출처: 고용노동부
  employmentInsurance: {
    employee: 0.009, // 근로자 0.9% (실업급여)
    employer: {
      // 실업급여 0.9% + 고용안정·직업능력개발사업 추가 부담
      // 출처: 4대사회보험정보연계센터 (2026년 동결)
      under150: 0.009 + 0.0025, // 150인 미만 (우선지원대상기업 포함): 1.15%
      over150preferred: 0.009 + 0.0045, // 150인 이상 우선지원대상기업: 1.35%
      over150: 0.009 + 0.0065, // 150인 이상 1,000인 미만 (대규모기업): 1.55%
      over1000: 0.009 + 0.0085, // 1,000인 이상 / 국가·지자체: 1.75%
    },
  },

  // 산재보험: 업종별 상이 (사용자 전액 부담)
  // 출처: 고용노동부 (2024~2026년 3년 연속 동결)
  industrialAccident: {
    average: 0.0147, // 평균 1.47% ⬆️ (기존 1.8% 오류 수정, 업종별 0.6%~34%)
  },
};

// ============================================
// 비과세 한도 (2026년) ⭐ 업데이트
// ============================================
export const TAX_EXEMPTION_LIMITS = {
  year: 2026,

  // 식대 (2023년부터 월 20만원)
  meal: {
    monthly: 200000,
    description: "식대 (구내식당 제공 시 제외)",
  },

  // 자가운전보조금 (본인 차량 업무사용)
  carAllowance: {
    monthly: 200000,
    description: "자가운전보조금 (본인 명의 차량, 업무용)",
    condition: "출퇴근용은 비과세 불가",
  },

  // 출산/보육수당 (6세 이하 자녀) ⭐ 2026년 개정
  childcare: {
    monthlyPerChild: 200000, // 자녀 1인당 월 20만원 (2026년~)
    maxAge: 6, // 6세 이하 (변경 없음)
    description: "출산/보육수당 (6세 이하 자녀)",
    note: "2026년부터 자녀 1인당 월 20만원 (기존: 1인당 총 20만원)",
  },

  // 연구활동비 (연구원)
  research: {
    monthly: 200000,
    description: "연구활동비 (연구원 한정)",
  },

  // 유류비/차량유지비 (업무용)
  fuel: {
    monthly: 200000,
    description: "유류비/차량유지비 (업무용 차량)",
    condition: "자가운전보조금과 별개로 적용 가능",
  },

  // 생산직 야간근로수당 (월정액 210만원 이하)
  nightShift: {
    yearlyLimit: 2400000,
    monthlyWageLimit: 2100000,
    description: "생산직 야간근로수당",
  },

  // 출산지원금 (2024년~)
  birthSupport: {
    limit: "unlimited", // 전액 비과세
    condition: "출산 후 2년 이내 지급, 2회 이내",
    description: "출산지원금 (출생일 이후 2년 내 지급 시 전액 비과세)",
  },
};

// ============================================
// 소득세율 (근로소득 간이세액표 기준)
// ============================================
export const INCOME_TAX_BRACKETS = [
  { min: 0, max: 14000000, rate: 0.06, deduction: 0 },
  { min: 14000000, max: 50000000, rate: 0.15, deduction: 1260000 },
  { min: 50000000, max: 88000000, rate: 0.24, deduction: 5760000 },
  { min: 88000000, max: 150000000, rate: 0.35, deduction: 15440000 },
  { min: 150000000, max: 300000000, rate: 0.38, deduction: 19940000 },
  { min: 300000000, max: 500000000, rate: 0.4, deduction: 25940000 },
  { min: 500000000, max: 1000000000, rate: 0.42, deduction: 35940000 },
  { min: 1000000000, max: Infinity, rate: 0.45, deduction: 65940000 },
];

// ============================================
// 급여 최적화 계산
// ============================================
export interface SalaryOptimization {
  baseSalary: number; // 기본급 (과세)
  mealAllowance: number; // 식대 (비과세)
  carAllowance: number; // 자가운전보조금 (비과세)
  childcareAllowance: number; // 보육수당 (비과세)
  researchAllowance: number; // 연구보조비 (비과세)
  totalGross: number; // 총 급여
  taxableIncome: number; // 과세 소득
  insuranceBase: number; // 4대보험 기준액
  savings: {
    insurance: number; // 4대보험 절감액
    tax: number; // 소득세 절감액
    total: number; // 총 절감액
  };
  warnings: string[]; // 경고 메시지
}

export function optimizeSalary(
  totalGross: number,
  options: {
    hasOwnCar?: boolean; // 본인 차량 있음
    hasChildUnder6?: boolean; // 6세 이하 자녀 있음 (기존 호환용)
    childrenUnder6?: number; // 6세 이하 자녀 수 (2026년 개정 반영)
    isResearcher?: boolean; // 연구활동종사자
  } = {},
): SalaryOptimization {
  const warnings: string[] = [];

  // 1. 비과세 항목 최대 활용
  let remainingAmount = totalGross;

  // 식대 (거의 모든 경우 적용 가능)
  const mealAllowance = Math.min(
    TAX_EXEMPTION_LIMITS.meal.monthly,
    remainingAmount,
  );
  remainingAmount -= mealAllowance;

  // 자가운전보조금 (차량 있는 경우만)
  let carAllowance = 0;
  if (options.hasOwnCar && remainingAmount > 0) {
    carAllowance = Math.min(
      TAX_EXEMPTION_LIMITS.carAllowance.monthly,
      remainingAmount,
    );
    remainingAmount -= carAllowance;
  }

  // 보육수당 (6세 이하 자녀 수에 따라 - 2026년 개정)
  // 자녀 수가 지정되지 않고 hasChildUnder6만 있으면 1명으로 간주
  let childcareAllowance = 0;
  const childrenCount =
    options.childrenUnder6 ?? (options.hasChildUnder6 ? 1 : 0);
  if (childrenCount > 0 && remainingAmount > 0) {
    const maxChildcare =
      TAX_EXEMPTION_LIMITS.childcare.monthlyPerChild * childrenCount;
    childcareAllowance = Math.min(maxChildcare, remainingAmount);
    remainingAmount -= childcareAllowance;
  }

  // 연구보조비 (연구활동종사자인 경우만)
  let researchAllowance = 0;
  if (options.isResearcher && remainingAmount > 0) {
    researchAllowance = Math.min(
      TAX_EXEMPTION_LIMITS.research.monthly,
      remainingAmount,
    );
    remainingAmount -= researchAllowance;
  }

  // 나머지는 기본급
  const baseSalary = remainingAmount;

  // 2. 최저임금 체크
  if (baseSalary < MINIMUM_WAGE.monthly) {
    const effectiveHourly = totalGross / MINIMUM_WAGE.monthlyHours;
    if (effectiveHourly < MINIMUM_WAGE.hourly) {
      warnings.push(
        `⚠️ 최저임금 미달! (시급 ${Math.floor(effectiveHourly).toLocaleString()}원 < ${MINIMUM_WAGE.hourly.toLocaleString()}원)`,
      );
    }
  }

  // 3. 과세 소득 및 4대보험 기준액
  const taxableIncome = baseSalary; // 비과세 제외
  const insuranceBase = Math.min(
    Math.max(taxableIncome, INSURANCE_RATES.nationalPension.minBase),
    INSURANCE_RATES.nationalPension.maxBase,
  );

  // 4. 절감액 계산 (최적화 vs 전액 과세)
  const fullTaxableInsurance =
    totalGross *
    (INSURANCE_RATES.nationalPension.employee +
      INSURANCE_RATES.healthInsurance.employee +
      INSURANCE_RATES.healthInsurance.employee *
        INSURANCE_RATES.longTermCare.rate +
      INSURANCE_RATES.employmentInsurance.employee);

  const optimizedInsurance =
    insuranceBase *
    (INSURANCE_RATES.nationalPension.employee +
      INSURANCE_RATES.healthInsurance.employee +
      INSURANCE_RATES.healthInsurance.employee *
        INSURANCE_RATES.longTermCare.rate +
      INSURANCE_RATES.employmentInsurance.employee);

  const insuranceSavings = Math.round(
    fullTaxableInsurance - optimizedInsurance,
  );

  // 소득세 절감 (간략 계산)
  const taxSavings = Math.round((totalGross - taxableIncome) * 0.06); // 최저세율 기준

  return {
    baseSalary,
    mealAllowance,
    carAllowance,
    childcareAllowance,
    researchAllowance,
    totalGross,
    taxableIncome,
    insuranceBase,
    savings: {
      insurance: insuranceSavings,
      tax: taxSavings,
      total: insuranceSavings + taxSavings,
    },
    warnings,
  };
}

// ============================================
// 4대보험료 계산 (2026년 요율 적용)
// ============================================
export interface InsuranceCalculation {
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  totalEmployee: number;
  totalEmployer: number;
}

/**
 * 급여 지급월 기준으로 국민연금 기준소득월액 상한/하한을 반환합니다.
 * - 2026.1~6월: 상한 637만원 / 하한 40만원
 * - 2026.7월~:  상한 659만원 / 하한 41만원 (자동 전환)
 */
export function getNationalPensionBase(date: Date = new Date()): {
  maxBase: number;
  minBase: number;
} {
  const isJulyOrLater =
    date.getFullYear() > 2026 ||
    (date.getFullYear() === 2026 && date.getMonth() >= 6); // getMonth()는 0-based, 6=7월
  return isJulyOrLater
    ? {
        maxBase: INSURANCE_RATES.nationalPension.maxBaseJuly2026,
        minBase: INSURANCE_RATES.nationalPension.minBaseJuly2026,
      }
    : {
        maxBase: INSURANCE_RATES.nationalPension.maxBase,
        minBase: INSURANCE_RATES.nationalPension.minBase,
      };
}

export function calculateInsurance(
  taxableIncome: number,
  paymentDate: Date = new Date(),
): InsuranceCalculation {
  // 급여 지급월 기준 국민연금 기준소득월액 적용 (7월 자동 전환)
  const { maxBase, minBase } = getNationalPensionBase(paymentDate);
  const pensionBase = Math.min(Math.max(taxableIncome, minBase), maxBase);

  const nationalPension = Math.round(
    pensionBase * INSURANCE_RATES.nationalPension.employee,
  );
  const healthInsurance = Math.round(
    taxableIncome * INSURANCE_RATES.healthInsurance.employee,
  );
  const longTermCare = Math.round(
    healthInsurance * INSURANCE_RATES.longTermCare.rate,
  );
  const employmentInsurance = Math.round(
    taxableIncome * INSURANCE_RATES.employmentInsurance.employee,
  );

  const totalEmployee =
    nationalPension + healthInsurance + longTermCare + employmentInsurance;

  // 사용자 부담분 (150인 미만 기준)
  const employerNational = Math.round(
    pensionBase * INSURANCE_RATES.nationalPension.employer,
  );
  const employerHealth = Math.round(
    taxableIncome * INSURANCE_RATES.healthInsurance.employer,
  );
  const employerLongTerm = Math.round(
    employerHealth * INSURANCE_RATES.longTermCare.rate,
  );
  const employerEmployment = Math.round(
    taxableIncome * INSURANCE_RATES.employmentInsurance.employer.under150,
  );
  const employerIndustrial = Math.round(
    taxableIncome * INSURANCE_RATES.industrialAccident.average,
  );

  const totalEmployer =
    employerNational +
    employerHealth +
    employerLongTerm +
    employerEmployment +
    employerIndustrial;

  return {
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    totalEmployee,
    totalEmployer,
  };
}

// ============================================
// 한국 공휴일 및 근로일수 계산
// ============================================

// 고정 공휴일 (매년 동일)
const FIXED_HOLIDAYS: [number, number][] = [
  [1, 1], // 신정
  [3, 1], // 삼일절
  [5, 1], // 근로자의 날
  [5, 5], // 어린이날
  [6, 6], // 현충일
  [8, 15], // 광복절
  [10, 3], // 개천절
  [10, 9], // 한글날
  [12, 25], // 크리스마스
];

// 음력 기반 공휴일 (연도별 양력 변환, 대체공휴일 포함)
const LUNAR_HOLIDAYS: Record<number, [number, number][]> = {
  2024: [
    [2, 9],
    [2, 10],
    [2, 11],
    [2, 12], // 설날 + 대체
    [5, 15], // 석가탄신일
    [9, 16],
    [9, 17],
    [9, 18], // 추석
  ],
  2025: [
    [1, 28],
    [1, 29],
    [1, 30], // 설날
    [5, 6], // 석가탄신일 대체 (5/5 어린이날 겹침)
    [10, 5],
    [10, 6],
    [10, 7],
    [10, 8], // 추석 + 대체
  ],
  2026: [
    [2, 16],
    [2, 17],
    [2, 18], // 설날
    [5, 24],
    [5, 25], // 석가탄신일 + 대체 (일요일)
    [9, 24],
    [9, 25],
    [9, 26],
    [9, 28], // 추석 + 대체 (토요일→월요일)
  ],
  2027: [
    [2, 6],
    [2, 7],
    [2, 8],
    [2, 9], // 설날 + 대체 (토요일→화요일)
    [5, 13], // 석가탄신일
    [10, 14],
    [10, 15],
    [10, 16],
    [10, 18], // 추석 + 대체 (토요일→월요일)
  ],
  2028: [
    [1, 26],
    [1, 27],
    [1, 28], // 설날
    [5, 2], // 석가탄신일
    [10, 2],
    [10, 3],
    [10, 4], // 추석 (개천절 겹침)
  ],
  2029: [
    [2, 12],
    [2, 13],
    [2, 14], // 설날
    [5, 20],
    [5, 21], // 석가탄신일 + 대체 (일요일)
    [9, 21],
    [9, 22],
    [9, 23],
    [9, 24], // 추석 + 대체 (일요일→월요일)
  ],
  2030: [
    [2, 2],
    [2, 3],
    [2, 4],
    [2, 5], // 설날 + 대체 (일요일→화요일)
    [5, 9], // 석가탄신일
    [9, 11],
    [9, 12],
    [9, 13], // 추석
  ],
};

const WEEKDAY_MAP: Record<string, number> = {
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
};

/**
 * 해당 연도의 공휴일 Set을 반환 (YYYY-MM-DD 형식)
 */
export function getKoreanHolidays(year: number): Set<string> {
  const holidays = new Set<string>();

  // 고정 공휴일
  for (const [m, d] of FIXED_HOLIDAYS) {
    holidays.add(
      `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }

  // 음력 기반 공휴일
  const lunar = LUNAR_HOLIDAYS[year];
  if (lunar) {
    for (const [m, d] of lunar) {
      holidays.add(
        `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      );
    }
  }

  return holidays;
}

/**
 * 해당 월의 근로일수와 총 근로시간을 계산
 * @param year 연도
 * @param month 월 (1-12)
 * @param workDays 근무요일 (예: ['월', '화', '수', '목', '금'])
 * @param dailyHours 일 소정근로시간 (기본 8시간)
 */
export function getWorkingDays(
  year: number,
  month: number,
  workDays: string[] = ["월", "화", "수", "목", "금"],
  dailyHours: number = 8,
): { days: number; hours: number } {
  const holidays = getKoreanHolidays(year);
  const workDayNums = new Set(
    workDays.map((d) => WEEKDAY_MAP[d]).filter((n) => n !== undefined),
  );

  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dayOfWeek = date.getDay();

    // 해당 요일이 근무일인지 확인
    if (!workDayNums.has(dayOfWeek)) continue;

    // 공휴일 확인
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (holidays.has(dateStr)) continue;

    count++;
  }

  return { days: count, hours: count * dailyHours };
}

// ============================================
// 간이세액표 기반 소득세 계산
// ============================================
import {
  calculateSimpleIncomeTax,
  calculateLocalIncomeTax,
} from "./simple-tax-table";

export { calculateLocalIncomeTax };

/**
 * 간이세액표 기반 소득세 계산
 * @param monthlyTaxable 월 과세급여액 (비과세 제외)
 * @param dependents 공제대상 부양가족 수 (본인 포함, 기본값 1)
 * @param childrenUnder20 20세 이하 자녀 수 (기본값 0)
 */
export function calculateIncomeTax(
  monthlyTaxable: number,
  dependents: number = 1,
  childrenUnder20: number = 0,
): number {
  return calculateSimpleIncomeTax(monthlyTaxable, dependents, childrenUnder20);
}
