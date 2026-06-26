"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { OperatingWindow, updateOperatingWindow, addBlockedDate, removeBlockedDate, getBlockedDatesInMonth } from "@/app/actions/availability"
import { Trash2, Plus } from "lucide-react"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function SchedulingManager({
  initialOperatingWindows,
}: {
  initialOperatingWindows: OperatingWindow[]
}) {
  const [operatingWindows, setOperatingWindows] = useState<OperatingWindow[]>(initialOperatingWindows)
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [newBlockedDate, setNewBlockedDate] = useState("")
  const [newBlockedReason, setNewBlockedReason] = useState("")
  const [loading, setLoading] = useState(false)

  const handleUpdateOperatingWindow = async (dayOfWeek: number, updates: Partial<Omit<OperatingWindow, "day_of_week">>) => {
    setLoading(true)
    try {
      const result = await updateOperatingWindow(dayOfWeek, updates)
      if (!result.error) {
        setOperatingWindows((prev) =>
          prev.map((w) => (w.day_of_week === dayOfWeek ? { ...w, ...updates } : w))
        )
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAddBlockedDate = async () => {
    if (!newBlockedDate) return

    setLoading(true)
    try {
      const result = await addBlockedDate(newBlockedDate, newBlockedReason || undefined)
      if (!result.error) {
        setBlockedDates((prev) => [...prev, newBlockedDate])
        setNewBlockedDate("")
        setNewBlockedReason("")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveBlockedDate = async (dateISO: string) => {
    setLoading(true)
    try {
      const result = await removeBlockedDate(dateISO)
      if (!result.error) {
        setBlockedDates((prev) => prev.filter((d) => d !== dateISO))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Operating Windows */}
      <Card>
        <CardHeader>
          <CardTitle>Operating Hours</CardTitle>
          <CardDescription>Configure standard opening and closing times for each day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {operatingWindows.map((window) => (
              <div key={window.day_of_week} className="flex items-center justify-between gap-4 rounded-lg border border-border/40 p-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium">{DAYS[window.day_of_week]}</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={!window.is_closed}
                    onCheckedChange={(checked) =>
                      handleUpdateOperatingWindow(window.day_of_week, { is_closed: !checked })
                    }
                    disabled={loading}
                  />
                  <span className="text-xs text-muted-foreground">{window.is_closed ? "Closed" : "Open"}</span>
                </div>

                {!window.is_closed && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={window.opens_at}
                      onChange={(e) =>
                        handleUpdateOperatingWindow(window.day_of_week, { opens_at: e.target.value })
                      }
                      disabled={loading}
                      className="w-32"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={window.closes_at}
                      onChange={(e) =>
                        handleUpdateOperatingWindow(window.day_of_week, { closes_at: e.target.value })
                      }
                      disabled={loading}
                      className="w-32"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Blocked Dates */}
      <Card>
        <CardHeader>
          <CardTitle>Blocked Dates</CardTitle>
          <CardDescription>Block specific dates when the restaurant is closed (e.g., holidays, special events)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="date"
              value={newBlockedDate}
              onChange={(e) => setNewBlockedDate(e.target.value)}
              disabled={loading}
            />
            <Input
              type="text"
              placeholder="Reason (optional)"
              value={newBlockedReason}
              onChange={(e) => setNewBlockedReason(e.target.value)}
              disabled={loading}
            />
            <Button onClick={handleAddBlockedDate} disabled={loading || !newBlockedDate} size="sm">
              <Plus className="size-4" />
              Add
            </Button>
          </div>

          {blockedDates.length > 0 ? (
            <div className="space-y-2">
              {blockedDates.map((date) => (
                <div key={date} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                  <span className="text-sm font-medium">
                    {new Date(date + "T00:00:00").toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveBlockedDate(date)}
                    disabled={loading}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No blocked dates configured.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
