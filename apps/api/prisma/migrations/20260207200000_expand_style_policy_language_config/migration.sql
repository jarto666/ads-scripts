-- Step 1: Drop the old unique constraint on (language, scope)
ALTER TABLE "StylePolicy" DROP CONSTRAINT IF EXISTS "StylePolicy_language_scope_key";

-- Step 2: Drop the scope column
ALTER TABLE "StylePolicy" DROP COLUMN IF EXISTS "scope";

-- Step 3: Add unique constraint on language alone
ALTER TABLE "StylePolicy" ADD CONSTRAINT "StylePolicy_language_key" UNIQUE ("language");

-- Step 4: Update schemaVersion default
ALTER TABLE "StylePolicy" ALTER COLUMN "schemaVersion" SET DEFAULT 2;

-- Step 5: Add 16 new String[] columns with defaults
ALTER TABLE "StylePolicy" ADD COLUMN IF NOT EXISTS "clicheHookOpeners" TEXT[] DEFAULT '{}';
ALTER TABLE "StylePolicy" ADD COLUMN IF NOT EXISTS "clicheLlmSmell" TEXT[] DEFAULT '{}';
ALTER TABLE "StylePolicy" ADD COLUMN IF NOT EXISTS "clicheGenericFiller" TEXT[] DEFAULT '{}';
ALTER TABLE "StylePolicy" ADD COLUMN IF NOT EXISTS "clicheStructurePatterns" TEXT[] DEFAULT '{}';

ALTER TABLE "StylePolicy" ADD COLUMN IF NOT EXISTS "hookPowerWords" TEXT[] DEFAULT '{}';
ALTER TABLE "StylePolicy" ADD COLUMN IF NOT EXISTS "benefitWords" TEXT[] DEFAULT '{}';
ALTER TABLE "StylePolicy" ADD COLUMN IF NOT EXISTS "visualActionWords" TEXT[] DEFAULT '{}';
ALTER TABLE "StylePolicy" ADD COLUMN IF NOT EXISTS "ctaActionWords" TEXT[] DEFAULT '{}';
ALTER TABLE "StylePolicy" ADD COLUMN IF NOT EXISTS "ctaUrgencyWords" TEXT[] DEFAULT '{}';
ALTER TABLE "StylePolicy" ADD COLUMN IF NOT EXISTS "conversationalMarkers" TEXT[] DEFAULT '{}';
ALTER TABLE "StylePolicy" ADD COLUMN IF NOT EXISTS "emotionalPatterns" TEXT[] DEFAULT '{}';

ALTER TABLE "StylePolicy" ADD COLUMN IF NOT EXISTS "groundednessAbsolutePatterns" TEXT[] DEFAULT '{}';
ALTER TABLE "StylePolicy" ADD COLUMN IF NOT EXISTS "groundednessScalePatterns" TEXT[] DEFAULT '{}';
ALTER TABLE "StylePolicy" ADD COLUMN IF NOT EXISTS "groundednessPromoPatterns" TEXT[] DEFAULT '{}';
ALTER TABLE "StylePolicy" ADD COLUMN IF NOT EXISTS "groundednessTimelinePatterns" TEXT[] DEFAULT '{}';
ALTER TABLE "StylePolicy" ADD COLUMN IF NOT EXISTS "groundednessSocialProofPatterns" TEXT[] DEFAULT '{}';

