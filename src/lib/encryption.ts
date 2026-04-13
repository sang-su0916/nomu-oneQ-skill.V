/**
 * 주민등록번호 암호화/복호화 유틸리티 (서버사이드 전용)
 * AES-256-GCM 방식
 * 저장 형식: iv:authTag:ciphertext (hex)
 */
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM 권장 IV 길이
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.");
  }
  if (!/^[0-9a-f]{64}$/i.test(key)) {
    throw new Error("ENCRYPTION_KEY는 64자 hex 문자열이어야 합니다.");
  }
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error("ENCRYPTION_KEY는 32바이트(64자 hex)여야 합니다.");
  }
  return keyBuffer;
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return "";

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // iv:authTag:ciphertext 형식으로 저장
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";

  const key = getEncryptionKey();
  const parts = encryptedText.split(":");

  if (parts.length !== 3) {
    console.warn(
      "[encryption] 암호화 형식 불일치 — 마이그레이션 전 데이터일 수 있음",
    );
    return encryptedText;
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const ciphertext = parts[2];

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    console.warn(
      "[encryption] IV/authTag 길이 불일치 — 마이그레이션 전 데이터일 수 있음",
    );
    return encryptedText;
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * 값이 이미 암호화된 형식인지 확인
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  const parts = value.split(":");
  if (parts.length !== 3) return false;

  try {
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    return iv.length === IV_LENGTH && authTag.length === AUTH_TAG_LENGTH;
  } catch {
    return false;
  }
}
