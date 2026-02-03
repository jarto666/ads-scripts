-- CreateTable
CREATE TABLE "StylePolicy" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "status" TEXT NOT NULL DEFAULT 'beta',
    "wordLimits" JSONB NOT NULL DEFAULT '{}',
    "bannedPhrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bannedRegex" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "softAvoid" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "harshWords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StylePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StylePolicy_language_idx" ON "StylePolicy"("language");

-- CreateIndex
CREATE UNIQUE INDEX "StylePolicy_language_scope_key" ON "StylePolicy"("language", "scope");
