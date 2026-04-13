-- ============================================
-- nomu-oneQ RLS 무한 재귀 수정
-- 문제: company_members의 SELECT 정책이 자기 자신을 참조 → infinite recursion
-- 해결: SECURITY DEFINER 함수로 RLS 우회하는 헬퍼 생성
-- ============================================

-- 1. 헬퍼 함수: 유저가 소속된 company_id 목록 반환 (RLS 무시)
CREATE OR REPLACE FUNCTION get_my_company_ids()
RETURNS SETOF UUID AS $$
  SELECT company_id FROM company_members WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 2. 헬퍼 함수: 특정 사업장에서 유저의 역할 반환
CREATE OR REPLACE FUNCTION get_my_role(p_company_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM company_members 
  WHERE user_id = auth.uid() AND company_id = p_company_id
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================
-- 3. company_members 기존 정책 삭제
-- ============================================
DROP POLICY IF EXISTS "members_select" ON company_members;
DROP POLICY IF EXISTS "members_insert_admin" ON company_members;
DROP POLICY IF EXISTS "members_delete_admin" ON company_members;

-- ============================================
-- 4. company_members 새 정책 (헬퍼 함수 사용)
-- ============================================

-- SELECT: 본인이 멤버인 row만 볼 수 있음 (자기참조 없음!)
CREATE POLICY "members_select" ON company_members FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: 첫 멤버(본인을 admin으로) 또는 기존 admin이 초대
CREATE POLICY "members_insert" ON company_members FOR INSERT
  WITH CHECK (
    -- 케이스1: 온보딩 — 본인을 admin으로 등록 (해당 사업장에 아직 멤버 없을 때)
    (user_id = auth.uid() AND role = 'admin' AND get_my_role(company_id) IS NULL)
    OR
    -- 케이스2: admin이 다른 멤버 초대
    (get_my_role(company_id) = 'admin')
  );

-- DELETE: admin만 멤버 삭제 가능
CREATE POLICY "members_delete_admin" ON company_members FOR DELETE
  USING (get_my_role(company_id) = 'admin');

-- ============================================
-- 5. 다른 테이블 정책도 헬퍼 함수로 교체 (연쇄 재귀 방지)
-- ============================================

-- companies
DROP POLICY IF EXISTS "companies_select_member" ON companies;
DROP POLICY IF EXISTS "companies_update_admin" ON companies;

CREATE POLICY "companies_select_member" ON companies FOR SELECT
  USING (id IN (SELECT get_my_company_ids()));
CREATE POLICY "companies_update_admin" ON companies FOR UPDATE
  USING (get_my_role(id) = 'admin');

-- employees
DROP POLICY IF EXISTS "employees_select" ON employees;
DROP POLICY IF EXISTS "employees_insert" ON employees;
DROP POLICY IF EXISTS "employees_update" ON employees;
DROP POLICY IF EXISTS "employees_delete" ON employees;

CREATE POLICY "employees_select" ON employees FOR SELECT
  USING (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "employees_insert" ON employees FOR INSERT
  WITH CHECK (get_my_role(company_id) IN ('admin', 'manager'));
CREATE POLICY "employees_update" ON employees FOR UPDATE
  USING (get_my_role(company_id) IN ('admin', 'manager'));
CREATE POLICY "employees_delete" ON employees FOR DELETE
  USING (get_my_role(company_id) = 'admin');

-- payment_records
DROP POLICY IF EXISTS "payments_select" ON payment_records;
DROP POLICY IF EXISTS "payments_insert" ON payment_records;
DROP POLICY IF EXISTS "payments_update" ON payment_records;

CREATE POLICY "payments_select" ON payment_records FOR SELECT
  USING (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "payments_insert" ON payment_records FOR INSERT
  WITH CHECK (get_my_role(company_id) IN ('admin', 'manager'));
CREATE POLICY "payments_update" ON payment_records FOR UPDATE
  USING (get_my_role(company_id) IN ('admin', 'manager'));

-- documents
DROP POLICY IF EXISTS "documents_select" ON documents;
DROP POLICY IF EXISTS "documents_insert" ON documents;
DROP POLICY IF EXISTS "documents_update" ON documents;

CREATE POLICY "documents_select" ON documents FOR SELECT
  USING (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "documents_insert" ON documents FOR INSERT
  WITH CHECK (get_my_role(company_id) IN ('admin', 'manager'));
CREATE POLICY "documents_update" ON documents FOR UPDATE
  USING (get_my_role(company_id) IN ('admin', 'manager'));

-- notifications
DROP POLICY IF EXISTS "notifications_select" ON notifications;

CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (
    user_id = auth.uid() OR
    company_id IN (SELECT get_my_company_ids())
  );

-- ============================================
-- 완료! 이제 온보딩 시 company_members INSERT가 정상 동작합니다.
-- ============================================
