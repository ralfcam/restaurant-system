import createNextIntlPlugin from "next-intl/plugin"

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Logos and hero photos travel as base64 on a Server Action. Default body
  // limit is 1MB; a 4MB hero file encodes to ~5.4MB plus RSC framing. This
  // limit is shared across all Server Actions, so it must cover the larger
  // of the two. Keep in sync with HERO_UPLOAD_BODY_SIZE_LIMIT in
  // lib/branding.ts.
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
}

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

export default withNextIntl(nextConfig)
