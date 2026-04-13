export interface IndustryPreset {
  id: string;
  label: string;
  icon: string;
  desc: string;
  defaults: {
    workDaysPerWeek: number;
    mealAllowance: number;
    transportAllowance: number;
    overtimeDefault: boolean;
    nightWorkDefault: boolean;
    saturdayHalf?: boolean;
    defaultComprehensivePay?: number;
  };
}

export const INDUSTRY_PRESETS: IndustryPreset[] = [
  {
    id: "restaurant",
    label: "음식점·요식업",
    icon: "🍳",
    desc: "주 6일 근무, 토요일 반일, 식대 포함",
    defaults: {
      workDaysPerWeek: 6,
      mealAllowance: 200000,
      transportAllowance: 0,
      overtimeDefault: false,
      nightWorkDefault: false,
      saturdayHalf: true,
      defaultComprehensivePay: 2500000,
    },
  },
  {
    id: "office",
    label: "사무직·IT",
    icon: "💼",
    desc: "주 5일 근무, 식대+교통비, 토·일 휴무",
    defaults: {
      workDaysPerWeek: 5,
      mealAllowance: 200000,
      transportAllowance: 200000,
      overtimeDefault: false,
      nightWorkDefault: false,
      defaultComprehensivePay: 3000000,
    },
  },
  {
    id: "manufacturing",
    label: "제조업·생산직",
    icon: "🏭",
    desc: "주 5일 근무, 연장·야간 수당 기본 포함",
    defaults: {
      workDaysPerWeek: 5,
      mealAllowance: 200000,
      transportAllowance: 0,
      overtimeDefault: true,
      nightWorkDefault: true,
      defaultComprehensivePay: 2800000,
    },
  },
  {
    id: "custom",
    label: "기타 (직접 입력)",
    icon: "✏️",
    desc: "모든 항목을 직접 설정합니다",
    defaults: {
      workDaysPerWeek: 5,
      mealAllowance: 0,
      transportAllowance: 0,
      overtimeDefault: false,
      nightWorkDefault: false,
      defaultComprehensivePay: 0,
    },
  },
];
