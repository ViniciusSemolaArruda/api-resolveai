import { EmployeeRole } from "@prisma/client"

export const EMPLOYEE_ROLE_CODE: Record<EmployeeRole, number> = {
  ILUMINACAO_PUBLICA: 1,
  BURACO_NA_VIA: 2,
  COLETA_DE_LIXO: 3,
  OBSTRUCAO_DE_CALCADA: 4,
  VAZAMENTO_DE_AGUA: 5,
  OUTROS: 9,
}
