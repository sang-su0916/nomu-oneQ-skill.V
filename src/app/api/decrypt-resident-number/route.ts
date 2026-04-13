import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { globalLimiter, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // 레이트 리미팅: 30회/분
    const ip = getClientIp(request);
    const rl = globalLimiter.check(ip + ":decrypt-resident", 30);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }
    // 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    // 사용자 소속 사업장 확인 (IDOR 방지)
    const { data: membership } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "소속 사업장이 없습니다." },
        { status: 403 },
      );
    }

    const body = await request.json();

    // employeeIds가 제공된 경우: 해당 직원이 요청자의 사업장 소속인지 검증
    if (body.employeeIds && Array.isArray(body.employeeIds)) {
      const { data: employees } = await supabase
        .from("employees")
        .select("id")
        .eq("company_id", membership.company_id)
        .in("id", body.employeeIds);

      if (!employees || employees.length !== body.employeeIds.length) {
        return NextResponse.json(
          { error: "권한이 없는 직원 데이터입니다." },
          { status: 403 },
        );
      }
    }

    // 배치 크기 제한 (서버 리소스 보호)
    const MAX_BATCH_SIZE = 100;

    // 단건 또는 배치 복호화 지원
    if (body.value) {
      const decrypted = decrypt(body.value);
      return NextResponse.json({ decrypted });
    }

    if (body.values && Array.isArray(body.values)) {
      if (body.values.length > MAX_BATCH_SIZE) {
        return NextResponse.json(
          {
            error: `한 번에 최대 ${MAX_BATCH_SIZE}건까지 복호화할 수 있습니다.`,
          },
          { status: 400 },
        );
      }
      const decrypted = body.values.map((v: string) => {
        try {
          return decrypt(v);
        } catch (e) {
          console.warn("[decrypt-batch] 개별 복호화 실패:", e);
          return "";
        }
      });
      return NextResponse.json({ decrypted });
    }

    return NextResponse.json(
      { error: "복호화할 값을 입력해주세요." },
      { status: 400 },
    );
  } catch (error) {
    console.error("복호화 실패:", error);
    return NextResponse.json(
      { error: "복호화 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
