/*
  Warnings:

  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Case" ALTER COLUMN "title" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Case_userId_createdAt_idx" ON "Case"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CaseEvent_authorId_createdAt_idx" ON "CaseEvent"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "CasePhoto_kind_createdAt_idx" ON "CasePhoto"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "User_role_createdAt_idx" ON "User"("role", "createdAt");
