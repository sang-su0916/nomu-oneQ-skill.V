-- ============================================
-- 온보딩 RPC 함수: 사업장 등록 + 멤버 + 프로필 한 번에 처리
-- SECURITY DEFINER로 RLS 우회
-- ============================================

CREATE OR REPLACE FUNCTION register_company(
  p_name TEXT,
  p_ceo_name TEXT,
  p_business_number TEXT,
  p_address TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- 1. 사업장 생성
  INSERT INTO companies (name, ceo_name, business_number, address, phone)
  VALUES (p_name, p_ceo_name, p_business_number, p_address, p_phone)
  RETURNING id INTO v_company_id;

  -- 2. admin 멤버 등록
  INSERT INTO company_members (company_id, user_id, role)
  VALUES (v_company_id, auth.uid(), 'admin');

  -- 3. 프로필에 현재 사업장 설정
  UPDATE profiles SET current_company_id = v_company_id
  WHERE id = auth.uid();

  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
