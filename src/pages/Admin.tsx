import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Edit } from "lucide-react";
import logo from "@/assets/j-app-logo.jpg";
import PassengerSortable from "@/components/PassengerSortable";

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passkey, setPasskey] = useState("");
  const [drivers, setDrivers] = useState<any[]>([]);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showDriverDialog, setShowDriverDialog] = useState(false);
  const [showPassengerDialog, setShowPassengerDialog] = useState(false);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [showDestinationDialog, setShowDestinationDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [editingPassenger, setEditingPassenger] = useState<any>(null);
  const [destinationForm, setDestinationForm] = useState({
    name: "",
    address: "",
  });
  const [taskForm, setTaskForm] = useState({
    passenger_name: "",
    pickup_location: "",
    dropoff_location: "",
    task_name: "",
    notes: "",
    deadline: "",
  });
  const [driverForm, setDriverForm] = useState({
    name: "",
    email: "",
    phone: "",
    pin_password: "",
  });
  const [passengerForm, setPassengerForm] = useState({
    name: "",
    default_pickup_location: "",
  });
  // ADDED: state for the destination being edited
  const [editingDestination, setEditingDestination] = useState<any>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  async function checkPasskey() {
    const { data } = await supabase.from("app_settings").select("setting_value").eq("setting_key", "admin_passkey").single();

    if (data && passkey === data.setting_value) {
      setIsAuthenticated(true);
      toast({ title: "Access granted" });
    } else {
      toast({ title: "Incorrect passkey", variant: "destructive" });
    }
  }

  async function loadData() {
    const [
      driversRes, 
      passengersRes, 
      tasksRes, 
      templatesRes, 
      settingsRes,
      destinationsRes
    ] = await Promise.all([
      supabase.from("drivers").select("*").order("name"),
      supabase.from("passengers").select("*").order("name"),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("message_templates").select("*").order("template_key"),
      supabase.from("app_settings").select("*"),
      supabase.from("destinations").select("*").order("name"),
    ]);

    if (driversRes.error) console.error("Drivers load error:", driversRes.error);
    if (passengersRes.error) console.error("Passengers load error:", passengersRes.error);
    if (tasksRes.error) console.error("Tasks load error:", tasksRes.error);
    if (templatesRes.error) console.error("Templates load error:", templatesRes.error);
    if (settingsRes.error) console.error("Settings load error:", settingsRes.error);

    if (destinationsRes.error) {
      console.error("Destinations load error:", destinationsRes.error);
      // Suppress toast so Admin stays usable if the table hasn't been created yet
    }

    setDrivers(driversRes.data || []);
    // Build settings map and apply passenger order if present
    const settingsMap: any = {};
    (settingsRes.data || []).forEach((s) => {
      settingsMap[s.setting_key] = s.setting_value;
    });
    setSettings(settingsMap);
    let orderedPassengers = passengersRes.data || [];
    const orderStr = settingsMap["passenger_order"];
    if (orderStr) {
      try {
        const orderIds: string[] = JSON.parse(orderStr);
        const indexMap = new Map(orderIds.map((id, i) => [id, i]));
        orderedPassengers.sort((a: any, b: any) => {
          const ai = indexMap.has(a.id) ? (indexMap.get(a.id) as number) : Number.POSITIVE_INFINITY;
          const bi = indexMap.has(b.id) ? (indexMap.get(b.id) as number) : Number.POSITIVE_INFINITY;
          if (ai !== bi) return ai - bi;
          return (a.name || "").localeCompare(b.name || "");
        });
      } catch {
        // ignore parse errors, keep default order
      }
    }
    setPassengers(orderedPassengers);
    setTemplates(templatesRes.data || []);
    setDestinations(destinationsRes.data || []);
  }

  async function createOrUpdateTask() {
    const { passenger_name, pickup_location, dropoff_location, task_name, notes, deadline } = taskForm;
    const cleanTaskName = (task_name || "").trim();
    if (!cleanTaskName) {
      toast({ title: "Please fill Task Name", variant: "destructive" });
      return;
    }

    const passenger = (passenger_name || "").trim();
    const pickup = (pickup_location || "").trim();
    const dropoff = (dropoff_location || "").trim();
    const cleanedNotes = (notes || "").trim();

    if (editingTask) {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          passenger_name: passenger || "",
          pickup_location: pickup || "",
          dropoff_location: dropoff || "",
          task_name: cleanTaskName,
          notes: cleanedNotes || null,
          eta: deadline || null
        })
        .eq("id", editingTask.id);

      if (error) {
        toast({ title: "Failed to update task", variant: "destructive" });
        return;
      }
      toast({ title: "Task updated" });
    } else {
      const { error } = await supabase
        .from("tasks")
        .insert([{ 
          passenger_name: passenger || "",
          pickup_location: pickup || "",
          dropoff_location: dropoff || "",
          task_name: cleanTaskName,
          notes: cleanedNotes || null,
          eta: deadline || null,
          status: "available"
        }]);

      if (error) {
        toast({ title: "Failed to create task", variant: "destructive" });
        return;
      }
      toast({ title: "Task created" });
    }

    setShowTaskDialog(false);
    setEditingTask(null);
    setTaskForm({ passenger_name: "", pickup_location: "", dropoff_location: "", task_name: "", notes: "", deadline: "" });
    loadData();
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete task", variant: "destructive" });
      return;
    }
    toast({ title: "Task deleted" });
    loadData();
  }

  async function createOrUpdateDriver() {
    const { name, email, phone, pin_password } = driverForm;
    if (!name || !pin_password) {
      toast({ title: "Name and PIN are required", variant: "destructive" });
      return;
    }

    if (editingDriver) {
      const { error } = await supabase
        .from("drivers")
        .update({ name, email, phone, pin_password })
        .eq("id", editingDriver.id);

      if (error) {
        toast({ title: "Failed to update driver", variant: "destructive" });
        return;
      }
      toast({ title: "Driver updated" });
    } else {
      const { error } = await supabase
        .from("drivers")
        .insert([{ name, email, phone, pin_password }]);

      if (error) {
        toast({ title: "Failed to create driver", variant: "destructive" });
        return;
      }
      toast({ title: "Driver created" });
    }

    setShowDriverDialog(false);
    setEditingDriver(null);
    setDriverForm({ name: "", email: "", phone: "", pin_password: "" });
    loadData();
  }

  async function deleteDriver(id: string) {
    const { error } = await supabase.from("drivers").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete driver", variant: "destructive" });
      return;
    }
    toast({ title: "Driver deleted" });
    loadData();
  }

  async function createOrUpdatePassenger() {
    const { name, default_pickup_location } = passengerForm;
    if (!name || !default_pickup_location) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    if (editingPassenger) {
      const { error } = await supabase
        .from("passengers")
        .update({ name, default_pickup_location })
        .eq("id", editingPassenger.id);

      if (error) {
        toast({ title: "Failed to update passenger", variant: "destructive" });
        return;
      }
      toast({ title: "Passenger updated" });
    } else {
      const { error } = await supabase
        .from("passengers")
        .insert([{ name, default_pickup_location }]);

      if (error) {
        toast({ title: "Failed to create passenger", variant: "destructive" });
        return;
      }
      toast({ title: "Passenger created" });
    }

    setShowPassengerDialog(false);
    setEditingPassenger(null);
    setPassengerForm({ name: "", default_pickup_location: "" });
    loadData();
  }

  async function deletePassenger(id: string) {
    const { error } = await supabase.from("passengers").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete passenger", variant: "destructive" });
      return;
    }
    toast({ title: "Passenger deleted" });
    loadData();
  }

  async function createOrUpdateDestination() {
    const { name, address } = destinationForm;
    if (!name || !address) {
      toast({ title: "Name and Address are required", variant: "destructive" });
      return;
    }

    if (editingDestination) {
      const { error } = await supabase
        .from("destinations")
        .update({ name, address })
        .eq("id", editingDestination.id);

      if (error) {
        console.error("Failed to update destination:", error);
        toast({ title: "Failed to update destination", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Destination updated" });
    } else {
      const { error } = await supabase
        .from("destinations")
        .insert([{ name, address, email: null, phone: null, pin_password: null }]); // include optional fields

      if (error) {
        console.error("Failed to create destination:", error);
        toast({ title: "Failed to create destination", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Destination created" });
    }

    setShowDestinationDialog(false);
    setEditingDestination(null);
    setDestinationForm({ name: "", address: "" });
    loadData();
  }

  async function deleteDestination(id: string) {
    const { error } = await supabase.from("destinations").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete destination", variant: "destructive" });
      return;
    }
    toast({ title: "Destination deleted" });
    loadData();
  }

  async function updateTemplate(id: string, templateText: string) {
    const { error } = await supabase
      .from("message_templates")
      .update({ template_text: templateText })
      .eq("id", id);

    if (error) {
      toast({ title: "Failed to update template", variant: "destructive" });
      return;
    }
    toast({ title: "Template updated" });
    loadData();
  }

  async function updateSettings() {
    const updates = [
      { key: "telegram_bot_token", value: settings.telegram_bot_token },
      { key: "telegram_chat_id", value: settings.telegram_chat_id },
      { key: "admin_passkey", value: settings.admin_passkey },
    ];

    for (const update of updates) {
      await supabase
        .from("app_settings")
        .update({ setting_value: update.value })
        .eq("setting_key", update.key);
    }

    toast({ title: "Settings updated" });
  }

  function escapeCSV(value: any): string {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  async function exportAndClearOlderCompleted() {
    const completed = [...(tasks || [])]
      .filter((t) => t.status === "completed")
      .sort((a, b) => new Date(a.completed_at || 0).getTime() - new Date(b.completed_at || 0).getTime());

    if (completed.length <= 20) {
      toast({ title: "Nothing to export", description: "There are 20 or fewer completed tasks." });
      return;
    }

    const older = completed.slice(0, completed.length - 20);
    const headers = [
      "id",
      "task_name",
      "passenger_name",
      "pickup_location",
      "dropoff_location",
      "notes",
      "status",
      "created_at",
      "accepted_at",
      "completed_at",
      "driver_id",
      "eta",
      "delay_minutes",
    ];
    const rows = older.map((t) =>
      [
        escapeCSV(t.id),
        escapeCSV(t.task_name),
        escapeCSV(t.passenger_name),
        escapeCSV(t.pickup_location),
        escapeCSV(t.dropoff_location),
        escapeCSV(t.notes),
        escapeCSV(t.status),
        escapeCSV(t.created_at),
        escapeCSV(t.accepted_at),
        escapeCSV(t.completed_at),
        escapeCSV(t.driver_id),
        escapeCSV(t.eta),
        escapeCSV(t.delay_minutes),
      ].join(","),
    );
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `completed_tasks_export_${timestamp}.csv`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    const idsToDelete = older.map((t) => t.id);
    const { error } = await supabase.from("tasks").delete().in("id", idsToDelete);
    if (error) {
      toast({ title: "Failed to clear older tasks", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: `Exported ${older.length} tasks and kept the latest 20.` });
    await loadData();
  }

  async function savePassengerOrder() {
    const orderIds = passengers.map((p) => p.id);
    const value = JSON.stringify(orderIds);
    // Try to find existing setting
    const { data: existing } = await supabase
      .from("app_settings")
      .select("*")
      .eq("setting_key", "passenger_order")
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("app_settings")
        .update({ setting_value: value })
        .eq("setting_key", "passenger_order");
      if (error) {
        toast({ title: "Failed to save order", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { error } = await supabase
        .from("app_settings")
        .insert([{ setting_key: "passenger_order", setting_value: value }]);
      if (error) {
        toast({ title: "Failed to save order", description: error.message, variant: "destructive" });
        return;
      }
    }
    toast({ title: "Passenger order saved" });
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/20 to-background">
        <Card className="w-full max-w-md p-8 shadow-elevated">
          <div className="text-center space-y-6">
            <img src={logo} alt="Welcome Logo" className="w-20 h-20 mx-auto rounded-2xl" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-muted-foreground mt-1">Enter passkey to continue</p>
            </div>
            <div className="space-y-3">
              <Input
                type="password"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && checkPasskey()}
                placeholder="Enter admin passkey"
                autoFocus
              />
              <Button onClick={checkPasskey} className="w-full">
                Access Admin Panel
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <img src={logo} alt="Welcome" className="w-12 h-12 rounded-xl" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 gap-1">
            <TabsTrigger value="tasks" className="text-xs sm:text-sm">Tasks</TabsTrigger>
            <TabsTrigger value="drivers" className="text-xs sm:text-sm">Drivers</TabsTrigger>
            <TabsTrigger value="passengers" className="text-xs sm:text-sm">Passengers</TabsTrigger>
            <TabsTrigger value="destinations" className="text-xs sm:text-sm">Destinations</TabsTrigger>
            <TabsTrigger value="templates" className="text-xs sm:text-sm">Templates</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Manage Tasks</h2>
              <Button
                onClick={() => {
                  setEditingTask(null);
                  setTaskForm({ passenger_name: "", pickup_location: "", dropoff_location: "", task_name: "", notes: "", deadline: "" });
                  setShowTaskDialog(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </Button>
            </div>

            {/* Active Tasks - Show all tasks except completed ones */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Active Tasks</h3>
              {tasks.filter(t => t.status !== "completed").length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  No active tasks
                </Card>
              ) : (
                tasks.filter(t => t.status !== "completed").map((task) => {
                  const driver = drivers.find(d => d.id === task.driver_id);
                  return (
                    <Card key={task.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{task.task_name || "Unnamed Task"}</h3>
                            <Badge variant={task.status === "available" ? "default" : "secondary"}>
                              {task.status}
                            </Badge>
                          </div>
                          {task.passenger_name && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">Passenger:</span> {task.passenger_name}
                            </p>
                          )}
                          {task.pickup_location && (
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">From:</span> {task.pickup_location}
                            </p>
                          )}
                          {task.dropoff_location && (
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">To:</span> {task.dropoff_location}
                            </p>
                          )}
                          {task.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">Notes:</span> {task.notes}
                            </p>
                          )}
                          {driver && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">Driver:</span> {driver.name}
                            </p>
                          )}
                          {task.eta && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">ETA:</span> {task.eta}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => {
                              setEditingTask(task);
                              setTaskForm({
                                passenger_name: task.passenger_name || "",
                                pickup_location: task.pickup_location || "",
                                dropoff_location: task.dropoff_location || "",
                                task_name: task.task_name || "",
                                notes: task.notes || "",
                                deadline: (typeof task.eta === "string" ? task.eta : "") || "",
                              });
                              setShowTaskDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="destructive" onClick={() => deleteTask(task.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Export & clear older completed (keep latest 20) */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={exportAndClearOlderCompleted}
                disabled={tasks.filter((t) => t.status === "completed").length <= 20}
              >
                Export older completed to CSV & clear
              </Button>
            </div>

            {/* Done Tasks */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Done Tasks</h3>
              {tasks.filter(t => t.status === "completed").length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  No completed tasks
                </Card>
              ) : (
                tasks.filter(t => t.status === "completed").map((task) => {
                  const driver = drivers.find(d => d.id === task.driver_id);
                  return (
                    <Card key={task.id} className="p-4 bg-muted/30">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <Badge className="mb-2">Completed</Badge>
                          <h3 className="font-semibold text-lg">{task.task_name || "Unnamed Task"}</h3>
                          {task.passenger_name && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium text-foreground">Passenger:</span> {task.passenger_name}
                            </p>
                          )}
                          {task.pickup_location && (
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">From:</span> {task.pickup_location}
                            </p>
                          )}
                          {task.dropoff_location && (
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">To:</span> {task.dropoff_location}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-2">
                            <span className="font-medium text-foreground">Driver:</span> {driver?.name || "Unknown"}
                          </p>
                          {task.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">Notes:</span> {task.notes}
                            </p>
                          )}
                          {task.completed_at && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">Completed:</span> {new Date(task.completed_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <Button size="icon" variant="destructive" onClick={() => deleteTask(task.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="drivers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Manage Drivers</h2>
              <Button
                onClick={() => {
                  setEditingDriver(null);
                  setDriverForm({ name: "", email: "", phone: "", pin_password: "" });
                  setShowDriverDialog(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Driver
              </Button>
            </div>
            <div className="space-y-3">
              {drivers.map((driver) => (
                <Card key={driver.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg">{driver.name}</h3>
                      <p className="text-sm text-muted-foreground">{driver.email || "No email"}</p>
                      <p className="text-sm text-muted-foreground">{driver.phone || "No phone"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          setEditingDriver(driver);
                          setDriverForm({
                            name: driver.name,
                            email: driver.email || "",
                            phone: driver.phone || "",
                            pin_password: driver.pin_password,
                          });
                          setShowDriverDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="destructive" onClick={() => deleteDriver(driver.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="passengers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Manage Passengers</h2>
              <Button
                onClick={() => {
                  setEditingPassenger(null);
                  setPassengerForm({ name: "", default_pickup_location: "" });
                  setShowPassengerDialog(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Passenger
              </Button>
            </div>
            <PassengerSortable
              passengers={passengers}
              onReorder={(next) => setPassengers(next)}
              onEdit={(passenger) => {
                setEditingPassenger(passenger);
                setPassengerForm({
                  name: passenger.name,
                  default_pickup_location: passenger.default_pickup_location,
                });
                setShowPassengerDialog(true);
              }}
              onDelete={(id) => deletePassenger(id)}
            />
            <div className="flex justify-end">
              <Button variant="outline" onClick={savePassengerOrder}>
                Save Order
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="destinations" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Manage Destinations</h2>
              <Button
                onClick={() => {
                  setEditingDestination(null);
                  setDestinationForm({ name: "", address: "" });
                  setShowDestinationDialog(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Destination
              </Button>
            </div>
            <div className="space-y-3">
              {destinations.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  No destinations yet. Use "Add Destination" to create one.
                </Card>
              ) : (
                destinations.map((destination) => (
                  <Card key={destination.id} className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-lg">{destination.name}</h3>
                        <p className="text-sm text-muted-foreground">{destination.address || "No address"}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            setEditingDestination(destination);
                            setDestinationForm({
                              name: destination.name,
                              address: destination.address || "",
                            });
                            setShowDestinationDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="destructive" onClick={() => deleteDestination(destination.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <h2 className="text-2xl font-bold">Message Templates</h2>
            <p className="text-sm text-muted-foreground">
              Use variables: [driver], [passenger], [eta], [delay], [location]
            </p>
            <div className="space-y-3">
              {templates.map((template) => (
                <Card key={template.id} className="p-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-base font-semibold capitalize">
                        {template.template_key.replace(/_/g, " ")}
                      </Label>
                      {template.description && (
                        <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                      )}
                    </div>
                    <Textarea
                      value={template.template_text}
                      onChange={(e) => {
                        const updatedTemplates = templates.map((t) =>
                          t.id === template.id ? { ...t, template_text: e.target.value } : t
                        );
                        setTemplates(updatedTemplates);
                      }}
                      rows={2}
                    />
                    <Button
                      size="sm"
                      onClick={() => updateTemplate(template.id, template.template_text)}
                    >
                      Save Template
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <h2 className="text-2xl font-bold">App Settings</h2>
            <Card className="p-6 space-y-4">
              <div>
                <Label>Telegram Bot Token</Label>
                <Input
                  value={settings.telegram_bot_token || ""}
                  onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                />
              </div>
              <div>
                <Label>Telegram Chat ID</Label>
                <Input
                  value={settings.telegram_chat_id || ""}
                  onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                />
              </div>
              <div>
                <Label>Admin Passkey</Label>
                <Input
                  type="password"
                  value={settings.admin_passkey || ""}
                  onChange={(e) => setSettings({ ...settings, admin_passkey: e.target.value })}
                />
              </div>
              <Button onClick={updateSettings}>Save Settings</Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Task Name *</Label>
              <Input
                value={taskForm.task_name}
                onChange={(e) => setTaskForm({ ...taskForm, task_name: e.target.value })}
                placeholder="Enter task name"
              />
            </div>
            <div>
              <Label>Pickup Location</Label>
              <Input
                value={taskForm.pickup_location}
                onChange={(e) => setTaskForm({ ...taskForm, pickup_location: e.target.value })}
                placeholder="Enter pickup location"
              />
            </div>
            <div>
              <Label>Deadline</Label>
              <Input
                type="datetime-local"
                value={taskForm.deadline}
                onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                placeholder="Select deadline"
              />
            </div>
            <div>
              <Label>Dropoff Location</Label>
              <Input
                value={taskForm.dropoff_location}
                onChange={(e) => setTaskForm({ ...taskForm, dropoff_location: e.target.value })}
                placeholder="Enter dropoff location (optional)"
              />
            </div>
            <div>
              <Label>Passenger Name (optional)</Label>
              <Input
                value={taskForm.passenger_name}
                onChange={(e) => setTaskForm({ ...taskForm, passenger_name: e.target.value })}
                placeholder="Enter passenger name (optional)"
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={taskForm.notes}
                onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                placeholder="Add any additional notes"
              />
            </div>
            <Button onClick={createOrUpdateTask} className="w-full">
              {editingTask ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDriverDialog} onOpenChange={setShowDriverDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDriver ? "Edit Driver" : "Create New Driver"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={driverForm.name}
                onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                placeholder="Enter driver name"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={driverForm.email}
                onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
                placeholder="Enter email (optional)"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={driverForm.phone}
                onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                placeholder="Enter phone (optional)"
              />
            </div>
            <div>
              <Label>PIN Password *</Label>
              <Input
                type="password"
                value={driverForm.pin_password}
                onChange={(e) => setDriverForm({ ...driverForm, pin_password: e.target.value })}
                placeholder="Enter 4-digit PIN"
              />
            </div>
            <Button onClick={createOrUpdateDriver} className="w-full">
              {editingDriver ? "Update Driver" : "Create Driver"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPassengerDialog} onOpenChange={setShowPassengerDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPassenger ? "Edit Passenger" : "Add New Passenger"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Passenger Name *</Label>
              <Input
                value={passengerForm.name}
                onChange={(e) => setPassengerForm({ ...passengerForm, name: e.target.value })}
                placeholder="Enter passenger name"
              />
            </div>
            <div>
              <Label>Default Pickup Location *</Label>
              <Input
                value={passengerForm.default_pickup_location}
                onChange={(e) => setPassengerForm({ ...passengerForm, default_pickup_location: e.target.value })}
                placeholder="Enter default pickup address"
              />
            </div>
            <Button onClick={createOrUpdatePassenger} className="w-full">
              {editingPassenger ? "Update Passenger" : "Add Passenger"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDestinationDialog} onOpenChange={setShowDestinationDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDestination ? "Edit Destination" : "Add New Destination"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={destinationForm.name}
                onChange={(e) => setDestinationForm({ ...destinationForm, name: e.target.value })}
                placeholder="Enter destination name"
              />
            </div>
            <div>
              <Label>Address *</Label>
              <Input
                value={destinationForm.address}
                onChange={(e) => setDestinationForm({ ...destinationForm, address: e.target.value })}
                placeholder="Enter full address (Google Maps searchable)"
              />
            </div>
            <Button onClick={createOrUpdateDestination} className="w-full">
              {editingDestination ? "Update Destination" : "Add Destination"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}