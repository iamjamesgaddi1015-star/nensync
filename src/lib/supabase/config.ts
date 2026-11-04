export function publicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const u = new URL(url);
    if (!["https:", "http:"].includes(u.protocol)) return null;
  } catch {
    return null;
  }
  return { url, key };
}
export const timedFetch: typeof fetch = (input, init) => {
  const request = input instanceof Request ? input : null;
  let timeout = 10_000;
  try {
    const url = new URL(request ? request.url : String(input));
    // These Auth calls can include verification-email delivery. Keep a bounded
    // longer deadline without slowing failure detection for workspace reads.
    if (/^\/auth\/v1\/(signup|recover|resend)\/?$/.test(url.pathname))
      timeout = 30_000;
  } catch {
    /* Fetch remains responsible for rejecting an invalid URL. */
  }
  const callerSignal =
    init?.signal !== undefined ? init.signal : request?.signal;
  const deadline = AbortSignal.timeout(timeout);
  return fetch(input, {
    ...init,
    signal: callerSignal ? AbortSignal.any([callerSignal, deadline]) : deadline,
  });
};
