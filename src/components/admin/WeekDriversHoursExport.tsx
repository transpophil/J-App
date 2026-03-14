import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import { useToast } from "@/hooks/use-toast";

type Driver = { id: string; name: string };

type DriverHourRow = {
  driver_id: string;
  work_date: string; // YYYY-MM-DD
  start_time: string | null;
  end_time: string | null;
};

const REQUIRED_SHIFT_MINUTES = 10 * 60 + 45;
const BREAK_MINUTES = 45;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function getLocalIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function isoToLocalDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`);
}

function getWeekStartIso(isoDate: string) {
  const d = isoToLocalDate(isoDate);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return getLocalIsoDate(d);
}

function addDays(isoDate: string, days: number) {
  const d = isoToLocalDate(isoDate);
  d.setDate(d.getDate() + days);
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

function safeFileName(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export default function WeekDriversHoursExport({
  drivers,
  projectName,
}: {
  drivers: Driver[];
  projectName?: string;
}) {
  const { toast } = useToast();

  const [weekDate, setWeekDate] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const weekStart = useMemo(() => getWeekStartIso(getLocalIsoDate(weekDate)), [weekDate]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekLabel = useMemo(() => formatWeekRange(weekStart), [weekStart]);

  async function exportWeekPdf() {
    if (drivers.length === 0) {
      toast({ title: "No drivers", description: "Add drivers first." });
      return;
    }

    setExporting(true);
    try {
      const driverIds = drivers.map((d) => d.id);

      const { data, error } = await supabase
        .from("driver_hours")
        .select("driver_id,work_date,start_time,end_time")
        .in("driver_id", driverIds)
        .gte("work_date", weekStart)
        .lte("work_date", weekEnd)
        .order("work_date", { ascending: true });

      if (error) {
        console.error("Failed to load driver hours for week", error);
        toast({ title: "Could not load hours", variant: "destructive" });
        return;
      }

      const rows = (data ?? []) as DriverHourRow[];
      const byDriver = new Map<string, DriverHourRow[]>();
      for (const r of rows) {
        const list = byDriver.get(r.driver_id) ?? [];
        list.push(r);
        byDriver.set(r.driver_id, list);
      }

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const marginX = 40;
      const pageRight = 555;
      const lineHeight = 16;
      let y = 60;

      // Header
      if (projectName?.trim()) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(projectName.trim(), marginX, y);
        y += 18;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`Week: ${weekLabel}`, marginX, y);
      y += 14;

      doc.setDrawColor(200);
      doc.line(marginX, y, pageRight, y);
      y += 22;

      for (const driver of drivers) {
        const dRows = (byDriver.get(driver.id) ?? []).slice().sort((a, b) => (a.work_date < b.work_date ? -1 : 1));

        if (y > 740) {
          doc.addPage();
          y = 60;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(driver.name, marginX, y);
        y += 14;

        // columns
        const xDate = marginX;
        const xStart = 210;
        const xEnd = 320;
        const xHours = 450;

        doc.setFontSize(10);
        doc.text("Date", xDate, y);
        doc.text("Start", xStart, y);
        doc.text("End", xEnd, y);
        doc.text("Hours", xHours, y);
        y += 10;
        doc.setDrawColor(220);
        doc.line(marginX, y, pageRight, y);
        y += 14;

        doc.setFont("helvetica", "normal");

        let totalMinutes = 0;
        if (dRows.length === 0) {
          doc.text("No entries", marginX, y);
          y += 18;
        } else {
          for (const r of dRows) {
            if (y > 780) {
              doc.addPage();
              y = 60;
            }

            const workedMin = getWorkedMinutes(r);
            if (typeof workedMin === "number") totalMinutes += workedMin;

            doc.text(formatShortDate(r.work_date), xDate, y);
            doc.text(r.start_time ?? "—", xStart, y);
            doc.text(displayEndTime(r), xEnd, y);
            doc.text(workedMin === null ? "—" : minutesToDuration(workedMin), xHours, y);
            y += lineHeight;
          }

          y += 6;
          doc.setDrawColor(230);
          doc.line(marginX, y, pageRight, y);
          y += 14;

          doc.setFont("helvetica", "bold");
          doc.text(`Weekly total: ${minutesToDuration(totalMinutes)}`, marginX, y);
          doc.setFont("helvetica", "normal");
          y += 20;
        }

        doc.setDrawColor(200);
        doc.line(marginX, y, pageRight, y);
        y += 22;
      }

      doc.save(`hours_all_drivers_${safeFileName(weekStart)}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
        <div className="space-y-1">
          <div className="font-semibold text-foreground">Weekly hours (all drivers)</div>
          <div className="text-sm text-muted-foreground">Choose a week and download one PDF with every driver’s submitted hours.</div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {weekLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={weekDate}
                onSelect={(d) => {
                  if (!d) return;
                  setWeekDate(d);
                  setOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button onClick={exportWeekPdf} disabled={exporting} className="gap-2">
            <Download className="h-4 w-4" />
            {exporting ? "Generating…" : "Download PDF"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
