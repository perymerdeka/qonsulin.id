import { createHmac, timingSafeEqual } from "node:crypto";

export const adminCookieName = "qonsulin_admin_session";

const maxAgeSeconds = 60 * 60 * 8;

export function getAdminCookieMaxAge() {
  return maxAgeSeconds;
}

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "qonsulin-local-dev-secret";
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function createAdminSessionValue(email: string) {
  const expiresAt = Date.now() + maxAgeSeconds * 1000;
  const payload = Buffer.from(JSON.stringify({ email, expiresAt }), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionValue(cookieValue?: string) {
  if (!cookieValue) return false;

  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: string; expiresAt?: number };
    return data.email === getAdminEmail() && typeof data.expiresAt === "number" && data.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function getAdminEmail() {
  return process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_QONSULIN_ADMIN_EMAIL || "halo@qonsulin.id";
}

export function verifyAdminCredentials(email: string, password: string) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) return false;

  return email.trim().toLowerCase() === getAdminEmail().toLowerCase() && password.trim() === configuredPassword.trim();
}
