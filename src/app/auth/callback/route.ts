import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // 코드 교환 실패 → 로그인으로
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    // 사업장 등록 여부 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: memberships } = await supabase
        .from("company_members")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (!memberships || memberships.length === 0) {
        // 사업장 미등록 → 온보딩으로
        return NextResponse.redirect(`${origin}/onboarding`);
      }
    }
  }

  return NextResponse.redirect(`${origin}${redirect}`);
}
