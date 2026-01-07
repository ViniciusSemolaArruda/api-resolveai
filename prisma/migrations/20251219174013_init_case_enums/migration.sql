/*
  Warnings:

  - The `kind` column on the `CasePhoto` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "CasePhotoKind" AS ENUM ('REPORT', 'UPDATE');

-- AlterTable
ALTER TABLE "CasePhoto" DROP COLUMN "kind",
ADD COLUMN     "kind" "CasePhotoKind" NOT NULL DEFAULT 'REPORT';
