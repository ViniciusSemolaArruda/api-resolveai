// app/api/cloudinary/signature/route.ts
import crypto from "crypto"
import { NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { verifyToken } from "../../../../lib/auth"

export const runtime = "nodejs"

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() ?? null
}

export async function GET(req: Request) {
  try {
    // ✅ 1) exige login
    const token = getBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // ✅ 2) valida token (retorno tipado)
    const { userId } = await verifyToken(token)
    if (!userId) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    // ✅ 3) garante que usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 })
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    // ✅ folder isolado por usuário
    const baseFolder = process.env.CLOUDINARY_FOLDER || "resolve-ai/cases"
    const folder = `${baseFolder}/${userId}`

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        {
          error: "Cloudinary env missing",
          cloudName: !!cloudName,
          apiKey: !!apiKey,
          apiSecret: !!apiSecret,
        },
        { status: 500 }
      )
    }

    const timestamp = Math.floor(Date.now() / 1000)

    // ⚠️ ordem e parâmetros precisam bater com o upload
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`

    const signature = crypto
      .createHash("sha1")
      .update(paramsToSign + apiSecret)
      .digest("hex")

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
    })
  } catch (e) {
    console.error("GET /api/cloudinary/signature error:", e)
    return NextResponse.json({ error: "Erro ao gerar assinatura" }, { status: 500 })
  }
}
