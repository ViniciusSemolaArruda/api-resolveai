import { EmployeeRole } from "@prisma/client"
import { EMPLOYEE_ROLE_CODE } from "../constants/employeeRoleCode"

export function generateEmployeeCode(role: EmployeeRole): number {
  const rolePrefix = EMPLOYEE_ROLE_CODE[role]

  if (!rolePrefix) {
    throw new Error("Cargo inválido")
  }

  const randomPart = Math.floor(100000 + Math.random() * 900000)

  return Number(`${rolePrefix}${randomPart}`)
}
