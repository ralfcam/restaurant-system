"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { GuestProfilePanel } from "@/components/staff/guest-profile-panel"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

export function GuestProfileDialog({
  profile,
}: {
  profile: React.ComponentProps<typeof GuestProfilePanel>["profile"]
}) {
  const router = useRouter()
  const t = useTranslations()

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) router.back()
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle>{t("staff.customers.title")}</DialogTitle>
        <GuestProfilePanel profile={profile} />
      </DialogContent>
    </Dialog>
  )
}
