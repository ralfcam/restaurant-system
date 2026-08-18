import createNextIntlPlugin from "next-intl/plugin"

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Logos travel as base64 on a Server Action. Default body limit is 1MB;
  // a 2MB file encodes to ~2.7MB plus RSC framing. Keep in sync with
  // LOGO_UPLOAD_BODY_SIZE_LIMIT in lib/branding.ts.
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
}

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

export default withNextIntl(nextConfig)
