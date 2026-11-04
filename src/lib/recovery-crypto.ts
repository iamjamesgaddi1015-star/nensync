import { createHmac, timingSafeEqual } from "node:crypto";
export function signRecovery(userId: string, secret: string, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, expires: now + 600000 }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function verifyRecovery(
  value: string | undefined,
  userId: string,
  secret: string,
  now = Date.now(),
) {
  if (!value || value.length > 2048) return false;
  try {
    const [payload, signature, ...extra] = value.split(".");
    if (extra.length || !payload || !signature) return false;
    const expected = createHmac("sha256", secret).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return false;
    const p: unknown = JSON.parse(Buffer.from(payload, "base64url").toString());
    return (
      !!p &&
      typeof p === "object" &&
      "sub" in p &&
      p.sub === userId &&
      "expires" in p &&
      typeof p.expires === "number" &&
      p.expires > now &&
      p.expires <= now + 600000
    );
  } catch {
    return false;
  }
}
