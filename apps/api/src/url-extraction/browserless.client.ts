import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UnblockResponse {
  content: string;
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
  }>;
  screenshot?: string; // base64 if requested
}

export interface BrowserlessError {
  code: string;
  message: string;
}

@Injectable()
export class BrowserlessClient {
  private readonly logger = new Logger(BrowserlessClient.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BROWSERLESS_API_KEY') || '';
    this.baseUrl =
      this.configService.get<string>('BROWSERLESS_BASE_URL') ||
      'https://production-sfo.browserless.io';
    this.timeout =
      this.configService.get<number>('BROWSERLESS_TIMEOUT_MS') || 30000;
  }

  /**
   * Unblock and scrape a URL using Browserless Unblock API
   * Handles CAPTCHAs, Cloudflare, and bot detection automatically
   */
  async unblock(
    url: string,
    options?: {
      screenshot?: boolean;
      waitForSelector?: string;
    },
  ): Promise<UnblockResponse> {
    const requestBody: Record<string, unknown> = {
      url,
      content: true,
      cookies: true,
      bestAttempt: true,
      // Wait for DOM + initial JS, don't wait for network idle (causes timeouts on heavy sites)
      gotoOptions: {
        waitUntil: 'domcontentloaded',
        timeout: this.timeout,
      },
      // Give JS a moment to render after DOM is ready
      waitForTimeout: 3000,
    };

    if (options?.screenshot) {
      requestBody.screenshot = true;
    }

    if (options?.waitForSelector) {
      requestBody.waitForSelector = {
        selector: options.waitForSelector,
        timeout: this.timeout,
      };
    }

    return this.makeRequest<UnblockResponse>('/unblock', requestBody);
  }

  /**
   * Scrape specific elements from a URL using CSS selectors
   */
  async scrape(
    url: string,
    selectors: string[],
  ): Promise<
    Array<{
      selector: string;
      results: Array<{
        text: string;
        html: string;
        attributes: Record<string, string>;
      }>;
    }>
  > {
    const requestBody = {
      url,
      elements: selectors.map((selector) => ({ selector })),
      gotoOptions: {
        waitUntil: 'networkidle2',
        timeout: this.timeout,
      },
      bestAttempt: true,
    };

    const response = await this.makeRequest<{
      data: Array<{
        selector: string;
        results: Array<{
          text: string;
          html: string;
          attributes: Record<string, string>;
        }>;
      }>;
    }>('/scrape', requestBody);

    return response.data;
  }

  private async makeRequest<T>(
    endpoint: string,
    body: Record<string, unknown>,
    retries = 2,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}?token=${this.apiKey}`;

    this.logger.log(`Making request to ${endpoint} with body: ${JSON.stringify(body)}`);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.timeout + 5000,
        );

        this.logger.log(`Attempt ${attempt + 1}/${retries + 1} to ${endpoint}`);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.error(
            `Browserless API error: ${response.status} ${errorText}`,
          );

          // Handle rate limiting
          if (response.status === 429) {
            throw new Error('QUOTA_EXCEEDED');
          }

          // Retry on 5xx errors
          if (response.status >= 500 && attempt < retries) {
            await this.delay(1000 * (attempt + 1));
            continue;
          }

          throw new Error(`Browserless API error: ${response.status}`);
        }

        const jsonResponse = await response.json();

        // Log response details for debugging
        this.logger.log(`Browserless response for ${body.url}:`);
        this.logger.log(`- Content length: ${jsonResponse.content?.length || 0}`);
        this.logger.log(`- Has cookies: ${!!jsonResponse.cookies?.length}`);
        if (jsonResponse.error) {
          this.logger.error(`- Error in response: ${JSON.stringify(jsonResponse.error)}`);
        }
        // Log if response seems empty or problematic
        if (!jsonResponse.content || jsonResponse.content.length < 100) {
          this.logger.warn(`Response content seems empty or too short. Full response keys: ${Object.keys(jsonResponse).join(', ')}`);
        }

        return jsonResponse;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          this.logger.warn(`Request timed out for ${body.url}`);
          throw new Error('TIMEOUT');
        }

        if (
          error instanceof Error &&
          (error.message === 'QUOTA_EXCEEDED' || error.message === 'TIMEOUT')
        ) {
          throw error;
        }

        if (attempt < retries) {
          this.logger.warn(
            `Request failed, retrying... (${attempt + 1}/${retries})`,
          );
          await this.delay(1000 * (attempt + 1));
          continue;
        }
        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
