import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TimeWheel } from "@/components/TimeWheel";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Clock, RotateCcw, Calendar as CalendarIcon, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";

type DriverHourRow = {
  id: string;
  driver_id: string;
  work_date: string; // YYYY-MM-DD
  start_time: string | null;
  end_time: string | null;
};

const REQUIRED_SHIFT_MINUTES = 10 * 60 + 45; // 10h work + 45m break = 10:45 total

function getLocalIsoDate(date = new Date()) {
  // YYYY-MM-DD in the driver's local time (avoids UTC day shifting)
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getLocalNowTime(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isoToLocalDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`);
}

function formatDayDate(isoDate: string) {
  const d = isoToLocalDate(isoDate);
  const day = d.toLocaleDateString(undefined, { weekday: "short" });
  const date = d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${day} ${date}`;
}

function formatShortDate(isoDate: string) {
  const d = isoToLocalDate(isoDate);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
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

function getWeekStartIso(isoDate: string) {
  // Monday-based week (local)
  const d = isoToLocalDate(isoDate);
  const day = d.getDay(); // 0=Sun,1=Mon...
  const diff = (day + 6) % 7; // days since Monday
  d.setDate(d.getDate() - diff);
  return getLocalIsoDate(d);
}

function formatWeekRange(weekStartIso: string) {
  const start = isoToLocalDate(weekStartIso);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startStr = start.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
  const endStr = end.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${startStr} – ${endStr}`;
}

function displayEndTime(row: DriverHourRow) {
  if (!row.start_time) return row.end_time ?? "—";
  if (!row.end_time) return "—";

  const requiredEnd = addMinutes(row.start_time, REQUIRED_SHIFT_MINUTES);
  const actualMin = parseTimeToMinutes(row.end_time);
  const requiredMin = parseTimeToMinutes(requiredEnd);

  // If driver worked less than 10:45, show the required end time.
  return actualMin < requiredMin ? requiredEnd : row.end_time;
}

export default function HoursTab({ driverId }: { driverId: string }) {
  const { toast } = useToast();
  const today = useMemo(() => getLocalIsoDate(), []);
  const defaultNowTime = useMemo(() => getLocalNowTime(), []);

  const [rows, setRows] = useState<DriverHourRow[]>([]);

  // Editing date (defaults to today, but can be any day)
  const [activeDate, setActiveDate] = useState<string>(today);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const [startTime, setStartTime] = useState(defaultNowTime);
  const [endTime, setEndTime] = useState(defaultNowTime);

  const [showStartWheel, setShowStartWheel] = useState(true);
  const [showEndWheel, setShowEndWheel] = useState(true);

  const [savingStart, setSavingStart] = useState(false);
  const [savingEnd, setSavingEnd] = useState(false);

  const activeRow = useMemo(() => rows.find((r) => r.work_date === activeDate) ?? null, [rows, activeDate]);

  async function loadHours() {
    const { data, error } = await supabase
      .from("driver_hours")
      .select("id,driver_id,work_date,start_time,end_time")
      .eq("driver_id", driverId)
      .order("work_date", { ascending: false });

    if (error) {
      console.error("Failed to load driver hours", error);
      return;
    }

    setRows((data ?? []) as DriverHourRow[]);
  }

  useEffect(() => {
    loadHours();

    const channel = supabase
      .channel(`driver_hours_${driverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_hours", filter: `driver_id=eq.${driverId}` },
        () => loadHours()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  // When switching days, load that day's values into the wheels
  useEffect(() => {
    if (!activeRow) {
      const now = getLocalNowTime();
      setStartTime(now);
      setEndTime(now);
      setShowStartWheel(true);
      setShowEndWheel(true);
      return;
    }

    if (activeRow.start_time) {
      setStartTime(activeRow.start_time);
      setShowStartWheel(false);
    } else {
      setShowStartWheel(true);
    }

    if (activeRow.end_time) {
      setEndTime(activeRow.end_time);
      setShowEndWheel(false);
    } else {
      setShowEndWheel(true);
    }
  }, [activeRow, activeDate]);

  async function saveStart() {
    setSavingStart(true);
    try {
      const { error } = await supabase
        .from("driver_hours")
        .upsert(
          {
            driver_id: driverId,
            work_date: activeDate,
            start_time: startTime,
          },
          { onConflict: "driver_id,work_date" }
        );

      if (error) {
        console.error("Failed to save start time", error);
        toast({ title: "Could not save start time", variant: "destructive" });
        return;
      }

      setShowStartWheel(false);
      toast({ title: "Start time saved" });
      await loadHours();
    } finally {
      setSavingStart(false);
    }
  }

  async function saveEnd() {
    setSavingEnd(true);
    try {
      const { error } = await supabase
        .from("driver_hours")
        .upsert(
          {
            driver_id: driverId,
            work_date: activeDate,
            end_time: endTime,
          },
          { onConflict: "driver_id,work_date" }
        );

      if (error) {
        console.error("Failed to save end time", error);
        toast({ title: "Could not save end time", variant: "destructive" });
        return;
      }

      setShowEndWheel(false);
      toast({ title: "End time saved" });
      await loadHours();
    } finally {
      setSavingEnd(false);
    }
  }

  async function startOverForDate(row: DriverHourRow) {
    const ok = window.confirm(`Start over for ${formatDayDate(row.work_date)}? This will delete the saved times for that day.`);
    if (!ok) return;

    const { error } = await supabase.from("driver_hours").delete().eq("id", row.id);
    if (error) {
      console.error("Failed to start over", error);
      toast({ title: "Could not start over", variant: "destructive" });
      return;
    }

    toast({ title: "Day cleared" });
    if (activeDate === row.work_date) {
      const now = getLocalNowTime();
      setStartTime(now);
      setEndTime(now);
      setShowStartWheel(true);
      setShowEndWheel(true);
    }
    await loadHours();
  }

  function downloadWeekPdf(week: { weekStart: string; rangeLabel: string; rows: DriverHourRow[] }) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const marginX = 40;
    let y = 50;

    doc.setFontSize(16);
    doc.text("Driver Hours", marginX, y);

    y += 18;
    doc.setFontSize(11);
    doc.text(`Week: ${week.rangeLabel}`, marginX, y);

    y += 10;
    doc.setDrawColor(200);
    doc.line(marginX, y, 555, y);

    y += 22;

    // Column positions
    const xDate = marginX;
    const xStart = 220;
    const xEnd = 340;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Date", xDate, y);
    doc.text("Start", xStart, y);
    doc.text("End", xEnd, y);
    doc.setFont("helvetica", "normal");

    y += 12;
    doc.line(marginX, y, 555, y);
    y += 18;

    const lineHeight = 18;
    for (const r of week.rows.slice().sort((a, b) => (a.work_date < b.work_date ? 1 : -1))) {
      if (y > 780) {
        doc.addPage();
        y = 60;
      }

      doc.text(formatShortDate(r.work_date), xDate, y);
      doc.text(r.start_time ?? "—", xStart, y);
      doc.text(displayEndTime(r), xEnd, y);
      y += lineHeight;
    }

    const fileName = `hours_${week.weekStart}.pdf`;
    doc.save(fileName);
  }

  const startSaved = Boolean(activeRow?.start_time);
  const endSaved = Boolean(activeRow?.end_time);

  const plannedEndTime = useMemo(() => {
    const base = startSaved && activeRow?.start_time ? activeRow.start_time : startTime;
    return addMinutes(base, REQUIRED_SHIFT_MINUTES);
  }, [startSaved, startTime, activeRow?.start_time]);

  const rowsByWeek = useMemo(() => {
    const map = new Map<string, DriverHourRow[]>();
    for (const r of rows) {
      const weekStart = getWeekStartIso(r.work_date);
      const list = map.get(weekStart) ?? [];
      list.push(r);
      map.set(weekStart, list);
    }

    const weekStarts = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
    return weekStarts.map((weekStart) => ({
      weekStart,
      rangeLabel: formatWeekRange(weekStart),
      rows: (map.get(weekStart) ?? []).sort((a, b) => (a.work_date < b.work_date ? 1 : -1)),
    }));
  }, [rows]);

  return (
    <div className="space-y-6">
      <Card className="p-6 shadow-elevated bg-card/80 backdrop-blur-md border-border/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Hours</h2>

            <div className="mt-2 flex items-center gap-2">
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {formatDayDate(activeDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={isoToLocalDate(activeDate)}
                    onSelect={(d) => {
                      if (!d) return;
                      setActiveDate(getLocalIsoDate(d));
                      setDatePopoverOpen(false);
                    }}
                    initialFocus
                  />
                  <div className="border-t border-border p-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setActiveDate(today);
                        setDatePopoverOpen(false);
                      }}
                    >
                      Today
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {activeDate !== today && (
                <Button variant="ghost" size="sm" onClick={() => setActiveDate(today)}>
                  Back to Today
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">10:45 required</span>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border/60 bg-background/40 px-4 py-3">
          <div className="text-sm text-muted-foreground">Potential end time (start + 10:45)</div>
          <div className="text-lg font-bold text-foreground">{plannedEndTime}</div>
        </div>

        <div className="mt-6 grid gap-8">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-base">Start Time</Label>
              {startSaved && (
                <div className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Saved</span>
                </div>
              )}
            </div>

            {startSaved && !showStartWheel ? (
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-4 py-3">
                <div>
                  <div className="text-sm text-muted-foreground">Start time</div>
                  <div className="text-2xl font-bold text-foreground">{activeRow?.start_time}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowStartWheel(true)}>
                  Edit
                </Button>
              </div>
            ) : (
              <>
                <TimeWheel value={startTime} onChange={setStartTime} />
                <Button onClick={saveStart} disabled={savingStart} className="w-full">
                  {savingStart ? "Saving..." : "Save Start"}
                </Button>
              </>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-base">End Time</Label>
              {endSaved && (
                <div className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Saved</span>
                </div>
              )}
            </div>

            {endSaved && !showEndWheel ? (
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-4 py-3">
                <div>
                  <div className="text-sm text-muted-foreground">End time</div>
                  <div className="text-2xl font-bold text-foreground">{activeRow ? displayEndTime(activeRow) : "—"}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowEndWheel(true)}>
                  Edit
                </Button>
              </div>
            ) : (
              <>
                <TimeWheel value={endTime} onChange={setEndTime} />
                <Button
                  onClick={saveEnd}
                  disabled={savingEnd || !startSaved}
                  className="w-full"
                  variant={startSaved ? "default" : "secondary"}
                >
                  {savingEnd ? "Saving..." : "Save End"}
                </Button>
                {!startSaved && <p className="text-xs text-muted-foreground">Save Start first.</p>}
              </>
            )}

            {activeRow && (activeRow.start_time || activeRow.end_time) && (
              <Button
                variant="outline"
                className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => startOverForDate(activeRow)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Start Over (Clear Day)
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6 shadow-elevated bg-card/80 backdrop-blur-md border-border/50">
        <h3 className="text-lg font-bold text-foreground mb-4">Daily Log</h3>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hours saved yet.</p>
        ) : (
          <div className="space-y-8">
            {rowsByWeek.map((week) => (
              <div key={week.weekStart} className="space-y-3">
                <div className="text-sm font-semibold text-muted-foreground">Week: {week.rangeLabel}</div>

                <div className="rounded-lg border border-border/60 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-[45%]">Date</TableHead>
                        <TableHead className="w-[20%]">Start time</TableHead>
                        <TableHead className="w-[20%]">End time</TableHead>
                        <TableHead className="w-[15%] text-right">Edit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {week.rows.map((r) => {
                        const isActive = r.work_date === activeDate;
                        return (
                          <TableRow key={r.id} className={isActive ? "bg-primary/5" : undefined}>
                            <TableCell className="font-medium">{formatDayDate(r.work_date)}</TableCell>
                            <TableCell>{r.start_time ?? "—"}</TableCell>
                            <TableCell>{displayEndTime(r)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setActiveDate(r.work_date);
                                  setShowStartWheel(false);
                                  setShowEndWheel(false);
                                }}
                              >
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadWeekPdf(week)}>
                    <Download className="h-4 w-4" />
                    Download week as PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}