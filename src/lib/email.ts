/**
 * 이메일 발송 유틸리티
 *
 * 우선순위:
 * 1. Resend (RESEND_API_KEY) — Vercel 서버리스 환경에 최적
 * 2. Nodemailer SMTP (SMTP_HOST 등) — 로컬/자체 서버용 fallback
 * 3. console.log — 개발용
 */
import { Resend } from "resend";
import nodemailer from "nodemailer";

interface EmailAttachment {
  filename: string;
  content: string; // base64
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  fallback?: boolean;
}

// ── Resend ──
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

// ── Nodemailer SMTP (fallback) ──
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

/**
 * 이메일 발송
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  const from =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "noreply@nomu-oneq.com";

  // 1. Resend (우선)
  const resend = getResend();
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, "base64"),
        })),
      });

      if (error) {
        console.error("[email/resend] 발송 실패:", error.message);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[email/resend] 예외:", message);
      return { success: false, error: message };
    }
  }

  // 2. Nodemailer SMTP (fallback)
  const transport = getTransporter();
  if (transport) {
    try {
      const info = await transport.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, "base64"),
          encoding: "base64" as const,
        })),
      });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[email/smtp] 발송 실패:", message);
      return { success: false, error: message };
    }
  }

  // 3. 개발용 fallback
  console.log(
    "📧 [EMAIL FALLBACK] To:",
    options.to,
    "| Subject:",
    options.subject,
  );
  return { success: true, fallback: true, messageId: `fallback-${Date.now()}` };
}

/**
 * 다수 수신자에게 이메일 일괄 발송
 */
export async function sendBulkEmail(
  recipients: string[],
  subject: string,
  html: string,
  text?: string,
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const to of recipients) {
    const result = await sendEmail({ to, subject, html, text });
    if (result.success) {
      sent++;
    } else {
      failed++;
      errors.push(`${to}: ${result.error}`);
    }
  }

  return { sent, failed, errors };
}
