/**
 * Test script to compare model quality for script generation
 * Run with: npx ts-node scripts/test-models.ts
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

const MODELS = [
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', tier: 'standard' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Haiku 4.5', tier: 'standard' },
  { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', tier: 'premium' },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Sonnet 4.5', tier: 'premium' },
];

// Sample project data for testing
const TEST_PROJECT = {
  name: 'RiffRight',
  productDescription: `RiffRight is an AI-powered audio mastering and mix analysis platform that helps musicians instantly analyze their mixes and get professional-grade mastering. Upload your track and get detailed feedback on EQ balance, dynamics, stereo width, and loudness - plus one-click AI mastering that rivals expensive studio sessions.`,
  offer: '14-day free trial, then $19/month',
  brandVoice: 'Professional but approachable, technical expertise made accessible, enthusiastic about helping musicians succeed',
  forbiddenClaims: ['guaranteed hit', 'sounds exactly like', 'replaces human engineers'],
  language: 'en',
  personas: [
    {
      name: 'Bedroom Producer',
      description: 'Independent music producer creating beats and tracks from home studio. Self-taught, uploads to Spotify/SoundCloud.',
      painPoints: ['Mixes sound muddy compared to pro releases', 'Can\'t afford professional mastering', 'No feedback on what\'s wrong'],
      desires: ['Radio-ready sound', 'Confidence in releases', 'Learn to mix better'],
    },
    {
      name: 'Podcast Creator',
      description: 'Content creator producing weekly podcast episodes. Needs consistent audio quality across episodes.',
      painPoints: ['Audio levels inconsistent', 'Voice sounds thin or boomy', 'Editing takes too long'],
      desires: ['Professional podcast sound', 'Faster workflow', 'Stand out from competition'],
    },
  ],
};

const TEST_SETTINGS = {
  platform: 'tiktok',
  angles: ['pain_agitation', 'transformation', 'social_proof'],
  durations: [30, 45],
  count: 5,
};

// Platform prompt block (simplified for testing)
const PLATFORM_BLOCK = `## Platform: TikTok
Style: Raw, authentic, slightly chaotic energy. Hooks must stop the scroll in 0.5-1s.
Tone: Casual, relatable, "talking to a friend" vibe. Embrace trending sounds/formats.
Hook Style: Pattern interrupt, controversial take, or "POV/storytime" opener.
Pacing: Fast cuts (2-4s per scene), visual variety, text overlays throughout.
CTA Style: Soft CTAs work better ("link in bio", "I'll drop the link").
Caption Density: Heavy text overlays, often full captions on screen.`;

async function callOpenRouter(
  messages: Array<{ role: string; content: string }>,
  model: string,
  temperature = 0.7,
): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ugc-script-factory.com',
      'X-Title': 'UGC Script Factory - Model Test',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}

function buildPass1Prompt(): string {
  const personaDescriptions = TEST_PROJECT.personas
    .map(p => `- ${p.name}: ${p.description} Pain points: ${p.painPoints.join(', ')}. Desires: ${p.desires.join(', ')}`)
    .join('\n');

  return `You are an expert UGC video ad script planner specializing in short-form vertical content.

${PLATFORM_BLOCK}

## Product
${TEST_PROJECT.productDescription}

Offer: ${TEST_PROJECT.offer}

## Target Audiences
${personaDescriptions}

## Brand Voice
${TEST_PROJECT.brandVoice}

## Forbidden Claims (DO NOT USE)
${TEST_PROJECT.forbiddenClaims.map(c => `- ${c}`).join('\n')}

## Beat Count Guidelines
- 30s: 4-6 beats
- 45s: 6-8 beats

## Task
Generate ${TEST_SETTINGS.count} unique script PLANS for PAID ADS covering these angles: ${TEST_SETTINGS.angles.join(', ')}
Each plan should have a duration from: ${TEST_SETTINGS.durations.join('s, ')}s

For each plan, provide:
1. angle: One of the specified angles
2. duration: Target duration in seconds
3. hookIdea: A compelling hook idea matching the platform style
4. beats: Bullet points outlining the script structure
5. complianceNotes: Any potential compliance risks

Return your response as a JSON array:
[
  {
    "angle": "pain_agitation",
    "duration": 30,
    "hookIdea": "Stop scrolling if you're tired of...",
    "beats": ["Hook with pain point", "Show the struggle", "Introduce solution", ...],
    "complianceNotes": ["Note 1"]
  }
]

IMPORTANT: Return ONLY valid JSON, no markdown.`;
}

function buildPass2Prompt(plan: any): string {
  return `You are an expert UGC video ad script writer specializing in short-form vertical content.

${PLATFORM_BLOCK}

## Product
${TEST_PROJECT.productDescription}

Offer: ${TEST_PROJECT.offer}

## Target Audience
${TEST_PROJECT.personas.map(p => `${p.name}: ${p.description}`).join('; ')}

## Brand Voice
${TEST_PROJECT.brandVoice}

## FORBIDDEN (Never use these):
${TEST_PROJECT.forbiddenClaims.map(c => `- "${c}"`).join('\n')}

## Script Plan to Expand
Angle: ${plan.angle}
Duration: ${plan.duration}s
Hook Idea: ${plan.hookIdea}
Beats: ${plan.beats.join(' → ')}

## Task
Write a complete PAID AD script following this EXACT JSON structure:

{
  "angle": "${plan.angle}",
  "duration": ${plan.duration},
  "hook": "The opening hook line (attention-grabbing, under 3 seconds)",
  "storyboard": [
    {
      "t": "0-3s",
      "shot": "Description of what's in frame",
      "onScreen": "Text overlay for this segment",
      "spoken": "Exact words the creator says",
      "broll": ["Optional b-roll idea"]
    }
  ],
  "ctaVariants": ["CTA option 1", "CTA option 2", "CTA option 3"],
  "filmingChecklist": ["Filming instruction 1", "Props needed", "etc."],
  "warnings": ["Any compliance warnings"]
}

REQUIREMENTS:
- Hook MUST grab attention in first 2 seconds
- 4-6 storyboard segments for 30s, 6-8 for 45s
- Time segments should add up to ~${plan.duration}s

Return ONLY valid JSON.`;
}

// Quality scoring based on our StylePolicy criteria
const BANNED_PATTERNS = [
  /not\s+\w+[,.]?\s*not\s+\w+[,.]?\s*(just|only)\s+\w+/gi,  // "Not A, not B, just C"
  /no\s+\w+[,.]?\s*no\s+\w+[,.]?\s*(just|only)/gi,          // "No X, no Y, just results"
  /literally\s+\d+\s*(seconds?|minutes?)/gi,                 // "literally 10 seconds"
  /in\s+just\s+\d+\s*(seconds?|minutes?)/gi,                 // "in just 5 seconds"
];

const BANNED_PHRASES = [
  'game changer', 'game-changer', 'life changing', 'life-changing',
  'wait for it', 'trust me on this', 'let that sink in', 'read that again',
];

const HARSH_WORDS = ['terrible', 'ugly', 'horrible', 'crappy', 'garbage', 'trash'];

interface QualityScore {
  total: number;
  details: {
    justCount: number;
    literallyCount: number;
    exclamationCount: number;
    bannedPhraseHits: string[];
    bannedPatternHits: string[];
    harshWordHits: string[];
    hookWordCount: number;
    hookHasQuestion: boolean;
    hookHasYou: boolean;
  };
}

function scoreScript(script: any): QualityScore {
  if (!script || script.error) {
    return { total: 0, details: { justCount: 0, literallyCount: 0, exclamationCount: 0, bannedPhraseHits: [], bannedPatternHits: [], harshWordHits: [], hookWordCount: 0, hookHasQuestion: false, hookHasYou: false } };
  }

  const allText = [
    script.hook || '',
    ...(script.storyboard || []).map((s: any) => `${s.spoken || ''} ${s.onScreen || ''}`),
    ...(script.ctaVariants || []),
  ].join(' ');

  const textLower = allText.toLowerCase();

  // Count word occurrences
  const justCount = (allText.match(/\bjust\b/gi) || []).length;
  const literallyCount = (allText.match(/\bliterally\b/gi) || []).length;
  const exclamationCount = (allText.match(/!/g) || []).length;

  // Check banned phrases
  const bannedPhraseHits: string[] = [];
  for (const phrase of BANNED_PHRASES) {
    if (textLower.includes(phrase.toLowerCase())) {
      bannedPhraseHits.push(phrase);
    }
  }

  // Check banned patterns
  const bannedPatternHits: string[] = [];
  for (const pattern of BANNED_PATTERNS) {
    const matches = allText.match(pattern);
    if (matches) {
      bannedPatternHits.push(...matches);
    }
  }

  // Check harsh words
  const harshWordHits: string[] = [];
  for (const word of HARSH_WORDS) {
    if (textLower.includes(word)) {
      harshWordHits.push(word);
    }
  }

  // Hook analysis
  const hook = script.hook || '';
  const hookWordCount = hook.split(/\s+/).filter(Boolean).length;
  const hookHasQuestion = hook.includes('?');
  const hookHasYou = /\byou\b|\byour\b/i.test(hook);

  // Calculate score (100 = perfect, deduct for issues)
  let score = 100;

  // Word limit violations
  if (justCount > 1) score -= (justCount - 1) * 10;
  if (literallyCount > 0) score -= literallyCount * 15;
  if (exclamationCount > 2) score -= (exclamationCount - 2) * 5;

  // Banned content
  score -= bannedPhraseHits.length * 15;
  score -= bannedPatternHits.length * 20;
  score -= harshWordHits.length * 10;

  // Hook quality bonuses/penalties
  if (hookWordCount >= 6 && hookWordCount <= 14) score += 5;
  else if (hookWordCount < 4 || hookWordCount > 20) score -= 10;
  if (hookHasQuestion) score += 5;
  if (hookHasYou) score += 5;

  return {
    total: Math.max(0, Math.min(100, score)),
    details: {
      justCount,
      literallyCount,
      exclamationCount,
      bannedPhraseHits,
      bannedPatternHits,
      harshWordHits,
      hookWordCount,
      hookHasQuestion,
      hookHasYou,
    },
  };
}

interface TestResult {
  model: string;
  modelName: string;
  tier: string;
  pass1: {
    plans: any[];
    tokens: { input: number; output: number };
    timeMs: number;
  };
  pass2: {
    scripts: any[];
    scores: QualityScore[];
    avgScore: number;
    tokens: { input: number; output: number };
    timeMs: number;
  };
  totalTokens: { input: number; output: number };
  totalTimeMs: number;
}

async function testModel(model: typeof MODELS[0]): Promise<TestResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${model.name} (${model.id})`);
  console.log('='.repeat(60));

  // Pass 1: Generate plans
  console.log('\nPass 1: Generating plans...');
  const pass1Start = Date.now();

  const pass1Response = await callOpenRouter(
    [
      { role: 'system', content: 'You are a UGC script planning assistant. Always respond with valid JSON.' },
      { role: 'user', content: buildPass1Prompt() },
    ],
    model.id,
  );

  const pass1Time = Date.now() - pass1Start;
  let plans: any[];

  try {
    // Strip markdown code blocks if present
    let content = pass1Response.content.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(content);
    // Handle if the response is wrapped in an object
    plans = Array.isArray(parsed) ? parsed : (parsed.plans || parsed.scripts || [parsed]);
  } catch (e) {
    console.error('Failed to parse Pass 1 response:', pass1Response.content.substring(0, 500));
    throw e;
  }

  if (!plans || plans.length === 0) {
    console.error('No plans generated. Response:', pass1Response.content.substring(0, 500));
    throw new Error('No plans generated');
  }

  console.log(`  Generated ${plans.length} plans in ${pass1Time}ms`);
  console.log(`  Tokens: ${pass1Response.usage.prompt_tokens} in / ${pass1Response.usage.completion_tokens} out`);

  // Pass 2: Generate full scripts
  console.log('\nPass 2: Generating full scripts...');
  const pass2Start = Date.now();
  const scripts: any[] = [];
  let pass2Tokens = { input: 0, output: 0 };

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    console.log(`  Script ${i + 1}/${plans.length} (${plan.angle}, ${plan.duration}s)...`);

    const pass2Response = await callOpenRouter(
      [
        { role: 'system', content: 'You are a UGC script writer. Always respond with valid JSON.' },
        { role: 'user', content: buildPass2Prompt(plan) },
      ],
      model.id,
    );

    pass2Tokens.input += pass2Response.usage.prompt_tokens;
    pass2Tokens.output += pass2Response.usage.completion_tokens;

    try {
      // Strip markdown code blocks if present
      let content = pass2Response.content.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const script = JSON.parse(content);
      scripts.push(script);
      console.log(`    Hook: "${script.hook?.substring(0, 50)}..."`);
    } catch (e) {
      console.error(`    Failed to parse script:`, pass2Response.content.substring(0, 200));
      scripts.push({ error: 'parse_failed', raw: pass2Response.content.substring(0, 500) });
    }
  }

  const pass2Time = Date.now() - pass2Start;
  console.log(`  Generated ${scripts.length} scripts in ${pass2Time}ms`);
  console.log(`  Tokens: ${pass2Tokens.input} in / ${pass2Tokens.output} out`);

  // Score all scripts
  const scores = scripts.map(s => scoreScript(s));
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.total, 0) / scores.length)
    : 0;

  console.log(`\n  Quality Scores:`);
  scores.forEach((score, i) => {
    const issues: string[] = [];
    if (score.details.justCount > 1) issues.push(`just:${score.details.justCount}`);
    if (score.details.literallyCount > 0) issues.push(`literally:${score.details.literallyCount}`);
    if (score.details.exclamationCount > 2) issues.push(`!:${score.details.exclamationCount}`);
    if (score.details.bannedPhraseHits.length > 0) issues.push(`clichés:${score.details.bannedPhraseHits.length}`);
    if (score.details.bannedPatternHits.length > 0) issues.push(`patterns:${score.details.bannedPatternHits.length}`);
    if (score.details.harshWordHits.length > 0) issues.push(`harsh:${score.details.harshWordHits.length}`);

    console.log(`    Script ${i + 1}: ${score.total}/100 ${issues.length > 0 ? `(${issues.join(', ')})` : '✓'}`);
  });
  console.log(`  Average Score: ${avgScore}/100`);

  return {
    model: model.id,
    modelName: model.name,
    tier: model.tier,
    pass1: {
      plans,
      tokens: { input: pass1Response.usage.prompt_tokens, output: pass1Response.usage.completion_tokens },
      timeMs: pass1Time,
    },
    pass2: {
      scripts,
      scores,
      avgScore,
      tokens: pass2Tokens,
      timeMs: pass2Time,
    },
    totalTokens: {
      input: pass1Response.usage.prompt_tokens + pass2Tokens.input,
      output: pass1Response.usage.completion_tokens + pass2Tokens.output,
    },
    totalTimeMs: pass1Time + pass2Time,
  };
}

async function main() {
  console.log('Script Generation Model Comparison Test');
  console.log('======================================\n');
  console.log(`Testing with: ${TEST_PROJECT.name}`);
  console.log(`Platform: ${TEST_SETTINGS.platform}`);
  console.log(`Scripts per model: ${TEST_SETTINGS.count}`);

  const results: TestResult[] = [];

  for (const model of MODELS) {
    try {
      const result = await testModel(model);
      results.push(result);
    } catch (error) {
      console.error(`\nError testing ${model.name}:`, error);
      results.push({
        model: model.id,
        modelName: model.name,
        tier: model.tier,
        pass1: { plans: [], tokens: { input: 0, output: 0 }, timeMs: 0 },
        pass2: { scripts: [], scores: [], avgScore: 0, tokens: { input: 0, output: 0 }, timeMs: 0 },
        totalTokens: { input: 0, output: 0 },
        totalTimeMs: 0,
      });
    }
  }

  // Save full results
  const outputDir = path.join(__dirname, '../test-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(outputDir, `model-comparison-${timestamp}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\n\nFull results saved to: ${outputFile}`);

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  // Pricing (per 1M tokens)
  const PRICING: Record<string, { input: number; output: number }> = {
    'google/gemini-3-flash-preview': { input: 0.50, output: 3.00 },
    'anthropic/claude-haiku-4.5': { input: 1.00, output: 5.00 },
    'google/gemini-3-pro-preview': { input: 2.00, output: 12.00 },
    'anthropic/claude-sonnet-4.5': { input: 3.00, output: 15.00 },
  };

  console.log('\n| Model | Tier | Time | Tokens (in/out) | Cost/Script | Quality |');
  console.log('|-------|------|------|-----------------|-------------|---------|');

  for (const r of results) {
    const pricing = PRICING[r.model] || { input: 0, output: 0 };
    const costPerScript = (
      (r.totalTokens.input / 1_000_000) * pricing.input +
      (r.totalTokens.output / 1_000_000) * pricing.output
    ) / TEST_SETTINGS.count;

    console.log(
      `| ${r.modelName.padEnd(15)} | ${r.tier.padEnd(8)} | ${(r.totalTimeMs / 1000).toFixed(1).padStart(5)}s | ` +
      `${r.totalTokens.input}/${r.totalTokens.output} | ` +
      `$${costPerScript.toFixed(4).padStart(7)} | ` +
      `${r.pass2.avgScore.toString().padStart(3)}/100 |`
    );
  }

  // Ranking
  const ranked = [...results]
    .filter(r => r.pass2.avgScore > 0)
    .sort((a, b) => b.pass2.avgScore - a.pass2.avgScore);

  console.log('\n' + '='.repeat(80));
  console.log('RANKING BY QUALITY');
  console.log('='.repeat(80));
  ranked.forEach((r, i) => {
    const pricing = PRICING[r.model] || { input: 0, output: 0 };
    const costPerScript = (
      (r.totalTokens.input / 1_000_000) * pricing.input +
      (r.totalTokens.output / 1_000_000) * pricing.output
    ) / TEST_SETTINGS.count;

    console.log(`${i + 1}. ${r.modelName} - Score: ${r.pass2.avgScore}/100, Cost: $${costPerScript.toFixed(4)}/script`);
  });

  // Print sample scripts for quality comparison
  console.log('\n' + '='.repeat(80));
  console.log('SAMPLE SCRIPTS FOR QUALITY COMPARISON');
  console.log('='.repeat(80));

  for (const r of results) {
    if (r.pass2.scripts.length > 0 && !r.pass2.scripts[0].error) {
      const script = r.pass2.scripts[0];
      console.log(`\n--- ${r.modelName} (${r.tier}) ---`);
      console.log(`Hook: "${script.hook}"`);
      console.log(`Storyboard segments: ${script.storyboard?.length || 0}`);
      if (script.storyboard && script.storyboard[0]) {
        console.log(`First beat: [${script.storyboard[0].t}] "${script.storyboard[0].spoken}"`);
      }
      console.log(`CTAs: ${script.ctaVariants?.join(' | ') || 'none'}`);
    }
  }
}

main().catch(console.error);
