/**
 * Prisma seed script
 * Run with: npx prisma db seed
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

/**
 * English StylePolicy - Stable
 * Based on benchmark testing (2026-01-30)
 */
const ENGLISH_STYLE_POLICY = {
  language: 'en',
  scope: 'global',
  status: 'stable',
  schemaVersion: 1,

  // Word usage limits
  wordLimits: {
    just: { max: 1, enforce: true },
    literally: { max: 0, enforce: true },
    exclamations: { max: 2, enforce: true },
    ellipsis: { max: 1, enforce: false },
    caps_words: { max: 2, enforce: false },
  },

  // Exact match banned phrases (meme clichés)
  bannedPhrases: [
    'game changer',
    'game-changer',
    'life changing',
    'life-changing',
    'you need to see this',
    'wait for it',
    'trust me on this',
    'I said what I said',
    'and I\'m not even kidding',
    'let that sink in',
    'read that again',
    'this is not a drill',
    'hear me out',
    'I\'ll never shut up about this',
  ],

  // Regex patterns for structural clichés
  bannedRegex: [
    // "Not A, not B, just C" variations
    'not\\s+\\w+[,.]?\\s*not\\s+\\w+[,.]?\\s*(just|only)\\s+\\w+',
    // "No X, no Y, just results"
    'no\\s+\\w+[,.]?\\s*no\\s+\\w+[,.]?\\s*(just|only)',
    // "literally X seconds/minutes"
    'literally\\s+\\d+\\s*(seconds?|minutes?|hours?)',
    // "in just X seconds"
    'in\\s+just\\s+\\d+\\s*(seconds?|minutes?)',
    // "X in just Y" time claims
    '\\w+\\s+in\\s+just\\s+\\d+',
    // Made-up promos
    'first\\s+\\d+\\s+(free|users?|customers?)',
    '\\d+%\\s*off',
    'promo\\s*code',
    'no\\s+credit\\s+card\\s+(needed|required)',
    // Hook starting with "Okay" or "Okay,"
    '^okay[,\\s]',
  ],

  // Soft warnings (not hard blocks)
  softAvoid: [
    'starting sentences with "So..."',
    'excessive rhetorical questions',
    'more than one "you guys" or "y\'all"',
    '"Right?" at end of sentences',
    '"Okay so" as opener',
  ],

  // Harsh tone words
  harshWords: [
    'terrible',
    'ugly',
    'horrible',
    'crappy',
    'garbage',
    'trash',
    'worst',
    'pathetic',
    'disgusting',
    'awful',
  ],
};

async function main() {
  console.log('Seeding database...');

  // Upsert English StylePolicy
  const englishPolicy = await prisma.stylePolicy.upsert({
    where: {
      language_scope: {
        language: ENGLISH_STYLE_POLICY.language,
        scope: ENGLISH_STYLE_POLICY.scope,
      },
    },
    update: {
      ...ENGLISH_STYLE_POLICY,
      updatedAt: new Date(),
    },
    create: ENGLISH_STYLE_POLICY,
  });

  console.log(`✓ English StylePolicy created/updated: ${englishPolicy.id}`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
