import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, User } from "lucide-react";

interface Task {
  id: string;
  driver_id: string;
  task_name: string | null;
  notes: string | null;
  status: string;
  trip_started_at: string;
  eta: string;
  completed_at?: string;
}

interface Driver {
  id: string;
  name: string;
}

export function TaskSection() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [drivers, setDrivers] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTasks();
    loadDrivers();

    // Set up realtime subscription
    const channel = supabase
      .channel("tasks_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        loadTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("id, driver_id, task_name, notes, status, trip_started_at, eta, completed_at")
      .neq("status", "completed")
      .order("trip_started_at", { ascending: false });
    
    setTasks(data || []);
  }

  async function loadDrivers() {
    const { data } = await supabase
      .from("drivers")
      .select("id, name");
    
    if (data) {
      const driversMap = data.reduce((acc, driver) => {
        acc[driver.id] = driver.name;
        return acc;
      }, {} as Record<string, string>);
      setDrivers(driversMap);
    }
  }

  if (tasks.length === 0) {
    return (
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50">
        <p className="text-center text-muted-foreground">No active tasks</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Active Tasks</h2>
      {tasks.map((task) => (
        <Card key={task.id} className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-elevated">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant={task.status === "in_progress" ? "default" : "secondary"}>
                {task.status === "in_progress" ? "Active" : task.status}
              </Badge>
              {task.eta && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>ETA: {task.eta}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Driver</p>
                  <p className="font-semibold text-foreground">
                    {drivers[task.driver_id] || "Unknown Driver"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-secondary" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Task</p>
                  <p className="font-semibold text-foreground">{task.task_name || "Unnamed Task"}</p>
                  {task.notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">Notes:</span> {task.notes}
                    </p>
                  )}
                </div>
              </div>

              {task.trip_started_at && (
                <div className="text-xs text-muted-foreground">
                  Started: {new Date(task.trip_started_at).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
