import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { globalLimiter, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // 레이트 리미팅: 10회/분
    const ip = getClientIp(request);
    const rl = globalLimiter.check(ip + ":register-company", 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }
    // 1. 현재 로그인한 유저 확인
    const serverSupabase = await createServerClient();
    const {
      data: { user },
      error: authErr,
    } = await serverSupabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    // 2. 요청 바디 파싱
    const body = await request.json();
    const { name, ceoName, businessNumber, address, phone } = body;

    if (!name || !ceoName || !businessNumber) {
      return NextResponse.json(
        { error: "필수 항목을 입력해주세요." },
        { status: 400 },
      );
    }

    // 3. Service Role 클라이언트 (RLS 우회)
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[register-company] SUPABASE_SERVICE_ROLE_KEY 미설정");
      return NextResponse.json(
        { error: "서버 설정 오류 (SERVICE_ROLE_KEY 미설정)" },
        { status: 500 },
      );
    }
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // 4. 사업장 생성 시도
    const { data: company, error: companyErr } = await adminSupabase
      .from("companies")
      .insert({
        name,
        ceo_name: ceoName,
        business_number: businessNumber,
        address: address || null,
        phone: phone || null,
        plan: "start",
      })
      .select("id")
      .single();

    let companyId: string;

    if (companyErr) {
      if (companyErr.code === "23505") {
        // 이미 등록된 사업자번호 → 기존 사업장에 합류
        const { data: existing } = await adminSupabase
          .from("companies")
          .select("id")
          .eq("business_number", businessNumber)
          .single();

        if (!existing) {
          return NextResponse.json(
            { error: "사업장을 찾을 수 없습니다." },
            { status: 404 },
          );
        }

        // 이미 멤버인지 확인
        const { data: existingMember } = await adminSupabase
          .from("company_members")
          .select("id")
          .eq("company_id", existing.id)
          .eq("user_id", user.id)
          .single();

        if (existingMember) {
          // 이미 멤버 → 프로필만 업데이트
          await adminSupabase
            .from("profiles")
            .update({ current_company_id: existing.id })
            .eq("id", user.id);
          return NextResponse.json({ companyId: existing.id, joined: true });
        }

        companyId = existing.id;
      } else {
        console.error(
          "[register-company] 사업장 생성 오류:",
          companyErr.message,
          companyErr.code,
          companyErr.details,
        );
        return NextResponse.json(
          { error: `사업장 등록 실패: ${companyErr.message}` },
          { status: 500 },
        );
      }
    } else {
      companyId = company.id;
    }

    // 5. 멤버 등록
    const { error: memberErr } = await adminSupabase
      .from("company_members")
      .insert({
        company_id: companyId,
        user_id: user.id,
        role: "admin",
      });

    if (memberErr) {
      // 새로 만든 사업장인 경우만 롤백
      if (!companyErr) {
        await adminSupabase.from("companies").delete().eq("id", companyId);
      }
      console.error("[register-company] 멤버 등록 오류:", memberErr.message);
      return NextResponse.json(
        { error: "멤버 등록 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    // 6. 프로필에 현재 사업장 설정
    await adminSupabase
      .from("profiles")
      .update({ current_company_id: companyId })
      .eq("id", user.id);

    return NextResponse.json({ companyId, joined: !!companyErr });
  } catch (err) {
    console.error("[register-company] 예외:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
