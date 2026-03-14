import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DriverHourRow = {
  id: string;
  driver_id: string;
  work_date: string; // YYYY-MM-DD
  start_time: string | null;
  end_time: string | null;
};

const REQUIRED_SHIFT_MINUTES = 10 * 60 + 45; // 10h work + 45m break = 10:45 total
const BREAK_MINUTES = 45;

function isoToLocalDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`);
}

function formatDayDate(isoDate: string) {
  const d = isoToLocalDate(isoDate);
  const day = d.toLocaleDateString(undefined, { weekday: "short" });
  const date = d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${day} ${date}`;
}

function formatWeekRange(weekStartIso: string) {
  const start = isoToLocalDate(weekStartIso);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startStr = start.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
  const endStr = end.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${startStr} – ${endStr}`;
}

function getLocalIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getWeekStartIso(isoDate: string) {
  // Monday-based week (local)
  const d = isoToLocalDate(isoDate);
  const day = d.getDay(); // 0=Sun,1=Mon...
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return getLocalIsoDate(d);
}

function parseTimeToMinutes(time: string) {
  const [h, m] = time.split(":").map((v) => Number(v));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

function minutesToTime(minutes: number) {
  const m = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function addMinutes(time: string, minutesToAdd: number) {
  return minutesToTime(parseTimeToMinutes(time) + minutesToAdd);
}

function minutesToDuration(minutes: number) {
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return `${hh}:${String(mm).padStart(2, "0")}`;
}

function getEffectiveEndTime(row: DriverHourRow) {
  if (!row.start_time || !row.end_time) return null;
  const requiredEnd = addMinutes(row.start_time, REQUIRED_SHIFT_MINUTES);
  const actualMin = parseTimeToMinutes(row.end_time);
  const requiredMin = parseTimeToMinutes(requiredEnd);
  return actualMin < requiredMin ? requiredEnd : row.end_time;
}

function displayEndTime(row: DriverHourRow) {
  if (!row.start_time) return row.end_time ?? "—";
  if (!row.end_time) return "—";
  return getEffectiveEndTime(row) ?? "—";
}

function getWorkedMinutes(row: DriverHourRow) {
  if (!row.start_time || !row.end_time) return null;

  const end = getEffectiveEndTime(row);
  if (!end) return null;

  const startMin = parseTimeToMinutes(row.start_time);
  let endMin = parseTimeToMinutes(end);
  if (endMin < startMin) endMin += 24 * 60;

  return Math.max(0, endMin - startMin - BREAK_MINUTES);
}

export default function DriverHoursDialog({
  open,
  onOpenChange,
  driver,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: { id: string; name: string } | null;
}) {
  const [rows, setRows] = useState<DriverHourRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !driver) return;

    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("driver_hours")
          .select("id,driver_id,work_date,start_time,end_time")
          .eq("driver_id", driver.id)
          .order("work_date", { ascending: false });

        if (error) {
          console.error("Failed to load driver hours", error);
          setRows([]);
          return;
        }

        setRows((data ?? []) as DriverHourRow[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, driver?.id]);

  const rowsByWeek = useMemo(() => {
    const map = new Map<string, DriverHourRow[]>();
    for (const r of rows) {
      const weekStart = getWeekStartIso(r.work_date);
      const list = map.get(weekStart) ?? [];
      list.push(r);
      map.set(weekStart, list);
    }

    const weekStarts = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
    return weekStarts.map((weekStart) => {
      const weekRows = (map.get(weekStart) ?? []).sort((a, b) => (a.work_date < b.work_date ? 1 : -1));
      const totalMinutes = weekRows.reduce((sum, r) => sum + (getWorkedMinutes(r) ?? 0), 0);
      return {
        weekStart,
        rangeLabel: formatWeekRange(weekStart),
        rows: weekRows,
        totalMinutes,
      };
    });
  }, [rows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{driver ? `${driver.name} — Hours` : "Hours"}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No hours saved yet for this driver.</div>
        ) : (
          <div className="space-y-6">
            {rowsByWeek.map((week) => (
              <Card key={week.weekStart} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-foreground">Week: {week.rangeLabel}</div>
                  <div className="text-sm text-muted-foreground">
                    Weekly total: <span className="font-semibold text-foreground">{minutesToDuration(week.totalMinutes)}</span>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-border/60 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-[45%]">Date</TableHead>
                        <TableHead className="w-[18%]">Start</TableHead>
                        <TableHead className="w-[18%]">End</TableHead>
                        <TableHead className="w-[19%]">Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {week.rows.map((r) => {
                        const workedMin = getWorkedMinutes(r);
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{formatDayDate(r.work_date)}</TableCell>
                            <TableCell>{r.start_time ?? "—"}</TableCell>
                            <TableCell>{displayEndTime(r)}</TableCell>
                            <TableCell>{workedMin === null ? "—" : minutesToDuration(workedMin)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
