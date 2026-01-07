// lib/http.ts
import { NextResponse } from "next/server"

type JsonObject = Record<string, unknown>

export function ok<T extends JsonObject | unknown[]>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function unauthorized(message = "Não autorizado") {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = "Acesso negado") {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function notFound(message = "Não encontrado") {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function serverError(
  message = "Erro interno",
  extra?: JsonObject
) {
  return NextResponse.json(
    extra ? { error: message, ...extra } : { error: message },
    { status: 500 }
  )
}
