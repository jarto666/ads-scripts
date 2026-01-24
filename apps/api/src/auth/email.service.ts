import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

  async sendMagicLink(email: string, magicLink: string): Promise<void> {
    const provider = this.configService.get<string>('EMAIL_PROVIDER');

    if (provider === 'resend') {
      await this.sendViaResend(email, magicLink);
    } else {
      // Default: log to console (development mode)
      this.logMagicLink(email, magicLink);
    }
  }

  private async sendViaResend(email: string, magicLink: string): Promise<void> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const fromEmail =
      this.configService.get<string>('EMAIL_FROM') || 'noreply@example.com';

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not set, falling back to console logging');
      this.logMagicLink(email, magicLink);
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject: 'Your Magic Link - UGC Script Factory',
          html: this.getMagicLinkEmailHtml(magicLink),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Failed to send email via Resend: ${error}`);
        throw new Error('Failed to send email');
      }

      this.logger.log(`Magic link sent to ${email}`);
    } catch (error) {
      this.logger.error(`Email sending failed: ${error}`);
      throw error;
    }
  }

  private logMagicLink(email: string, magicLink: string): void {
    this.logger.log('========================================');
    this.logger.log(`MAGIC LINK for ${email}:`);
    this.logger.log(magicLink);
    this.logger.log('========================================');
  }

  private getMagicLinkEmailHtml(magicLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Magic Link</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; font-size: 24px;">Sign in to UGC Script Factory</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Click the button below to sign in. This link will expire in 15 minutes.
          </p>
          <a href="${magicLink}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0;">
            Sign In
          </a>
          <p style="color: #999; font-size: 14px;">
            If you didn't request this email, you can safely ignore it.
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">
            Or copy and paste this URL into your browser:<br>
            <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px; word-break: break-all;">${magicLink}</code>
          </p>
        </body>
      </html>
    `;
  }
}
