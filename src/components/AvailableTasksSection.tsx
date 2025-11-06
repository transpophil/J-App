import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDriver } from "@/contexts/DriverContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, User, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  task_name: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  passenger_name: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  eta: string | null;
  driver_id: string | null;
  driver_name?: string | null;
}

export function AvailableTasksSection() {
  const { currentDriver } = useDriver();
  const { toast } = useToast();
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [acceptedTasks, setAcceptedTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!currentDriver) return;
    
    loadTasks();

    // Set up realtime subscription
    const channel = supabase
      .channel("available_tasks")
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "tasks"
      }, () => {
        loadTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentDriver]);

  async function loadTasks() {
    // Load available tasks (admin tasks only - must have task_name)
    const { data: available } = await supabase
      .from("tasks")
      .select("id, task_name, notes, status, created_at, eta, passenger_name, pickup_location, dropoff_location")
      .eq("status", "available")
      .not("task_name", "is", null)
      .order("created_at", { ascending: false });

    setAvailableTasks(available || []);

    // Load accepted tasks for all drivers (admin tasks only - must have task_name) and include driver name
    const { data: accepted } = await supabase
      .from("tasks")
      .select("id, task_name, notes, status, created_at, eta, passenger_name, pickup_location, dropoff_location, driver_id, drivers(name)")
      .in("status", ["accepted", "in_progress", "on_board"])
      .not("task_name", "is", null)
      .order("accepted_at", { ascending: false });

    const withDriverName = (accepted || []).map((t: any) => ({
      ...t,
      driver_name: t?.drivers?.name ?? null,
    }));
    setAcceptedTasks(withDriverName);
  }

  async function acceptTask(taskId: string) {
    if (!currentDriver) return;

    const { error } = await supabase
      .from("tasks")
      .update({
        status: "accepted",
        driver_id: currentDriver.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("status", "available"); // Only update if still available

    if (error) {
      toast({ 
        title: "Failed to accept task", 
        description: error.message,
        variant: "destructive" 
      });
      return;
    }

    toast({ title: "Task accepted successfully!" });
    loadTasks();
  }

  async function markTaskDone(taskId: string) {
    if (!currentDriver) return;

    const { error } = await supabase
      .from("tasks")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("driver_id", currentDriver.id);

    if (error) {
      toast({ 
        title: "Failed to mark task as done", 
        description: error.message,
        variant: "destructive" 
      });
      return;
    }

    toast({ title: "Task completed!" });
    loadTasks();
  }

  if (availableTasks.length === 0 && acceptedTasks.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Accepted Tasks - Show full details with Done Button */}
      {acceptedTasks.length > 0 && (
        <Card className="p-6 shadow-elevated bg-card/80 backdrop-blur-md border-border/50">
          <h2 className="text-xl font-bold text-foreground mb-4">Accepted Tasks</h2>

          <div className="space-y-3">
            {acceptedTasks.map((task) => (
              <Card key={task.id} className="p-4 border-primary/30 bg-card">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-xl text-foreground">
                      {task.task_name || "Unnamed Task"}
                    </h3>
                    <Badge variant="secondary" className="mt-2">
                      {task.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    {(task.driver_name || task.driver_id) && (
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <span>
                          <span className="font-medium">Accepted by:</span> {task.driver_name || "Unknown"}
                        </span>
                      </div>
                    )}
                    
                    {task.passenger_name && (
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <span>
                          <span className="font-medium">Passenger:</span> {task.passenger_name}
                        </span>
                      </div>
                    )}
                    
                    {task.pickup_location && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <span>
                          <span className="font-medium">Pickup:</span> {task.pickup_location}
                        </span>
                      </div>
                    )}
                    
                    {task.dropoff_location && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <span>
                          <span className="font-medium">Dropoff:</span> {task.dropoff_location}
                        </span>
                      </div>
                    )}
                    
                    {task.notes && (
                      <div className="p-3 bg-muted/50 rounded-md">
                        <p className="font-medium text-foreground">Notes:</p>
                        <p className="text-muted-foreground mt-1">{task.notes}</p>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <span>
                        <span className="font-medium">Created:</span> {new Date(task.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {currentDriver?.id === task.driver_id ? (
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90" 
                      size="default"
                      onClick={() => markTaskDone(task.id)}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Done
                    </Button>
                  ) : (
                    <Button className="w-full" variant="secondary" disabled>
                      <Clock className="mr-2 h-4 w-4" />
                      In progress
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Available Tasks */}
      {availableTasks.length > 0 && (
        <Card className="p-6 shadow-elevated bg-card/80 backdrop-blur-md border-border/50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Available Tasks</h2>
              <Badge variant="secondary" className="text-sm">
                {availableTasks.length} New
              </Badge>
            </div>

            <div className="space-y-3">
              {availableTasks.map((task) => (
                <Card key={task.id} className="p-4 border-secondary/20 bg-secondary/5">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">
                        {task.task_name || "Unnamed Task"}
                      </h3>
                      <div className="flex items-start gap-2 mt-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>
                          <span className="font-medium">Deadline:</span>{" "}
                          {task.eta ? new Date(task.eta).toLocaleString() : "Not set"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      {task.passenger_name && (
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                          <span>
                            <span className="font-medium">Passenger:</span> {task.passenger_name}
                          </span>
                        </div>
                      )}
                      
                      {task.pickup_location && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                          <span>
                            <span className="font-medium">Pickup:</span> {task.pickup_location}
                          </span>
                        </div>
                      )}
                      
                      {task.dropoff_location && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                          <span>
                            <span className="font-medium">Dropoff:</span> {task.dropoff_location}
                          </span>
                        </div>
                      )}
                    </div>

                    {task.notes && (
                      <div className="p-3 bg-muted/50 rounded-md">
                        <p className="text-sm font-medium text-foreground">Notes:</p>
                        <p className="text-sm text-muted-foreground mt-1">{task.notes}</p>
                      </div>
                    )}

                    <Button 
                      className="w-full" 
                      onClick={() => acceptTask(task.id)}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Accept Task
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}