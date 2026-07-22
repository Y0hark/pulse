export interface Mailer {
  sendMagicLink(email: string, link: string): Promise<void>;
}

/** Dev-only stub: logs the link instead of sending real email. Swap for a real provider later. */
export class ConsoleMailer implements Mailer {
  async sendMagicLink(email: string, link: string): Promise<void> {
    console.log(`[magic-link] ${email} -> ${link}`);
  }
}

export interface ResendMailerOptions {
  apiKey: string;
  from: string;
}

/** Sends via the Resend HTTP API directly (no SDK) — one dependency-free fetch call. */
export class ResendMailer implements Mailer {
  constructor(private readonly opts: ResendMailerOptions) {}

  async sendMagicLink(email: string, link: string): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.opts.from,
        to: email,
        subject: 'Your Pulse sign-in link',
        html: `<p>Click to sign in to Pulse:</p><p><a href="${link}">${link}</a></p><p>This link expires shortly and can only be used once.</p>`,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Resend send failed (${res.status}): ${body}`);
    }
  }
}
