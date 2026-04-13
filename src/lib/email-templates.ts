/**
 * HTML 이메일 템플릿
 * 엘비즈파트너스 브랜딩 (네이비 + 골드)
 */

const BRAND = {
  navy: "#1E3A5F",
  gold: "#D4A843",
  lightBg: "#F8F9FA",
  white: "#FFFFFF",
  textDark: "#1a1a1a",
  textMuted: "#6b7280",
  border: "#E5E7EB",
};

// 공통 레이아웃 래퍼
function layout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.lightBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.lightBg};padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- 헤더 -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND.navy},#2a4a6f);padding:32px 40px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;color:${BRAND.gold};font-size:24px;font-weight:700;letter-spacing:-0.5px;">노무원큐</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">엘비즈파트너스 노무관리 솔루션</p>
            </td>
          </tr>
          <!-- 본문 -->
          <tr>
            <td style="background-color:${BRAND.white};padding:40px;border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};">
              ${content}
            </td>
          </tr>
          <!-- 푸터 -->
          <tr>
            <td style="background-color:${BRAND.white};padding:24px 40px 32px;border-top:1px solid ${BRAND.border};border-radius:0 0 12px 12px;border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};border-bottom:1px solid ${BRAND.border};text-align:center;">
              <p style="margin:0;color:${BRAND.textMuted};font-size:12px;line-height:1.6;">
                © ${new Date().getFullYear()} 엘비즈파트너스 | 노무원큐<br>
                본 메일은 발신 전용이며, 회신되지 않습니다.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(text: string, href: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr>
      <td align="center">
        <a href="${href}" style="display:inline-block;padding:14px 36px;background-color:${BRAND.navy};color:${BRAND.white};text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`;
}

function infoBox(items: { label: string; value: string }[]): string {
  const rows = items
    .map(
      (i) => `
    <tr>
      <td style="padding:8px 16px;color:${BRAND.textMuted};font-size:13px;white-space:nowrap;">${i.label}</td>
      <td style="padding:8px 16px;color:${BRAND.textDark};font-size:14px;font-weight:500;">${i.value}</td>
    </tr>`,
    )
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.lightBg};border-radius:8px;margin:20px 0;">${rows}</table>`;
}

// ─── 템플릿들 ───────────────────────────────