-- Step 6: Populate English row with data from TypeScript files
UPDATE "StylePolicy" SET
  "schemaVersion" = 2,

  -- Extend wordLimits with scorePenalty fields from cliche excessive patterns
  "wordLimits" = '{"just":{"max":1,"enforce":true,"scorePenalty":-5},"literally":{"max":0,"enforce":true,"scorePenalty":-8},"exclamations":{"max":2,"enforce":true,"scorePenalty":-3},"ellipsis":{"max":1,"enforce":false},"caps_words":{"max":2,"enforce":false},"like":{"max":3,"enforce":false,"scorePenalty":-3},"really":{"max":2,"enforce":false,"scorePenalty":-4},"amazing":{"max":1,"enforce":false,"scorePenalty":-5},"actually":{"max":2,"enforce":false,"scorePenalty":-3},"basically":{"max":1,"enforce":false,"scorePenalty":-5},"!":{"max":3,"enforce":false,"scorePenalty":-3},"?":{"max":4,"enforce":false,"scorePenalty":-2}}',

  -- Cliché hook openers
  "clicheHookOpeners" = ARRAY[
    'here''s the thing','here''s why','here''s how','here''s what',
    'okay so','so basically','real talk','story time','hear me out',
    'hot take','unpopular opinion','controversial opinion',
    'can we talk about','we need to talk about','let me tell you',
    'i kept seeing','i finally found','i found the secret',
    'nobody talks about','no one is talking about','why is no one',
    'everyone''s been asking','people keep asking',
    'stop scrolling if','stop scrolling','wait until you see',
    'you need to see this','you need to know','you won''t believe',
    'this is your sign','if you''re seeing this',
    'this changed everything','game changer','life changer',
    'this changed my life','best thing i ever','wish i knew sooner',
    'pov: you finally','pov: you just','pov:',
    'the algorithm finally','tiktok made me buy','tiktok made me',
    'i need to tell you'
  ],

  -- LLM smell phrases
  "clicheLlmSmell" = ARRAY[
    'leverage','synergy','optimize','utilize','facilitate',
    'streamline','maximize','scalable',
    'comprehensive solution','cutting-edge','state-of-the-art',
    'industry-leading','best-in-class','world-class','top-tier','premium quality',
    'revolutionary','groundbreaking','game-changing','paradigm shift',
    'holistic approach','robust','seamless experience','seamlessly',
    'elevate your','unlock the potential','unlock your','transform your',
    'empower yourself','take it to the next level','next level',
    'dive into','dive in','delve into','embark on','navigate the',
    'harness the power','supercharge your','revolutionize your','amplify your',
    'unique blend','perfect solution','ultimate solution','one-stop',
    'all-in-one','effortlessly','hassle-free'
  ],

  -- Generic filler phrases
  "clicheGenericFiller" = ARRAY[
    'you won''t believe','this changed my life','obsessed with',
    'absolutely love','so amazing','best thing ever','you need this',
    'trust me on this',
    'no cap','it''s giving','hits different','hit different',
    'iykyk','say less','main character energy','living my best life',
    'i was today years old',
    'the thing is','that part','not me doing','the way i',
    'crying rn','screaming','im dead','i''m dead','no literally','literally dying',
    'highly recommend','would recommend','10/10 recommend','10 out of 10',
    'must have','must-have','life changing','life-changing'
  ],

  -- Structure patterns (regex strings)
  "clicheStructurePatterns" = ARRAY[
    '(?:^|\.\s+)so\s','^okay so\b','^(so\s+)?basically\b',
    '^wait\s+(wait\s+)?wait\b',
    'not\s+\w+,?\s*not\s+\w+,?\s*(just|only)',
    'no\s+\w+,?\s*no\s+\w+,?\s*(just|only)',
    '\bif you''re (tired|sick|struggling)',
    '\b(am i|are we) the only (one|ones?)\b',
    '\bcan we (just )?appreciate\b',
    '\?.*\?.*\?','\?\?+','!!+','\.{4,}',
    '\byou guys\b.*\byou guys\b','\bliterally\b.*\bliterally\b',
    '\bjust\b.*\bjust\b.*\bjust\b',
    '\blike\b.*\blike\b.*\blike\b.*\blike\b',
    '\bi literally cannot\b',
    'right\?\s*$',',\s*right\?'
  ],

  -- Hook power words (scoring)
  "hookPowerWords" = ARRAY[
    'stop','wait','hold on','pause','listen',
    'if you','if you''re','when you','ever wonder',
    'but','however','actually','truth is','reality is',
    'don''t','never','avoid','mistake','wrong',
    'secret','hidden','nobody tells','what if','imagine',
    'everyone','people are','went viral','obsessed',
    'bet you','prove me wrong','change my mind',
    'story time','storytime','true story','confession','finally',
    'works','changed','discovered','found','realized',
    'pov','pov:','me when','that moment when','when your',
    'scared','stressed','hate','tired of','sick of','struggling',
    'crazy','literally','lowkey','highkey','ngl','fr',
    'anyone else','tell me why','is it just me','not me'
  ],

  -- Benefit words (scoring)
  "benefitWords" = ARRAY[
    'get','achieve','unlock','gain','earn','win',
    'transform','change','become','turn into','upgrade',
    'easy','simple','quick','fast','instant','effortless',
    'finally','no more','goodbye','forget','stop struggling',
    'save','free','bonus','extra','included',
    'help','solve','fix','cure','heal','improve',
    'results','outcome','difference','impact','effect',
    'love','enjoy','amazing','incredible','perfect',
    'minutes','seconds','hours','days','weeks','overnight'
  ],

  -- Visual action words (scoring)
  "visualActionWords" = ARRAY[
    'show','reveal','display','present','demonstrate',
    'hold','grab','pick up','put down','place','set',
    'open','close','pour','apply','use','try',
    'close-up','closeup','close up','wide shot','medium shot',
    'pan','zoom','tilt','track','follow',
    'face','hands','eyes','smile','reaction','expression',
    'product','package','box','bottle','label','texture',
    'point','gesture','look at','focus on','highlight',
    'cut to','transition','switch','move to'
  ],

  -- CTA action words
  "ctaActionWords" = ARRAY[
    'click','tap','get','grab','shop','buy','order',
    'try','start','join','sign up','subscribe','follow',
    'check out','discover','learn','see','find out',
    'claim','unlock','access','download','save'
  ],

  -- CTA urgency words
  "ctaUrgencyWords" = ARRAY[
    'now','today','limited','exclusive','only','last chance',
    'hurry','fast','quick','before','while','ending',
    'don''t miss','don''t wait','act now','right now'
  ],

  -- Conversational markers
  "conversationalMarkers" = ARRAY[
    'honestly','literally','actually','okay so','like',
    'you guys','y''all','real talk','no joke','trust me',
    'i mean','right?','you know'
  ],

  -- Emotional patterns (regex strings)
  "emotionalPatterns" = ARRAY[
    '\b(tired|sick|frustrated|hate|love|obsessed|scared|stressed)\b',
    '\b(secret|hidden|truth|real|honest)\b',
    '\b(stop|wait|don''t|never|always)\b'
  ],

  -- Groundedness: absolute claims patterns
  "groundednessAbsolutePatterns" = ARRAY[
    '\bonly\b','\bbest\b','\bultimate\b','\bguaranteed?\b',
    '\b#1\b|number one','\bperfect\b','\bunmatched\b','\bunbeatable\b'
  ],

  -- Groundedness: scale claims patterns
  "groundednessScalePatterns" = ARRAY[
    '\bthousands\b','\bmillions\b','\beveryone\b','\beverybody\b',
    '\bcountless\b','\bhundreds of thousands\b'
  ],

  -- Groundedness: promo patterns
  "groundednessPromoPatterns" = ARRAY[
    '\bfree trial\b','\bno credit card\b','\d+%\s*off\b',
    '\bpromo code\b','\bdiscount\b','\bfirst \d+ free\b',
    '\blimited time\b','\bspecial offer\b','\bexclusive deal\b',
    '\bmoney[- ]back guarantee\b'
  ],

  -- Groundedness: timeline patterns
  "groundednessTimelinePatterns" = ARRAY[
    '\bin (?:just )?\d+ seconds?\b','\binstantly\b','\bovernight\b',
    '\bimmediately\b','\bin minutes\b'
  ],

  -- Groundedness: social proof patterns
  "groundednessSocialProofPatterns" = ARRAY[
    '\b5[- ]star\b','\b4\.[5-9][- ]star\b','\breviews?\b',
    '\btestimonials?\b','\b\d+[kKmM]?\+?\s*(?:users?|customers?|people)\b',
    '\btrusted by\b','\brated\s+#?\d\b','\baward[- ]winning\b'
  ],

  "updatedAt" = NOW()
WHERE "language" = 'en';
