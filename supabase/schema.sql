-- ============================================
-- nomu-oneQ Database Schema
-- 사업장별 격리 + 역할 기반 접근제어
-- ============================================

-- 0. UUID 확장
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 사업장 (companies)
-- ============================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                    -- 상호
  ceo_name TEXT NOT NULL,                -- 대표자명
  business_number TEXT UNIQUE NOT NULL,  -- 사업자등록번호
  address TEXT,
  phone TEXT,
  -- 구독 정보
  plan TEXT NOT NULL DEFAULT 'start' CHECK (plan IN ('start', 'pro', 'ultra')),
  plan_started_at TIMESTAMPTZ,
  plan_expires_at TIMESTAMPTZ,
  max_employees INT NOT NULL DEFAULT 3,  -- 플랜별 직원 한도
  -- 메타
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. 사업장 멤버 (company_members) — 역할 기반
-- ============================================
CREATE TABLE company_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, user_id)
);

-- ============================================
-- 3. 직원 (employees)
-- ============================================
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  -- 기본 정보
  name TEXT NOT NULL,
  resident_number TEXT,              -- 암호화 권장
  address TEXT,
  phone TEXT,
  email TEXT,
  -- 고용 정보
  employment_type TEXT NOT NULL DEFAULT 'fulltime' CHECK (employment_type IN ('fulltime', 'parttime', 'freelancer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resigned', 'pending')),
  hire_date DATE NOT NULL,
  resign_date DATE,
  department TEXT,
  position TEXT,
  -- 급여 정보
  salary_type TEXT NOT NULL DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'hourly')),
  base_salary INT NOT NULL DEFAULT 0,
  hourly_wage INT,
  meal_allowance INT NOT NULL DEFAULT 0,
  car_allowance INT NOT NULL DEFAULT 0,
  childcare_allowance INT NOT NULL DEFAULT 0,
  research_allowance INT NOT NULL DEFAULT 0,
  other_allowances JSONB DEFAULT '[]',
  bonus_info TEXT,
  -- 근무 조건
  weekly_hours NUMERIC(4,1) NOT NULL DEFAULT 40,
  work_days TEXT[] DEFAULT ARRAY['월','화','수','목','금'],
  work_start_time TEXT DEFAULT '09:00',
  work_end_time TEXT DEFAULT '18:00',
  break_time INT DEFAULT 60,         -- 분
  -- 4대보험
  insurance_national BOOLEAN DEFAULT TRUE,
  insurance_health BOOLEAN DEFAULT TRUE,
  insurance_employment BOOLEAN DEFAULT TRUE,
  insurance_industrial BOOLEAN DEFAULT TRUE,
  -- 비과세 옵션
  has_own_car BOOLEAN DEFAULT FALSE,
  has_child_under6 BOOLEAN DEFAULT FALSE,
  children_under6_count INT DEFAULT 0,
  is_researcher BOOLEAN DEFAULT FALSE,
  -- 메타
  contract_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. 급여 지급 기록 (payment_records)
-- ============================================
CREATE TABLE payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  payment_date DATE,
  -- 지급 내역
  earnings JSONB NOT NULL DEFAULT '{}',
  -- 공제 내역
  deductions JSONB NOT NULL DEFAULT '{}',
  -- 요약
  total_earnings INT NOT NULL DEFAULT 0,
  total_taxable INT NOT NULL DEFAULT 0,
  total_non_taxable INT NOT NULL DEFAULT 0,
  total_deductions INT NOT NULL DEFAULT 0,
  net_pay INT NOT NULL DEFAULT 0,
  -- 상태
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, year, month)
);

-- ============================================
-- 5. 서류 보관함 (documents)
-- ============================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  -- 서류 정보
  doc_type TEXT NOT NULL,              -- 'contract_fulltime', 'payslip', 'resignation' 등
  title TEXT NOT NULL,                 -- 표시용 제목
  data JSONB NOT NULL DEFAULT '{}',    -- 서류 내용 (JSON)
  pdf_url TEXT,                        -- 저장된 PDF URL
  -- 전자서명 (Phase 3)
  signed BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMPTZ,
  signed_by TEXT,                      -- 서명자 이름
  signature_url TEXT,                  -- 서명 이미지 URL
  -- 메타
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 6. 알림 (notifications) — Phase 3
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,                  -- 'contract_expiry', 'annual_leave', 'probation' 등
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  target_date DATE,                    -- 관련 날짜
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 7. 프로필 (profiles) — auth.users 확장
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  current_company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- RLS (Row Level Security) 정책
-- ============================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- profiles: 본인만 읽기/수정
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- companies: 소속 멤버만 읽기
CREATE POLICY "companies_select_member" ON companies FOR SELECT
  USING (id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
CREATE POLICY "companies_insert_auth" ON companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "companies_update_admin" ON companies FOR UPDATE
  USING (id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role = 'admin'));

-- company_members: 소속 사업장 멤버만 보기
CREATE POLICY "members_select" ON company_members FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
CREATE POLICY "members_insert_admin" ON company_members FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "members_delete_admin" ON company_members FOR DELETE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role = 'admin'));

-- employees: 소속 사업장 직원만 접근
CREATE POLICY "employees_select" ON employees FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
CREATE POLICY "employees_insert" ON employees FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "employees_update" ON employees FOR UPDATE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "employees_delete" ON employees FOR DELETE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role = 'admin'));

-- payment_records: 소속 사업장만
CREATE POLICY "payments_select" ON payment_records FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
CREATE POLICY "payments_insert" ON payment_records FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "payments_update" ON payment_records FOR UPDATE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

-- documents: 소속 사업장만
CREATE POLICY "documents_select" ON documents FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
CREATE POLICY "documents_insert" ON documents FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "documents_update" ON documents FOR UPDATE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

-- notifications: 본인 또는 소속 사업장
CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (
    user_id = auth.uid() OR
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
  );

-- ============================================
-- 트리거: profiles 자동 생성
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 트리거: updated_at 자동 갱신
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 인덱스
-- ============================================
CREATE INDEX idx_company_members_user ON company_members(user_id);
CREATE INDEX idx_company_members_company ON company_members(company_id);
CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_employees_status ON employees(company_id, status);
CREATE INDEX idx_payment_records_company ON payment_records(company_id);
CREATE INDEX idx_payment_records_employee ON payment_records(employee_id, year, month);
CREATE INDEX idx_documents_company ON documents(company_id);
CREATE INDEX idx_documents_employee ON documents(employee_id);
CREATE INDEX idx_notifications_company ON notifications(company_id, is_read);
