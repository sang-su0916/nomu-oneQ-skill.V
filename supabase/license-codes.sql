-- license_codes 테이블 생성
CREATE TABLE IF NOT EXISTS license_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(8) UNIQUE NOT NULL,
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('start', 'pro', 'ultra')),
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  used_by UUID REFERENCES companies(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX idx_license_codes_code ON license_codes(code);
CREATE INDEX idx_license_codes_used_by ON license_codes(used_by);

-- RLS 활성화
ALTER TABLE license_codes ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 미사용 코드 조회 가능 (코드 검증용)
CREATE POLICY "authenticated_users_can_read_unused_codes"
  ON license_codes
  FOR SELECT
  TO authenticated
  USING (used_by IS NULL);

-- 인증된 사용자가 자기 회사로만 코드 사용 (UPDATE)
CREATE POLICY "users_can_use_code_for_own_company"
  ON license_codes
  FOR UPDATE
  TO authenticated
  USING (used_by IS NULL)
  WITH CHECK (
    used_by IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

-- 서비스 역할은 모든 작업 허용 (관리자 페이지용)
CREATE POLICY "service_role_full_access"
  ON license_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- anon 사용자에게 INSERT 허용 (관리자 페이지에서 코드 생성용 - 비밀번호 보호는 앱 레벨)
CREATE POLICY "anon_can_insert_codes"
  ON license_codes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- anon/authenticated 사용자에게 모든 코드 조회 허용 (관리자 페이지용)
CREATE POLICY "anon_can_read_all_codes"
  ON license_codes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- companies 테이블에 plan 관련 컬럼이 없다면 추가 (이미 있으면 무시)
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free';
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ;
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS max_employees INTEGER DEFAULT 3;
