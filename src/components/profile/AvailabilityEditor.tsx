"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, Loader2, Save, Trash2 } from "lucide-react";

import { saveAvailability } from "@/app/profile/actions";
import type { AvailabilityWindow } from "@/lib/availability";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

interface AvailabilityEditorProps {
  initial: AvailabilityWindow[];
}

export function AvailabilityEditor({ initial }: AvailabilityEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [windows, setWindows] = useState<AvailabilityWindow[]>(initial);

  const byDay = (day: number) => windows.filter((w) => w.dayOfWeek === day);

  function addWindow(day: number) {
    // Default new window to the first free 2-hour slot after existing ones.
    const existing = byDay(day);
    let startMinutes = 9 * 60;
    for (const window of existing) {
      const [h, m] = window.endTime.split(":").map(Number);
      const end = (h ?? 0) * 60 + (m ?? 0);
      if (end > startMinutes) startMinutes = end;
    }
    const endMinutes = Math.min(23 * 60, startMinutes + 120);
    if (endMinutes <= startMinutes) {
      toast.add({
        title: `${DAYS[day]} is fully booked — remove a window first.`,
        type: "error",
      });
      return;
    }
    setWindows((prev) => [
      ...prev,
      {
        dayOfWeek: day,
        startTime: minutesToHHMM(startMinutes),
        endTime: minutesToHHMM(endMinutes),
        isActive: true,
      },
    ]);
  }

  function updateWindow(
    index: number,
    patch: Partial<Pick<AvailabilityWindow, "startTime" | "endTime">>,
  ) {
    setWindows((prev) =>
      prev.map((window, i) => (i === index ? { ...window, ...patch } : window)),
    );
  }

  function removeWindow(index: number) {
    setWindows((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    // Client-side validation mirroring the server schema.
    for (const window of windows) {
      if (window.startTime >= window.endTime) {
        toast.add({
          title: `${DAYS[window.dayOfWeek]}: end time must be after start time.`,
          type: "error",
        });
        return;
      }
    }
    startTransition(async () => {
      const result = await saveAvailability(windows);
      if (!result.success) {
        toast.add({ title: result.error, type: "error" });
        return;
      }
      toast.add({ title: "Weekly availability saved", type: "success" });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly availability</CardTitle>
        <CardDescription>
          Customers can only book you inside these windows. Leave a day empty
          to stay closed.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {[1, 2, 3, 4, 5, 6, 0].map((day) => {
          const dayWindows = byDay(day);
          return (
            <div
              key={day}
              className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <span className="w-24 shrink-0 text-sm font-medium">
                {DAYS[day]}
              </span>

              <div className="flex-1 space-y-2">
                {dayWindows.length === 0 && (
                  <p className="text-sm text-muted-foreground">Closed</p>
                )}
                {dayWindows.map((window) => {
                  const index = windows.indexOf(window);
                  return (
                    <div key={`${window.startTime}-${index}`} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={window.startTime}
                        onChange={(event) =>
                          updateWindow(index, { startTime: event.target.value })
                        }
                        className="h-9 rounded-md border bg-background px-2.5 text-sm"
                        aria-label={`Start time on ${DAYS[day]}`}
                      />
                      <span className="text-sm text-muted-foreground">–</span>
                      <input
                        type="time"
                        value={window.endTime}
                        onChange={(event) =>
                          updateWindow(index, { endTime: event.target.value })
                        }
                        className="h-9 rounded-md border bg-background px-2.5 text-sm"
                        aria-label={`End time on ${DAYS[day]}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${DAYS[day]} ${window.startTime} window`}
                        onClick={() => removeWindow(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addWindow(day)}
              >
                <CalendarPlus className="size-3.5" />
                Add window
              </Button>
            </div>
          );
        })}

        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save availability
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
