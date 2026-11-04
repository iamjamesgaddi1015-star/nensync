import "server-only";
import { signRecovery, verifyRecovery } from "../recovery-crypto";
export const RECOVERY_COOKIE = "nensync-recovery";
function key() {
  const value = process.env.NENSYNC_RECOVERY_SECRET;
  return value && value.length >= 32 ? value : null;
}
export function recoveryContext(userId: string) {
  const secret = key();
  return secret ? signRecovery(userId, secret) : null;
}
export function verifiedRecovery(value: string | undefined, userId: string) {
  const secret = key();
  return !!secret && verifyRecovery(value, userId, secret);
}
