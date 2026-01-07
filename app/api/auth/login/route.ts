// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin";

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET ausente no .env.local");
  return new TextEncoder().encode(s);
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Erro desconhecido";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
    };

    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    /**
     * ============================
     * LOGIN ADMIN FIXO
     * ============================
     */
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = await new SignJWT({
        sub: "admin",
        role: "ADMIN",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(getJwtSecret());

      return NextResponse.json({
        user: {
          id: "admin",
          name: "Administrador",
          email: ADMIN_EMAIL,
          role: "ADMIN",
        },
        token,
      });
    }

    /**
     * ============================
     * LOGIN USUÁRIO NORMAL
     * ============================
     */
    const userDb = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
      },
    });

    if (!userDb || !userDb.passwordHash) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, userDb.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    const token = await new SignJWT({
      sub: userDb.id,
      role: userDb.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(getJwtSecret());

    return NextResponse.json({
      user: {
        id: userDb.id,
        name: userDb.name,
        email: userDb.email,
        role: userDb.role,
      },
      token,
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    return NextResponse.json(
      { error: "Erro ao logar", message },
      { status: 500 }
    );
  }
}
