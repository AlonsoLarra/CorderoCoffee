import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyEmailToken } from "@/lib/supabase/email-tokens";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { token } = body as { token?: string };

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Verify the token
    const tokenData = await verifyEmailToken({
      token,
      tokenType: "signup_verification",
    });

    if (!tokenData) {
      return NextResponse.json(
        { error: "Invalid or expired verification link" },
        { status: 400 },
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();

    // If there's a user_id, update their confirmation status
    if (tokenData.userId) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        tokenData.userId,
        {
          email_confirm: true,
        },
      );

      if (updateError) {
        console.error("Failed to confirm email:", updateError);
        return NextResponse.json(
          { error: "Failed to confirm email. Please try again." },
          { status: 500 },
        );
      }

      // Also set email_verified in metadata for additional safety
      await supabaseAdmin.auth.admin.updateUserById(tokenData.userId, {
        user_metadata: {
          email_verified: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
      email: tokenData.email,
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
