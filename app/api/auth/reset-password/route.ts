import { NextResponse, type NextRequest } from "next/server";

import { verifyEmailToken } from "@/lib/supabase/email-tokens";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { token, password } = body as { token?: string; password?: string };

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
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
        { error: "Invalid or expired reset link" },
        { status: 400 },
      );
    }

    // If there's a user_id, update their password
    if (tokenData.userId) {
      const supabase = createSupabaseServerClient();

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        tokenData.userId,
        {
          password,
        },
      );

      if (updateError) {
        console.error("Failed to reset password:", updateError);
        return NextResponse.json(
          { error: "Failed to reset password. Please try again." },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Password reset successfully",
      });
    }

    return NextResponse.json(
      { error: "User not found for this email" },
      { status: 404 },
    );
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
