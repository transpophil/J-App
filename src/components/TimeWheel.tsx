import { useEffect, useRef, useState } from "react";

interface TimeWheelProps {
  value: string;
  onChange: (value: string) => void;
}

function parseTime(value: string) {
  const match = /^\s*(\d{1,2}):(\d{1,2})\s*$/.exec(value);
  const hour = match ? Math.min(23, Math.max(0, Number(match[1]))) : 0;
  const minute = match ? Math.min(59, Math.max(0, Number(match[2]))) : 0;
  return { hour, minute };
}

function timeString(hour: number, minute: number) {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export function TimeWheel({ value, onChange }: TimeWheelProps) {
  const initial = parseTime(value);
  const [hour, setHour] = useState<number>(initial.hour);
  const [minute, setMinute] = useState<number>(initial.minute);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  // Generate hours (0-23) for 24-hour format
  const hours = Array.from({ length: 24 }, (_, i) => i);
  // Generate minutes (0-59)
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // Keep internal state in sync when parent value changes (e.g., open dialog defaults)
  useEffect(() => {
    const next = parseTime(value);
    if (next.hour !== hour) setHour(next.hour);
    if (next.minute !== minute) setMinute(next.minute);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    onChange(timeString(hour, minute));
  }, [hour, minute, onChange]);

  // Scroll wheels to the currently selected time.
  useEffect(() => {
    const itemHeight = 48; // h-12 = 48px
    const containerHeight = 192; // h-48 = 192px
    const centerOffset = containerHeight / 2 - itemHeight / 2; // 72px

    const scrollToIndex = (el: HTMLDivElement | null, index: number, len: number) => {
      if (!el) return;
      const targetIndex = len + index; // start in the middle copy
      const top = Math.max(0, itemHeight * (1 + targetIndex) - centerOffset); // +1 for top padding
      requestAnimationFrame(() => {
        el.scrollTo({ top, behavior: "auto" });
      });
    };

    scrollToIndex(hourRef.current, hour, hours.length);
    scrollToIndex(minuteRef.current, minute, minutes.length);
  }, [hour, minute, hours.length, minutes.length]);

  const handleHourScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const itemHeight = 48; // h-12 = 48px
    const index = Math.round(scrollTop / itemHeight);
    const newHour = hours[index % hours.length];
    // Allow selecting 00 (hour 0) by checking for undefined instead of truthy
    if (newHour !== undefined && newHour !== hour) {
      setHour(newHour);
    }
  };

  const handleMinuteScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const itemHeight = 48;
    const index = Math.round(scrollTop / itemHeight);
    const newMinute = minutes[index % minutes.length];
    if (newMinute !== undefined && newMinute !== minute) {
      setMinute(newMinute);
    }
  };

  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <div className="relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="h-full flex flex-col">
            <div className="flex-1 bg-gradient-to-b from-background to-transparent" />
            <div className="h-12 border-y-2 border-primary/20" />
            <div className="flex-1 bg-gradient-to-t from-background to-transparent" />
          </div>
        </div>
        <div
          ref={hourRef}
          onScroll={handleHourScroll}
          className="h-48 w-20 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="h-12" />
          {hours.concat(hours).concat(hours).map((h, i) => (
            <div
              key={i}
              className="h-12 flex items-center justify-center text-2xl font-semibold snap-center text-foreground"
            >
              {h.toString().padStart(2, "0")}
            </div>
          ))}
          <div className="h-12" />
        </div>
      </div>

      <div className="text-3xl font-bold text-foreground">:</div>

      <div className="relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="h-full flex flex-col">
            <div className="flex-1 bg-gradient-to-b from-background to-transparent" />
            <div className="h-12 border-y-2 border-primary/20" />
            <div className="flex-1 bg-gradient-to-t from-background to-transparent" />
          </div>
        </div>
        <div
          ref={minuteRef}
          onScroll={handleMinuteScroll}
          className="h-48 w-20 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="h-12" />
          {minutes.concat(minutes).map((m, i) => (
            <div
              key={i}
              className="h-12 flex items-center justify-center text-2xl font-semibold snap-center text-foreground"
            >
              {m.toString().padStart(2, "0")}
            </div>
          ))}
          <div className="h-12" />
        </div>
      </div>
    </div>
  );
}