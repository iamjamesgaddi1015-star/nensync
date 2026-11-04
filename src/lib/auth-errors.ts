const GENERIC_SIGNUP_ERROR =
  "Signup could not be completed. Try again later or sign in if you already have an account.";

// Allowlist corrective feedback. Never reflect arbitrary provider messages,
// email addresses, tokens or account-existence information into the form.
export function signupErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return GENERIC_SIGNUP_ERROR;
  const code = "code" in error ? error.code : undefined;
  if (code === "weak_password") {
    const text =
      "message" in error && typeof error.message === "string"
        ? error.message
        : "";
    const match = /at least (\d{1,3}) characters/i.exec(text);
    const minimum = match ? Number(match[1]) : 0;
    return minimum > 0 && minimum <= 256
      ? `Use a password of at least ${Math.max(12, minimum)} characters to meet this workspace's requirements.`
      : "Your password does not meet this workspace's security requirements. Try a longer, unique password.";
  }
  if (code === "email_address_invalid")
    return "Enter a valid email address that can receive verification emails.";
  if (code === "email_address_not_authorized")
    return "Verification email delivery is not configured for this address. Contact the workspace owner.";
  if (code === "signup_disabled" || code === "email_provider_disabled")
    return "Account registration is currently unavailable. Contact the workspace owner.";
  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit"
  )
    return "Too many signup attempts or verification emails. Wait before trying again and check your inbox.";
  const name = "name" in error ? error.name : undefined;
  if (
    name === "TimeoutError" ||
    name === "AbortError" ||
    name === "AuthRetryableFetchError" ||
    ("status" in error && error.status === 0)
  )
    return "The server did not confirm signup before the connection ended. Check your inbox before retrying; your account may already have been created.";
  return GENERIC_SIGNUP_ERROR;
}
