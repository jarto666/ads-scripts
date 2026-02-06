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
          subject: 'Sign in to Klippli',
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
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="dark">
          <meta name="supported-color-schemes" content="dark">
          <title>Sign in to Klippli</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0d0e14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0d0e14; min-height: 100vh;">
            <tr>
              <td align="center" style="padding: 48px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px;">

                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding-bottom: 40px;">
                      <span style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #f0f2f4;">Klipp</span><span style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #00bcd4;">li</span>
                    </td>
                  </tr>

                  <!-- Card -->
                  <tr>
                    <td style="background-color: #161825; border-radius: 12px; border: 1px solid #1e2030; padding: 40px 36px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-bottom: 16px;">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #f0f2f4; letter-spacing: -0.3px;">Sign in to your account</h1>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 28px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #7a7f9a;">
                              Click the button below to securely sign in. This link expires in 15 minutes and can only be used once.
                            </p>
                          </td>
                        </tr>

                        <!-- Button -->
                        <tr>
                          <td align="center" style="padding-bottom: 28px;">
                            <a href="${magicLink}" style="display: inline-block; background-color: #00bcd4; color: #0d0e14; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; letter-spacing: 0.2px;">
                              Sign in to Klippli
                            </a>
                          </td>
                        </tr>

                        <!-- Divider -->
                        <tr>
                          <td style="padding-bottom: 20px;">
                            <div style="height: 1px; background-color: #1e2030;"></div>
                          </td>
                        </tr>

                        <!-- Fallback link -->
                        <tr>
                          <td>
                            <p style="margin: 0 0 8px 0; font-size: 12px; color: #4a4f6a;">
                              Or copy this link into your browser:
                            </p>
                            <p style="margin: 0; font-size: 12px; line-height: 1.5; word-break: break-all;">
                              <a href="${magicLink}" style="color: #00bcd4; text-decoration: none;">${magicLink}</a>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding-top: 32px;">
                      <p style="margin: 0; font-size: 12px; color: #3a3f5a; line-height: 1.5;">
                        If you didn&rsquo;t request this email, you can safely ignore it.
                      </p>
                      <p style="margin: 12px 0 0 0; font-size: 11px; color: #2a2f4a;">
                        &copy; ${new Date().getFullYear()} Klippli &middot; AI UGC Script Generator
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }
}
