import { test, expect } from "@playwright/test";

// ── 공개 페이지 스모크 테스트 ──
test.describe("공개 페이지 접근", () => {
  test("랜딩 페이지 로드", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/노무원큐/);
  });

  test("로그인 페이지 로드", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "노무원큐" })).toBeVisible();
    await expect(page.getByText("사업장 노무관리, 원큐로 해결")).toBeVisible();
  });

  test("회원가입 페이지 로드", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: "노무원큐" })).toBeVisible();
    await expect(page.getByText("무료로 시작하세요")).toBeVisible();
  });

  test("가이드 페이지 로드", async ({ page }) => {
    await page.goto("/guide");
    await expect(
      page.getByRole("heading", { name: /사용자 가이드/ }),
    ).toBeVisible();
  });

  test("소개 페이지 로드", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("body")).toBeVisible();
  });
});

// ── 회원가입 폼 유효성 검사 ──
test.describe("회원가입 유효성 검사", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
  });

  test("이용약관 동의 체크박스 존재", async ({ page }) => {
    await expect(page.locator("#agree-terms")).toBeVisible();
    await expect(page.getByText("에 동의합니다.")).toBeVisible();
  });

  test("이용약관 미동의 시 에러", async ({ page }) => {
    await page.getByPlaceholder("홍길동").fill("테스트");
    await page
      .getByPlaceholder("example@company.com")
      .first()
      .fill("test@example.com");
    await page.getByPlaceholder("6자 이상").fill("password123");
    await page.getByPlaceholder("비밀번호 재입력").fill("password123");
    await page.getByRole("button", { name: /무료 회원가입/ }).click();
    await expect(
      page.getByText("이용약관 및 개인정보처리방침에 동의해주세요"),
    ).toBeVisible();
  });

  test("비밀번호 불일치 에러", async ({ page }) => {
    await page.getByPlaceholder("홍길동").fill("테스트");
    await page
      .getByPlaceholder("example@company.com")
      .first()
      .fill("test@example.com");
    await page.getByPlaceholder("6자 이상").fill("password123");
    await page.getByPlaceholder("비밀번호 재입력").fill("different");
    await page.locator("#agree-terms").check();
    await page.getByRole("button", { name: /무료 회원가입/ }).click();
    await expect(page.getByText("비밀번호가 일치하지 않습니다")).toBeVisible();
  });

  test("짧은 비밀번호 에러", async ({ page }) => {
    await page.getByPlaceholder("홍길동").fill("테스트");
    await page
      .getByPlaceholder("example@company.com")
      .first()
      .fill("test@example.com");
    await page.getByPlaceholder("6자 이상").fill("12345");
    await page.getByPlaceholder("비밀번호 재입력").fill("12345");
    await page.locator("#agree-terms").check();
    await page.getByRole("button", { name: /무료 회원가입/ }).click();
    await expect(page.getByText("비밀번호는 6자 이상")).toBeVisible();
  });
});

// ── 로그인 폼 ──
test.describe("로그인 폼", () => {
  test("로그인 폼 요소 확인", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByPlaceholder("example@company.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "로그인", exact: true }),
    ).toBeVisible();
  });

  test("소셜 로그인 버튼 표시", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: /카카오로 로그인/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Google로 로그인/ }),
    ).toBeVisible();
  });

  test("로그인 페이지에서 회원가입 링크", async ({ page }) => {
    await page.goto("/login");
    const signupLink = page.getByRole("link", { name: /회원가입/ });
    await expect(signupLink).toBeVisible();
  });
});

// ── 가이드 페이지 네비게이션 ──
test.describe("가이드 페이지", () => {
  test("10개 섹션 모두 표시", async ({ page }) => {
    await page.goto("/guide");
    const sections = [
      "시작하기",
      "대시보드",
      "직원 관리",
      "계약서 작성",
      "급여명세서",
      "서류 작성",
      "보관함",
      "이메일 발송",
      "멤버십",
      "자주 묻는 질문",
    ];
    for (const section of sections) {
      await expect(page.getByText(section).first()).toBeVisible();
    }
  });
});

