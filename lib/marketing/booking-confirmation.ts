import "server-only"

/** `&` first so later entities are not re-escaped. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

type ConfirmationMailer = { send: (payload?: unknown) => unknown }

const unconfiguredMailer: ConfirmationMailer = {
  send() {
    throw new Error("Mail provider is not configured.")
  },
}

export async function sendBookingConfirmation(
  {
    email,
    confCode,
    guestName,
    date,
    time,
    partySize,
  }: {
    email: string
    confCode: string
    guestName: string
    date: string
    time: string
    partySize: number
  },
  mailer: ConfirmationMailer = unconfiguredMailer,
): Promise<void> {
  const html = [guestName, date, time, String(partySize), confCode]
    .map(escapeHtml)
    .join(" ")
  await mailer.send({
    to: email,
    html,
  })
}
