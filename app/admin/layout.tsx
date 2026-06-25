// Middleware in middleware.ts handles auth-gating /admin/* routes.
// This layout exists as an anchor for the /admin segment.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
