"use client";

import { useState, type RefObject } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface EmailSendButtonProps {
  documentTitle: string;
  documentType: string;
  recipientName?: string;
  /** 미리보기 영역의 ref — PDF 생성에 사용 */
  printRef?: RefObject<HTMLDivElement | null>;
  className?: string;
}

export default function EmailSendButton({
  documentTitle,
  documentType,
  recipientName,
  printRef,
  className,
}: EmailSendButtonProps) {
  const { company } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [attachPdf, setAttachPdf] = useState(true);

  /** html2canvas + jsPDF로 PDF base64 생성 */
  const generatePdfBase64 = async (): Promise<string | null> => {
    if (!printRef?.current) return null;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const el = printRef.current;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgWidth = 210; // A4 mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");

      // 여러 페이지 처리
      const pageHeight = 297;
      let position = 0;
      const imgData = canvas.toDataURL("image/jpeg", 0.85);

      while (position < imgHeight) {
        if (position > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, -position, imgWidth, imgHeight);
        position += pageHeight;
      }

      const base64 = pdf.output("datauristring").split(",")[1];
      return base64;
    } catch (err) {
      console.error("PDF 생성 실패:", err);
      return null;
    }
  };

  const handleSend = async () => {
    if (!email || !email.includes("@")) {
      setErrorMsg("올바른 이메일 주소를 입력해주세요.");
      return;
    }

    setSending(true);
    setResult("idle");
    setErrorMsg("");

    try {
      // PDF 생성 (옵션)
      let attachments;
      if (attachPdf && printRef?.current) {
        const pdfBase64 = await generatePdfBase64();
        if (pdfBase64) {
          const filename = `${documentTitle.replace(/[^가-힣a-zA-Z0-9\s_-]/g, "").trim()}.pdf`;
          attachments = [{ filename, content: pdfBase64 }];
        }
      }

      const companyName = company?.name || "사업장";
      const subject =
        `[노무원큐] ${documentType} — ${recipientName || ""}`.trim();
      const html = buildEmailHtml({
        companyName,
        documentType,
        documentTitle,
        recipientName: recipientName || "",
        siteUrl: window.location.origin,
        hasPdf: !!attachments,
      });

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-call": "true",
        },
        body: JSON.stringify({
          to: email,
          subject,
          html,
          text: `${companyName} - ${documentType}가 발급되었습니다.${attachments ? " PDF가 첨부되어 있습니다." : ""}`,
          attachments,
        }),
      });

      if (res.ok) {
        setResult("success");
        setTimeout(() => {
          setOpen(false);
          setResult("idle");
          setEmail("");
        }, 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "발송에 실패했습니다.");
        setResult("error");
      }
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다.");
      setResult("error");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || "btn-secondary"}
      >
        📧 이메일 발송
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => !sending && setOpen(false)}
        >
          <div
            className="bg-[var(--bg-card)] rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[var(--text)] mb-1">
              서류 이메일 발송
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-5">
              {documentTitle}
            </p>

            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              받는 사람 이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMsg("");
              }}
              placeholder="employee@example.com"
              className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] mb-3"
              disabled={sending}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />

            {/* PDF 첨부 옵션 */}
            {printRef?.current && (
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachPdf}
                  onChange={(e) => setAttachPdf(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  disabled={sending}
                />
                <span className="text-sm text-[var(--text)]">
                  PDF 파일 첨부
                </span>
              </label>
            )}

            {errorMsg && (
              <p className="text-sm text-red-500 mb-2">{errorMsg}</p>
            )}

            {result === "success" && (
              <p className="text-sm text-green-600 mb-2">
                {attachPdf ? "PDF 첨부 발송 완료!" : "발송 완료!"}
              </p>
            )}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setResult("idle");
                  setEmail("");
                  setErrorMsg("");
                }}
                disabled={sending}
                className="flex-1 py-3 rounded-lg border border-[var(--border)] text-[var(--text)] font-medium hover:bg-[var(--bg)] transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || result === "success"}
                className="flex-1 py-3 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {sending
                  ? attachPdf
                    ? "PDF 생성 중..."
                    : "발송 중..."
                  : result === "success"
                    ? "발송 완료"
                    : "발송"}
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] mt-3 text-center">
              {attachPdf && printRef?.current
                ? "서류가 PDF로 변환되어 이메일에 첨부됩니다"
                : "서류 발급 알림이 이메일로 전송됩니다"}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function buildEmailHtml(params: {
  companyName: string;
  documentType: string;
  documentTitle: string;
  recipientName: string;
  siteUrl: string;
  hasPdf: boolean;
}): string {
  const navy = "#1E3A5F";
  const gold = "#D4A843";
  const bg = "#F8F9FA";
  const border = "#E5E7EB";
  const muted = "#6b7280";
  const dark = "#1a1a1a";
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const pdfNotice = params.hasPdf
    ? `<p style="color:${dark};font-size:14px;line-height:1.7;margin:0 0 20px;padding:12px 16px;background:#E8F5E9;border-radius:8px;">📎 <strong>PDF 파일이 첨부</strong>되어 있습니다. 다운로드하여 확인하세요.</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:linear-gradient(135deg,${navy},#2a4a6f);padding:32px 40px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="margin:0;color:${gold};font-size:24px;font-weight:700;">노무원큐</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">엘비즈파트너스 노무관리 솔루션</p>
  </td></tr>
  <tr><td style="background:#fff;padding:40px;border-left:1px solid ${border};border-right:1px solid ${border};">
    <h2 style="margin:0 0 16px;color:${dark};font-size:20px;">📄 서류 발급 안내</h2>
    <p style="color:${muted};font-size:15px;line-height:1.7;margin:0 0 20px;">
      ${params.recipientName ? `${params.recipientName}님, ` : ""}아래 서류가 발급되었습니다.
    </p>
    ${pdfNotice}
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};border-radius:8px;margin:0 0 24px;">
      <tr><td style="padding:12px 16px;color:${muted};font-size:13px;">사업장</td><td style="padding:12px 16px;color:${dark};font-size:14px;font-weight:500;">${params.companyName}</td></tr>
      <tr><td style="padding:12px 16px;color:${muted};font-size:13px;">서류 종류</td><td style="padding:12px 16px;color:${dark};font-size:14px;font-weight:500;">${params.documentType}</td></tr>
      <tr><td style="padding:12px 16px;color:${muted};font-size:13px;">발급일</td><td style="padding:12px 16px;color:${dark};font-size:14px;font-weight:500;">${today}</td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td align="center">
        <a href="${params.siteUrl}/dashboard" style="display:inline-block;padding:14px 36px;background:${navy};color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">노무원큐에서 확인하기</a>
      </td></tr>
    </table>
    <p style="color:${muted};font-size:13px;line-height:1.6;">${params.hasPdf ? "첨부된 PDF를 확인하시거나, 위 버튼을 눌러 노무원큐에서 서류를 관리하세요." : "서류 원본은 노무원큐에 로그인하여 확인·다운로드할 수 있습니다."}</p>
  </td></tr>
  <tr><td style="background:#fff;padding:24px 40px 32px;border-top:1px solid ${border};border-radius:0 0 12px 12px;border:1px solid ${border};border-top:1px solid ${border};text-align:center;">
    <p style="margin:0;color:${muted};font-size:12px;line-height:1.6;">
      &copy; ${new Date().getFullYear()} 엘비즈파트너스 | 노무원큐<br>
      본 메일은 발신 전용이며, 회신되지 않습니다.
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
