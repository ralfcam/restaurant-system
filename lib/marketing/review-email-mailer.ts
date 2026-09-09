import "server-only"

type ReviewEmailMailer = { send: (payload?: unknown) => unknown }

export function createReviewEmailMailer(): ReviewEmailMailer {
  return {
    send() {
      throw new Error("Mail provider is not configured.")
    },
  }
}
