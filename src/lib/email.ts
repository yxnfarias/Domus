const FROM = process.env.RESEND_FROM_EMAIL ?? 'Domus <onboarding@resend.dev>'
const SITE  = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function buildInviteHtml(inviteLink: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>Convite — Domus</title>
</head>
<body style="margin:0;padding:0;background:#F0EDE5;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE5;padding:48px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:14px;overflow:hidden;box-shadow:0 4px 32px rgba(8,32,24,0.10);">

  <!-- Header -->
  <tr>
    <td style="background:#0F3D2E;padding:36px 44px;">
      <p style="margin:0;font-family:Georgia,serif;font-size:24px;color:#FAF7F2;letter-spacing:0.06em;">Domus</p>
      <p style="margin:6px 0 0;font-size:11px;color:rgba(250,247,242,0.50);letter-spacing:0.18em;text-transform:uppercase;">Plataforma Imobiliária</p>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:44px 44px 36px;">
      <p style="margin:0 0 10px;font-size:11px;color:#8A9E96;text-transform:uppercase;letter-spacing:0.14em;">Convite</p>
      <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:22px;font-weight:400;color:#1A2E26;line-height:1.4;">
        Você foi convidado para<br/>o Domus
      </h1>
      <p style="margin:0 0 28px;font-size:14px;color:#4A5E56;line-height:1.8;">
        Você recebeu um convite para acessar a plataforma Domus. Clique no botão abaixo para criar sua senha e começar a usar o sistema.
      </p>

      <!-- CTA -->
      <table cellpadding="0" cellspacing="0" style="margin:0 0 36px;">
        <tr>
          <td style="background:#0F3D2E;border-radius:8px;">
            <a href="${inviteLink}" style="display:block;padding:15px 32px;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#FAF7F2;text-decoration:none;letter-spacing:0.03em;">
              Aceitar convite &rarr;
            </a>
          </td>
        </tr>
      </table>

      <!-- Link fallback -->
      <p style="margin:0 0 8px;font-size:12px;color:#8A9E96;">Ou copie este link no navegador:</p>
      <p style="margin:0 0 28px;font-size:11px;color:#4A7A60;word-break:break-all;line-height:1.6;">${inviteLink}</p>

      <p style="margin:0;font-size:11px;color:#B0BDB8;line-height:1.7;">
        Este link expira em 7 dias. Se você não esperava este convite, pode ignorar este e-mail com segurança.
      </p>
    </td>
  </tr>

  <!-- Divider -->
  <tr><td style="padding:0 44px;"><div style="height:1px;background:#EDE9E0;"></div></td></tr>

  <!-- Footer -->
  <tr>
    <td style="padding:24px 44px;">
      <p style="margin:0;font-size:11px;color:#B0BDB8;line-height:1.7;">
        Domus · Plataforma Imobiliária<br/>
        <a href="${SITE}" style="color:#4A7A60;text-decoration:none;">${SITE}</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

export async function sendInviteEmail(to: string, inviteLink: string): Promise<{ error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { error: 'RESEND_API_KEY não configurada' }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to,
      subject: 'Você foi convidado para o Domus',
      html: buildInviteHtml(inviteLink),
    }),
  })

  if (res.ok) return { error: null }

  const body = await res.json().catch(() => ({}))
  return { error: body.message ?? body.error ?? `HTTP ${res.status}` }
}
