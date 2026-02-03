-- CreateTable
CREATE TABLE "ProjectFacts" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workflowSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pricing" TEXT,
    "promos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ctaRules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedProof" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "harshLabelsBan" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectFacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFacts_projectId_key" ON "ProjectFacts"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectFacts" ADD CONSTRAINT "ProjectFacts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
