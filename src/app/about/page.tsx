"use client";

export default function About() {
  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800&display=swap");

        .about-page * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .about-page {
          font-family:
            "Noto Sans KR",
            -apple-system,
            BlinkMacSystemFont,
            sans-serif;
          color: #1e293b;
          line-height: 1.7;
          background: #ffffff;
        }

        /* Hero */
        .about-hero {
          background: linear-gradient(
            135deg,
            #1e3a5f 0%,
            #2563eb 50%,
            #3b82f6 100%
          );
          color: white;
          padding: 80px 24px 100px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .about-hero::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            radial-gradient(
              circle at 30% 20%,
              rgba(255, 255, 255, 0.1) 0%,
              transparent 50%
            ),
            radial-gradient(
              circle at 70% 80%,
              rgba(255, 255, 255, 0.05) 0%,
              transparent 50%
            );
        }
        .about-hero-content {
          position: relative;
          max-width: 800px;
          margin: 0 auto;
        }
        .about-hero-badge {
          display: inline-block;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 24px;
        }
        .about-hero h1 {
          font-size: clamp(36px, 6vw, 56px);
          font-weight: 800;
          letter-spacing: -1px;
          margin-bottom: 16px;
        }
        .about-hero p {
          font-size: clamp(16px, 2.5vw, 20px);
          opacity: 0.9;
          max-width: 600px;
          margin: 0 auto 32px;
          line-height: 1.8;
        }
        .about-hero-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: white;
          color: #2563eb;
          padding: 14px 32px;
          border-radius: 12px;
          font-size: 17px;
          font-weight: 700;
          text-decoration: none;
          transition:
            transform 0.2s,
            box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        .about-hero-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
        }

        /* Section */
        .about-section {
          padding: 80px 24px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .about-section-alt {
          background: #f8fafc;
        }
        .about-section-title {
          font-size: clamp(28px, 4vw, 36px);
          font-weight: 800;
          text-align: center;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }
        .about-section-subtitle {
          text-align: center;
          color: #64748b;
          font-size: 17px;
          margin-bottom: 48px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        /* Stats */
        .about-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
          margin-bottom: 60px;
        }
        .about-stat {
          text-align: center;
          padding: 32px 20px;
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          transition:
            transform 0.2s,
            box-shadow 0.2s;
        }
        .about-stat:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
        }
        .about-stat-number {
          font-size: 42px;
          font-weight: 800;
          color: #2563eb;
          line-height: 1;
        }
        .about-stat-label {
          font-size: 15px;
          color: #64748b;
          margin-top: 8px;
        }

        /* Features */
        .about-features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 24px;
        }
        .about-feature-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 32px;
          transition:
            transform 0.2s,
            box-shadow 0.2s;
        }
        .about-feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
        }
        .about-feature-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-bottom: 16px;
        }
        .about-feature-card h3 {
          font-size: 19px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .about-feature-card p {
          color: #64748b;
          font-size: 15px;
          line-height: 1.7;
        }

        /* Benefits */
        .about-benefits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }
        .about-benefit {
          padding: 28px;
          border-radius: 16px;
          background: white;
          border: 1px solid #e2e8f0;
        }
        .about-benefit-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }
        .about-benefit h4 {
          font-size: 17px;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .about-benefit p {
          font-size: 14px;
          color: #64748b;
          line-height: 1.7;
        }

        /* CTA */
        .about-cta-section {
          background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
          color: white;
          padding: 80px 24px;
          text-align: center;
        }
        .about-cta-section h2 {
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 800;
          margin-bottom: 16px;
        }
        .about-cta-section p {
          font-size: 18px;
          opacity: 0.9;
          margin-bottom: 32px;
        }

        /* Footer */
        .about-footer {
          padding: 40px 24px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
        }
        .about-footer-brand {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .about-footer-name {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 4px;
        }
        .about-footer-copy {
          font-size: 13px;
          color: #94a3b8;
        }
        .about-footer-legal {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          font-size: 12px;
          color: #94a3b8;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .about-hero {
            padding: 60px 20px 80px;
          }
          .about-section {
            padding: 60px 20px;
          }
          .about-features-grid {
            grid-template-columns: 1fr;
          }
          .about-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <div className="about-page">
        {/* Hero */}
        <section className="about-hero">
          <div className="about-hero-content">
            <span className="about-hero-badge">2026년 최신 노동법 반영</span>
            <h1>노무원큐</h1>
            <p>
              근로계약서, 급여명세서, 임금대장, 취업규칙부터
              <br />
              입사~퇴사까지 필요한 <strong>노무서류 30종+</strong>을<br />
              빈칸 채우기처럼 쉽게 만드세요.
            </p>
            <a
              href="https://lbiz-partners.com/signup"
              className="about-hero-cta"
            >
              홈페이지에서 시작하기 →
            </a>
          </div>
        </section>

        {/* Stats */}
        <div className="about-section">
          <div className="about-stats">
            <div className="about-stat">
              <div className="about-stat-number">30종+</div>
              <div className="about-stat-label">생성 가능한 서류</div>
            </div>
            <div className="about-stat">
              <div className="about-stat-number">98조</div>
              <div className="about-stat-label">취업규칙 조항</div>
            </div>
            <div className="about-stat">
              <div className="about-stat-number">2026</div>
              <div className="about-stat-label">최신 법령 반영</div>
            </div>
            <div className="about-stat">
              <div className="about-stat-number">3분</div>
              <div className="about-stat-label">초기 설정 완료</div>
            </div>
          </div>
        </div>

        {/* Core Features */}
        <div className="about-section-alt">
          <div className="about-section">
            <h2 className="about-section-title">핵심 기능</h2>
            <p className="about-section-subtitle">
              직원 등록 한 번이면, 모든 서류에 자동 반영됩니다
            </p>

            <div className="about-features-grid">
              <div className="about-feature-card">
                <div
                  className="about-feature-icon"
                  style={{ background: "#dbeafe" }}
                >
                  👥
                </div>
                <h3>직원 관리 & 급여 최적화</h3>
                <p>
                  직원 정보를 한 번 등록하면 모든 서류에 자동 입력됩니다. 비과세
                  항목(식대, 자가운전보조금, 보육수당)을 활용한 급여 최적화로{" "}
                  <strong>연간 수십만원 절세</strong> 효과까지.
                </p>
              </div>
              <div className="about-feature-card">
                <div
                  className="about-feature-icon"
                  style={{ background: "#d1fae5" }}
                >
                  📋
                </div>
                <h3>근로계약서 3종</h3>
                <p>
                  <strong>정규직</strong>(월급제, 4대보험 자동계산),{" "}
                  <strong>파트타임</strong>(시급제, 주휴수당 자동계산),{" "}
                  <strong>프리랜서</strong>(용역계약, 원천징수 3.3% 자동계산)
                  모두 지원합니다.
                </p>
              </div>
              <div className="about-feature-card">
                <div
                  className="about-feature-icon"
                  style={{ background: "#fef3c7" }}
                >
                  💵
                </div>
                <h3>급여명세서 & 임금대장</h3>
                <p>
                  4대보험, 소득세, 지방소득세를 <strong>자동 계산</strong>
                  합니다. 13가지 추가 수당 항목 지원. 전 직원 급여를 한 표로
                  정리하는 임금대장까지.
                </p>
              </div>
              <div className="about-feature-card">
                <div
                  className="about-feature-icon"
                  style={{ background: "#ede9fe" }}
                >
                  📖
                </div>
                <h3>취업규칙 (17개 장, 98개 조항)</h3>
                <p>
                  고용노동부 2025.3 표준 양식 기반. 육아휴직 확대 등 최신 개정법
                  반영. <strong>노동청 제출 가능 수준</strong>의 완전판을 회사
                  설정만으로 자동 생성합니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="about-section-alt">
          <div className="about-section">
            <h2 className="about-section-title">왜 노무원큐인가요?</h2>
            <p className="about-section-subtitle">
              중소기업 대표님이 선택하는 이유
            </p>

            <div className="about-benefits-grid">
              <div className="about-benefit">
                <div className="about-benefit-icon">⚡</div>
                <h4>빠르고 쉬운 작성</h4>
                <p>
                  빈칸 채우기처럼 간단합니다. 노무사 없이도 표준 양식 서류를
                  직접 만들 수 있어요.
                </p>
              </div>
              <div className="about-benefit">
                <div className="about-benefit-icon">🔄</div>
                <h4>자동 입력 & 자동 계산</h4>
                <p>
                  직원 등록 한 번이면 모든 서류에 자동 반영. 4대보험, 소득세,
                  퇴직금도 자동 계산합니다.
                </p>
              </div>
              <div className="about-benefit">
                <div className="about-benefit-icon">📋</div>
                <h4>표준 양식 기반</h4>
                <p>
                  고용노동부 표준계약서와 표준 취업규칙을 기반으로 만들었습니다.
                  노동청 제출 가능 수준!
                </p>
              </div>
              <div className="about-benefit">
                <div className="about-benefit-icon">🔐</div>
                <h4>안전한 데이터 관리</h4>
                <p>
                  사업장·직원 데이터는 암호화되어 안전하게 보관됩니다.
                  주민등록번호는 AES-256-GCM 방식으로 암호화 저장됩니다.
                </p>
              </div>
              <div className="about-benefit">
                <div className="about-benefit-icon">💰</div>
                <h4>급여 절세 최적화</h4>
                <p>
                  비과세 항목을 자동 배분하여 같은 급여에서 세금을 줄여줍니다.
                  연간 수십만원 절약!
                </p>
              </div>
              <div className="about-benefit">
                <div className="about-benefit-icon">📱</div>
                <h4>어디서든 접속</h4>
                <p>
                  설치 없이 웹 브라우저로 바로 사용합니다. PC, 태블릿, 모바일
                  모두 지원합니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 이용 안내 */}
        <div className="about-section" style={{ textAlign: "center" }}>
          <h2 className="about-section-title">모든 기능을 바로 이용하세요</h2>
          <p className="about-section-subtitle">
            별도 등급 구분 없이, 가입 즉시 전체 기능을 사용할 수 있습니다.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              maxWidth: "700px",
              margin: "0 auto",
            }}
          >
            {[
              "직원 50명까지 등록",
              "전체 노무서류 30종+",
              "PDF 다운로드",
              "전자서명",
              "서류 보관함",
              "계약만료·연차 알림",
            ].map((f) => (
              <div
                key={f}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "14px 16px",
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  fontSize: "15px",
                  color: "#475569",
                }}
              >
                <span style={{ color: "#22c55e" }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <section className="about-cta-section">
          <h2>지금 바로 시작하세요</h2>
          <p>복잡한 노무서류, 노무원큐로 쉽게 해결하세요</p>
          <a href="https://lbiz-partners.com/signup" className="about-hero-cta">
            홈페이지에서 시작하기 →
          </a>
        </section>

        {/* Footer */}
        <footer className="about-footer">
          <div className="about-footer-brand">엘비즈 파트너스</div>
          <div className="about-footer-name">이상수 대표</div>
          <div className="about-footer-copy">
            &copy; 2026 노무원큐 · 노무서류 관리 시스템
          </div>
          <div className="about-footer-legal">
            본 서비스에서 제공하는 문서 양식은 참고용이며, 실제 법적 효력은 관할
            기관 및 전문가 확인이 필요합니다.
          </div>
        </footer>
      </div>
    </>
  );
}
