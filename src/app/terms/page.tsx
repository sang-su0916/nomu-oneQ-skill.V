import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관",
  description:
    "노무원큐 서비스 이용약관 - 서비스 이용에 관한 제반 사항을 규정합니다.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] py-12 px-4">
      <article className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">이용약관</h1>
        <p className="text-sm text-[var(--text-muted)] mb-10">
          시행일: 2026년 3월 11일
        </p>

        <div className="space-y-10 text-[var(--text)] leading-relaxed">
          {/* 제1조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">제1조 (목적)</h2>
            <p className="text-[var(--text-muted)]">
              이 약관은 엘비즈파트너스(이하 &ldquo;회사&rdquo;)가 제공하는{" "}
              <strong>노무원큐</strong>(이하 &ldquo;서비스&rdquo;)의 이용조건 및
              절차, 회사와 이용자의 권리, 의무 및 책임사항, 기타 필요한 사항을
              규정함을 목적으로 합니다.
            </p>
          </section>

          {/* 제2조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">제2조 (정의)</h2>
            <ul className="list-decimal pl-6 space-y-2 text-[var(--text-muted)]">
              <li>
                <strong>&ldquo;서비스&rdquo;</strong>란 회사가
                https://nomu-oneq.vercel.app 을 통해 제공하는 노무서류 자동생성
                SaaS(Software as a Service)를 말합니다. 근로계약서, 급여명세서,
                임금대장, 취업규칙, 퇴직금정산서 등 노무 관련 서류의 작성, 관리,
                다운로드 기능을 포함합니다.
              </li>
              <li>
                <strong>&ldquo;회원&rdquo;</strong>이란 서비스에 회원가입을 하고
                이용자 계정을 부여받은 자를 말합니다.
              </li>
              <li>
                <strong>&ldquo;사업장&rdquo;</strong>이란 회원이 서비스 내에
                등록한 사업장 단위를 말합니다.
              </li>
              <li>
                <strong>&ldquo;게스트&rdquo;</strong>란 회원가입 없이 서비스의
                일부 기능(체험)을 이용하는 자를 말합니다.
              </li>
            </ul>
          </section>

          {/* 제3조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">
              제3조 (약관의 효력 및 변경)
            </h2>
            <ul className="list-decimal pl-6 space-y-2 text-[var(--text-muted)]">
              <li>
                이 약관은 서비스 화면에 게시하거나 기타의 방법으로 공지함으로써
                효력이 발생합니다.
              </li>
              <li>
                회사는 합리적인 사유가 발생할 경우 관련 법령에 위배되지 않는
                범위 내에서 약관을 변경할 수 있으며, 변경된 약관은 시행일 최소
                7일 전에 공지합니다.
              </li>
              <li>
                회원이 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고
                탈퇴할 수 있습니다.
              </li>
            </ul>
          </section>

          {/* 제4조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">제4조 (회원가입 및 탈퇴)</h2>
            <ul className="list-decimal pl-6 space-y-2 text-[var(--text-muted)]">
              <li>
                회원가입은 이용자가 약관에 동의하고, 이메일/비밀번호 또는 소셜
                로그인(Google, Kakao)을 통해 가입 신청을 한 후 회사가 이를
                승인함으로써 완료됩니다.
              </li>
              <li>
                회원은 언제든지 서비스 내 설정 메뉴를 통해 탈퇴를 요청할 수
                있으며, 회사는 관련 법령에서 정한 바에 따라 즉시 처리합니다.
              </li>
              <li>
                탈퇴 시 해당 회원이 등록한 사업장 및 직원 정보, 생성된 서류 등
                모든 데이터는 관련 법령에서 정한 보유기간이 경과한 후
                파기됩니다.
              </li>
              <li>
                회사는 다음 각 호에 해당하는 경우 회원가입을 거절하거나 사후에
                자격을 제한할 수 있습니다.
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>타인의 정보를 도용한 경우</li>
                  <li>서비스 운영을 방해한 경우</li>
                  <li>관련 법령을 위반한 경우</li>
                </ul>
              </li>
            </ul>
          </section>

          {/* 제5조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">제5조 (서비스의 내용)</h2>
            <p className="mb-3 text-[var(--text-muted)]">
              회사가 제공하는 서비스의 주요 내용은 다음과 같습니다.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[var(--text-muted)]">
              <li>사업장 등록 및 관리</li>
              <li>직원 정보 등록 및 관리</li>
              <li>근로계약서, 급여명세서, 임금대장 등 노무서류 자동 생성</li>
              <li>퇴직금 정산서 생성</li>
              <li>취업규칙 및 징계서류 생성</li>
              <li>4대보험 요율 자동 반영 급여 계산</li>
              <li>서류 PDF 다운로드 및 관리</li>
              <li>기타 회사가 추가 개발하여 제공하는 서비스</li>
            </ul>
          </section>

          {/* 제6조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">제6조 (서비스 이용)</h2>
            <ul className="list-decimal pl-6 space-y-2 text-[var(--text-muted)]">
              <li>현재 모든 기능이 기본 제공됩니다.</li>
              <li>멤버십 코드를 통해 추가 설정이 가능합니다.</li>
              <li>향후 유료 결제 시스템 도입 시 별도로 안내합니다.</li>
            </ul>
          </section>

          {/* 제7조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">
              제7조 (서비스의 제한 및 중지)
            </h2>
            <ul className="list-decimal pl-6 space-y-2 text-[var(--text-muted)]">
              <li>
                회사는 다음 각 호에 해당하는 경우 서비스의 전부 또는 일부를
                제한하거나 중지할 수 있습니다.
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>서비스용 설비의 보수 등 공사로 인한 부득이한 경우</li>
                  <li>
                    천재지변, 국가비상사태 등 불가항력적인 사유가 있는 경우
                  </li>
                  <li>
                    서비스 이용의 폭주 등으로 정상적인 서비스 이용에 지장이 있는
                    경우
                  </li>
                </ul>
              </li>
              <li>
                서비스 중단이 예정된 경우 회사는 최소 7일 전에 공지합니다. 다만,
                불가피한 경우 사후에 공지할 수 있습니다.
              </li>
            </ul>
          </section>

          {/* 제8조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">제8조 (면책조항)</h2>
            <ul className="list-decimal pl-6 space-y-2 text-[var(--text-muted)]">
              <li className="font-semibold text-[var(--text)]">
                본 서비스를 통해 생성되는 노무서류 양식은 참고 목적으로
                제공되며, 법적 효력은 관할 기관 및 전문가(공인노무사, 변호사
                등)의 확인이 필요합니다.
              </li>
              <li>
                회사는 서비스에서 제공하는 서류 양식의 법적 유효성을 보증하지
                않으며, 서류의 사용으로 인해 발생하는 법적 분쟁이나 손해에 대해
                책임지지 않습니다.
              </li>
              <li>
                회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중단 등
                불가항력적 사유로 서비스를 제공할 수 없는 경우 책임이
                면제됩니다.
              </li>
              <li>
                회사는 회원의 귀책사유로 인한 서비스 이용 장애에 대하여 책임지지
                않습니다.
              </li>
              <li>
                회사는 회원이 서비스에 게재한 정보, 자료의 정확성, 신뢰도에 대해
                책임지지 않습니다.
              </li>
              <li>
                4대보험 요율, 최저임금 등 법정 기준은 관계 법령 변경에 따라
                업데이트되며, 일시적으로 최신 기준과 차이가 있을 수 있습니다.
              </li>
            </ul>
          </section>

          {/* 제9조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">제9조 (회원의 의무)</h2>
            <ul className="list-decimal pl-6 space-y-2 text-[var(--text-muted)]">
              <li>
                회원은 관계 법령, 이 약관, 서비스 이용 안내 등을 준수하여야
                합니다.
              </li>
              <li>
                회원은 자신의 계정 정보를 안전하게 관리할 의무가 있으며,
                타인에게 양도하거나 대여할 수 없습니다.
              </li>
              <li>
                회원은 직원의 개인정보를 서비스에 입력할 때 해당 직원의 동의를
                받아야 하며, 개인정보보호법 등 관련 법령을 준수해야 합니다.
              </li>
              <li>
                회원은 다음 각 호의 행위를 하여서는 안 됩니다.
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>타인의 정보를 도용하는 행위</li>
                  <li>서비스를 이용하여 불법적인 서류를 작성하는 행위</li>
                  <li>서비스의 안정적 운영을 방해하는 행위</li>
                  <li>기타 관련 법령에 위반되는 행위</li>
                </ul>
              </li>
            </ul>
          </section>

          {/* 제10조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">제10조 (지적재산권)</h2>
            <ul className="list-decimal pl-6 space-y-2 text-[var(--text-muted)]">
              <li>서비스에 대한 저작권 및 지적재산권은 회사에 귀속됩니다.</li>
              <li>
                회원이 서비스를 이용하여 생성한 서류의 내용에 대한 권리는
                회원에게 귀속됩니다.
              </li>
              <li>
                회원은 서비스를 이용하여 얻은 정보를 회사의 사전 동의 없이 영리
                목적으로 이용하거나 제3자에게 제공할 수 없습니다.
              </li>
            </ul>
          </section>

          {/* 제11조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">제11조 (멤버십 및 결제)</h2>
            <ul className="list-decimal pl-6 space-y-2 text-[var(--text-muted)]">
              <li>
                현재 모든 기능이 기본 제공됩니다. 멤버십 코드를 통해 추가 설정이
                가능합니다.
              </li>
              <li>
                유료 결제 시스템은 추후 도입될 예정이며, 도입 시 별도의 이용약관
                또는 요금 안내를 통해 고지합니다.
              </li>
              <li>
                유료 서비스의 환불 정책은 전자상거래 등에서의 소비자보호에 관한
                법률 등 관련 법령에 따릅니다.
              </li>
            </ul>
          </section>

          {/* 제12조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">제12조 (개인정보보호)</h2>
            <p className="text-[var(--text-muted)]">
              회사는 회원의 개인정보를 보호하기 위해 개인정보보호법 등 관련
              법령을 준수하며, 자세한 사항은{" "}
              <Link
                href="/privacy"
                className="text-[var(--primary)] hover:underline"
              >
                개인정보처리방침
              </Link>
              에서 확인하실 수 있습니다.
            </p>
          </section>

          {/* 제13조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">제13조 (손해배상)</h2>
            <ul className="list-decimal pl-6 space-y-2 text-[var(--text-muted)]">
              <li>
                회사는 무료로 제공하는 서비스 이용과 관련하여 회원에게 발생한
                손해에 대해 책임을 지지 않습니다. 다만, 회사의 고의 또는
                중과실에 의한 경우는 그러하지 아니합니다.
              </li>
              <li>
                회원이 이 약관을 위반하여 회사에 손해를 끼친 경우, 해당 회원은
                회사에 발생한 손해를 배상하여야 합니다.
              </li>
            </ul>
          </section>

          {/* 제14조 */}
          <section>
            <h2 className="text-xl font-bold mb-3">제14조 (분쟁해결)</h2>
            <ul className="list-decimal pl-6 space-y-2 text-[var(--text-muted)]">
              <li>
                이 약관에 명시되지 않은 사항은 전자상거래 등에서의 소비자보호에
                관한 법률, 약관의 규제에 관한 법률, 정보통신망 이용촉진 및
                정보보호 등에 관한 법률 등 관련 법령에 따릅니다.
              </li>
              <li>
                서비스 이용과 관련하여 분쟁이 발생한 경우 양 당사자는 분쟁
                해결을 위해 성실히 협의합니다.
              </li>
              <li>
                협의로 해결되지 않는 경우, 관할 법원은 민사소송법에 따른
                법원으로 합니다.
              </li>
            </ul>
          </section>

          {/* 부칙 */}
          <section>
            <h2 className="text-xl font-bold mb-3">부칙</h2>
            <p className="text-[var(--text-muted)]">
              이 약관은 2026년 3월 11일부터 시행합니다.
            </p>
          </section>
        </div>

        {/* 하단 네비게이션 */}
        <div className="mt-12 pt-6 border-t border-[var(--border)] flex justify-between text-sm">
          <Link href="/" className="text-[var(--primary)] hover:underline">
            홈으로
          </Link>
          <Link
            href="/privacy"
            className="text-[var(--primary)] hover:underline"
          >
            개인정보처리방침
          </Link>
        </div>
      </article>
    </div>
  );
}
