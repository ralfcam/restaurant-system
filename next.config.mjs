import path from "node:path"
import { fileURLToPath } from "node:url"
import createNextIntlPlugin from "next-intl/plugin"

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin both roots here: Turbopack infers workspace root from an ancestor
  // lockfile; a stray home-directory package-lock.json caused 360 orphaned
  // .next workers (~22 GB) and a host crash.
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
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
