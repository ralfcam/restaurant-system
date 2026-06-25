export default function AuthErrorPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-semibold">
          Authentication error
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong during sign-in. Please try again.
        </p>
        <a
          href="/auth/login"
          className="mt-4 inline-block text-sm text-primary underline underline-offset-4"
        >
          Back to login
        </a>
      </div>
    </div>
  )
}
