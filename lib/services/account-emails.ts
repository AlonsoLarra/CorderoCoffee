const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL ?? "Cuenta Cordero <cuenta@corderocoffee.mx>";

type AccountEmailPayload = {
  toEmail: string;
  appBaseUrl: string;
};

type AccountEmailWithTokenPayload = AccountEmailPayload & {
  verificationToken: string;
};

async function sendAccountEmail(params: {
  toEmail: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!RESEND_API_KEY) {
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: params.toEmail,
        subject: params.subject,
        html: params.html,
      }),
    });
  } catch {
    // Best effort: no bloquear los flujos de auth por un fallo de email.
  }
}

export async function sendWelcomePendingConfirmationEmail({
  toEmail,
  appBaseUrl,
  verificationToken,
}: AccountEmailWithTokenPayload): Promise<void> {
  const verificationUrl = `${appBaseUrl}/acceso/verificar-email?token=${verificationToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Confirma tu cuenta en Cordero Coffee Club</h2>
      <p style="color: #666; font-size: 16px;">Hola,</p>
      <p style="color: #666; font-size: 16px;">Recibimos una solicitud para crear una cuenta con este correo. Haz clic en el botón de abajo para confirmar tu cuenta:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #8B5A3C; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-size: 16px;">Confirmar mi cuenta</a>
      </div>
      
      <p style="color: #666; font-size: 14px;">O copia este link si el botón no funciona:</p>
      <p style="color: #0066cc; font-size: 12px; word-break: break-all;"><a href="${verificationUrl}">${verificationUrl}</a></p>
      
      <p style="color: #999; font-size: 12px; margin-top: 30px;">Si no fuiste tú quien solicitó esta cuenta, ignora este correo.</p>
      <p style="color: #999; font-size: 12px;">Este enlace vence en 24 horas.</p>
    </div>
  `;

  await sendAccountEmail({
    toEmail,
    subject: "Confirma tu cuenta en Cordero Coffee Club",
    html,
  });
}

export async function sendConfirmationLinkRequestedEmail({
  toEmail,
  appBaseUrl,
  verificationToken,
}: AccountEmailWithTokenPayload): Promise<void> {
  const verificationUrl = `${appBaseUrl}/acceso/verificar-email?token=${verificationToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Reenvío de confirmación</h2>
      <p style="color: #666; font-size: 16px;">Hola,</p>
      <p style="color: #666; font-size: 16px;">Solicitaste reenviar el correo de confirmación. Haz clic en el botón de abajo para confirmar tu cuenta:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #8B5A3C; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-size: 16px;">Confirmar mi cuenta</a>
      </div>
      
      <p style="color: #666; font-size: 14px;">O copia este link si el botón no funciona:</p>
      <p style="color: #0066cc; font-size: 12px; word-break: break-all;"><a href="${verificationUrl}">${verificationUrl}</a></p>
      
      <p style="color: #999; font-size: 12px; margin-top: 30px;">Si no fuiste tú quien solicitó esto, ignora este correo.</p>
      <p style="color: #999; font-size: 12px;">Este enlace vence en 24 horas.</p>
    </div>
  `;

  await sendAccountEmail({
    toEmail,
    subject: "Reenvío de confirmación de cuenta",
    html,
  });
}

export async function sendPasswordResetRequestedEmail({
  toEmail,
  appBaseUrl,
  verificationToken,
}: AccountEmailWithTokenPayload): Promise<void> {
  const resetUrl = `${appBaseUrl}/acceso/nueva-contrasena?token=${verificationToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Restablece tu contraseña</h2>
      <p style="color: #666; font-size: 16px;">Hola,</p>
      <p style="color: #666; font-size: 16px;">Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #8B5A3C; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-size: 16px;">Restablecer contraseña</a>
      </div>
      
      <p style="color: #666; font-size: 14px;">O copia este link si el botón no funciona:</p>
      <p style="color: #0066cc; font-size: 12px; word-break: break-all;"><a href="${resetUrl}">${resetUrl}</a></p>
      
      <p style="color: #999; font-size: 12px; margin-top: 30px;">Si no fuiste tú quien solicitó este cambio, te recomendamos cambiar tu contraseña inmediatamente desde tu cuenta.</p>
      <p style="color: #999; font-size: 12px;">Este enlace vence en 24 horas.</p>
    </div>
  `;

  await sendAccountEmail({
    toEmail,
    subject: "Restablece tu contraseña en Cordero Coffee Club",
    html,
  });
}
