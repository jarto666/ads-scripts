-- CreateTable
CREATE TABLE "ProjectDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "completedSteps" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "sourceUrl" TEXT,
    "importMethod" TEXT NOT NULL DEFAULT 'scratch',
    "formData" JSONB NOT NULL DEFAULT '{}',
    "extractedAt" TIMESTAMP(3),
    "extractionData" JSONB,
    "analyzedAt" TIMESTAMP(3),
    "analysisData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDraft_userId_key" ON "ProjectDraft"("userId");

-- CreateIndex
CREATE INDEX "ProjectDraft_userId_idx" ON "ProjectDraft"("userId");

-- AddForeignKey
ALTER TABLE "ProjectDraft" ADD CONSTRAINT "ProjectDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
