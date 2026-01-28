import { Injectable, Logger } from '@nestjs/common';
import { OpenRouterClient } from '../generation/openrouter.client';
import { ExtractionResult } from '../url-extraction/url-extraction.service';

export interface PersonaSuggestion {
  id: string;
  name: string;
  description: string;
  demographics?: string;
  painPoints: string[];
  desires: string[];
  objections: string[];
  confidence: number;
}

export interface AnalysisResult {
  productSummary: string;
  brandVoice?: string;
  suggestedPersonas: PersonaSuggestion[];
  confidence: number;
}

const ANALYSIS_SYSTEM_PROMPT = `You are an expert marketing analyst specializing in customer personas and brand positioning.
Your task is to analyze product/website content and generate actionable insights for UGC (User-Generated Content) ad scripts.

You must respond with valid JSON only. No markdown, no explanations outside the JSON.`;

@Injectable()
export class ProjectAnalysisService {
  private readonly logger = new Logger(ProjectAnalysisService.name);

  constructor(private openRouter: OpenRouterClient) {}

  /**
   * Analyze extracted content and generate AI-enriched suggestions
   */
  async analyzeExtraction(
    extractionData: ExtractionResult,
  ): Promise<AnalysisResult> {
    const prompt = this.buildAnalysisPrompt(extractionData);

    try {
      const response = await this.openRouter.chatCompletion(
        [
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        {
          model: 'anthropic/claude-3-5-haiku',
          temperature: 0.5,
          maxTokens: 4096,
          jsonMode: true,
        },
      );

      const parsed = this.parseAnalysisResponse(response);
      this.logger.log(
        `Analysis complete: ${parsed.suggestedPersonas.length} personas generated`,
      );

      return parsed;
    } catch (error) {
      this.logger.error('AI analysis failed:', error);
      // Return minimal result on failure
      return {
        productSummary:
          extractionData.description ||
          extractionData.title ||
          'Product description unavailable',
        suggestedPersonas: [],
        confidence: 0,
      };
    }
  }

  private buildAnalysisPrompt(data: ExtractionResult): string {
    // Truncate raw HTML to avoid token limits
    const contentPreview = data.rawHtml
      ? this.extractTextContent(data.rawHtml).substring(0, 5000)
      : '';

    return `Analyze this product page and provide structured data for UGC ad script generation.

## Extracted Content
Title: ${data.title || 'Unknown'}
Description: ${data.description || 'Not found'}
Page Type: ${data.pageType}
Detected Offers: ${data.offers.length > 0 ? data.offers.join(', ') : 'None found'}
URL: ${data.url}

## Page Text Preview
${contentPreview || 'No text content available'}

## Task
Generate a JSON response with:

1. **productSummary**: A concise, compelling product description (2-3 sentences, max 500 chars) suitable for ad scripts. Focus on the core value proposition.

2. **brandVoice**: Brief description of the brand's tone and style (e.g., "Professional and trustworthy", "Fun and energetic", "Premium and exclusive"). Max 100 chars.

3. **suggestedPersonas**: An array of 2-4 distinct target customer personas. Each persona must include:
   - id: A unique string identifier (e.g., "persona-1", "persona-2")
   - name: A memorable 2-4 word label (e.g., "Busy Professional Mom", "Health-Conscious Millennial")
   - description: 2-3 sentences describing this person's situation and why they'd want this product
   - demographics: Age range, occupation, life situation (optional)
   - painPoints: Array of 3-5 specific problems they face that this product solves
   - desires: Array of 3-5 outcomes or aspirations they have
   - objections: Array of 2-3 reasons they might hesitate to buy
   - confidence: Number 0-1 indicating how confident you are this is a good persona for this product

4. **confidence**: Overall confidence score 0-1 for the entire analysis

## Requirements
- Make each persona distinctly different (vary by life stage, motivation, urgency)
- Pain points should be specific and emotional, not generic
- Desires should focus on transformation and outcomes
- Objections should be realistic concerns a buyer might have
- If you can't extract enough information, return fewer personas with lower confidence

## Response Format
{
  "productSummary": "string",
  "brandVoice": "string",
  "suggestedPersonas": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "demographics": "string",
      "painPoints": ["string"],
      "desires": ["string"],
      "objections": ["string"],
      "confidence": 0.8
    }
  ],
  "confidence": 0.8
}`;
  }

  private parseAnalysisResponse(response: string): AnalysisResult {
    try {
      const parsed = JSON.parse(response);

      // Validate and sanitize the response
      return {
        productSummary:
          typeof parsed.productSummary === 'string'
            ? parsed.productSummary.substring(0, 500)
            : 'Product description unavailable',
        brandVoice:
          typeof parsed.brandVoice === 'string'
            ? parsed.brandVoice.substring(0, 100)
            : undefined,
        suggestedPersonas: this.validatePersonas(parsed.suggestedPersonas),
        confidence:
          typeof parsed.confidence === 'number'
            ? Math.min(1, Math.max(0, parsed.confidence))
            : 0.5,
      };
    } catch (error) {
      this.logger.error('Failed to parse AI response:', error);
      return {
        productSummary: 'Product description unavailable',
        suggestedPersonas: [],
        confidence: 0,
      };
    }
  }

  private validatePersonas(personas: unknown): PersonaSuggestion[] {
    if (!Array.isArray(personas)) return [];

    return personas
      .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
      .map((p, index) => ({
        id: typeof p.id === 'string' ? p.id : `persona-${index + 1}`,
        name:
          typeof p.name === 'string'
            ? p.name.substring(0, 100)
            : `Persona ${index + 1}`,
        description:
          typeof p.description === 'string'
            ? p.description.substring(0, 500)
            : '',
        demographics:
          typeof p.demographics === 'string'
            ? p.demographics.substring(0, 200)
            : undefined,
        painPoints: this.validateStringArray(p.painPoints, 5),
        desires: this.validateStringArray(p.desires, 5),
        objections: this.validateStringArray(p.objections, 3),
        confidence:
          typeof p.confidence === 'number'
            ? Math.min(1, Math.max(0, p.confidence))
            : 0.5,
      }))
      .slice(0, 4); // Max 4 personas
  }

  private validateStringArray(arr: unknown, maxItems: number): string[] {
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((item): item is string => typeof item === 'string')
      .map((s) => s.substring(0, 200))
      .slice(0, maxItems);
  }

  private extractTextContent(html: string): string {
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode common HTML entities
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }
}
