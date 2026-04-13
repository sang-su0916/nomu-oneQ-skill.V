import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import crypto from "crypto";

/**
 * GET /api/auto-login?token=xxx
 * 홈페이지에서 발급한 토큰으로 자동 로그인 처리
 * 1. 토큰 검증 (서명 + 만료)
 * 2. 이메일로 기존 사용자 검색 → 없으면 생성
 * 3. 매직 링크 발급 → 로그인 완료 후 대시보드로 리다이렉트
 * 4. 홈페이지에 사용 기록 콜백
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=no_token", request.url));
  }

  const secret = process.env.APP_LINK_SECRET;
  if (!secret) {
    return NextResponse.redirect(
      new URL("/login?error=server_config", request.url),
    );
  }

  // 토큰 검증
  const parts = token.split(".");
  if (parts.length !== 2) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_token", request.url),
    );
  }

  const [payloadBase64, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payloadBase64)
    .digest("base64url");

  if (signature !== expectedSig) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_token", request.url),
    );
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString());
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=invalid_token", request.url),
    );
  }

  // 만료 확인
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return NextResponse.redirect(
      new URL("/login?error=token_expired", request.url),
    );
  }

  const { homepage_user_id, email, name } = payload;
  if (!email || !homepage_user_id) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_token", request.url),
    );
  }

  // Supabase Admin 클라이언트
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );

  // 이메일로 기존 사용자 검색
  const { data: users } = await supabase.auth.admin.listUsers();
  const existingUser = users?.users?.find((u) => u.email === email);

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    // 새 사용자 생성 (랜덤 비밀번호, 이메일 확인 완료 처리)
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { full_name: name, homepage_user_id },
      });

    if (createError || !newUser.user) {
      console.error("[auto-login] User creation failed:", createError);
      return NextResponse.redirect(
        new URL("/login?error=create_failed", request.url),
      );
    }
    userId = newUser.user.id;
  }

  // homepage_user_id를 profiles에 저장
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ homepage_user_id })
    .eq("id", userId);
  if (profileError) {
    console.error("[auto-login] profile update error:", profileError.message);
  }

  // 매직 링크 생성으로 자동 로그인
  const { data: linkData, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${request.nextUrl.origin}/auth/callback?redirect=/dashboard`,
      },
    });

  if (linkError || !linkData) {
    console.error("[auto-login] Magic link failed:", linkError);
    return NextResponse.redirect(
      new URL("/login?error=link_failed", request.url),
    );
  }

  // 홈페이지에 사용 기록 콜백 (비동기, 실패해도 무시)
  const homepageUrl = process.env.HOMEPAGE_URL || "https://lbiz-partners.com";
  const callbackToken = crypto
    .createHmac("sha256", secret)
    .update("app-usage-callback")
    .digest("hex");

  fetch(`${homepageUrl}/api/app-usage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${callbackToken}`,
    },
    body: JSON.stringify({
      homepage_user_id,
      app_name: "labor",
      app_user_id: userId,
    }),
  }).catch(() => {});

  // 매직 링크의 토큰 부분 추출하여 verify 엔드포인트로 리다이렉트
  const verifyUrl = new URL(linkData.properties.action_link);
  return NextResponse.redirect(verifyUrl.toString());
}
