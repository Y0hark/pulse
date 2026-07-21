export interface Mailer {
  sendMagicLink(email: string, link: string): Promise<void>;
}

/** Dev-only stub: logs the link instead of sending real email. Swap for a real provider later. */
export class ConsoleMailer implements Mailer {
  async sendMagicLink(email: string, link: string): Promise<void> {
    console.log(`[magic-link] ${email} -> ${link}`);
  }
}
