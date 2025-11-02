import { useEffect, useRef, useState } from "react";

interface TimeWheelProps {
  value: string;
  onChange: (value: string) => void;
}

export function TimeWheel({ value, onChange }: TimeWheelProps) {
  const [hour, setHour] = useState<number>(12);
  const [minute, setMinute] = useState<number>(0);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  // Generate hours (1-12)
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  // Generate minutes (0-59)
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  useEffect(() => {
    const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onChange(time);
  }, [hour, minute, onChange]);

  const handleHourScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const itemHeight = 48; // h-12 = 48px
    const index = Math.round(scrollTop / itemHeight);
    const newHour = hours[index % hours.length];
    if (newHour && newHour !== hour) {
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
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="h-12" />
          {hours.concat(hours).concat(hours).map((h, i) => (
            <div
              key={i}
              className="h-12 flex items-center justify-center text-2xl font-semibold snap-center text-foreground"
            >
              {h.toString().padStart(2, '0')}
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
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="h-12" />
          {minutes.concat(minutes).map((m, i) => (
            <div
              key={i}
              className="h-12 flex items-center justify-center text-2xl font-semibold snap-center text-foreground"
            >
              {m.toString().padStart(2, '0')}
            </div>
          ))}
          <div className="h-12" />
        </div>
      </div>
    </div>
  );
}
