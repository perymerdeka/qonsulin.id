import { createHmac, timingSafeEqual } from "node:crypto";

export const adminCookieName = "qonsulin_admin_session";

export type StaffRole = "admin" | "moderator";

export type AdminSession = {
  email: string;
  role: StaffRole;
  alias?: string;
  userId?: string;
  expiresAt: number;
};

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

export function createAdminSessionValue(email: string, role: StaffRole = "admin", alias?: string, userId?: string) {
  const expiresAt = Date.now() + maxAgeSeconds * 1000;
  const payload = Buffer.from(JSON.stringify({ email, role, alias, userId, expiresAt }), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function getAdminSession(cookieValue?: string): AdminSession | null {
  if (!cookieValue) return null;

  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<AdminSession>;
    if (!data.email || typeof data.expiresAt !== "number" || data.expiresAt <= Date.now()) return null;

    const validRoles: StaffRole[] = ["admin", "moderator"];
    const role: StaffRole = data.role && validRoles.includes(data.role as StaffRole)
      ? (data.role as StaffRole)
      : data.email.toLowerCase() === getAdminEmail().toLowerCase()
        ? "admin"
        : "admin";

    return {
      email: data.email,
      role,
      alias: data.alias || (data.email.toLowerCase() === getAdminEmail().toLowerCase() ? "Administrator" : "Staf"),
      userId: data.userId,
      expiresAt: data.expiresAt
    };
  } catch {
    return null;
  }
}

export function verifyAdminSessionValue(cookieValue?: string, allowedRoles?: StaffRole[]): boolean {
  const session = getAdminSession(cookieValue);
  if (!session) return false;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(session.role);
}

export function getAdminEmail() {
  return process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_QONSULIN_ADMIN_EMAIL || "halo@qonsulin.id";
}

export function verifyAdminCredentials(email: string, password: string) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) return false;

  return email.trim().toLowerCase() === getAdminEmail().toLowerCase() && password.trim() === configuredPassword.trim();
}