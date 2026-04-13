-- ============================================
-- notifications 테이블 (schema.sql에 이미 정의됨)
-- 이 파일은 notifications 테이블이 아직 없는 경우를 위한 단독 마이그레이션
-- ============================================

-- 테이블 생성 (이미 존재하면 무시)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('contract_expiry', 'probation_end', 'annual_leave_notice', 'nda_renewal')),
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  target_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 소속 사업장 멤버만 조회
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_select') THEN
    CREATE POLICY "notifications_select" ON notifications FOR SELECT
      USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
  END IF;
END $$;

-- RLS 정책: 소속 사업장 멤버만 삽입
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_insert') THEN
    CREATE POLICY "notifications_insert" ON notifications FOR INSERT
      WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
  END IF;
END $$;

-- RLS 정책: 소속 사업장 멤버만 수정 (읽음 처리 등)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_update') THEN
    CREATE POLICY "notifications_update" ON notifications FOR UPDATE
      USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
  END IF;
END $$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_employee ON notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type, target_date);
