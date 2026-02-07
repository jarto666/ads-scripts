-- Seed English StylePolicy (global)
-- This data was previously in prisma/seed.ts but never ran on production.
-- ON CONFLICT DO NOTHING ensures idempotency.

INSERT INTO "StylePolicy" (
  "id", "language", "scope", "status", "schemaVersion",
  "wordLimits", "bannedPhrases", "bannedRegex", "softAvoid", "harshWords",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid()::TEXT,
  'en', 'global', 'stable', 1,
  '{"just":{"max":1,"enforce":true},"literally":{"max":0,"enforce":true},"exclamations":{"max":2,"enforce":true},"ellipsis":{"max":1,"enforce":false},"caps_words":{"max":2,"enforce":false}}',
  ARRAY['game changer','game-changer','life changing','life-changing','you need to see this','wait for it','trust me on this','I said what I said','and I''m not even kidding','let that sink in','read that again','this is not a drill','hear me out','I''ll never shut up about this'],
  ARRAY['not\s+\w+[,.]?\s*not\s+\w+[,.]?\s*(just|only)\s+\w+','no\s+\w+[,.]?\s*no\s+\w+[,.]?\s*(just|only)','literally\s+\d+\s*(seconds?|minutes?|hours?)','in\s+just\s+\d+\s*(seconds?|minutes?)','\w+\s+in\s+just\s+\d+','first\s+\d+\s+(free|users?|customers?)','\d+%\s*off','promo\s*code','no\s+credit\s+card\s+(needed|required)','^okay[,\s]'],
  ARRAY['starting sentences with "So..."','excessive rhetorical questions','more than one "you guys" or "y''all"','"Right?" at end of sentences','"Okay so" as opener'],
  ARRAY['terrible','ugly','horrible','crappy','garbage','trash','worst','pathetic','disgusting','awful'],
  NOW(), NOW()
) ON CONFLICT ("language", "scope") DO NOTHING;
