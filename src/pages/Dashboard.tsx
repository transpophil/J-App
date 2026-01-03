import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDriver } from "@/contexts/DriverContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { sendTelegramTemplate } from "@/utils/telegram";
import { LogOut, MapPin, Clock, CheckCircle2, AlertCircle, Navigation, ArrowLeft } from "lucide-react";
import { TimeWheel } from "@/components/TimeWheel";
import { TaskSection } from "@/components/TaskSection";
import TasksBoard from "@/components/TasksBoard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logo from "@/assets/j-app-logo.jpg";
import backgroundImage from "@/assets/background-image.png";
import { Input } from "@/components/ui/input";

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentDriver, logout } = useDriver();
  const { toast } = useToast();
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [selectedPassengers, setSelectedPassengers] = useState<string[]>([]);
  const [eta, setEta] = useState<string>("12:00");
  const [delayPassenger, setDelayPassenger] = useState<string>("");
  const [showDelaySelection, setShowDelaySelection] = useState(false);
  const [showEtaDialog, setShowEtaDialog] = useState(false);
  const [tripMode, setTripMode] = useState<"pickup" | "travel">("pickup");
  const [hasNewTasks, setHasNewTasks] = useState(false);

  // ADDED: destinations and selected destination state
  const [destinations, setDestinations] = useState<any[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<string>("");
  // ADD: free text destination
  const [freeDestination, setFreeDestination] = useState<string>("");

  // Add a unified Back handler for trip steps
  function handleBackStep() {
    // If ETA dialog is open, "Back" goes to passenger selection
    if (showEtaDialog) {
      setShowEtaDialog(false);
      setTripMode("pickup");
      return;
    }
    // If in Travel, "Back" opens ETA dialog with current values prefilled
    if (tripMode === "travel") {
      if (currentTask?.eta) setEta(currentTask.eta);
      if (currentTask?.dropoff_location) {
        setSelectedDestination(""); // Prefer free-text if previous destination isn't a saved one
        setFreeDestination(currentTask.dropoff_location);
      }
      setShowEtaDialog(true);
      return;
    }
    // If already in Pickup, there's no previous step
  }

  // Subscribe to realtime updates for tasks
  useEffect(() => {
    if (!currentDriver) {
      navigate("/login");
      return;
    }
    loadData();
    loadNewTasks();

    const channel = supabase
      .channel("tasks_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        loadData();
        loadNewTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentDriver, navigate]);

  async function loadNewTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("id")
      .eq("status", "available")
      .not("task_name", "is", null);
    setHasNewTasks((data?.length ?? 0) > 0);
  }

  async function loadData() {
    if (!currentDriver) return;

    // Verify driver still exists in database
    const { data: driverExists } = await supabase
      .from("drivers")
      .select("id")
      .eq("id", currentDriver.id)
      .maybeSingle();

    if (!driverExists) {
      // Driver was deleted, logout
      toast({ 
        title: "Driver account no longer exists", 
        description: "Please login again",
        variant: "destructive" 
      });
      logout();
      navigate("/login");
      return;
    }

    // Load passengers
    const { data: passengersData } = await supabase
      .from("passengers")
      .select("*")
      .order("name");

    // ADDED: Load destinations
    const { data: destinationsData } = await supabase
      .from("destinations")
      .select("id, name, address")
      .order("name");

    setDestinations(destinationsData || []);

    // Apply saved order (unchanged)
    let orderedPassengers = passengersData || [];
    const { data: orderSetting } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "passenger_order")
      .maybeSingle();
    if (orderSetting?.setting_value) {
      try {
        const orderIds: string[] = JSON.parse(orderSetting.setting_value);
        const indexMap = new Map(orderIds.map((id, i) => [id, i]));
        orderedPassengers.sort((a: any, b: any) => {
          const ai = indexMap.has(a.id) ? (indexMap.get(a.id) as number) : Number.POSITIVE_INFINITY;
          const bi = indexMap.has(b.id) ? (indexMap.get(b.id) as number) : Number.POSITIVE_INFINITY;
          if (ai !== bi) return ai - bi;
          return (a.name || "").localeCompare(b.name || "");
        });
      } catch {
        // ignore parse errors
      }
    }
    setPassengers(orderedPassengers);

    // Load current passenger trip task for this driver (passenger trips only - no task_name)
    const { data: current } = await supabase
      .from("tasks")
      .select("*")
      .eq("driver_id", currentDriver.id)
      .neq("status", "completed")
      .is("task_name", null)
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (current) {
      setCurrentTask(current);
      
      // Parse passenger IDs from the task's passenger names
      if (current.passenger_name && passengersData) {
        const taskPassengerNames = current.passenger_name.split(" & ").map((n: string) => n.trim());
        const matchedPassengerIds = passengersData
          .filter(p => taskPassengerNames.includes(p.name))
          .map(p => p.id);
        setSelectedPassengers(matchedPassengerIds);
      } else {
        setSelectedPassengers([]);
      }
      
      // If trip already started, switch to travel mode
      if (current.trip_started_at) {
        setTripMode("travel");
      } else {
        setTripMode("pickup");
      }
    } else {
      setCurrentTask(null);
      setTripMode("pickup");
      setSelectedPassengers([]);
      setEta("12:00");
      setDelayPassenger("");
      setShowDelaySelection(false);
      setShowEtaDialog(false);
      // RESET: destination selections
      setSelectedDestination("");
      setFreeDestination("");
    }
  }

  function handleLetsGoClick() {
    if (selectedPassengers.length === 0 || !currentDriver) {
      toast({ title: "Please select at least one passenger", variant: "destructive" });
      return;
    }
    // NEW: require a destination before proceeding to ETA
    if (!selectedDestination && !freeDestination.trim()) {
      toast({ title: "Please select or enter a destination", variant: "destructive" });
      return;
    }
    setShowEtaDialog(true);
  }

  async function handleConfirmTrip() {
    if (!eta || !currentDriver || selectedPassengers.length === 0) {
      toast({ title: "Please set ETA", variant: "destructive" });
      return;
    }

    // VALIDATE: require either selected destination or free-text destination
    if (!selectedDestination && !freeDestination.trim()) {
      toast({ title: "Please select or enter a destination", variant: "destructive" });
      return;
    }

    let destinationAddress = "";
    if (selectedDestination) {
      const destinationObj = destinations.find((d) => d.id === selectedDestination);
      if (!destinationObj || !destinationObj.address) {
        toast({ title: "Invalid destination selected", variant: "destructive" });
        return;
      }
      destinationAddress = destinationObj.address;
    } else {
      destinationAddress = freeDestination.trim();
    }

    const selectedPassengerData = passengers.filter(p => selectedPassengers.includes(p.id));
    if (selectedPassengerData.length === 0) {
      toast({ title: "No passengers selected", variant: "destructive" });
      return;
    }

    // Join passenger names and locations
    const passengerNames = selectedPassengerData.map(p => p.name).join(" & ");
    const pickupLocations = selectedPassengerData.map(p => p.default_pickup_location).join(", ");

    // If updating existing task, append new passengers
    const finalPassengerNames = currentTask 
      ? `${currentTask.passenger_name} & ${passengerNames}`
      : passengerNames;
    const finalPickupLocations = currentTask
      ? `${currentTask.pickup_location}, ${pickupLocations}`
      : pickupLocations;

    // Create or update task
    const taskData = {
      passenger_name: finalPassengerNames,
      pickup_location: finalPickupLocations,
      dropoff_location: destinationAddress, // use selected or free-text destination
      status: "on_board",
      driver_id: currentDriver.id,
      eta: eta,
      trip_started_at: currentTask?.trip_started_at || new Date().toISOString(),
      accepted_at: currentTask?.accepted_at || new Date().toISOString(),
    };

    let taskId = currentTask?.id;
    
    if (currentTask) {
      const { error } = await supabase
        .from("tasks")
        .update(taskData)
        .eq("id", currentTask.id);
      
      if (error) {
        console.error("Error updating task:", error);
        toast({ 
          title: "Failed to start trip", 
          description: error.message || "Unknown error",
          variant: "destructive" 
        });
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("tasks")
        .insert([taskData])
        .select()
        .single();
      
      if (error) {
        console.error("Error creating task:", error);
        toast({ 
          title: "Failed to start trip", 
          description: error.message || "Unknown error",
          variant: "destructive" 
        });
        return;
      }
      if (!data) {
        toast({ title: "Failed to start trip: No data returned", variant: "destructive" });
        return;
      }
      taskId = data.id;
    }

    // Send Telegram message using template
    await sendTelegramTemplate("lets_go", {
      driver: currentDriver.name,
      passenger: passengerNames,
      eta: eta,
    });

    toast({ title: "Trip started! Message sent to group." });
    setShowEtaDialog(false);
    setTripMode("travel");
    loadData();
  }

  async function handleDelay() {
    if (!delayPassenger || !currentDriver) {
      toast({ title: "Please select a passenger", variant: "destructive" });
      return;
    }

    const passenger = passengers.find(p => p.id === delayPassenger);
    if (!passenger) return;

    // Send delay message
    await sendTelegramTemplate("delay", {
      driver: currentDriver.name,
      passenger: passenger.name,
      delay: "",
    });

    toast({ title: "Delay notification sent to group." });
    setDelayPassenger("");
    setShowDelaySelection(false);
  }

  function togglePassengerSelection(passengerId: string) {
    setSelectedPassengers(prev => {
      if (prev.includes(passengerId)) {
        return prev.filter(id => id !== passengerId);
      } else {
        return [...prev, passengerId];
      }
    });
  }

  async function handleFiveMinWarning() {
    if (!currentTask || !currentDriver || selectedPassengers.length === 0) return;

    const { error } = await supabase
      .from("tasks")
      .update({ five_min_warning_sent_at: new Date().toISOString() })
      .eq("id", currentTask.id);

    if (error) {
      toast({ title: "Failed to update task", variant: "destructive" });
      return;
    }

    await sendTelegramTemplate("five_min_warning", {
      driver: currentDriver.name,
      passenger: currentTask.passenger_name,
    });

    toast({ title: "5-minute warning sent to group." });
    loadData();
  }

  async function handleDropOff() {
    if (!currentTask || !currentDriver || selectedPassengers.length === 0) {
      toast({ title: "No passengers to drop off", variant: "destructive" });
      return;
    }

    try {
      // Get all selected passengers' names
      const droppedPassengerNames = selectedPassengers
        .map(passengerId => {
          const passenger = passengers.find(p => p.id === passengerId);
          return passenger?.name;
        })
        .filter(Boolean)
        .join(" & ");

      if (!droppedPassengerNames) {
        toast({ title: "No valid passengers selected", variant: "destructive" });
        return;
      }

      // Complete the task in database first
      const { error } = await supabase
        .from("tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentTask.id);

      if (error) throw error;

      // Send Telegram notification
      await sendTelegramTemplate("drop_off", {
        driver: currentDriver.name,
        passenger: droppedPassengerNames,
      });

      toast({ title: "All passengers dropped off! Trip completed." });
      
      // Reset to START PICKUP state - loadData will handle the rest
      await loadData();
    } catch (error) {
      console.error("Error completing drop off:", error);
      toast({ title: "Failed to complete drop off", variant: "destructive" });
    }
  }

  function handleAddPickup() {
    // Switch back to pickup mode to add more passengers
    setTripMode("pickup");
    // Keep existing passengers selected so we can add more to the list
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // Open route including selected destination or free-text and passenger waypoints
  function openRouteToDestination() {
    if (selectedPassengers.length === 0) {
      toast({ title: "Please select passengers first", variant: "destructive" });
      return;
    }

    let destination = "";
    if (selectedDestination) {
      const destinationObj = destinations.find((d) => d.id === selectedDestination);
      if (!destinationObj || !destinationObj.address) {
        toast({ title: "Invalid destination selected", variant: "destructive" });
        return;
      }
      destination = destinationObj.address;
    } else if (freeDestination.trim()) {
      destination = freeDestination.trim();
    } else {
      toast({
        title: "Destination needed",
        description: "Open the Let's Go dialog to select or type a destination.",
        variant: "destructive",
      });
      return;
    }

    const orderedLocations = selectedPassengers
      .map((id) => passengers.find((p) => p.id === id)?.default_pickup_location)
      .filter((loc): loc is string => Boolean(loc));

    const waypointList = orderedLocations;

    const buildWebUrl = (origin?: string) => {
      return (
        `https://www.google.com/maps/dir/?api=1` +
        (origin ? `&origin=${encodeURIComponent(origin)}` : "") +
        `&destination=${encodeURIComponent(destination)}` +
        (waypointList.length > 0 ? `&waypoints=${encodeURIComponent(waypointList.join("|"))}` : "") +
        `&travelmode=driving`
      );
    };

    // Synchronously open Google Maps immediately (without origin) to avoid popup blocking
    const initialUrl = buildWebUrl(undefined);
    const tab = window.open(initialUrl, "_blank");

    // If popup was blocked, open in current tab as a fallback
    if (!tab) {
      toast({
        title: "Popup blocked",
        description: "Opening route in the current tab.",
        variant: "destructive",
      });
      window.location.href = initialUrl;
      return;
    }

    // Then try to enhance with precise origin if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
          const urlWithOrigin = buildWebUrl(origin);
          tab.location.href = urlWithOrigin;
        },
        () => {
          // If denied, keep the already-opened tab with initial URL
          toast({
            title: "Location access denied",
            description: "Opened route without a fixed start point.",
          });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
  }

  if (!currentDriver) return null;

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed relative"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/80 to-background/90 backdrop-blur-[2px]" />
      
      {/* Content */}
      <div className="relative z-10">
      {/* Header */}
        <header className="bg-gradient-to-br from-background via-muted/30 to-background border-b border-border shadow-sm">
        <div className="container mx-auto px-6 py-5 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <img src={logo} alt="App Logo" className="w-16 h-16 rounded-2xl shadow-md" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Driver Dashboard</h1>
              <p className="text-base text-muted-foreground mt-0.5">Hello, {currentDriver.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Global Back control for trip flow */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleBackStep}
              disabled={tripMode === "pickup" && !showEtaDialog}
              className="bg-white/80 hover:bg-white"
              title={tripMode === "pickup" && !showEtaDialog ? "No previous step" : "Back to previous step"}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleLogout} className="bg-white/80 hover:bg-white">
              <LogOut className="h-5 w-5" />
            </Button>
            <Button onClick={() => navigate("/admin")}>
              Admin
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
        {/* Tabs for Tasks and Pick Ups */}
        <Tabs defaultValue="pickups" className="w-full">
          <TabsList className="w-full justify-center gap-4 p-2">
            <TabsTrigger value="pickups" className="px-6 py-3 text-lg font-bold">Pick Ups</TabsTrigger>
            <TabsTrigger value="tasks" className="px-6 py-3 text-lg font-bold relative">
              Tasks
              {hasNewTasks && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-6">
            <TasksBoard />
          </TabsContent>

          <TabsContent value="pickups" className="mt-6">
            {/* Passenger Trip Management - unchanged */}
            <div>
              {tripMode === "pickup" ? (
                // Pickup Flow - Simple Selection
                <Card className="p-6 shadow-elevated bg-card/80 backdrop-blur-md border-border/50">
                  <div className="space-y-6">
                    <div className="text-center">
                      {currentTask ? (
                        <>
                          <Badge className="mb-2">Passenger</Badge>
                          <h2 className="text-2xl font-bold text-foreground mb-2">Add Passenger</h2>
                          <p className="text-muted-foreground">Selected passenger to add current trips</p>
                        </>
                      ) : (
                        <>
                          <h2 className="text-2xl font-bold text-foreground mb-2">Start Trip</h2>
                          <p className="text-muted-foreground">Select passengers and destination, preview route, then press Let's Go</p>
                        </>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label>Passengers *</Label>
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                        {passengers.map((passenger) => (
                          <div
                            key={passenger.id}
                            onClick={() => togglePassengerSelection(passenger.id)}
                            className={`p-4 border rounded-lg cursor-pointer transition-all ${
                              selectedPassengers.includes(passenger.id)
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
                                selectedPassengers.includes(passenger.id)
                                  ? "border-primary bg-primary"
                                  : "border-border"
                              }`}>
                                {selectedPassengers.includes(passenger.id) && (
                                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-foreground">{passenger.name}</p>
                                <p className="text-sm text-muted-foreground">{passenger.default_pickup_location}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Destination *</Label>
                      {destinations.length > 0 ? (
                        <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose destination" />
                          </SelectTrigger>
                          <SelectContent>
                            {destinations.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={freeDestination}
                          onChange={(e) => setFreeDestination(e.target.value)}
                          placeholder="Type destination address"
                        />
                      )}
                    </div>

                    <div className="space-y-3">
                      {selectedPassengers.length > 0 && (selectedDestination || freeDestination.trim()) && (
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={openRouteToDestination}
                        >
                          <Navigation className="mr-2 h-5 w-5" />
                          View Route in Google Maps
                        </Button>
                      )}

                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={handleLetsGoClick}
                        disabled={selectedPassengers.length === 0}
                      >
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Let's Go
                      </Button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">or</span>
                        </div>
                      </div>

                      {!showDelaySelection ? (
                        <Button 
                          variant="destructive" 
                          className="w-full" 
                          size="lg"
                          onClick={() => setShowDelaySelection(true)}
                          disabled={selectedPassengers.length === 0}
                        >
                          <AlertCircle className="mr-2 h-5 w-5" />
                          Report Delay
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <Label className="text-foreground font-semibold">Select delayed passenger</Label>
                            <Select value={delayPassenger} onValueChange={setDelayPassenger}>
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Choose passenger" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedPassengers.map((passengerId) => {
                                  const passenger = passengers.find(p => p.id === passengerId);
                                  if (!passenger) return null;
                                  return (
                                    <SelectItem key={passenger.id} value={passenger.id}>
                                      {passenger.name}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setShowDelaySelection(false);
                                setDelayPassenger("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button 
                              variant="destructive"
                              onClick={handleDelay}
                              disabled={!delayPassenger}
                            >
                              Send Delay Notice
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ) : (
                // Travel Overview Screen
                <Card className="p-6 shadow-elevated bg-card/80 backdrop-blur-md border-border/50">
                  <div className="space-y-6">
                    <div className="text-center">
                      <Badge className="mb-3">Trip In Progress</Badge>
                      <h2 className="text-2xl font-bold text-foreground mb-1">Travel Overview</h2>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          <span className="font-semibold text-foreground">DRIVER</span>
                        </div>
                        <p className="text-lg font-bold text-foreground">{currentDriver.name}</p>
                      </div>

                      <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="h-5 w-5 text-secondary" />
                          <span className="font-semibold text-foreground">PASSENGERS</span>
                        </div>
                        {selectedPassengers.map((passengerId, index) => {
                          const passenger = passengers.find(p => p.id === passengerId);
                          if (!passenger) return null;
                          return (
                            <div key={passengerId} className={index > 0 ? "mt-3 pt-3 border-t border-secondary/20" : ""}>
                              <p className="text-lg font-bold text-foreground">{passenger.name}</p>
                              <p className="text-sm text-muted-foreground">#a {passenger.default_pickup_location}</p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-4 bg-muted/50 border border-border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-5 w-5 text-foreground" />
                          <span className="font-semibold text-foreground">ETA</span>
                        </div>
                        <p className="text-3xl font-bold text-foreground text-center">{currentTask?.eta}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={handleFiveMinWarning}
                        disabled={selectedPassengers.length === 0 || currentTask?.five_min_warning_sent_at != null}
                      >
                        <Clock className="mr-2 h-5 w-5" />
                        5 Min Warning
                      </Button>
                      <Button 
                        variant="outline"
                        className="w-full" 
                        size="lg"
                        onClick={handleAddPickup}
                      >
                        <MapPin className="mr-2 h-5 w-5" />
                        Add PickUp
                      </Button>
                      <Button 
                        variant="default" 
                        className="w-full" 
                        size="lg"
                        onClick={handleDropOff}
                        disabled={selectedPassengers.length === 0}
                      >
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Drop Off
                      </Button>
                    </div>

                    {currentTask?.five_min_warning_sent_at && (
                      <p className="text-sm text-center text-muted-foreground">
                        ✓ 5-minute warning already sent
                      </p>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

      {/* ETA Input Dialog simplified: only time input now */}
      <Dialog open={showEtaDialog} onOpenChange={setShowEtaDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter ETA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Time</Label>
              <TimeWheel value={eta} onChange={setEta} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={handleBackStep}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleConfirmTrip}>
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      </div>
    </div>
    </div>
  );
}