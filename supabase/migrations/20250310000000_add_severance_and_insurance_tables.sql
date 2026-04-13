-- ============================================
-- Migration: Add Severance Pay and Insurance Reporting Tables
-- 생성일: 2025-03-10
-- 설명: 퇴직금 계산 및 4대보험 자동신고 기능을 위한 테이블 추가
-- ============================================

-- ============================================
-- 1. 퇴직금 계산 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS severance_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- 입력값
  hire_date DATE NOT NULL,
  retirement_date DATE NOT NULL,
  last_three_months_wages JSONB NOT NULL, -- MonthlyWage[] 저장
  included_allowances DECIMAL(12,0) DEFAULT 0,
  annual_bonus_total DECIMAL(12,0) DEFAULT 0,
  
  -- 계산 결과
  service_days INTEGER NOT NULL,
  service_years DECIMAL(5,2) NOT NULL,
  average_wage DECIMAL(12,0) NOT NULL, -- 1일 평균임금
  total_severance_pay DECIMAL(12,0) NOT NULL, -- 총 퇴직금
  calculation_details JSONB NOT NULL,
  
  -- 메타데이터
  calculated_by UUID REFERENCES auth.users(id),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 상태
  status VARCHAR(20) DEFAULT 'calculated' CHECK (status IN ('calculated', 'settled', 'exported', 'mid_term_settled'))
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_severance_company ON severance_calculations(company_id);
CREATE INDEX IF NOT EXISTS idx_severance_employee ON severance_calculations(employee_id);
CREATE INDEX IF NOT EXISTS idx_severance_calculated_at ON severance_calculations(calculated_at);
CREATE INDEX IF NOT EXISTS idx_severance_status ON severance_calculations(status);

-- ============================================
-- 2. 4대보험 신고 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS insurance_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- 신고 기본 정보
  report_type VARCHAR(30) NOT NULL CHECK (report_type IN (
    'national-pension-acquisition',
    'national-pension-loss',
    'national-pension-change',
    'health-insurance-acquisition',
    'health-insurance-loss',
    'health-insurance-change',
    'employment-insurance-acquisition',
    'employment-insurance-loss',
    'industrial-accident-acquisition',
    'industrial-accident-loss',
    'monthly-report'
  )),
  report_month VARCHAR(6) NOT NULL, -- YYYYMM (신고 대상 월)
  
  -- 신고 내용
  report_title TEXT NOT NULL,
  report_description TEXT,
  
  -- 파일 정보
  file_name TEXT,
  file_url TEXT,
  file_format VARCHAR(10) CHECK (file_format IN ('csv', 'excel', 'txt')),
  
  -- 신고 상태
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'submitted', 'completed', 'error')),
  
  -- 대상 직원 수
  total_employees INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  -- 생성/제출 정보
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  
  -- 오류 정보
  error_message TEXT,
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_insurance_reports_company ON insurance_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_insurance_reports_type ON insurance_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_insurance_reports_month ON insurance_reports(report_month);
CREATE INDEX IF NOT EXISTS idx_insurance_reports_status ON insurance_reports(status);

-- ============================================
-- 3. 4대보험 신고 항목 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS insurance_report_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES insurance_reports(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- 신고 유형별 데이터 (JSONB로 유연하게 저장)
  report_data JSONB NOT NULL,
  
  -- 신고 상태 (개별 항목)
  item_status VARCHAR(20) DEFAULT 'pending' CHECK (item_status IN ('pending', 'included', 'excluded', 'error')),
  error_message TEXT,
  
  -- 검증 결과
  validation_result JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_insurance_items_report ON insurance_report_items(report_id);
CREATE INDEX IF NOT EXISTS idx_insurance_items_company ON insurance_report_items(company_id);
CREATE INDEX IF NOT EXISTS idx_insurance_items_employee ON insurance_report_items(employee_id);

-- ============================================
-- 4. employees 테이블 컬럼 추가
-- ============================================
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS insurance_acquisition_date DATE, -- 4대보험 취득일
ADD COLUMN IF NOT EXISTS insurance_loss_date DATE, -- 4대보험 상실일
ADD COLUMN IF NOT EXISTS severance_eligible_date DATE; -- 퇴직금 정산 가능일 (5년 근속 시)

-- ============================================
-- 5. RLS 정책 설정
-- ============================================

-- severance_calculations RLS
ALTER TABLE severance_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company severance calculations" ON severance_calculations;
CREATE POLICY "Users can view own company severance calculations"
  ON severance_calculations FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert own company severance calculations" ON severance_calculations;
CREATE POLICY "Users can insert own company severance calculations"
  ON severance_calculations FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own company severance calculations" ON severance_calculations;
CREATE POLICY "Users can update own company severance calculations"
  ON severance_calculations FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete own company severance calculations" ON severance_calculations;
CREATE POLICY "Users can delete own company severance calculations"
  ON severance_calculations FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid()
  ));

-- insurance_reports RLS
ALTER TABLE insurance_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company insurance reports" ON insurance_reports;
CREATE POLICY "Users can view own company insurance reports"
  ON insurance_reports FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert own company insurance reports" ON insurance_reports;
CREATE POLICY "Users can insert own company insurance reports"
  ON insurance_reports FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own company insurance reports" ON insurance_reports;
CREATE POLICY "Users can update own company insurance reports"
  ON insurance_reports FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete own company insurance reports" ON insurance_reports;
CREATE POLICY "Users can delete own company insurance reports"
  ON insurance_reports FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid()
  ));

-- insurance_report_items RLS
ALTER TABLE insurance_report_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company insurance report items" ON insurance_report_items;
CREATE POLICY "Users can view own company insurance report items"
  ON insurance_report_items FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert own company insurance report items" ON insurance_report_items;
CREATE POLICY "Users can insert own company insurance report items"
  ON insurance_report_items FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own company insurance report items" ON insurance_report_items;
CREATE POLICY "Users can update own company insurance report items"
  ON insurance_report_items FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete own company insurance report items" ON insurance_report_items;
CREATE POLICY "Users can delete own company insurance report items"
  ON insurance_report_items FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid()
  ));

-- ============================================
-- 6. 트리거 함수 및 트리거
-- ============================================

-- updated_at 자동 업데이트 함수 (이미 존재하면 스킵)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- severance_calculations 트리거
DROP TRIGGER IF EXISTS update_severance_calculations_updated_at ON severance_calculations;
CREATE TRIGGER update_severance_calculations_updated_at
  BEFORE UPDATE ON severance_calculations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- insurance_reports 트리거
DROP TRIGGER IF EXISTS update_insurance_reports_updated_at ON insurance_reports;
CREATE TRIGGER update_insurance_reports_updated_at
  BEFORE UPDATE ON insurance_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