/** 가입 환영 이메일 */
export function welcomeEmail(params: {
  userName: string;
  companyName: string;
  loginUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `[노무원큐] ${params.companyName} 가입을 환영합니다! 🎉`;
  const html = layout(
    subject,
    `
    <h2 style="margin:0 0 16px;color:${BRAND.textDark};font-size:20px;">환영합니다, ${params.userName}님! 🎉</h2>
    <p style="color:${BRAND.textMuted};font-size:15px;line-height:1.7;margin:0 0 16px;">
      <strong style="color:${BRAND.navy};">${params.companyName}</strong>의 노무원큐 계정이 성공적으로 생성되었습니다.
    </p>
    <p style="color:${BRAND.textMuted};font-size:15px;line-height:1.7;margin:0 0 8px;">
      이제 다음 기능을 바로 사용하실 수 있습니다:
    </p>
    <ul style="color:${BRAND.textMuted};font-size:14px;line-height:2;padding-left:20px;margin:0 0 16px;">
      <li>📋 근로계약서 자동 생성</li>
      <li>💵 급여명세서 발급</li>
      <li>📄 각종 노무 서류 작성</li>
      <li>👥 직원 정보 관리</li>
    </ul>
    ${button("노무원큐 시작하기", params.loginUrl)}
  `,
  );
  const text = `환영합니다, ${params.userName}님! ${params.companyName}의 노무원큐 계정이 생성되었습니다. 로그인: ${params.loginUrl}`;
  return { subject, html, text };
}

/** 비밀번호 재설정 이메일 */
export function passwordResetEmail(params: {
  userName: string;
  resetUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = "[노무원큐] 비밀번호 재설정 안내";
  const html = layout(
    subject,
    `
    <h2 style="margin:0 0 16px;color:${BRAND.textDark};font-size:20px;">비밀번호 재설정 🔐</h2>
    <p style="color:${BRAND.textMuted};font-size:15px;line-height:1.7;margin:0 0 16px;">
      ${params.userName}님, 비밀번호 재설정을 요청하셨습니다.<br>
      아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.
    </p>
    ${button("비밀번호 재설정", params.resetUrl)}
    <p style="color:${BRAND.textMuted};font-size:13px;line-height:1.6;margin:16px 0 0;">
      ⏰ 이 링크는 1시간 후 만료됩니다.<br>
      본인이 요청하지 않은 경우, 이 메일을 무시해주세요.
    </p>
  `,
  );
  const text = `비밀번호 재설정 링크: ${params.resetUrl} (1시간 내 유효)`;
  return { subject, html, text };
}

/** 서류 만료 알림 이메일 */
export function documentExpiryEmail(params: {
  recipientName: string;
  companyName: string;
  items: {
    employeeName: string;
    documentType: string;
    expiryDate: string;
    daysLeft: number;
  }[];
  dashboardUrl: string;
}): { subject: string; html: string; text: string } {
  const urgentCount = params.items.filter((i) => i.daysLeft <= 7).length;
  const subject = `[노무원큐] 서류 만료 알림${urgentCount > 0 ? " ⚠️ 긴급" : ""} — ${params.companyName}`;

  const itemsHtml = params.items
    .map((item) => {
      const urgency =
        item.daysLeft <= 7
          ? `color:#DC2626;font-weight:700;`
          : `color:${BRAND.gold};font-weight:600;`;
      return `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.textDark};font-size:14px;">${item.employeeName}</td>
      <td style="padding:12px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.textMuted};font-size:14px;">${item.documentType}</td>
      <td style="padding:12px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.textMuted};font-size:14px;">${item.expiryDate}</td>
      <td style="padding:12px 16px;border-bottom:1px solid ${BRAND.border};font-size:14px;text-align:center;">
        <span style="${urgency}">D-${item.daysLeft}</span>
      </td>
    </tr>`;
    })
    .join("");

  const html = layout(
    subject,
    `
    <h2 style="margin:0 0 16px;color:${BRAND.textDark};font-size:20px;">📋 서류 만료 알림</h2>
    <p style="color:${BRAND.textMuted};font-size:15px;line-height:1.7;margin:0 0 20px;">
      ${params.recipientName}님, <strong>${params.companyName}</strong>에서 곧 만료되는 서류가 있습니다.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};border-radius:8px;overflow:hidden;margin:0 0 20px;">
      <tr style="background-color:${BRAND.lightBg};">
        <th style="padding:10px 16px;text-align:left;font-size:13px;color:${BRAND.textMuted};font-weight:600;">직원</th>
        <th style="padding:10px 16px;text-align:left;font-size:13px;color:${BRAND.textMuted};font-weight:600;">서류</th>
        <th style="padding:10px 16px;text-align:left;font-size:13px;color:${BRAND.textMuted};font-weight:600;">만료일</th>
        <th style="padding:10px 16px;text-align:center;font-size:13px;color:${BRAND.textMuted};font-weight:600;">잔여</th>
      </tr>
      ${itemsHtml}
    </table>
    ${button("대시보드에서 확인하기", params.dashboardUrl)}
  `,
  );

  const text = params.items
    .map(
      (i) =>
        `- ${i.employeeName}: ${i.documentType} (${i.expiryDate}, D-${i.daysLeft})`,
    )
    .join("\n");
  return {
    subject,
    html,
    text: `서류 만료 알림\n${text}\n확인: ${params.dashboardUrl}`,
  };
}

/** 계약 갱신 안내 이메일 */
export function contractRenewalEmail(params: {
  recipientName: string;
  companyName: string;
  employeeName: string;
  contractType: string;
  expiryDate: string;
  daysLeft: number;
  renewalUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `[노무원큐] 근로계약 갱신 안내 — ${params.employeeName}`;
  const html = layout(
    subject,
    `
    <h2 style="margin:0 0 16px;color:${BRAND.textDark};font-size:20px;">📝 근로계약 갱신 안내</h2>
    <p style="color:${BRAND.textMuted};font-size:15px;line-height:1.7;margin:0 0 20px;">
      ${params.recipientName}님, <strong>${params.employeeName}</strong>의 근로계약이 곧 만료됩니다.
    </p>
    ${infoBox([
      { label: "사업장", value: params.companyName },
      { label: "직원", value: params.employeeName },
      { label: "계약유형", value: params.contractType },
      { label: "만료일", value: params.expiryDate },
      { label: "잔여일", value: `D-${params.daysLeft}` },
    ])}
    <p style="color:${BRAND.textMuted};font-size:14px;line-height:1.7;margin:16px 0;">
      계약 갱신이 필요한 경우, 아래 버튼을 눌러 새 계약서를 작성해주세요.
    </p>
    ${button("계약서 작성하기", params.renewalUrl)}
  `,
  );
  const text = `근로계약 갱신 안내\n직원: ${params.employeeName}\n만료일: ${params.expiryDate} (D-${params.daysLeft})\n작성: ${params.renewalUrl}`;
  return { subject, html, text };
}

/** 수습 기간 만료 알림 이메일 */
export function probationEndEmail(params: {
  recipientName: string;
  companyName: string;
  employeeName: string;
  hireDate: string;
  probationEndDate: string;
  daysLeft: number;
  evalUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `[노무원큐] 수습 기간 만료 알림 — ${params.employeeName}`;
  const html = layout(
    subject,
    `
    <h2 style="margin:0 0 16px;color:${BRAND.textDark};font-size:20px;">📝 수습 기간 만료 알림</h2>
    <p style="color:${BRAND.textMuted};font-size:15px;line-height:1.7;margin:0 0 20px;">
      ${params.recipientName}님, <strong>${params.employeeName}</strong>의 수습 기간이 곧 종료됩니다.
    </p>
    ${infoBox([
      { label: "사업장", value: params.companyName },
      { label: "직원", value: params.employeeName },
      { label: "입사일", value: params.hireDate },
      { label: "수습 종료일", value: params.probationEndDate },
      { label: "잔여일", value: `D-${params.daysLeft}` },
    ])}
    <p style="color:${BRAND.textMuted};font-size:14px;line-height:1.7;margin:16px 0;">
      수습 평가서를 작성하여 정규 전환 여부를 결정해주세요.
    </p>
    ${button("수습평가서 작성", params.evalUrl)}
  `,
  );
  const text = `수습 기간 만료 알림\n직원: ${params.employeeName}\n종료일: ${params.probationEndDate} (D-${params.daysLeft})\n평가: ${params.evalUrl}`;
  return { subject, html, text };
}

/** 연차촉진 통보 안내 이메일 */
export function annualLeaveNoticeEmail(params: {
  recipientName: string;
  companyName: string;
  employees: { name: string; remainingDays: number; deadline: string }[];
  noticeUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `[노무원큐] 연차촉진 통보 시기 안내 — ${params.companyName}`;

  const rowsHtml = params.employees
    .map(
      (e) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.textDark};font-size:14px;">${e.name}</td>
      <td style="padding:10px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.gold};font-size:14px;font-weight:600;text-align:center;">${e.remainingDays}일</td>
      <td style="padding:10px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.textMuted};font-size:14px;">${e.deadline}</td>
    </tr>`,
    )
    .join("");

  const html = layout(
    subject,
    `
    <h2 style="margin:0 0 16px;color:${BRAND.textDark};font-size:20px;">📬 연차촉진 통보 시기 안내</h2>
    <p style="color:${BRAND.textMuted};font-size:15px;line-height:1.7;margin:0 0 20px;">
      ${params.recipientName}님, 연차촉진 통보가 필요한 직원이 있습니다.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};border-radius:8px;overflow:hidden;margin:0 0 20px;">
      <tr style="background-color:${BRAND.lightBg};">
        <th style="padding:10px 16px;text-align:left;font-size:13px;color:${BRAND.textMuted};font-weight:600;">직원</th>
        <th style="padding:10px 16px;text-align:center;font-size:13px;color:${BRAND.textMuted};font-weight:600;">잔여 연차</th>
        <th style="padding:10px 16px;text-align:left;font-size:13px;color:${BRAND.textMuted};font-weight:600;">통보 기한</th>
      </tr>
      ${rowsHtml}
    </table>
    ${button("연차촉진통보서 작성", params.noticeUrl)}
    <p style="color:${BRAND.textMuted};font-size:13px;line-height:1.6;margin:16px 0 0;">
      💡 <strong>참고:</strong> 근로기준법 제61조에 따라 연차 촉진 절차를 이행하지 않으면 미사용 연차에 대한 보상 의무가 발생합니다.
    </p>
  `,
  );

  const text = params.employees
    .map((e) => `- ${e.name}: 잔여 ${e.remainingDays}일 (기한: ${e.deadline})`)
    .join("\n");
  return {
    subject,
    html,
    text: `연차촉진 통보 안내\n${text}\n작성: ${params.noticeUrl}`,
  };
}
