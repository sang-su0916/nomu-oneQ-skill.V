import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { encrypt, isEncrypted } from "@/lib/encryption";

/**
 * 기존 평문 주민등록번호를 일괄 암호화하는 마이그레이션 API
 * 1회성 실행용 - SERVICE_ROLE_KEY 사용
 */
export async function POST(request: NextRequest) {
  try {
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

    // Service Role 클라이언트 (RLS 우회)
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 모든 직원 레코드 조회
    const { data: employees, error: fetchErr } = await adminSupabase
      .from("employees")
      .select("id, resident_number");

    if (fetchErr) {
      console.error("[migrate-encrypt] 조회 실패:", fetchErr.message);
      return NextResponse.json(
        { error: "직원 데이터 조회에 실패했습니다." },
        { status: 500 },
      );
    }

    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const emp of employees || []) {
      const rn = emp.resident_number;

      // null이거나 빈 값이면 건너뜀
      if (!rn) {
        skipped++;
        continue;
      }

      // 이미 암호화된 값이면 건너뜀
      if (isEncrypted(rn)) {
        skipped++;
        continue;
      }

      try {
        const encrypted = encrypt(rn);
        const { error: updateErr } = await adminSupabase
          .from("employees")
          .update({ resident_number: encrypted })
          .eq("id", emp.id);

        if (updateErr) {
          errors.push(`ID ${emp.id}: ${updateErr.message}`);
        } else {
          migrated++;
        }
      } catch (e) {
        errors.push(
          `ID ${emp.id}: ${e instanceof Error ? e.message : "알 수 없는 오류"}`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      total: (employees || []).length,
      migrated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("마이그레이션 실패:", error);
    return NextResponse.json(
      { error: "마이그레이션 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
