"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { updateGuestProfilePii } from "@/app/actions/guest-profiles"
import { ReservationStatusBadge } from "@/components/staff/reservation-status"
import type { ReservationStatus } from "@/lib/data"

type FichaHistoryRow = {
  status: ReservationStatus
  date: string
  time: string
  party_size: number
  table_label?: string | null
  notes?: string | null
  isVisit: boolean
}

export function GuestProfilePanel({
  profile,
  showEmail = true,
}: {
  showEmail?: boolean
  profile: {
    email: string
    guest_name?: string | null
    phone?: string | null
    notes?: string | null
    summary?: {
      totalReservations: number
      completedVisits: number
      lastVisit: string | null
    }
    history?: Array<{
      status: string
      date: string
      time: string
      party_size: number
      table_label?: string | null
      notes?: string | null
      isVisit: boolean
    }>
  }
}) {
  const router = useRouter()
  const t = useTranslations()

  async function saveGuestPii(formData: FormData) {
    const guest_name = String(formData.get("guest_name") ?? "")
    const phone = String(formData.get("phone") ?? "")
    const result = await updateGuestProfilePii({
      email: profile.email,
      guest_name,
      phone,
    })
    if (result.error) toast.error(t(result.error))
    else toast.success(t("staff.customers.saved"))
    router.refresh()
  }

  return (
    <div className="grid gap-3">
      <p>{t("staff.customers.staffOnly")}</p>
      {showEmail ? (
        <p className="grid gap-1 text-sm">
          <span className="text-muted-foreground">
            {t("staff.customers.emailReadOnly")}
          </span>
          <span>{profile.email}</span>
        </p>
      ) : null}
      {profile.summary ? (
        <div className="grid gap-1 text-sm">
          <p>
            {t("staff.customers.totalReservations")}{" "}
            {profile.summary.totalReservations}
          </p>
          <p>
            {t("staff.customers.completedVisits")}{" "}
            {profile.summary.completedVisits}
          </p>
          <p>
            {t("staff.customers.lastVisit")}{" "}
            {profile.summary.lastVisit ?? t("staff.customers.lastVisitNone")}
          </p>
        </div>
      ) : null}
      <form action={saveGuestPii} className="grid gap-3">
        <label htmlFor="guest_name" className="grid gap-1 text-sm">
          {t("staff.customers.name")}
          <input
            id="guest_name"
            name="guest_name"
            autoComplete="name"
            defaultValue={profile.guest_name ?? ""}
            className="rounded-md border px-3 py-2"
          />
        </label>
        <label htmlFor="phone" className="grid gap-1 text-sm">
          {t("staff.customers.phone")}
          <input
            id="phone"
            name="phone"
            autoComplete="tel"
            defaultValue={profile.phone ?? ""}
            className="rounded-md border px-3 py-2"
          />
        </label>
        <button type="submit">
          {t("staff.customers.save")}
          {/* Save */}
        </button>
      </form>
      <p className="grid gap-1 text-sm">
        <span className="text-muted-foreground">
          {t("staff.customers.notesOperational")}
        </span>
        <span>{profile.notes}</span>
      </p>
      <p>{t("staff.customers.notesHelper")}</p>
      <p>{t("staff.customers.operationalLimit")}</p>
      {!profile.history?.length ? (
        <p>
          {t("staff.customers.empty")}
          {/* not found */}
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>{t("staff.customers.date")}</th>
              <th>{t("staff.customers.time")}</th>
              <th>{t("staff.customers.partySize")}</th>
              <th>{t("staff.customers.table")}</th>
              <th>{t("staff.customers.status")}</th>
              <th>{t("staff.customers.historyNotes")}</th>
            </tr>
          </thead>
          <tbody>
            {(profile.history as FichaHistoryRow[]).map((row, index) => (
              <tr key={`${index}-${row.date}-${row.time}-${row.party_size}`}>
                <td>{row.date}</td>
                <td>{row.time}</td>
                <td>{row.party_size}</td>
                <td>{row.table_label}</td>
                <td>
                  <ReservationStatusBadge status={row.status} />
                  {row.isVisit ? t("staff.customers.visit") : null}
                </td>
                <td>{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
