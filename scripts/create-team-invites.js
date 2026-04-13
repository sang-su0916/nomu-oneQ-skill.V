/**
 * team_invites 테이블 생성 스크립트
 *
 * Supabase Dashboard > SQL Editor 에서 아래 SQL을 실행하세요:
 *
 * CREATE TABLE IF NOT EXISTS team_invites (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 *   email TEXT NOT NULL,
 *   role TEXT NOT NULL DEFAULT 'viewer',
 *   invite_code TEXT NOT NULL UNIQUE,
 *   invited_by UUID REFERENCES auth.users(id),
 *   status TEXT NOT NULL DEFAULT 'pending',
 *   expires_at TIMESTAMPTZ,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE INDEX IF NOT EXISTS idx_team_invites_code ON team_invites(invite_code);
 * CREATE INDEX IF NOT EXISTS idx_team_invites_company ON team_invites(company_id, status);
 *
 * -- RLS 활성화
 * ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
 *
 * -- Service Role만 접근 가능 (API 라우트에서 service role key 사용)
 * CREATE POLICY "Service role full access" ON team_invites
 *   FOR ALL USING (true) WITH CHECK (true);
 */

console.log("아래 SQL을 Supabase Dashboard > SQL Editor에서 실행하세요:");
console.log(
  "https://supabase.com/dashboard/project/sxnsabfiwzebwzbatggq/sql/new",
);
console.log("");
console.log(`
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  invite_code TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_invites_code ON team_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_team_invites_company ON team_invites(company_id, status);

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON team_invites
  FOR ALL USING (true) WITH CHECK (true);
`);