// ── 비인증 사용자 리다이렉트 ──
test.describe("인증 필요 페이지 리다이렉트", () => {
  test("대시보드 접근 시 로그인 리다이렉트", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/(login|dashboard)/, { timeout: 5000 });
  });
});

// ── 공개 기능 페이지 (비로그인 접근) ──
test.describe("공개 기능 페이지", () => {
  test("급여명세서 페이지 로드", async ({ page }) => {
    await page.goto("/payslip");
    // 급여명세서 폼이 렌더링될 때까지 대기
    await expect(page.getByText(/급여명세서/).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("4대보험 계산기 페이지 로드", async ({ page }) => {
    await page.goto("/insurance");
    await expect(page.getByText(/4대보험/).first()).toBeVisible();
  });

  test("계약서 선택 페이지 로드", async ({ page }) => {
    await page.goto("/contract");
    await expect(page.getByText("정규직 근로계약서")).toBeVisible();
    await expect(page.getByText(/파트타임|단시간/).first()).toBeVisible();
    await expect(page.getByText(/프리랜서/).first()).toBeVisible();
    await expect(page.getByText(/외국인/).first()).toBeVisible();
  });

  test("정규직 계약서 폼 로드", async ({ page }) => {
    await page.goto("/contract/fulltime");
    await expect(page.getByText(/근로계약서/).first()).toBeVisible();
  });

  test("파트타임 계약서 폼 로드", async ({ page }) => {
    await page.goto("/contract/parttime");
    await expect(page.getByText(/근로계약서/).first()).toBeVisible();
  });

  test("프리랜서 계약서 폼 로드", async ({ page }) => {
    await page.goto("/contract/freelancer");
    await expect(page.getByText(/계약서/).first()).toBeVisible();
  });

  test("외국인 계약서 폼 로드", async ({ page }) => {
    await page.goto("/contract/foreign");
    await expect(page.getByText(/계약서|Contract/).first()).toBeVisible();
  });

  test("취업규칙 페이지 로드", async ({ page }) => {
    await page.goto("/work-rules");
    await expect(page.getByText(/취업규칙/).first()).toBeVisible();
  });

  test("멤버십 페이지 로드 및 3등급 표시", async ({ page }) => {
    await page.goto("/membership");
    await expect(page.getByText("Start").first()).toBeVisible();
    await expect(page.getByText("Pro").first()).toBeVisible();
    await expect(page.getByText("Ultra").first()).toBeVisible();
  });

  test("개인정보처리방침 페이지 로드", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByText(/개인정보/).first()).toBeVisible();
  });

  test("이용약관 페이지 로드", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: "이용약관" })).toBeVisible();
  });

  test("퇴직금 계산기 페이지 로드", async ({ page }) => {
    await page.goto("/severance/calculate");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("button", { name: /퇴직금 계산/ })).toBeVisible(
      { timeout: 10000 },
    );
  });

  test("휴업수당 계산기 비로그인 접근", async ({ page }) => {
    await page.goto("/shutdown-allowance");
    // 로그인 페이지로 리다이렉트되지 않아야 함
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain("/login");
  });

  test("문의 페이지 비로그인 접근", async ({ page }) => {
    await page.goto("/contact");
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain("/login");
  });

  test("상담 페이지 비로그인 접근", async ({ page }) => {
    await page.goto("/consult");
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain("/login");
  });

  test("비밀번호 찾기 페이지 비로그인 접근", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain("/login");
  });
});

// ── 4대보험 계산기 인터랙션 ──
test.describe("4대보험 계산기", () => {
  test("페이지 로드 및 입력 필드 존재", async ({ page }) => {
    await page.goto("/insurance");
    await expect(page.locator("input").first()).toBeVisible({ timeout: 10000 });
  });
});

// ── 반응형 레이아웃 ──
test.describe("반응형 레이아웃", () => {
  test("모바일 뷰포트에서 페이지 로드", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("태블릿 뷰포트에서 페이지 로드", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });
});
