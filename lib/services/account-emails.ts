const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL ?? "Cuenta Cordero <cuenta@corderocoffee.mx>";

type AccountEmailPayload = {
  toEmail: string;
  appBaseUrl: string;
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
}: AccountEmailPayload): Promise<void> {
  const html = `
    <h2>Confirma tu cuenta de Cordero Coffee Club</h2>
    <p>Recibimos una solicitud para crear una cuenta con este correo.</p>
    <p>Te enviamos también un enlace oficial de confirmación desde Supabase. Si no lo encuentras, revisa spam/promociones.</p>
    <p>Después de confirmar, podrás iniciar sesión aquí:</p>
    <p><a href="${appBaseUrl}/acceso">${appBaseUrl}/acceso</a></p>
    <p>Si no fuiste tú, ignora este correo.</p>
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
}: AccountEmailPayload): Promise<void> {
  const html = `
    <h2>Reenvío de confirmación solicitado</h2>
    <p>Solicitaste reenviar el correo de confirmación de tu cuenta.</p>
    <p>Te acabamos de mandar un nuevo enlace oficial de verificación.</p>
    <p>Cuando confirmes, inicia sesión en:</p>
    <p><a href="${appBaseUrl}/acceso">${appBaseUrl}/acceso</a></p>
    <p>Si no fuiste tú, ignora este correo.</p>
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
}: AccountEmailPayload): Promise<void> {
  const html = `
    <h2>Solicitud para restablecer contraseña</h2>
    <p>Se solicitó restablecer la contraseña de tu cuenta.</p>
    <p>Te enviamos un enlace oficial para cambiarla.</p>
    <p>Si no fuiste tú, te recomendamos iniciar sesión y actualizar tu contraseña desde tu perfil.</p>
    <p><a href="${appBaseUrl}/acceso">Ir a acceso</a></p>
  `;

  await sendAccountEmail({
    toEmail,
    subject: "Solicitud de recuperación de contraseña",
    html,
  });
}
