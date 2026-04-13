import Link from "next/link";
import LandingRedirect from "@/components/LandingRedirect";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingRedirect />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--bg)] to-blue-50">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* 좌: 텍스트 */}
            <div>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-indigo-700 text-sm font-bold mb-6 shadow-md">
                5~50인 소규모 사업장 전용
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-[var(--text)] leading-tight mb-6">
                근로계약서부터 급여명세서까지
                <br />
                <span className="text-[var(--primary)]">30초</span>면 완성
              </h1>
              <p className="text-lg text-[var(--text-muted)] mb-4 leading-relaxed">
                직원 정보 한 번 입력하면 노무서류 30종이 자동으로 채워집니다.
                <br />
                2026년 최저임금·4대보험요율 자동 반영.
              </p>

              {/* 핵심 수치 */}
              <div className="flex gap-6 mb-8">
                <div>
                  <p className="text-2xl font-extrabold text-[var(--primary)]">
                    30종+
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">노무서류</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-[var(--primary)]">
                    30초
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">서류 완성</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-[var(--primary)]">
                    50인
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    사업장 지원
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="https://lbiz-partners.com/api/app-redirect?app=labor"
                  className="px-8 py-4 bg-[var(--primary)] text-white rounded-xl text-lg font-bold hover:opacity-90 transition-opacity shadow-lg text-center"
                >
                  홈페이지에서 시작하기
                </a>
              </div>
            </div>

            {/* 우: 서류 미리보기 목업 */}
            <div className="relative hidden md:block">
              <DocumentMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Before / After */}
      <section className="py-16 bg-[var(--bg-card)]">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[var(--text)] mb-10">
            이렇게 달라집니다
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-red-50 border border-red-200">
              <p className="text-sm font-bold text-red-600 mb-4">
                Before — 기존 방식
              </p>
              <ul className="space-y-3 text-sm text-red-800">
                <li className="flex items-start gap-2">
                  <span>✕</span> 엑셀 양식 찾기 → 30분+
                </li>
                <li className="flex items-start gap-2">
                  <span>✕</span> 4대보험 요율 직접 검색·계산
                </li>
                <li className="flex items-start gap-2">
                  <span>✕</span> 법 개정 때마다 양식 수정
                </li>
                <li className="flex items-start gap-2">
                  <span>✕</span> 직원마다 서류 복사·붙여넣기
                </li>
                <li className="flex items-start gap-2">
                  <span>✕</span> 서류 분실·관리 불가
                </li>
              </ul>
            </div>
            <div className="p-6 rounded-2xl bg-green-50 border border-green-200">
              <p className="text-sm font-bold text-green-600 mb-4">
                After — 노무원큐
              </p>
              <ul className="space-y-3 text-sm text-green-800">
                <li className="flex items-start gap-2">
                  <span>✓</span> 직원 선택 → 서류 자동 완성 30초
                </li>
                <li className="flex items-start gap-2">
                  <span>✓</span> 2026년 요율·최저임금 자동 반영
                </li>
                <li className="flex items-start gap-2">
                  <span>✓</span> 법 개정 시 양식 자동 업데이트
                </li>
                <li className="flex items-start gap-2">
                  <span>✓</span> 30종 서류 원클릭 생성
                </li>
                <li className="flex items-start gap-2">
                  <span>✓</span> 클라우드 보관 + 전자서명
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 상황별 가이드 */}
      <section className="py-16 bg-[var(--bg)]">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[var(--text)] mb-3">
            🎯 어떤 상황인가요?
          </h2>
          <p className="text-center text-[var(--text-muted)] mb-10">
            상황에 맞는 서류를 순서대로 안내합니다
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <div className="text-4xl mb-3">👋</div>
              <h3 className="text-lg font-bold text-emerald-900 mb-2">
                직원을 새로 뽑았어요
              </h3>
              <ol className="space-y-2 text-sm text-emerald-800">
                <li className="flex gap-2">
                  <span className="font-bold text-emerald-600">1.</span>{" "}
                  <Link href="/employees" className="hover:underline">
                    직원 등록
                  </Link>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-emerald-600">2.</span>{" "}
                  <Link href="/contract/fulltime" className="hover:underline">
                    근로계약서 작성
                  </Link>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-emerald-600">3.</span>{" "}
                  <Link
                    href="/documents/privacy-consent"
                    className="hover:underline"
                  >
                    개인정보 동의서
                  </Link>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-emerald-600">4.</span>{" "}
                  <Link href="/documents/nda" className="hover:underline">
                    비밀유지 서약서
                  </Link>
                </li>
              </ol>
            </div>
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="text-lg font-bold text-blue-900 mb-2">
                월급을 줘야 해요
              </h3>
              <ol className="space-y-2 text-sm text-blue-800">
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600">1.</span>{" "}
                  <Link href="/insurance" className="hover:underline">
                    4대보험 계산
                  </Link>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600">2.</span>{" "}
                  <Link href="/payslip" className="hover:underline">
                    급여명세서 작성
                  </Link>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600">3.</span>{" "}
                  <Link href="/wage-ledger" className="hover:underline">
                    임금대장 기록
                  </Link>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600">4.</span>{" "}
                  <Link href="/work-rules" className="hover:underline">
                    취업규칙 확인
                  </Link>
                </li>
              </ol>
            </div>
            <div className="p-6 bg-red-50 border border-red-200 rounded-2xl">
              <div className="text-4xl mb-3">🚪</div>
              <h3 className="text-lg font-bold text-red-900 mb-2">
                직원이 그만둬요
              </h3>
              <ol className="space-y-2 text-sm text-red-800">
                <li className="flex gap-2">
                  <span className="font-bold text-red-600">1.</span>{" "}
                  <Link href="/terminate" className="hover:underline">
                    퇴직 처리 가이드
                  </Link>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-red-600">2.</span>{" "}
                  <Link
                    href="/documents/resignation"
                    className="hover:underline"
                  >
                    사직서
                  </Link>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-red-600">3.</span>{" "}
                  <Link href="/severance/calculate" className="hover:underline">
                    퇴직금 계산
                  </Link>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-red-600">4.</span>{" "}
                  <Link
                    href="/documents/career-certificate"
                    className="hover:underline"
                  >
                    경력증명서 발급
                  </Link>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-[var(--bg-card)]">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-[var(--text)] mb-4">
            왜 노무원큐인가요?
          </h2>
          <p className="text-center text-[var(--text-muted)] mb-12">
            복잡한 노무관리, 더 이상 엑셀로 하지 마세요
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon="⚡"
              title="30초 만에 서류 완성"
              desc="직원 정보 한 번 입력하면 근로계약서부터 퇴직금정산까지 자동 생성됩니다."
            />
            <FeatureCard
              icon="🔒"
              title="사업장별 안전한 관리"
              desc="로그인 기반 사업장 격리. 우리 회사 데이터는 우리만 접근할 수 있습니다."
            />
            <FeatureCard
              icon="📱"
              title="모바일에서도 OK"
              desc="PC, 태블릿, 스마트폰 어디서든 노무서류를 작성하고 관리하세요."
            />
            <FeatureCard
              icon="💰"
              title="급여 자동 계산"
              desc="2026년 4대보험요율, 최저임금 자동 반영. 비과세 항목 최적화까지."
            />
            <FeatureCard
              icon="📋"
              title="30종+ 노무서류"
              desc="근로계약서, 급여명세서, 취업규칙, 징계서류 등 필요한 서류를 한곳에서."
            />
            <FeatureCard
              icon="🏛️"
              title="노무사·세무사 연계"
              desc="엘비즈파트너스 제휴 전문가에게 유료 상담을 신청할 수 있습니다."
            />
          </div>
        </div>
      </section>

      {/* 서류 카테고리 미리보기 */}
      <section className="py-20 bg-[var(--bg-card)]">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-[var(--text)] mb-4">
            30종+ 노무서류, 한눈에
          </h2>
          <p className="text-center text-[var(--text-muted)] mb-12">
            필요한 서류를 카테고리별로 빠르게 찾으세요
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <CategoryCard
              emoji="📋"
              title="계약서"
              items={[
                "정규직 근로계약서",
                "파트타임 계약서",
                "프리랜서 계약서",
                "외국인 근로계약서",
              ]}
            />
            <CategoryCard
              emoji="💵"
              title="급여/임금"
              items={["급여명세서", "임금대장", "퇴직금정산서"]}
            />
            <CategoryCard
              emoji="📜"
              title="증명서"
              items={["재직증명서", "경력증명서"]}
            />
            <CategoryCard
              emoji="🏖️"
              title="휴가/휴직"
              items={["연차관리대장", "연차촉진통보서", "휴직신청서"]}
            />
            <CategoryCard
              emoji="⚠️"
              title="징계/해고"
              items={["경고장", "징계통보서", "해고통보서"]}
            />
            <CategoryCard
              emoji="📄"
              title="서약/동의"
              items={["개인정보동의서", "비밀유지서약서", "서약서"]}
            />
          </div>
          <p className="text-center text-sm text-[var(--text-muted)] mt-6">
            이 외에도 인사카드, 수습평가서, 업무인수인계서 등 다양한 서류를
            지원합니다.
          </p>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-[var(--bg)]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-[var(--text)] mb-10">
            이런 분들이 사용합니다
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="엑셀로 근로계약서 쓰던 시간이 절반 이하로 줄었어요. 직원 10명 넘으면 이런 거 필수입니다."
              author="음식점 대표"
              role="직원 12명"
            />
            <TestimonialCard
              quote="4대보험 요율을 매년 찾아보느라 시간 허비했는데, 자동 반영되니까 편합니다."
              author="제조업 사무장"
              role="직원 35명"
            />
            <TestimonialCard
              quote="파트타임 직원 계약서를 간편하게 만들 수 있어서 좋아요. 모바일로도 되고요."
              author="카페 점주"
              role="직원 5명"
            />
          </div>
        </div>
      </section>

      {/* 주요 기능 안내 */}
      <section className="py-20 bg-[var(--bg-card)]">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-[var(--text)] mb-4">
            모든 기능을 바로 이용하세요
          </h2>
          <p className="text-[var(--text-muted)] mb-8">
            별도 등급 구분 없이, 가입 즉시 전체 기능을 사용할 수 있습니다.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-sm">
            {[
              "직원 50명까지 등록",
              "노무서류 30종+",
              "PDF 다운로드",
              "전자서명",
              "서류 보관함",
              "계약만료·연차 알림",
            ].map((f) => (
              <div
                key={f}
                className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
              >
                <span className="text-green-500">✓</span>
                <span className="text-[var(--text)]">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[var(--primary)] text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">지금 바로 시작하세요</h2>
          <p className="text-lg opacity-80 mb-8">
            가입 후 30초면 첫 번째 서류를 만들 수 있습니다
          </p>
          <a
            href="https://lbiz-partners.com/api/app-redirect?app=labor"
            className="inline-block px-8 py-4 bg-[var(--bg-card)] text-[var(--primary)] rounded-xl text-lg font-bold hover:opacity-90 transition-opacity"
          >
            홈페이지에서 회원가입 →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[var(--bg)] border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-[var(--text-muted)]">
          <p className="mb-2">
            <strong>노무원큐</strong> by{" "}
            <a
              href="https://lbiz-partners.com"
              className="text-[var(--primary)] hover:underline"
              target="_blank"
            >
              엘비즈파트너스
            </a>
          </p>
          <p>
            본 서비스의 문서 양식은 참고용이며, 법적 효력은 관할 기관 및 전문가
            확인이 필요합니다.
          </p>
          <p className="mt-2">
            <Link
              href="/privacy"
              className="text-[var(--text-muted)] hover:text-[var(--primary)] hover:underline"
            >
              개인정보처리방침
            </Link>
            <span className="mx-2">|</span>
            <Link
              href="/terms"
              className="text-[var(--text-muted)] hover:text-[var(--primary)] hover:underline"
            >
              이용약관
            </Link>
          </p>
          <p className="mt-1">© 2026 엘비즈파트너스. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

/* ─── 서류 미리보기 목업 (CSS only) ─── */
function DocumentMockup() {
  return (
    <div className="relative">
      {/* 뒷 카드: 급여명세서 */}
      <div className="absolute -right-4 -top-4 w-72 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-md p-5 rotate-3 opacity-80">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">💰</span>
          <span className="text-xs font-bold text-[var(--text-muted)]">
            급여명세서
          </span>
        </div>
        <div className="space-y-2">
          <div className="h-2.5 bg-[var(--bg)] rounded w-full" />
          <div className="h-2.5 bg-[var(--bg)] rounded w-3/4" />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="h-8 bg-blue-50 rounded" />
            <div className="h-8 bg-blue-50 rounded" />
            <div className="h-8 bg-green-50 rounded" />
            <div className="h-8 bg-red-50 rounded" />
          </div>
        </div>
      </div>

      {/* 앞 카드: 근로계약서 */}
      <div className="relative w-80 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-xl p-6 -rotate-2 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <span className="text-sm font-bold text-[var(--text)]">
              근로계약서
            </span>
          </div>
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
            자동 완성
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between py-1.5 border-b border-[var(--border-light)]">
            <span className="text-[var(--text-muted)]">사업장</span>
            <span className="font-medium text-[var(--text)]">(주)우리회사</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[var(--border-light)]">
            <span className="text-[var(--text-muted)]">근로자</span>
            <span className="font-medium text-[var(--text)]">홍길동</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[var(--border-light)]">
            <span className="text-[var(--text-muted)]">계약기간</span>
            <span className="font-medium text-[var(--text)]">2026.03.01 ~</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[var(--border-light)]">
            <span className="text-[var(--text-muted)]">월 급여</span>
            <span className="font-medium text-[var(--primary)]">
              3,200,000원
            </span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-[var(--text-muted)]">4대보험</span>
            <span className="font-medium text-green-600">자동 계산됨</span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <div className="flex-1 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-lg text-center">
            PDF 저장
          </div>
          <div className="flex-1 py-2 bg-[var(--bg)] text-[var(--text)] text-xs font-medium rounded-lg text-center border border-[var(--border)]">
            인쇄
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 컴포넌트 ─── */
function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-6 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-[var(--text)] mb-2">{title}</h3>
      <p className="text-[var(--text-muted)] text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function CategoryCard({
  emoji,
  title,
  items,
}: {
  emoji: string;
  title: string;
  items: string[];
}) {
  return (
    <div className="p-5 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{emoji}</span>
        <span className="font-bold text-[var(--text)]">{title}</span>
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li
            key={i}
            className="text-sm text-[var(--text-muted)] flex items-center gap-1.5"
          >
            <span className="w-1 h-1 bg-[var(--primary)] rounded-full flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TestimonialCard({
  quote,
  author,
  role,
}: {
  quote: string;
  author: string;
  role: string;
}) {
  return (
    <div className="p-6 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]">
      <p className="text-sm text-[var(--text)] leading-relaxed mb-4">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-bold">
          {author[0]}
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text)]">{author}</p>
          <p className="text-xs text-[var(--text-muted)]">{role}</p>
        </div>
      </div>
    </div>
  );
}
