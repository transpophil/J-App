import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface Task {
  id: string;
  passenger_name: string;
  pickup_location: string;
  dropoff_location: string;
  notes: string | null;
  status: string;
  created_at: string;
}

interface TaskNotificationBellProps {
  onTaskClick?: (task: Task) => void;
}

export function TaskNotificationBell({ onTaskClick }: TaskNotificationBellProps) {
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadAvailableTasks();

    // Set up realtime subscription for new tasks
    const channel = supabase
      .channel("available_tasks_changes")
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "tasks",
        filter: "status=eq.available"
      }, () => {
        loadAvailableTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadAvailableTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("status", "available")
      .order("created_at", { ascending: false });

    setAvailableTasks(data || []);
  }

  const taskCount = availableTasks.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {taskCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {taskCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">New Tasks Available</h3>
          {taskCount === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No new tasks available
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableTasks.map((task) => (
                <Card 
                  key={task.id} 
                  className="p-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => {
                    onTaskClick?.(task);
                    setOpen(false);
                  }}
                >
                  <h4 className="font-semibold text-sm">{task.passenger_name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {task.pickup_location || "No location specified"}
                  </p>
                  {task.notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {task.notes}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(task.created_at).toLocaleString()}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
