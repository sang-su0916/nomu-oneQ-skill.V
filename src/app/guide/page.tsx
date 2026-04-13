"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";

const SECTIONS = [
  { id: "quickstart", icon: "⚡", title: "빠른 시작 (초보용)" },
  { id: "start", icon: "🚀", title: "시작하기" },
  { id: "dashboard", icon: "📊", title: "대시보드" },
  { id: "employees", icon: "👥", title: "직원 관리" },
  { id: "contracts", icon: "📝", title: "계약서 작성" },
  { id: "payslip", icon: "💰", title: "급여명세서" },
  { id: "insurance", icon: "🏥", title: "4대보험 계산기" },
  { id: "severance", icon: "💼", title: "퇴직금 계산기" },
  { id: "convert", icon: "🔄", title: "근로형태 전환" },
  { id: "shutdown", icon: "🏭", title: "휴업수당 계산기" },
  { id: "work-rules", icon: "📋", title: "취업규칙 점검" },
  { id: "documents", icon: "📄", title: "서류 작성" },
  { id: "archive", icon: "🗄️", title: "보관함" },
  { id: "email", icon: "📧", title: "이메일 발송" },
  { id: "membership", icon: "🔑", title: "멤버십" },
  { id: "faq", icon: "❓", title: "자주 묻는 질문" },
] as const;

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState("start");
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb items={[{ label: "사용자 가이드" }]} />

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
            📖 노무원큐 사용자 가이드
          </h1>
          <p className="text-[var(--text-muted)]">
            소규모 사업장을 위한 노무관리 솔루션, 노무원큐의 모든 기능을
            안내합니다.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--primary)] transition-colors print:hidden"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          PDF 저장
        </button>
      </div>

      <div className="flex gap-8">
        {/* 좌측 네비게이션 (데스크톱) */}
        <nav className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-24 space-y-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === s.id
                    ? "bg-[var(--primary)] text-white font-semibold"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
                }`}
              >
                {s.icon} {s.title}
              </button>
            ))}
          </div>
        </nav>

        {/* 모바일 탭 */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-card)] border-t border-[var(--border)] overflow-x-auto">
          <div className="flex gap-1 px-2 py-2">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${
                  activeSection === s.id
                    ? "bg-[var(--primary)] text-white font-semibold"
                    : "bg-[var(--bg)] text-[var(--text-muted)]"
                }`}
              >
                {s.icon} {s.title}
              </button>
            ))}
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div ref={contentRef} className="flex-1 space-y-12 pb-20 lg:pb-8">
          {/* 초보 사장님 빠른 시작 */}
          <section id="quickstart">
            <SectionHeader
              icon="⚡"
              title="빠른 시작 가이드"
              subtitle="노무를 몰라도 10분이면 첫 계약서를 만들 수 있습니다"
            />

            <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 mb-6">
              <p className="text-sm text-blue-800 mb-4">
                이런 분을 위한 가이드입니다: 처음 직원을 뽑은 사장님,
                근로계약서를 어떻게 쓰는지 모르는 분, 4대보험이 얼마인지 모르는
                분
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {[
                  {
                    step: "①",
                    title: "회원가입",
                    time: "1분",
                    desc: "엘비즈파트너스 홈페이지에서 가입",
                  },
                  {
                    step: "②",
                    title: "사업장 등록",
                    time: "2분",
                    desc: "상호·대표자·사업자번호 입력",
                  },
                  {
                    step: "③",
                    title: "직원 등록",
                    time: "3분",
                    desc: "이름·급여·입사일 → 30종 서류 자동 연동",
                  },
                  {
                    step: "④",
                    title: "서류 작성",
                    time: "1분",
                    desc: "직원 선택하면 자동 완성!",
                  },
                ].map((s) => (
                  <div
                    key={s.step}
                    className="p-3 bg-white rounded-lg border border-blue-100"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-blue-600">
                        {s.step}
                      </span>
                      <span className="text-xs text-blue-500">{s.time}</span>
                    </div>
                    <p className="text-sm font-semibold text-[var(--text)]">
                      {s.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {s.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 핵심: 총 급여 자동 분배 */}
            <div className="guide-card mb-6">
              <h3 className="font-semibold text-[var(--text)] mb-3">
                💰 급여 입력은 이렇게 하세요
              </h3>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200 mb-3">
                <p className="text-sm text-green-800 mb-2">
                  <strong>총 급여만 입력하면 됩니다.</strong> 기본급/식대 구분은
                  자동으로!
                </p>
                <div className="bg-white p-3 rounded border text-sm font-mono">
                  <p>월 260만원 입력 →</p>
                  <p className="mt-1">
                    기본급 (과세): <strong>2,400,000원</strong>
                  </p>
                  <p>
                    식대 (비과세):{" "}
                    <strong className="text-green-600">200,000원</strong> ←
                    4대보험 안 붙는 부분
                  </p>
                </div>
                <p className="text-xs text-green-700 mt-2">
                  비과세 항목(차량, 6세 이하 자녀, 연구원)에 체크하면 더 많이
                  절감됩니다.
                </p>
              </div>
            </div>

            {/* 상황별 가이드 */}
            <div className="guide-card">
              <h3 className="font-semibold text-[var(--text)] mb-3">
                📋 이런 상황이면 이렇게 하세요
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="font-semibold text-emerald-900 mb-2">
                    👋 직원을 새로 뽑았어요
                  </p>
                  <ol className="text-sm text-emerald-800 space-y-1">
                    <li>
                      1.{" "}
                      <Link href="/employees" className="underline">
                        직원 등록
                      </Link>
                    </li>
                    <li>
                      2.{" "}
                      <Link href="/contract/fulltime" className="underline">
                        근로계약서 작성
                      </Link>
                    </li>
                    <li>
                      3.{" "}
                      <Link
                        href="/documents/privacy-consent"
                        className="underline"
                      >
                        개인정보 동의서
                      </Link>
                    </li>
                  </ol>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-semibold text-blue-900 mb-2">
                    💰 월급을 줘야 해요
                  </p>
                  <ol className="text-sm text-blue-800 space-y-1">
                    <li>
                      1.{" "}
                      <Link href="/payslip" className="underline">
                        급여명세서 작성
                      </Link>
                    </li>
                    <li>
                      2.{" "}
                      <Link href="/wage-ledger" className="underline">
                        임금대장 기록
                      </Link>
                    </li>
                    <li>
                      3.{" "}
                      <Link href="/insurance" className="underline">
                        4대보험 확인
                      </Link>
                    </li>
                  </ol>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="font-semibold text-red-900 mb-2">
                    🚪 직원이 그만둬요
                  </p>
                  <ol className="text-sm text-red-800 space-y-1">
                    <li>
                      1.{" "}
                      <Link href="/severance/calculate" className="underline">
                        퇴직금 계산
                      </Link>
                    </li>
                    <li>
                      2.{" "}
                      <Link href="/documents/resignation" className="underline">
                        사직서
                      </Link>
                    </li>
                    <li>
                      3.{" "}
                      <Link
                        href="/documents/career-certificate"
                        className="underline"
                      >
                        경력증명서
                      </Link>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </section>

          {/* 시작하기 */}
          <section id="start">
            <SectionHeader
              icon="🚀"
              title="시작하기"
              subtitle="3단계로 노무관리를 시작하세요"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <StepCard step={1} title="회원가입 & 사업장 등록" color="blue">
                <p>
                  <a
                    href="https://lbiz-partners.com/signup"
                    className="text-blue-600 underline font-semibold"
                  >
                    엘비즈파트너스 홈페이지
                  </a>
                  에서 가입한 뒤 <strong>온보딩 화면</strong>에서 사업장 정보를
                  입력합니다.
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• 사업장명, 사업자등록번호</li>
                  <li>• 대표자명, 주소, 연락처</li>
                </ul>
              </StepCard>
              <StepCard step={2} title="첫 직원 등록" color="indigo">
                <p>
                  온보딩 2단계에서 첫 직원을 간편하게 등록합니다. (나중에 해도
                  됩니다)
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• 이름, 입사일, 고용유형, 급여</li>
                  <li>• 나머지 정보는 이후 추가 가능</li>
                </ul>
              </StepCard>
              <StepCard step={3} title="서류 작성 & 관리" color="green">
                <p>
                  계약서, 급여명세서 등 30종+ 서류를 <strong>자동 입력</strong>
                  으로 작성합니다.
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• 등록 직원 선택 → 자동 채워짐</li>
                  <li>• 미리보기 → 인쇄/PDF → 보관함 저장</li>
                </ul>
              </StepCard>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
              <strong>회원 전용 서비스:</strong>{" "}
              <a
                href="https://lbiz-partners.com/signup"
                className="text-blue-600 underline"
              >
                엘비즈파트너스 홈페이지
              </a>
              에서 회원가입 후 모든 기능을 이용하실 수 있습니다.
            </div>
          </section>

          {/* 대시보드 */}
          <section id="dashboard">
            <SectionHeader
              icon="📊"
              title="대시보드"
              subtitle="한눈에 보는 사업장 현황"
            />
            <div className="guide-card">
              <p>
                <Link
                  href="/dashboard"
                  className="text-[var(--primary)] underline"
                >
                  대시보드
                </Link>
                에 접속하면 다음 정보를 확인할 수 있습니다:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <InfoBox
                  title="통계 카드"
                  items={[
                    "재직 직원 수",
                    "퇴사 직원 수",
                    "보관 서류 수",
                    "계약만료 임박 알림",
                    "무기계약 전환 대상 알림",
                  ]}
                />
                <InfoBox
                  title="자동 알림"
                  items={[
                    "계약 만료 60일 전부터 경고",
                    "갱신 거부 시 30일 전 통보 기한 안내 (기간제법 제17조)",
                    "파트타임·프리랜서 2년 도래 시 무기계약 전환 알림 (기간제법 제4조)",
                  ]}
                />
                <InfoBox
                  title="위젯"
                  items={[
                    "자주 쓰는 서류 바로가기",
                    "최근 작업 내역",
                    "시작 가이드 (첫 로그인 시)",
                  ]}
                />
              </div>
            </div>
          </section>

          {/* 직원 관리 */}
          <section id="employees">
            <SectionHeader
              icon="👥"
              title="직원 관리"
              subtitle="직원 정보를 등록하고 관리합니다"
            />
            <div className="guide-card">
              <h3 className="font-semibold text-[var(--text)] mb-3">
                주요 기능
              </h3>
              <div className="space-y-3">
                <Feature
                  title="직원 등록"
                  desc="이름, 생년월일, 연락처, 부서, 직위, 입사일, 급여 정보를 입력합니다. 주민등록번호는 암호화되어 저장됩니다."
                />
                <Feature
                  title="직원 선택 자동 입력"
                  desc="서류 작성 시 '등록된 직원에서 선택'을 누르면 이름, 급여 등 모든 정보가 자동으로 채워집니다."
                />
                <Feature
                  title="상태 관리"
                  desc="재직/퇴직 상태를 관리하고, 퇴직 처리 시 퇴직금 정산까지 안내합니다."
                />
              </div>
              <LinkButton href="/employees" label="직원 관리 바로가기" />
            </div>
          </section>

          {/* 계약서 */}
          <section id="contracts">
            <SectionHeader
              icon="📝"
              title="계약서 작성"
              subtitle="4종 계약서를 법률 기준에 맞게 작성합니다"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ContractCard
                href="/contract/fulltime"
                title="정규직 근로계약서"
                desc="근로기준법 제17조 필수 명시사항을 모두 포함합니다."
                features={[
                  "수습기간 설정",
                  "요일별 근로시간",
                  "연봉 → 월급 자동 계산",
                  "업종별 프리셋",
                ]}
              />
              <ContractCard
                href="/contract/parttime"
                title="단시간(파트타임) 계약서"
                desc="주 40시간 미만 단시간 근로자 전용 계약서입니다."
                features={[
                  "시급/일급 자동 환산",
                  "주휴수당 자동 계산",
                  "4대보험 적용 여부",
                ]}
              />
              <ContractCard
                href="/contract/freelancer"
                title="프리랜서 계약서"
                desc="업무위탁(용역) 계약서로, 근로자가 아닌 사업자 간 계약입니다."
                features={[
                  "계약금/중도금/잔금 분할",
                  "저작권 귀속 설정",
                  "비밀유지 조항",
                ]}
              />
              <ContractCard
                href="/contract/foreign"
                title="외국인 근로계약서"
                desc="외국인고용법 제11조 준수, 8개 언어 병기를 지원합니다."
                features={[
                  "비자 유형 선택",
                  "출국만기/귀국비용보험",
                  "다국어 병기 (베트남어, 중국어 등)",
                  "숙소 제공 조건",
                ]}
              />
            </div>

            <div className="guide-card mt-4">
              <h3 className="font-semibold text-[var(--text)] mb-2">
                공통 기능
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="p-3 bg-[var(--bg)] rounded-lg">
                  <p className="font-medium">📋 자동저장</p>
                  <p className="text-[var(--text-muted)] mt-1">
                    입력 중 데이터가 자동으로 저장되어 브라우저를 닫아도
                    복원됩니다.
                  </p>
                </div>
                <div className="p-3 bg-[var(--bg)] rounded-lg">
                  <p className="font-medium">✍️ 전자서명</p>
                  <p className="text-[var(--text-muted)] mt-1">
                    사업주와 근로자 서명을 미리보기/출력에 포함합니다.
                  </p>
                </div>
                <div className="p-3 bg-[var(--bg)] rounded-lg">
                  <p className="font-medium">🏭 업종별 프리셋</p>
                  <p className="text-[var(--text-muted)] mt-1">
                    음식점, 소매업, 제조업, IT 업종에 맞는 초기값을 제공합니다.
                  </p>
                </div>
                <div className="p-3 bg-[var(--bg)] rounded-lg">
                  <p className="font-medium">
                    📱 데스크톱 스텝 / 모바일 위자드
                  </p>
                  <p className="text-[var(--text-muted)] mt-1">
                    긴 폼을 단계별로 나눠서 작성합니다. 모바일에서는 프로그레스
                    바와 도움말이 함께 표시됩니다.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 급여명세서 */}
          <section id="payslip">
            <SectionHeader
              icon="💰"
              title="급여명세서"
              subtitle="법정 필수기재사항을 포함한 급여명세서를 작성합니다"
            />
            <div className="guide-card">
              <div className="space-y-3">
                <Feature
                  title="간편 모드 / 상세 모드"
                  desc="간편 모드는 기본급·식대·교통비·연장/야간수당 5개 항목만 표시합니다. 상세 모드에서는 근로시간, 부양가족, 추가수당까지 설정합니다."
                />
                <Feature
                  title="4대보험·세금 자동 계산"
                  desc="2026년 기준 국민연금(4.75%), 건강보험(3.595%), 장기요양(13.14%), 고용보험(0.9%), 소득세, 지방소득세를 자동 계산합니다."
                />
                <Feature
                  title="통상시급 자동 산정"
                  desc="기본급 + 고정수당(식대, 직책수당 등)을 기준으로 통상시급을 자동 산정하고, 연장·야간·휴일 수당을 법정 가산율로 계산합니다."
                />
                <Feature
                  title="주 52시간 연장근로 경고"
                  desc="월 연장근로시간이 법정 한도(주 12시간 = 월 약 52시간)에 근접하거나 초과하면 자동으로 경고 메시지가 표시됩니다. 위반 시 벌칙도 안내합니다."
                />
                <Feature
                  title="5인 미만 사업장 지원"
                  desc="5인 미만 사업장은 가산수당 법적 의무가 없지만, 자발적 지급을 위한 자동계산 옵션을 제공합니다."
                />
              </div>
              <LinkButton href="/payslip" label="급여명세서 바로가기" />
            </div>
          </section>

          {/* 4대보험 계산기 */}
          <section id="insurance">
            <SectionHeader
              icon="🏥"
              title="4대보험 계산기"
              subtitle="직원 한 명당 보험료가 얼마인지 바로 확인하세요"
            />
            <div className="guide-card">
              <p className="text-sm text-[var(--text-muted)] mb-4">
                직원을 고용하면 국민연금, 건강보험, 고용보험, 산재보험 — 이 네
                가지 보험에 가입해야 합니다. 보험료는 근로자와 사업주가 나눠
                부담하는데, 각각 얼마씩인지 한눈에 계산해줍니다.
              </p>

              <h3 className="font-semibold text-[var(--text)] mb-3">
                사용 방법
              </h3>
              <div className="space-y-3 mb-6">
                <Feature
                  title="① 월 기본급 입력"
                  desc="직원에게 매달 지급하는 기본급을 입력합니다. 예: 300만원"
                />
                <Feature
                  title="② 식대 선택"
                  desc="비과세 식대(월 20만원까지)를 설정합니다. 식대는 보험료 계산에서 빠지므로 정확히 입력하세요."
                />
                <Feature
                  title="③ 사업장 규모 선택"
                  desc="직원 수에 따라 고용보험 사업주 부담률이 달라집니다. 우리 회사에 맞는 규모를 선택하세요."
                />
                <Feature
                  title="④ 업종 선택 (산재보험)"
                  desc="업종에 따라 산재보험 요율이 다릅니다. 우리 업종을 선택하거나, 정확한 요율을 알면 '직접 입력'을 선택하세요."
                />
              </div>

              <h3 className="font-semibold text-[var(--text)] mb-3">
                결과 화면에서 확인할 수 있는 것
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-[var(--bg)] rounded-lg">
                  <p className="font-medium text-sm">👤 근로자 부담</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    직원 급여에서 공제되는 금액 (국민연금, 건강보험, 장기요양,
                    고용보험)
                  </p>
                </div>
                <div className="p-3 bg-[var(--bg)] rounded-lg">
                  <p className="font-medium text-sm">🏢 사업주 부담</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    사업주가 별도로 납부하는 금액 (위 4개 + 산재보험)
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800 mb-4">
                <strong>알아두세요:</strong> 산재보험은 사업주만 부담합니다.
                같은 업종이라도 사업장 재해율에 따라 요율이 ±40%까지 조정될 수
                있습니다. 정확한 요율은 <strong>고용산재 토탈서비스</strong>나
                근로복지공단 고지서에서 확인하세요.
              </div>

              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 text-sm text-orange-800 mb-4">
                <strong>산재 발생 시 대응 가이드:</strong> 계산기 하단에
                산업재해 발생 시 즉시 조치사항, 신고 절차, 급여
                종류(요양·휴업·장해·유족급여), 신청 방법을 정리해두었습니다.
                평소에 한 번 읽어두시면 긴급 상황에서 당황하지 않습니다.
              </div>

              <LinkButton href="/insurance" label="4대보험 계산기 바로가기" />
            </div>
          </section>

          {/* 퇴직금 계산기 */}
          <section id="severance">
            <SectionHeader
              icon="💼"
              title="퇴직금 계산기"
              subtitle="직원이 퇴직할 때 지급해야 할 퇴직금을 계산합니다"
            />
            <div className="guide-card">
              <p className="text-sm text-[var(--text-muted)] mb-4">
                1년 이상 근무한 직원이 퇴사하면 퇴직금을 지급해야 합니다.
                퇴직금은{" "}
                <strong>퇴직 전 3개월 평균임금 × 30일 × 근속연수</strong>로
                계산됩니다.
              </p>

              <h3 className="font-semibold text-[var(--text)] mb-3">
                두 가지 사용 방법
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-semibold text-blue-800 text-sm mb-2">
                    🔓 빠른 계산 (로그인 불필요)
                  </p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• 입사일, 퇴직일, 월 평균임금만 입력</li>
                    <li>• 회원가입 없이 바로 계산 가능</li>
                    <li>• 대략적인 퇴직금을 빠르게 확인할 때 유용</li>
                  </ul>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <p className="font-semibold text-indigo-800 text-sm mb-2">
                    🔐 상세 계산 (로그인 필요)
                  </p>
                  <ul className="text-xs text-indigo-700 space-y-1">
                    <li>• 등록된 직원을 선택하면 급여 데이터 자동 반영</li>
                    <li>• 기본급, 고정수당, 상여금, 연장근로수당 구분 계산</li>
                    <li>• 중간정산, 임금체불 기간 등 상세 옵션 지원</li>
                  </ul>
                </div>
              </div>

              <h3 className="font-semibold text-[var(--text)] mb-3">
                주요 기능
              </h3>
              <div className="space-y-3 mb-4">
                <Feature
                  title="평균임금 vs 통상임금 자동 비교"
                  desc="법에 따라 평균임금이 통상임금보다 낮으면 통상임금으로 퇴직금을 계산합니다. 시스템이 자동으로 비교하여 근로자에게 유리한 금액을 적용합니다."
                />
                <Feature
                  title="최저임금 위반 경고"
                  desc="입력한 급여가 최저임금에 미달하면 경고 메시지를 표시합니다."
                />
                <Feature
                  title="중간정산"
                  desc="퇴직 전이라도 1년 이상 근속한 직원은 퇴직금 중간정산을 신청할 수 있습니다."
                />
                <Feature
                  title="계산 결과 상세 내역"
                  desc="1일 평균임금, 근속일수, 3개월 임금 총액, 계산 과정을 단계별로 보여줍니다."
                />
              </div>

              <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-sm text-green-800">
                <strong>Tip:</strong> 퇴직금 계산 후{" "}
                <Link
                  href="/documents/settlement"
                  className="text-green-700 underline font-medium"
                >
                  퇴직 통합 정산서
                </Link>
                를 작성하면 연차수당, 상여금 등을 포함한 최종 정산 금액을 한
                장으로 정리할 수 있습니다.
              </div>

              <LinkButton
                href="/severance/calculate"
                label="퇴직금 계산기 바로가기"
              />
            </div>
          </section>

          {/* 근로형태 전환 */}
          <section id="convert">
            <SectionHeader
              icon="🔄"
              title="근로형태 전환"
              subtitle="정규직을 파트타임으로 전환할 때 필요한 모든 것을 안내합니다"
            />
            <div className="guide-card">
              <p className="text-sm text-[var(--text-muted)] mb-4">
                정규직(풀타임) 직원을 파트타임으로 전환하면 급여, 근무시간,
                4대보험, 연차 등 여러 가지가 바뀝니다. 이 도구는{" "}
                <strong>5단계</strong>로 전환에 필요한 비교 분석과 서류 작성을
                한 번에 도와줍니다.
              </p>

              <h3 className="font-semibold text-[var(--text)] mb-3">
                5단계 진행 과정
              </h3>
              <div className="space-y-3 mb-6">
                <div className="flex gap-3 items-start">
                  <span className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </span>
                  <div>
                    <p className="font-medium text-[var(--text)]">직원 선택</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      전환할 정규직 직원을 선택합니다. 현재 월급과 근무시간이
                      자동으로 불러와집니다.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </span>
                  <div>
                    <p className="font-medium text-[var(--text)]">
                      새 근무 조건 설정
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      전환 시행일, 주당 근무시간, 근무 요일, 시급을 입력합니다.
                      미사용 연차가 있으면 현금 정산할지, 이월할지 선택할 수
                      있습니다.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    3
                  </span>
                  <div>
                    <p className="font-medium text-[var(--text)]">
                      전환 전/후 비교 분석
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      월 급여, 4대보험, 실수령액이 전환 전후로 어떻게 달라지는지
                      표로 한눈에 비교합니다.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    4
                  </span>
                  <div>
                    <p className="font-medium text-[var(--text)]">
                      필요 서류 안내
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      근무시간변경합의서, 파트타임 근로계약서, 4대보험 변경 신고
                      — 필요한 서류를 바로 작성할 수 있도록 링크를 제공합니다.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    5
                  </span>
                  <div>
                    <p className="font-medium text-[var(--text)]">전환 요약</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      대상 직원, 전환일, 급여 변화, 연차 정산 내역 등 전체
                      내용을 정리한 요약을 확인하고 인쇄할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800 mb-4">
                <strong>중요:</strong> 근로조건을 불리하게 변경하는 것이므로
                반드시 <strong>근로자의 서면 동의</strong>가 필요합니다
                (근로기준법 제94조). 합의서에 서명을 꼭 받으세요.
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
                <strong>연차 정산이란?</strong> 전환 시점에 남은 연차휴가를
                돈으로 정산하는 것입니다. 예를 들어 연차가 5일 남아 있고
                일평균임금이 10만원이면, 50만원을 전환일 급여에 포함하여
                지급합니다.
              </div>

              <LinkButton href="/convert" label="근로형태 전환 바로가기" />
            </div>
          </section>

          {/* 휴업수당 계산기 */}
          <section id="shutdown">
            <SectionHeader
              icon="🏭"
              title="휴업수당 계산기"
              subtitle="경영 악화 등으로 휴업할 때 지급해야 할 수당을 계산합니다"
            />
            <div className="guide-card">
              <p className="text-sm text-[var(--text-muted)] mb-4">
                사업이 일시적으로 어려워져 직원을 쉬게 하거나 근무시간을 줄여야
                할 때가 있습니다. 이때 사업주는 직원에게{" "}
                <strong>평균임금의 70% 이상</strong>을 휴업수당으로 지급해야
                합니다 (근로기준법 제46조).
              </p>

              <h3 className="font-semibold text-[var(--text)] mb-3">
                두 가지 상황
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="font-semibold text-red-800 text-sm mb-2">
                    전일 휴업 (하루 종일 쉬는 경우)
                  </p>
                  <ul className="text-xs text-red-700 space-y-1">
                    <li>• 공장 가동 중단, 매장 임시 휴업 등</li>
                    <li>• 쉬는 날 수만큼 휴업수당 지급</li>
                    <li>• 계산: 1일 평균임금 × 70% × 휴업일수</li>
                  </ul>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="font-semibold text-amber-800 text-sm mb-2">
                    단축 근무 (시간을 줄이는 경우)
                  </p>
                  <ul className="text-xs text-amber-700 space-y-1">
                    <li>• 8시간 → 4시간으로 줄이는 등</li>
                    <li>• 일한 시간의 임금 + 못 일한 시간의 70%</li>
                    <li>
                      • 단, 일한 시간 임금이 평균임금의 70% 이상이면 추가 지급
                      없음
                    </li>
                  </ul>
                </div>
              </div>

              <h3 className="font-semibold text-[var(--text)] mb-3">
                사용 방법
              </h3>
              <div className="space-y-3 mb-4">
                <Feature
                  title="① 월 평균임금 입력"
                  desc="직원의 최근 3개월 임금 평균을 입력합니다. 기본급 + 고정수당 + 상여금(월 환산)을 모두 포함합니다."
                />
                <Feature
                  title="② 휴업 유형 선택"
                  desc="전일 휴업이면 쉬는 날 수를, 단축 근무면 원래 시간과 단축 시간을 입력합니다."
                />
                <Feature
                  title="③ 결과 확인"
                  desc="사업주가 지급해야 할 총 휴업수당과 1일 금액을 바로 확인합니다."
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800 mb-4">
                <strong>고용유지지원금:</strong> 경영 악화로 휴업하는 경우,
                고용보험에서 휴업수당의 일부를 지원받을 수 있습니다. 관할
                고용센터에 신청하세요.
              </div>

              <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-sm text-green-800">
                <strong>면제 사유:</strong> 천재지변, 전쟁 등 불가항력으로
                사업을 계속할 수 없는 경우에는 휴업수당 지급 의무가 면제됩니다
                (노동위원회 승인 필요).
              </div>

              <LinkButton
                href="/shutdown-allowance"
                label="휴업수당 계산기 바로가기"
              />
            </div>
          </section>

          {/* 취업규칙 점검 */}
          <section id="work-rules">
            <SectionHeader
              icon="📋"
              title="취업규칙 점검"
              subtitle="근로기준법 제93조 필수 기재사항 14가지를 자동 점검합니다"
            />
            <div className="guide-card">
              <p className="text-sm text-[var(--text-muted)] mb-4">
                직원이 10인 이상인 사업장은 취업규칙을 작성하여{" "}
                <strong>노동청에 신고</strong>해야 합니다. 근로기준법 제93조에서
                정한 14가지 필수 항목을 빠뜨리면 신고가 반려될 수 있습니다.
              </p>

              <h3 className="font-semibold text-[var(--text)] mb-3">
                자동 점검 기능
              </h3>
              <div className="space-y-3 mb-4">
                <Feature
                  title="14항목 체크리스트"
                  desc="시업·종업 시각, 휴일, 임금, 퇴직급여, 교육훈련, 징계 등 14가지 필수 기재사항을 체크리스트로 보여줍니다."
                />
                <Feature
                  title="누락 항목 발견"
                  desc="작성한 취업규칙에서 빠진 항목이 있으면 ❌로 표시하고, '누락 항목 자동 추가' 버튼으로 바로 보완할 수 있습니다."
                />
                <Feature
                  title="완료 현황"
                  desc="예: '12/14 완료 — 2개 항목을 추가하세요'처럼 진행 상황을 한눈에 확인합니다. 14/14가 되면 안심하고 신고하세요."
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800 mb-4">
                <strong>10인 이상 사업장 필수:</strong> 취업규칙을 작성·변경할
                때는 근로자 과반수의 의견을 들어야 하며, 불이익하게 변경할 때는
                동의가 필요합니다 (근로기준법 제94조).
              </div>

              <LinkButton href="/work-rules" label="취업규칙 점검 바로가기" />
            </div>
          </section>

          {/* 서류 */}
          <section id="documents">
            <SectionHeader
              icon="📄"
              title="서류 작성"
              subtitle="30종 이상의 노무 서류를 작성합니다"
            />
            <div className="guide-card">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <DocCategory
                  title="증명서"
                  items={[
                    { label: "재직증명서", href: "/documents/certificate" },
                    {
                      label: "경력증명서",
                      href: "/documents/career-certificate",
                    },
                  ]}
                />
                <DocCategory
                  title="급여/임금"
                  items={[
                    { label: "급여명세서", href: "/payslip" },
                    { label: "임금대장", href: "/wage-ledger" },
                    {
                      label: "퇴직금정산서",
                      href: "/documents/retirement-pay",
                    },
                  ]}
                />
                <DocCategory
                  title="근태/휴가"
                  items={[
                    { label: "출퇴근기록부", href: "/documents/attendance" },
                    {
                      label: "시간외근로합의서 ✨",
                      href: "/documents/overtime",
                    },
                    { label: "연차관리대장", href: "/documents/annual-leave" },
                    {
                      label: "연차촉진통보서",
                      href: "/documents/annual-leave-notice",
                    },
                  ]}
                />
                <DocCategory
                  title="동의/서약"
                  items={[
                    {
                      label: "개인정보동의서",
                      href: "/documents/privacy-consent",
                    },
                    { label: "비밀유지서약서", href: "/documents/nda" },
                    { label: "서약서", href: "/documents/pledge" },
                  ]}
                />
                <DocCategory
                  title="인사관리"
                  items={[
                    { label: "인사카드", href: "/documents/personnel-card" },
                    { label: "수습평가서", href: "/documents/probation-eval" },
                    {
                      label: "교육훈련확인서",
                      href: "/documents/training-record",
                    },
                    { label: "사직서", href: "/documents/resignation" },
                    { label: "업무인수인계서", href: "/documents/handover" },
                  ]}
                />
                <DocCategory
                  title="징계/해고"
                  items={[
                    { label: "경고장", href: "/documents/warning-letter" },
                    {
                      label: "징계통보서",
                      href: "/documents/disciplinary-notice",
                    },
                    {
                      label: "해고통보서",
                      href: "/documents/termination-notice",
                    },
                  ]}
                />
                <DocCategory
                  title="업무/기타"
                  items={[
                    {
                      label: "휴직/복직 신청서 ✨",
                      href: "/documents/leave-application",
                    },
                    {
                      label: "근무시간변경합의서 ✨",
                      href: "/documents/work-hours-change",
                    },
                    { label: "재택근무신청서", href: "/documents/remote-work" },
                    { label: "출장신청서", href: "/documents/business-trip" },
                    {
                      label: "겸업허가신청서",
                      href: "/documents/side-job-permit",
                    },
                    { label: "취업규칙", href: "/work-rules" },
                  ]}
                />
                <DocCategory
                  title="퇴직/전환"
                  items={[
                    { label: "퇴직 처리 가이드", href: "/terminate" },
                    {
                      label: "퇴직 통합 정산서",
                      href: "/documents/settlement",
                    },
                    {
                      label: "권고사직 합의서",
                      href: "/documents/separation-agreement",
                    },
                    {
                      label: "4대보험 상실 안내",
                      href: "/guide/insurance-loss",
                    },
                  ]}
                />
              </div>

              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200 text-sm text-green-800">
                <strong>서류 검색:</strong> 서류 목록 페이지(
                <Link
                  href="/documents"
                  className="text-green-700 underline font-medium"
                >
                  서류 작성
                </Link>
                )에서 서류 이름으로 검색하면 30종+ 서류 중 원하는 것을 빠르게
                찾을 수 있습니다.
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800">
                  모든 서류 공통 워크플로우
                </p>
                <div className="flex items-center gap-2 mt-2 text-sm text-blue-700 flex-wrap">
                  <span className="bg-blue-100 px-2 py-1 rounded">
                    ① 직원 선택
                  </span>
                  <span>→</span>
                  <span className="bg-blue-100 px-2 py-1 rounded">
                    ② 내용 입력
                  </span>
                  <span>→</span>
                  <span className="bg-blue-100 px-2 py-1 rounded">
                    ③ 미리보기
                  </span>
                  <span>→</span>
                  <span className="bg-blue-100 px-2 py-1 rounded">
                    ④ 인쇄/PDF
                  </span>
                  <span>→</span>
                  <span className="bg-blue-100 px-2 py-1 rounded">
                    ⑤ 보관함 저장
                  </span>
                </div>
              </div>

              <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <p className="text-sm font-medium text-indigo-800 mb-2">
                  ✨ 최근 추가된 기능
                </p>
                <div className="text-sm text-indigo-700 space-y-2">
                  <p>
                    <strong>시간외근로합의서</strong> — 연장근로 시간을 입력하면
                    주당 총 근로시간을 자동 계산합니다. 주 12시간(법정 한도)을
                    초과하면 빨간 경고와 함께 벌칙을 안내합니다.
                  </p>
                  <p>
                    <strong>근무시간변경합의서</strong> — 변경 전/후 근무시간을
                    표로 비교합니다. 근로시간이 줄어드는 불이익 변경이면 근로자
                    서면 동의 체크를 받아야 미리보기가 활성화됩니다.
                  </p>
                  <p>
                    <strong>휴직신청서</strong> — 육아휴직 선택 시 급여(통상임금
                    80%, 기간별 상한 160~250만원)를 자동 계산합니다. 6+6
                    부모육아휴직제, 출산전후휴가 급여도 안내합니다.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 보관함 */}
          <section id="archive">
            <SectionHeader
              icon="🗄️"
              title="보관함"
              subtitle="작성한 서류를 안전하게 보관합니다"
            />
            <div className="guide-card">
              <div className="space-y-3">
                <Feature
                  title="서류 저장"
                  desc="각 서류 작성 완료 후 '보관함에 저장' 버튼을 누르면 서류 원본이 보관됩니다."
                />
                <Feature
                  title="검색 & 필터"
                  desc="서류 유형, 직원 이름, 작성일 기준으로 필터링하여 원하는 서류를 빠르게 찾습니다."
                />
                <Feature
                  title="재출력"
                  desc="보관된 서류를 열어서 다시 인쇄하거나 PDF로 다운로드할 수 있습니다."
                />
              </div>
              <LinkButton href="/archive" label="보관함 바로가기" />
            </div>
          </section>

          {/* 이메일 발송 */}
          <section id="email">
            <SectionHeader
              icon="📧"
              title="이메일 발송"
              subtitle="서류를 PDF로 변환하여 이메일로 보냅니다"
            />
            <div className="guide-card">
              <div className="space-y-3">
                <Feature
                  title="PDF 첨부 발송"
                  desc="서류 작성 화면에서 '이메일 발송' 버튼 → 받는 사람 이메일 입력 → PDF 첨부 옵션 체크 → 발송합니다."
                />
                <Feature
                  title="근로기준법 준수"
                  desc="근로기준법 제17조에 따라 근로계약서는 반드시 근로자에게 1부를 교부해야 합니다. 이메일 발송으로 간편하게 교부할 수 있습니다."
                />
              </div>
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800">
                <strong>Tip:</strong> PDF 첨부 옵션을 체크하면 서류가 A4 PDF로
                자동 변환되어 첨부됩니다.
              </div>
            </div>
          </section>

          {/* 멤버십 */}
          <section id="membership">
            <SectionHeader icon="🔑" title="멤버십" subtitle="이용 안내" />
            <div className="guide-card">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                <p className="font-bold mb-2">모든 기능이 개방되어 있습니다</p>
                <p>
                  별도 등급 구분 없이, 가입 즉시 직원 등록(50명), 전체 서류
                  30종+, 전자서명, 서류 보관함, 계약만료/연차 알림 등 모든
                  기능을 이용하실 수 있습니다.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <Feature
                  title="멤버십 코드"
                  desc="관리자로부터 전달받은 멤버십 코드가 있다면 멤버십 페이지에서 입력할 수 있습니다."
                />
              </div>
              <LinkButton href="/membership" label="멤버십 페이지 바로가기" />
            </div>
          </section>

          {/* FAQ */}
          <section id="faq">
            <SectionHeader icon="❓" title="자주 묻는 질문" subtitle="" />
            <div className="space-y-3">
              <FaqItem
                q="작성 중인 서류를 실수로 닫았는데 복구할 수 있나요?"
                a="네, 자동저장 기능이 있어 다시 같은 서류 작성 페이지에 접속하면 이전 입력 내용이 자동으로 복원됩니다."
              />
              <FaqItem
                q="PDF로 저장하려면 어떻게 하나요?"
                a="서류 미리보기 화면에서 '인쇄/PDF' 버튼을 클릭한 뒤, 프린터 선택에서 'PDF로 저장'을 선택하면 됩니다."
              />
              <FaqItem
                q="직원 정보를 수정하면 이미 작성한 계약서도 바뀌나요?"
                a="아니요, 이미 작성·보관된 서류는 변경되지 않습니다. 새로 작성하는 서류에만 수정된 정보가 반영됩니다."
              />
              <FaqItem
                q="외국인 근로계약서를 근로자 모국어로 출력할 수 있나요?"
                a="네, 외국인 계약서 작성 시 '계약서 병기 언어'에서 베트남어, 중국어, 태국어 등 8개 언어를 선택하면 한국어와 함께 병기됩니다."
              />
              <FaqItem
                q="5인 미만 사업장인데 가산수당을 꼭 줘야 하나요?"
                a="법적 의무는 없습니다 (근로기준법 제11조). 하지만 자발적 지급을 원하시면 급여명세서의 '가산수당 자동계산' 옵션을 활성화하면 됩니다."
              />
              <FaqItem
                q="4대보험 계산기에서 산재보험 요율을 모르겠어요"
                a="업종 평균 요율을 선택하면 됩니다. 정확한 요율은 근로복지공단에서 발급한 고지서 또는 '고용산재 토탈서비스(total.comwel.or.kr)'에서 확인할 수 있습니다. 요율을 아는 경우 '직접 입력'을 선택하세요."
              />
              <FaqItem
                q="퇴직금은 1년 미만 근무자에게도 줘야 하나요?"
                a="아니요, 퇴직금은 1년 이상 근속한 직원에게만 지급 의무가 있습니다. 다만 주 15시간 이상 근무해야 합니다. 퇴직금 계산기에서 자동으로 지급 대상 여부를 판별합니다."
              />
              <FaqItem
                q="정규직을 파트타임으로 전환하면 퇴직금도 정산해야 하나요?"
                a="근로형태 전환 자체가 퇴직은 아니므로 퇴직금 의무 지급 사유는 아닙니다. 다만 근로자가 원하면 중간정산을 할 수 있고, 미사용 연차는 현금 정산 또는 이월 중 선택할 수 있습니다."
              />
              <FaqItem
                q="직원이 주 52시간 넘게 일했는데 어떻게 되나요?"
                a="연장근로는 주 12시간까지만 허용됩니다 (소정 40h + 연장 12h = 52h). 위반 시 2년 이하 징역 또는 2천만원 이하 벌금입니다. 급여명세서와 시간외근로합의서에서 자동으로 경고합니다."
              />
              <FaqItem
                q="기간제 직원이 2년 넘게 일하면 어떻게 되나요?"
                a="기간제법 제4조에 의해 무기계약 근로자로 간주됩니다. 대시보드에서 2년 도래 90일 전부터 자동 알림을 받을 수 있으며, 전환 대상 직원이 있으면 빨간 경고로 표시됩니다."
              />
              <FaqItem
                q="경영이 어려워서 직원을 쉬게 하려는데 급여를 안 줘도 되나요?"
                a="아니요, 사업주 귀책사유로 휴업하는 경우 평균임금의 70% 이상을 휴업수당으로 지급해야 합니다 (근로기준법 제46조). 위반 시 3년 이하 징역 또는 3천만원 이하 벌금입니다. 휴업수당 계산기에서 정확한 금액을 확인하세요."
              />
              <FaqItem
                q="데이터는 안전한가요?"
                a="모든 데이터는 Supabase(AWS 기반) 클라우드에 암호화되어 저장됩니다. 주민등록번호 등 민감 정보는 추가 암호화 처리됩니다."
              />
            </div>
          </section>

          {/* 법적 면책 고지 */}
          <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-600">
            <p className="font-medium text-gray-700 mb-1">법적 면책 고지</p>
            <p>
              노무원큐에서 제공하는 서류 양식, 계산 결과, 법률 정보는{" "}
              <strong>참고용</strong>이며, 법적 효력을 보장하지 않습니다. 정확한
              판단이 필요한 경우 노무사 등 전문가 상담을 권장합니다.
            </p>
          </div>

          {/* 문의 */}
          <div className="mt-8 p-6 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] text-center">
            <p className="text-lg font-semibold text-[var(--text)] mb-2">
              더 궁금한 점이 있으신가요?
            </p>
            <p className="text-[var(--text-muted)] mb-4">
              아래 이메일로 문의해주시면 빠르게 답변 드리겠습니다.
            </p>
            <a
              href="mailto:sangsu0916@gmail.com"
              className="inline-block px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              sangsu0916@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 서브 컴포넌트 ── */

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4 pb-3 border-b border-[var(--border)]">
      <h2 className="text-2xl font-bold text-[var(--text)]">
        {icon} {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function StepCard({
  step,
  title,
  color,
  children,
}: {
  step: number;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-800",
    green: "bg-green-50 border-green-200 text-green-800",
  };
  return (
    <div className={`p-5 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white ${
            color === "blue"
              ? "bg-blue-500"
              : color === "indigo"
                ? "bg-indigo-500"
                : "bg-green-500"
          }`}
        >
          {step}
        </span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function InfoBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-4 bg-[var(--bg)] rounded-lg">
      <p className="font-medium text-[var(--text)] mb-2">{title}</p>
      <ul className="text-sm text-[var(--text-muted)] space-y-1">
        {items.map((item, i) => (
          <li key={i}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-[var(--primary)] mt-0.5">▸</span>
      <div>
        <p className="font-medium text-[var(--text)]">{title}</p>
        <p className="text-sm text-[var(--text-muted)]">{desc}</p>
      </div>
    </div>
  );
}

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-4">
      <Link
        href={href}
        className="inline-block px-4 py-2 text-sm bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
      >
        {label} →
      </Link>
    </div>
  );
}

function ContractCard({
  href,
  title,
  desc,
  features,
}: {
  href: string;
  title: string;
  desc: string;
  features: string[];
}) {
  return (
    <Link
      href={href}
      className="block p-5 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-md transition-all"
    >
      <h3 className="font-semibold text-[var(--text)] mb-1">{title}</h3>
      <p className="text-sm text-[var(--text-muted)] mb-3">{desc}</p>
      <ul className="text-xs text-[var(--text-muted)] space-y-1">
        {features.map((f, i) => (
          <li key={i}>✓ {f}</li>
        ))}
      </ul>
    </Link>
  );
}

function DocCategory({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string }[];
}) {
  return (
    <div className="p-3 bg-[var(--bg)] rounded-lg">
      <p className="font-medium text-[var(--text)] text-sm mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i}>
            <Link
              href={item.href}
              className="text-xs text-[var(--primary)] hover:underline"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-4 flex items-center justify-between gap-4"
      >
        <span className="font-medium text-[var(--text)] text-sm">{q}</span>
        <span className="text-[var(--text-muted)] flex-shrink-0">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-[var(--text-muted)] border-t border-[var(--border)] pt-3">
          {a}
        </div>
      )}
    </div>
  );
}
