import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyEmailToken } from "@/lib/supabase/email-tokens";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { token, password } = body as { token?: string; password?: string };

    if (!token) {
      return NextResponse.json({ error: "Necesitamos un enlace válido para restablecer tu contraseña." }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 },
      );
    }

    // Verify the token
    const tokenData = await verifyEmailToken({
      token,
      tokenType: "password_reset",
    });

    if (!tokenData) {
      return NextResponse.json(
        { error: "El enlace para restablecer tu contraseña no es válido o ya expiró." },
        { status: 400 },
      );
    }

    if (tokenData.userId) {
      const supabaseAdmin = createSupabaseAdminClient();

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        tokenData.userId,
        {
          password,
        },
      );

      if (updateError) {
        console.error("Failed to reset password:", updateError);
        return NextResponse.json(
          { error: "No pudimos actualizar tu contraseña. Intenta de nuevo." },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Password reset successfully",
      });
    }

    return NextResponse.json(
      { error: "No pudimos validar este enlace de recuperación." },
      { status: 404 },
    );
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({ error: "Ocurrió un error al restablecer tu contraseña." }, { status: 500 });
  }
}
