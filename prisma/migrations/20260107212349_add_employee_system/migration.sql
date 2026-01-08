-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('ILUMINACAO_PUBLICA', 'BURACO_NA_VIA', 'COLETA_DE_LIXO', 'OBSTRUCAO_DE_CALCADA', 'VAZAMENTO_DE_AGUA', 'OUTROS');

-- AlterTable
ALTER TABLE "CaseEvent" ADD COLUMN     "employeeId" TEXT;

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeCode" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "role" "EmployeeRole" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_cpf_key" ON "Employee"("cpf");

-- CreateIndex
CREATE INDEX "Employee_employeeCode_idx" ON "Employee"("employeeCode");

-- CreateIndex
CREATE INDEX "Employee_role_idx" ON "Employee"("role");

-- CreateIndex
CREATE INDEX "CaseEvent_employeeId_createdAt_idx" ON "CaseEvent"("employeeId", "createdAt");

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
