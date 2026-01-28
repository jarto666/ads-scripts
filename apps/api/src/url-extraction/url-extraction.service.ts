import { Injectable, Logger } from '@nestjs/common';
import { BrowserlessClient } from './browserless.client';
import { OpenRouterClient } from '../generation/openrouter.client';

export interface ExtractionResult {
  title?: string;
  description?: string;
  offers: string[];
  pageType: 'homepage' | 'product' | 'landing' | 'unknown';
  language?: string;
  rawHtml?: string;
  url: string;
}

export interface ExtractionError {
  code: 'AUTH_REQUIRED' | 'NO_CONTENT' | 'QUOTA_EXCEEDED' | 'TIMEOUT' | 'EXTRACTION_FAILED';
  message: string;
}

@Injectable()
export class UrlExtractionService {
  private readonly logger = new Logger(UrlExtractionService.name);

  constructor(
    private browserless: BrowserlessClient,
    private openRouter: OpenRouterClient,
  ) {}

  /**
   * Extract product information from a URL using AI
   */
  async extractFromUrl(url: string): Promise<ExtractionResult> {
    this.logger.log(`Extracting content from: ${url}`);

    try {
      // Use Browserless Unblock API to get page content
      const response = await this.browserless.unblock(url);

      this.logger.log(`Browserless response received:`);
      this.logger.log(`- Has content: ${!!response.content}`);
      this.logger.log(`- Content length: ${response.content?.length || 0}`);

      if (!response.content) {
        this.logger.error(`No content returned from Browserless for ${url}`);
        throw { code: 'NO_CONTENT', message: 'No content returned from page' };
      }

      const html = response.content;

      // Check for blocked/CAPTCHA pages
      const blockedIndicators = [
        'robot check',
        'captcha',
        'verify you are a human',
        'please enable cookies',
        'access denied',
        'sorry, we just need to make sure',
        'automated access',
        'unusual traffic',
      ];
      const lowerHtml = html.toLowerCase();
      const blockedMatch = blockedIndicators.find(indicator => lowerHtml.includes(indicator));
      if (blockedMatch) {
        this.logger.error(`Page appears to be blocked (detected: "${blockedMatch}")`);
        throw {
          code: 'AUTH_REQUIRED',
          message: `Page blocked by anti-bot protection (${blockedMatch})`,
        };
      }

      // Check for login/auth walls
      if (this.detectAuthWall(html)) {
        throw {
          code: 'AUTH_REQUIRED',
          message: 'Page requires authentication',
        };
      }

      // First try basic extraction (meta tags, etc.)
      const basicResult = this.parseHtml(html, url);

      // If basic extraction found good content, use it
      if (basicResult.title && basicResult.description) {
        this.logger.log(`Basic extraction successful: "${basicResult.title}"`);
        return basicResult;
      }

      // Otherwise, use AI to extract from raw HTML
      this.logger.log(`Basic extraction failed, using AI extraction...`);
      const aiResult = await this.extractWithAI(html, url);

      if (!aiResult.title && !aiResult.description) {
        this.logger.error(`AI extraction also failed for ${url}`);
        throw { code: 'NO_CONTENT', message: 'Could not extract meaningful content' };
      }

      this.logger.log(
        `AI extracted from ${url}: title="${aiResult.title}", pageType=${aiResult.pageType}`,
      );

      return aiResult;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'QUOTA_EXCEEDED') {
          throw { code: 'QUOTA_EXCEEDED', message: 'Service quota exceeded, try later' };
        }
        if (error.message === 'TIMEOUT') {
          throw { code: 'TIMEOUT', message: 'Page took too long to load' };
        }
      }

