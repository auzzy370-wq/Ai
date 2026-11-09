/**
 * Transactional mail. Prefer Resend when RESEND_API_KEY is set.
 * Never log message bodies or verification tokens.
 */

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function fromAddress() {
  return process.env.AUTH_FROM_EMAIL?.trim() || "Crucible <onboarding@resend.dev>";
}

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return "(redacted)";
  const u = user || "";
  const shown = u.length <= 2 ? "*" : `${u[0]}***${u[u.length - 1]}`;
  return `${shown}@${domain}`;
}

export async function sendMail(message: MailMessage): Promise<{ mode: "resend" | "log" }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html ?? undefined,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    return { mode: "resend" };
  }

  // Dev fallback: acknowledge delivery without leaking tokens into logs.
  console.info(
    `[crucible-mail:log] queued subject=${JSON.stringify(message.subject)} to=${maskEmail(message.to)} (body redacted; set RESEND_API_KEY for delivery)`,
  );
  return { mode: "log" };
}
