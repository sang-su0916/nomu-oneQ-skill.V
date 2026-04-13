import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description:
    "노무원큐 개인정보처리방침 - 개인정보보호법에 따른 개인정보 처리 및 보호에 관한 사항",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] py-12 px-4">
      <article className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
          개인정보처리방침
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-10">
          시행일: 2026년 3월 11일
        </p>

        <div className="space-y-10 text-[var(--text)] leading-relaxed">
          {/* 제1조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">
              제1조 (개인정보의 처리 목적)
            </h2>
            <p className="mb-3">
              엘비즈파트너스(이하 &ldquo;회사&rdquo;)는{" "}
              <strong>노무원큐</strong>(이하 &ldquo;서비스&rdquo;,
              https://nomu-oneq.vercel.app)를 제공하기 위하여 다음의 목적으로
              개인정보를 처리합니다. 처리하는 개인정보는 다음 목적 이외의
              용도로는 이용되지 않으며, 목적이 변경되는 경우 별도의 동의를 받는
              등 필요한 조치를 이행할 것입니다.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-[var(--text-muted)]">
              <li>
                <strong>회원가입 및 관리:</strong> 회원 식별, 본인 확인, 서비스
                부정 이용 방지
              </li>
              <li>
                <strong>서비스 제공:</strong> 근로계약서, 급여명세서, 임금대장,
                퇴직금정산서 등 노무서류 자동 생성 및 관리
              </li>
              <li>
                <strong>사업장 관리:</strong> 사업장 정보 등록, 직원 정보 관리,
                급여 계산 및 명세서 발급
              </li>
              <li>
                <strong>고충처리:</strong> 민원 접수 및 처리, 분쟁 조정을 위한
                기록 보존
              </li>
              <li>
                <strong>서비스 개선:</strong> 서비스 이용 통계 분석, 신규 서비스
                개발
              </li>
            </ul>
          </section>

          {/* 제2조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">
              제2조 (수집하는 개인정보 항목)
            </h2>
            <p className="mb-3">
              회사는 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-[var(--border)] text-sm">
                <thead>
                  <tr className="bg-[var(--bg-card)]">
                    <th className="border border-[var(--border)] px-4 py-2 text-left">
                      구분
                    </th>
                    <th className="border border-[var(--border)] px-4 py-2 text-left">
                      수집 항목
                    </th>
                    <th className="border border-[var(--border)] px-4 py-2 text-left">
                      필수/선택
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-muted)]">
                  <tr>
                    <td className="border border-[var(--border)] px-4 py-2 font-medium">
                      회원가입 (이메일)
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      이름, 이메일, 비밀번호
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      필수
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[var(--border)] px-4 py-2 font-medium">
                      소셜 로그인 (Google)
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      이름, 이메일, 프로필 이미지(Google 제공)
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      필수
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[var(--border)] px-4 py-2 font-medium">
                      소셜 로그인 (Kakao)
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      이름, 이메일, 프로필 이미지(Kakao 제공)
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      필수
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[var(--border)] px-4 py-2 font-medium">
                      사업장 등록
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      상호, 사업자등록번호, 주소, 전화번호
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      필수
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[var(--border)] px-4 py-2 font-medium">
                      직원 정보
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      이름, 주민등록번호, 이메일, 전화번호, 입사일, 급여정보
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      필수
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[var(--border)] px-4 py-2 font-medium">
                      급여 정보
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      기본급, 수당 내역, 공제 내역
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      필수
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-sm text-[var(--text-muted)]">
              ※ 주민등록번호는 근로계약서, 4대보험 신고 등 법적 서류 작성에
              필수적으로 수집되며, AES-256-GCM 방식으로 암호화하여 저장합니다.
            </p>
          </section>

          {/* 제3조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">
              제3조 (개인정보의 처리 및 보유기간)
            </h2>
            <p className="mb-3">
              회사는 법령에 따른 보유기간 또는 정보주체로부터 동의 받은 기간
              내에서 개인정보를 처리 및 보유합니다.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[var(--text-muted)]">
              <li>
                <strong>회원 정보:</strong> 회원 탈퇴 시까지 (탈퇴 후 지체 없이
                파기)
              </li>
              <li>
                <strong>사업장 및 직원 정보:</strong> 회원 탈퇴 시 또는 사업장
                삭제 요청 시까지
              </li>
              <li>
                <strong>근로계약 관련 기록:</strong> 근로기준법에 따라 근로관계
                종료 후 3년
              </li>
              <li>
                <strong>임금대장 및 급여 관련 기록:</strong> 근로기준법에 따라
                3년
              </li>
              <li>
                <strong>계약 또는 청약철회에 관한 기록:</strong> 전자상거래법에
                따라 5년
              </li>
              <li>
                <strong>소비자 불만 또는 분쟁 처리 기록:</strong> 전자상거래법에
                따라 3년
              </li>
              <li>
                <strong>접속 기록:</strong> 통신비밀보호법에 따라 3개월
              </li>
            </ul>
          </section>

          {/* 제4조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">
              제4조 (개인정보의 제3자 제공)
            </h2>
            <p className="mb-3">
              회사는 원칙적으로 정보주체의 개인정보를 제3자에게 제공하지
              않습니다. 다만, 다음의 경우에는 예외로 합니다.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[var(--text-muted)]">
              <li>정보주체가 사전에 동의한 경우</li>
              <li>
                법령의 규정에 의하거나 수사 목적으로 법령에 정해진 절차와 방법에
                따라 수사기관의 요구가 있는 경우
              </li>
            </ul>
            <p className="mt-3">
              소셜 로그인 이용 시, 해당 플랫폼(Google, Kakao)의
              개인정보처리방침이 별도로 적용됩니다.
            </p>
          </section>

          {/* 제5조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">
              제5조 (개인정보 처리 위탁)
            </h2>
            <p className="mb-3">
              회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리를
              위탁하고 있습니다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-[var(--border)] text-sm">
                <thead>
                  <tr className="bg-[var(--bg-card)]">
                    <th className="border border-[var(--border)] px-4 py-2 text-left">
                      수탁업체
                    </th>
                    <th className="border border-[var(--border)] px-4 py-2 text-left">
                      위탁 업무
                    </th>
                    <th className="border border-[var(--border)] px-4 py-2 text-left">
                      보유기간
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-muted)]">
                  <tr>
                    <td className="border border-[var(--border)] px-4 py-2">
                      Supabase Inc.
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      클라우드 데이터베이스 호스팅, 인증(Auth) 서비스 제공
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      위탁 계약 종료 시
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[var(--border)] px-4 py-2">
                      Vercel Inc.
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      웹 애플리케이션 호스팅 및 배포
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      위탁 계약 종료 시
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[var(--border)] px-4 py-2">
                      Nodemailer SMTP 서비스
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      이메일 발송 (회원가입 인증, 알림 등)
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      위탁 계약 종료 시
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[var(--border)] px-4 py-2">
                      Google LLC
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      소셜 로그인(OAuth) 인증 처리
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      위탁 계약 종료 시
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[var(--border)] px-4 py-2">
                      Kakao Corp.
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      소셜 로그인(OAuth) 인증 처리
                    </td>
                    <td className="border border-[var(--border)] px-4 py-2">
                      위탁 계약 종료 시
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              ※ 위탁업체의 서버는 해외(미국 등)에 위치할 수 있으며,
              개인정보보호법 제17조 및 제28조의8에 따라 안전성 확보조치를 취하고
              있습니다.
            </p>
          </section>

          {/* 제6조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">
              제6조 (개인정보의 파기 절차 및 방법)
            </h2>
            <p className="mb-3">
              회사는 개인정보 보유기간 경과 또는 처리 목적 달성 시 지체 없이
              해당 개인정보를 파기합니다.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[var(--text-muted)]">
              <li>
                <strong>파기 절차:</strong> 불필요한 개인정보는 개인정보
                보호책임자의 승인을 받아 파기합니다.
              </li>
              <li>
                <strong>파기 방법:</strong>
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>전자적 파일: 복원 불가능한 방법으로 영구 삭제</li>
                  <li>종이 문서: 분쇄기로 분쇄하거나 소각</li>
                  <li>암호화 데이터: 암호화 키 폐기를 통한 복원 불가 처리</li>
                </ul>
              </li>
            </ul>
          </section>

          {/* 제7조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">
              제7조 (정보주체의 권리 및 의무)
            </h2>
            <p className="mb-3">
              정보주체는 다음과 같은 권리를 행사할 수 있습니다.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[var(--text-muted)]">
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리 정지 요구</li>
            </ul>
            <p className="mt-3 text-[var(--text-muted)]">
              권리 행사는 서비스 내 설정 메뉴 또는 이메일(아래 연락처)을 통해
              가능하며, 회사는 지체 없이 조치하겠습니다. 정보주체는 자신의
              개인정보를 보호할 의무가 있으며, 본인의 부주의로 인한 개인정보
              유출에 대해 회사는 책임지지 않습니다.
            </p>
          </section>

          {/* 제8조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">
              제8조 (개인정보의 안전성 확보조치)
            </h2>
            <p className="mb-3">
              회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고
              있습니다.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[var(--text-muted)]">
              <li>
                <strong>민감정보 암호화:</strong> 주민등록번호 등 민감정보는
                AES-256-GCM 방식으로 암호화하여 저장
              </li>
              <li>
                <strong>비밀번호 암호화:</strong> 비밀번호는 단방향
                해시(bcrypt)로 암호화하여 저장
              </li>
              <li>
                <strong>접근 통제:</strong> Supabase Row Level Security(RLS)
                정책을 통한 데이터 접근 통제
              </li>
              <li>
                <strong>전송 구간 암호화:</strong> SSL/TLS를 통한 데이터 전송
                구간 암호화
              </li>
              <li>
                <strong>인증 보안:</strong> Supabase Auth 기반 JWT 토큰 인증,
                세션 관리
              </li>
              <li>
                <strong>사업장 격리:</strong> 사업장별 데이터 격리를 통한 타
                사업장 데이터 접근 차단
              </li>
              <li>
                <strong>정기 점검:</strong> 개인정보 보호 관련 정기적인 자체
                점검 실시
              </li>
            </ul>
          </section>

          {/* 제9조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">
              제9조 (개인정보보호 책임자)
            </h2>
            <p className="mb-3">
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보
              처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와
              같이 개인정보보호 책임자를 지정하고 있습니다.
            </p>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--text-muted)]">
              <p>
                <strong>개인정보보호 책임자</strong>
              </p>
              <p>회사명: 엘비즈파트너스</p>
              <p>이메일: privacy@lbiz-partners.com</p>
            </div>
          </section>

          {/* 제10조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">
              제10조 (고충처리 및 권익침해 구제)
            </h2>
            <p className="mb-3">
              정보주체는 개인정보 침해에 대한 신고나 상담이 필요한 경우 아래
              기관에 문의하실 수 있습니다.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[var(--text-muted)]">
              <li>
                개인정보침해 신고센터 (한국인터넷진흥원): (국번없이) 118,{" "}
                <a
                  href="https://privacy.kisa.or.kr"
                  className="text-[var(--primary)] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  privacy.kisa.or.kr
                </a>
              </li>
              <li>
                개인정보 분쟁조정위원회: (국번없이) 1833-6972,{" "}
                <a
                  href="https://www.kopico.go.kr"
                  className="text-[var(--primary)] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  www.kopico.go.kr
                </a>
              </li>
              <li>
                대검찰청 사이버수사과: (국번없이) 1301,{" "}
                <a
                  href="https://www.spo.go.kr"
                  className="text-[var(--primary)] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  www.spo.go.kr
                </a>
              </li>
              <li>
                경찰청 사이버수사국: (국번없이) 182,{" "}
                <a
                  href="https://ecrm.cyber.go.kr"
                  className="text-[var(--primary)] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ecrm.cyber.go.kr
                </a>
              </li>
            </ul>
          </section>

          {/* 제11조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">
              제11조 (개인정보처리방침 변경)
            </h2>
            <p className="text-[var(--text-muted)]">
              이 개인정보처리방침은 2026년 3월 11일부터 적용됩니다. 방침이
              변경되는 경우 시행일 최소 7일 전부터 서비스 내 공지사항 또는
              이메일을 통해 변경 사항을 알려드리겠습니다.
            </p>
          </section>
        </div>

        {/* 하단 네비게이션 */}
        <div className="mt-12 pt-6 border-t border-[var(--border)] flex justify-between text-sm">
          <Link href="/" className="text-[var(--primary)] hover:underline">
            홈으로
          </Link>
          <Link href="/terms" className="text-[var(--primary)] hover:underline">
            이용약관
          </Link>
        </div>
      </article>
    </div>
  );
}