      // Check if it's already an ExtractionError
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }

      this.logger.error(`Extraction failed for ${url}:`, error);
      throw { code: 'EXTRACTION_FAILED', message: 'Failed to extract content from page' };
    }
  }

  /**
   * Use AI to extract product information from HTML
   */
  private async extractWithAI(html: string, url: string): Promise<ExtractionResult> {
    // Truncate HTML to avoid token limits (keep first 30k chars)
    const truncatedHtml = html.length > 30000 ? html.substring(0, 30000) + '...[truncated]' : html;

    const prompt = `Analyze this HTML and extract product/page information.

URL: ${url}

## HTML Content
${truncatedHtml}

## Task
Extract product information and return as JSON following this EXACT structure:

{
  "title": "Product or page title (from h1, title tag, or og:title)",
  "description": "2-4 sentence description of the product/service. Focus on what it is and key benefits.",
  "offers": [
    "$99.99",
    "20% off with code SAVE20",
    "Free shipping over $50"
  ],
  "pageType": "product",
  "language": "en"
}

## Field Guidelines
- title: Look in h1, title tag, og:title, twitter:title, or JSON-LD name
- description: Check meta description, og:description, JSON-LD description, or first substantial paragraph
- offers: Extract prices ($, €, £), discounts (% off), promo codes, shipping offers. Return empty array [] if none found
- pageType: "product" (has add to cart/buy), "landing" (has signup/CTA), "homepage" (main site page), or "unknown"
- language: 2-letter code from html lang attribute or content-language meta

Return ONLY valid JSON, no markdown, no explanation.`;

    try {
      const content = await this.openRouter.chatCompletion(
        [{ role: 'user', content: prompt }],
        {
          model: 'anthropic/claude-3-5-haiku',
          temperature: 0.1,
          maxTokens: 1000,
          jsonMode: true,
        },
      );

      this.logger.log(`AI extraction response: ${content.substring(0, 500)}`);

      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.error('AI did not return valid JSON');
        return {
          offers: [],
          pageType: 'unknown',
          url,
          rawHtml: html,
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        title: parsed.title || undefined,
        description: parsed.description || undefined,
        offers: Array.isArray(parsed.offers) ? parsed.offers : [],
        pageType: parsed.pageType || 'unknown',
        language: parsed.language || undefined,
        url,
        rawHtml: html,
      };
    } catch (error) {
      this.logger.error('AI extraction failed:', error);
      return {
        offers: [],
        pageType: 'unknown',
        url,
        rawHtml: html,
      };
    }
  }

  private parseHtml(html: string, url: string): ExtractionResult {
    const result: ExtractionResult = {
      offers: [],
      pageType: 'unknown',
      url,
      rawHtml: html,
    };

    // Extract title
    result.title = this.extractTitle(html);

    // Extract description
    result.description = this.extractDescription(html);

    // Extract offers/pricing
    result.offers = this.extractOffers(html);

    // Detect page type
    result.pageType = this.detectPageType(html, url);

    // Detect language
    result.language = this.extractLanguage(html);

    return result;
  }

  private extractTitle(html: string): string | undefined {
    // Try Open Graph title first
    const ogTitle = this.extractMeta(html, 'og:title');
    if (ogTitle) return ogTitle;

    // Try Twitter title
    const twitterTitle = this.extractMeta(html, 'twitter:title');
    if (twitterTitle) return twitterTitle;

    // Try page title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) return this.cleanText(titleMatch[1]);

    // Try H1
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) return this.cleanText(h1Match[1]);

    return undefined;
  }

  private extractDescription(html: string): string | undefined {
    // Try Open Graph description
    const ogDesc = this.extractMeta(html, 'og:description');
    if (ogDesc) return ogDesc;

    // Try meta description
    const metaDesc = this.extractMetaName(html, 'description');
    if (metaDesc) return metaDesc;

    // Try Twitter description
    const twitterDesc = this.extractMeta(html, 'twitter:description');
    if (twitterDesc) return twitterDesc;

    // Try JSON-LD description
    const jsonLd = this.extractJsonLd(html);
    if (jsonLd?.description) return jsonLd.description;

    // Try first substantial paragraph
    const paragraphs = html.match(/<p[^>]*>([^<]{50,})<\/p>/gi);
    if (paragraphs && paragraphs.length > 0) {
      const text = paragraphs[0].replace(/<[^>]+>/g, '');
      return this.cleanText(text).substring(0, 500);
    }

    return undefined;
  }

  private extractOffers(html: string): string[] {
    const offers: string[] = [];

    // Look for price patterns
    const pricePatterns = [
      /\$[\d,]+(?:\.\d{2})?/g,
      /€[\d,]+(?:\.\d{2})?/g,
      /£[\d,]+(?:\.\d{2})?/g,
      /\d+%\s*(?:off|discount)/gi,
      /save\s+\$?[\d,]+/gi,
      /free\s+shipping/gi,
      /limited\s+time/gi,
      /special\s+offer/gi,
    ];

    for (const pattern of pricePatterns) {
      const matches = html.match(pattern);
      if (matches) {
        offers.push(...matches.map((m) => this.cleanText(m)));
      }
    }

    // Look for promo codes
    const promoPattern = /(?:code|coupon|promo)[:\s]+([A-Z0-9]{4,})/gi;
    const promoMatches = html.matchAll(promoPattern);
    for (const match of promoMatches) {
      if (match[1]) {
        offers.push(`Code: ${match[1]}`);
      }
    }

    // Remove duplicates and limit
    return [...new Set(offers)].slice(0, 10);
  }

  private detectPageType(
    html: string,
    url: string,
  ): 'homepage' | 'product' | 'landing' | 'unknown' {
    const lowerHtml = html.toLowerCase();
    const lowerUrl = url.toLowerCase();

    // Product page indicators
    const productIndicators = [
      'add to cart',
      'add to bag',
      'buy now',
      'add-to-cart',
      'product-price',
      'schema.org/product',
      'og:type" content="product',
    ];
    const productScore = productIndicators.filter((i) =>
      lowerHtml.includes(i),
    ).length;

    // Landing page indicators
    const landingIndicators = [
      'sign up',
      'get started',
      'join now',
      'start free',
      'try for free',
      'book a demo',
      'schedule a call',
    ];
    const landingScore = landingIndicators.filter((i) =>
      lowerHtml.includes(i),
    ).length;

    // Homepage indicators
    const homepageIndicators = [
      'featured products',
      'our services',
      'about us',
      'contact us',
      'footer',
      '<nav',
    ];
    const homepageScore = homepageIndicators.filter((i) =>
      lowerHtml.includes(i),
    ).length;

    // URL-based detection
    if (
      lowerUrl.includes('/product/') ||
      lowerUrl.includes('/products/') ||
      lowerUrl.includes('/item/')
    ) {
      return 'product';
    }

    if (lowerUrl.endsWith('/') && !lowerUrl.includes('/page')) {
      const path = new URL(url).pathname;
      if (path === '/' || path === '') {
        return 'homepage';
      }
    }

    // Score-based detection
    if (productScore >= 2) return 'product';
    if (landingScore >= 2) return 'landing';
    if (homepageScore >= 3) return 'homepage';

    return 'unknown';
  }

  private extractLanguage(html: string): string | undefined {
    // Try html lang attribute
    const langMatch = html.match(/<html[^>]*lang=["']([a-z]{2}(?:-[A-Z]{2})?)/i);
    if (langMatch) return langMatch[1].substring(0, 2);

    // Try meta content-language
    const metaLang = this.extractMetaHttpEquiv(html, 'content-language');
    if (metaLang) return metaLang.substring(0, 2);

    return undefined;
  }

  private detectAuthWall(html: string): boolean {
    const authIndicators = [
      'please log in',
      'please sign in',
      'login required',
      'sign in to continue',
      'create an account',
      'password',
      'type="password"',
    ];

    const lowerHtml = html.toLowerCase();
    const hasLoginForm = lowerHtml.includes('type="password"');
    const hasAuthText = authIndicators.some((i) => lowerHtml.includes(i));

    // Only flag as auth wall if it has a password field AND auth text
    // and the content is relatively short (actual auth page, not just a login link)
    return hasLoginForm && hasAuthText && html.length < 50000;
  }

  private extractMeta(html: string, property: string): string | undefined {
    const pattern = new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      'i',
    );
    const match = html.match(pattern);
    if (match) return this.cleanText(match[1]);

    // Try reverse order (content before property)
    const pattern2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      'i',
    );
    const match2 = html.match(pattern2);
    if (match2) return this.cleanText(match2[1]);

    return undefined;
  }

  private extractMetaName(html: string, name: string): string | undefined {
    const pattern = new RegExp(
      `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`,
      'i',
    );
    const match = html.match(pattern);
    if (match) return this.cleanText(match[1]);

    // Try reverse order
    const pattern2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`,
      'i',
    );
    const match2 = html.match(pattern2);
    if (match2) return this.cleanText(match2[1]);

    return undefined;
  }

  private extractMetaHttpEquiv(html: string, name: string): string | undefined {
    const pattern = new RegExp(
      `<meta[^>]+http-equiv=["']${name}["'][^>]+content=["']([^"']+)["']`,
      'i',
    );
    const match = html.match(pattern);
    if (match) return this.cleanText(match[1]);

    return undefined;
  }

  private extractJsonLd(
    html: string,
  ): { description?: string; name?: string } | undefined {
    const scriptPattern =
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/gi;
    const matches = html.matchAll(scriptPattern);

    for (const match of matches) {
      try {
        const data = JSON.parse(match[1]);
        if (data['@type'] === 'Product' || data['@type'] === 'WebPage') {
          return {
            description: data.description,
            name: data.name,
          };
        }
      } catch {
        // Invalid JSON, continue
      }
    }

    return undefined;
  }

  private cleanText(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
