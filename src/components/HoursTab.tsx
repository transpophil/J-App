import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TimeWheel } from "@/components/TimeWheel";
import { CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type DriverHourRow = {
  id: string;
  driver_id: string;
  work_date: string; // YYYY-MM-DD
  start_time: string | null;
  end_time: string | null;
};

function getLocalIsoDate(date = new Date()) {
  // YYYY-MM-DD in the driver's local time (avoids UTC day shifting)
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDayDate(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00`);
  const day = d.toLocaleDateString(undefined, { weekday: "short" });
  const date = d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${day} ${date}`;
}

export default function HoursTab({ driverId }: { driverId: string }) {
  const { toast } = useToast();
  const today = useMemo(() => getLocalIsoDate(), []);

  const [rows, setRows] = useState<DriverHourRow[]>([]);
  const [todayRow, setTodayRow] = useState<DriverHourRow | null>(null);

  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("12:00");

  const [savingStart, setSavingStart] = useState(false);
  const [savingEnd, setSavingEnd] = useState(false);

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

    const list = (data ?? []) as DriverHourRow[];
    setRows(list);

    const t = list.find((r) => r.work_date === today) ?? null;
    setTodayRow(t);
    if (t?.start_time) setStartTime(t.start_time);
    if (t?.end_time) setEndTime(t.end_time);
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

  async function saveStart() {
    setSavingStart(true);
    try {
      const { error } = await supabase
        .from("driver_hours")
        .upsert(
          {
            driver_id: driverId,
            work_date: today,
            start_time: startTime,
          },
          { onConflict: "driver_id,work_date" }
        );

      if (error) {
        console.error("Failed to save start time", error);
        toast({ title: "Could not save start time", variant: "destructive" });
        return;
      }

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
            work_date: today,
            end_time: endTime,
          },
          { onConflict: "driver_id,work_date" }
        );

      if (error) {
        console.error("Failed to save end time", error);
        toast({ title: "Could not save end time", variant: "destructive" });
        return;
      }

      toast({ title: "End time saved" });
      await loadHours();
    } finally {
      setSavingEnd(false);
    }
  }

  const startSaved = Boolean(todayRow?.start_time);
  const endSaved = Boolean(todayRow?.end_time);

  return (
    <div className="space-y-6">
      <Card className="p-6 shadow-elevated bg-card/80 backdrop-blur-md border-border/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Hours</h2>
            <p className="text-sm text-muted-foreground">{formatDayDate(today)}</p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">24h</span>
          </div>
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
            <TimeWheel value={startTime} onChange={setStartTime} />
            <Button onClick={saveStart} disabled={savingStart} className="w-full">
              {savingStart ? "Saving..." : "Save Start"}
            </Button>
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
          </div>
        </div>
      </Card>

      <Card className="p-6 shadow-elevated bg-card/80 backdrop-blur-md border-border/50">
        <h3 className="text-lg font-bold text-foreground mb-4">Daily Log</h3>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hours saved yet.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">{formatDayDate(r.work_date)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-sm">
                  <div className="text-muted-foreground">
                    <span className="font-medium text-foreground">Start:</span> {r.start_time ?? "—"}
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-medium text-foreground">End:</span> {r.end_time ?? "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
