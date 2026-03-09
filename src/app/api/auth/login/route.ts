import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticate } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/constants";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
  next: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const user = await authenticate(payload.email, payload.password);

    if (!user) {
      return NextResponse.json(
        { error: "Email atau kata sandi tidak cocok." },
        { status: 401 },
      );
    }

    const redirectTo =
      payload.next && payload.next.startsWith("/")
        ? payload.next
        : user.role === "operator"
          ? "/mobile"
          : "/dashboard";

    const response = NextResponse.json({ redirectTo });
    response.cookies.set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof z.ZodError ? "Input login tidak valid." : "Gagal login.",
      },
      { status: 400 },
    );
  }
}
