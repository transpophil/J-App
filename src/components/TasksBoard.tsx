"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDriver } from "@/contexts/DriverContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Clock, User, MapPin, Navigation, ArrowLeft } from "lucide-react";

interface Task {
  id: string;
  task_name: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  accepted_at?: string | null;
  completed_at?: string | null;
  passenger_name: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  eta: string | null;
  driver_id: string | null;
  driver_name?: string | null;
}

export function TasksBoard() {
  const { currentDriver } = useDriver();
  const { toast } = useToast();

  const [newTasks, setNewTasks] = useState<Task[]>([]);
  const [acceptedTasks, setAcceptedTasks] = useState<Task[]>([]);

  useEffect(() => {
    loadTasks();

    const channel = supabase
      .channel("tasks_board")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        loadTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadTasks() {
    // New tasks: available admin tasks (must have task_name)
    const { data: available } = await supabase
      .from("tasks")
      .select("id, task_name, notes, status, created_at, eta, passenger_name, pickup_location, dropoff_location")
      .eq("status", "available")
      .not("task_name", "is", null)
      .order("created_at", { ascending: false });

    setNewTasks(available || []);

    // Accepted tasks: include driver name
    const { data: accepted } = await supabase
      .from("tasks")
      .select("id, task_name, notes, status, created_at, accepted_at, eta, passenger_name, pickup_location, dropoff_location, driver_id, drivers(name)")
      .in("status", ["accepted", "in_progress", "on_board"])
      .not("task_name", "is", null)
      .order("accepted_at", { ascending: false });

    const acceptedWithDriver = (accepted || []).map((t: any) => ({
      ...t,
      driver_name: t?.drivers?.name ?? null,
    })) as Task[];
    setAcceptedTasks(acceptedWithDriver);
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
      .eq("status", "available");

    if (error) {
      toast({ title: "Failed to accept task", description: error.message, variant: "destructive" });
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
      toast({ title: "Failed to mark task as done", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Task completed!" });
    loadTasks();
  }

  // Open Google Maps route immediately (current tab) to the task's pickup location
  function openTaskRoute(destination: string) {
    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&destination=${encodeURIComponent(destination)}` +
      `&travelmode=driving`;

    // Immediate navigation in current tab avoids popup blockers
    window.location.href = url;
  }

  // NEW: Unaccept task (go back from Accepted to Available)
  async function unacceptTask(taskId: string) {
    if (!currentDriver) return;
    const { error } = await supabase
      .from("tasks")
      .update({
        status: "available",
        driver_id: null,
        accepted_at: null,
      })
      .eq("id", taskId)
      .eq("driver_id", currentDriver.id)
      .eq("status", "accepted");

    if (error) {
      toast({ title: "Failed to revert task", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Task reverted to Available." });
    loadTasks();
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* New */}
      <Card className="p-6 shadow-elevated bg-card/80 backdrop-blur-md border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">New</h2>
          <Badge variant="secondary">{newTasks.length}</Badge>
        </div>
        {newTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No new tasks.</p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {newTasks.map((task) => (
              <AccordionItem key={task.id} value={task.id} className="border rounded-md mb-2">
                <AccordionTrigger className="px-4 py-3 text-lg font-semibold">
                  {task.task_name || "Unnamed Task"}
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <span>
                        <span className="font-medium">Created:</span> {new Date(task.created_at).toLocaleString()}
                      </span>
                    </div>
                    {task.eta && (
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span>
                          <span className="font-medium">ETA:</span> {task.eta}
                        </span>
                      </div>
                    )}
                    {task.passenger_name && (
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span>
                          <span className="font-medium">Passenger:</span> {task.passenger_name}
                        </span>
                      </div>
                    )}
                    {task.pickup_location && (
                      <div className="flex items-start gap-2 justify-between">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <span>
                            <span className="font-medium">Pickup:</span> {task.pickup_location}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openTaskRoute(task.pickup_location!)}
                          className="shrink-0"
                        >
                          <Navigation className="mr-2 h-4 w-4" />
                          Map
                        </Button>
                      </div>
                    )}
                    {task.dropoff_location && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span>
                          <span className="font-medium">Dropoff:</span> {task.dropoff_location}
                        </span>
                      </div>
                    )}
                    {task.notes && (
                      <div className="p-3 bg-muted/50 rounded-md">
                        <p className="text-sm font-medium text-foreground">Notes:</p>
                        <p className="text-sm text-muted-foreground mt-1">{task.notes}</p>
                      </div>
                    )}
                  </div>
                  <Button className="w-full" onClick={() => acceptTask(task.id)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Accept Task
                  </Button>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </Card>

      {/* Accepted */}
      <Card className="p-6 shadow-elevated bg-card/80 backdrop-blur-md border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Accepted</h2>
          <Badge variant="secondary">{acceptedTasks.length}</Badge>
        </div>
        {acceptedTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accepted tasks.</p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {acceptedTasks.map((task) => (
              <AccordionItem key={task.id} value={task.id} className="border rounded-md mb-2">
                <AccordionTrigger className="px-4 py-3 text-lg font-semibold">
                  {task.task_name || "Unnamed Task"}
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-3">
                  <div className="space-y-2 text-sm">
                    {task.driver_name && (
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span>
                          <span className="font-medium">Accepted by:</span> {task.driver_name}
                        </span>
                      </div>
                    )}
                    {task.accepted_at && (
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span>
                          <span className="font-medium">Accepted:</span>{" "}
                          {new Date(task.accepted_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {task.eta && (
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span>
                          <span className="font-medium">ETA:</span> {task.eta}
                        </span>
                      </div>
                    )}
                    {task.passenger_name && (
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span>
                          <span className="font-medium">Passenger:</span> {task.passenger_name}
                        </span>
                      </div>
                    )}
                    {task.pickup_location && (
                      <div className="flex items-start gap-2 justify-between">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <span>
                            <span className="font-medium">Pickup:</span> {task.pickup_location}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openTaskRoute(task.pickup_location!)}
                          className="shrink-0"
                        >
                          <Navigation className="mr-2 h-4 w-4" />
                          Map
                        </Button>
                      </div>
                    )}
                    {task.dropoff_location && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span>
                          <span className="font-medium">Dropoff:</span> {task.dropoff_location}
                        </span>
                      </div>
                    )}
                    {task.notes && (
                      <div className="p-3 bg-muted/50 rounded-md">
                        <p className="text-sm font-medium text-foreground">Notes:</p>
                        <p className="text-sm text-muted-foreground mt-1">{task.notes}</p>
                      </div>
                    )}
                  </div>

                  {currentDriver?.id === task.driver_id ? (
                    <div className="grid grid-cols-2 gap-3">
                      {task.status === "accepted" && (
                        <Button variant="outline" onClick={() => unacceptTask(task.id)}>
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Button>
                      )}
                      <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => markTaskDone(task.id)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Done
                      </Button>
                    </div>
                  ) : (
                    <Button className="w-full" variant="secondary" disabled>
                      <Clock className="mr-2 h-4 w-4" />
                      In progress
                    </Button>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </Card>
    </div>
  );
}

export default TasksBoard;