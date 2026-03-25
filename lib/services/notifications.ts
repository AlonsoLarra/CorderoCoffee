const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL ?? "pedidos@corderocoffee.mx";

export async function sendOrderReadyEmail(params: {
  toEmail: string;
  orderShortId: string;
  orderId: string;
}): Promise<void> {
  const { toEmail, orderShortId } = params;

  if (!RESEND_API_KEY) {
    // Notificaciones no configuradas, se omite silenciosamente
    console.info("[notifications] RESEND_API_KEY not set, skipping email");
    return;
  }

  const html = `
    <h2>¡Tu pedido está listo!</h2>
    <p>Hola, tu pedido <strong>#${orderShortId}</strong> ya está listo para que lo recojas.</p>
    <p>Pasa al mostrador cuando gustes.</p>
    <p>— Cordero Coffee Club</p>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: toEmail,
      subject: `Tu pedido #${orderShortId} está listo`,
      html,
    }),
  });
  // No lanzar error en caso de falla — la notificación es best-effort
}
