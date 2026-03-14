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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import { ArrowLeft, Plus, Trash2, Edit, FileText } from "lucide-react";
import logo from "@/assets/j-app-logo.jpg";
import PassengerSortable from "@/components/PassengerSortable";
import DriverSortable from "@/components/DriverSortable";
import DestinationSortable from "@/components/DestinationSortable";

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

  // ADDED: documents for driver Docs tab
  const [documents, setDocuments] = useState<any[]>([]);
  const [docName, setDocName] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);

  // Footer button configuration
  const [footerCrewLabel, setFooterCrewLabel] = useState("Crewlist");
  const [footerPcLabel, setFooterPcLabel] = useState("PC-Memo");
  const [footerTLabel, setFooterTLabel] = useState("T-Memo");
  const [footerCrewDocId, setFooterCrewDocId] = useState<string>("");
  const [footerPcDocId, setFooterPcDocId] = useState<string>("");
  const [footerTDocId, setFooterTDocId] = useState<string>("");

  // Upload a new document directly for each footer button
  const [footerCrewFile, setFooterCrewFile] = useState<File | null>(null);
  const [footerPcFile, setFooterPcFile] = useState<File | null>(null);
  const [footerTFile, setFooterTFile] = useState<File | null>(null);
  const [uploadingFooterDoc, setUploadingFooterDoc] = useState<"crew" | "pc" | "t" | null>(null);

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
  // ADDED: project picture file state
  const [projectFile, setProjectFile] = useState<File | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // ADD: Realtime subscription to keep Admin tasks in sync
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel("admin_tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      destinationsRes,
      documentsRes,
    ] = await Promise.all([
      supabase.from("drivers").select("*").order("name"),
      supabase.from("passengers").select("*").order("name"),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("message_templates").select("*").order("template_key"),
      supabase.from("app_settings").select("*"),
      supabase.from("destinations").select("*").order("name"),
      supabase.from("documents").select("*").order("created_at", { ascending: false }),
    ]);

    if (driversRes.error) console.error("Drivers load error:", driversRes.error);
    if (passengersRes.error) console.error("Passengers load error:", passengersRes.error);
    if (tasksRes.error) console.error("Tasks load error:", tasksRes.error);
    if (templatesRes.error) console.error("Templates load error:", templatesRes.error);
    if (settingsRes.error) console.error("Settings load error:", settingsRes.error);
    if (destinationsRes.error) console.error("Destinations load error:", destinationsRes.error);
    if (documentsRes.error) console.error("Documents load error:", documentsRes.error);

    // FIX: update tasks state so Active Tasks reflects current data
    setTasks(tasksRes.data || []);

    setDrivers(driversRes.data || []);

    // Build settings map and apply passenger order if present
    const settingsMap: any = {};
    (settingsRes.data || []).forEach((s) => {
      settingsMap[s.setting_key] = s.setting_value;
    });
    setSettings(settingsMap);

    // Footer settings
    setFooterCrewLabel(settingsMap.footer_crewlist_label || "Crewlist");
    setFooterPcLabel(settingsMap.footer_pcmemo_label || "PC-Memo");
    setFooterTLabel(settingsMap.footer_tmemo_label || "T-Memo");
    setFooterCrewDocId(settingsMap.footer_crewlist_doc_id || "");
    setFooterPcDocId(settingsMap.footer_pcmemo_doc_id || "");
    setFooterTDocId(settingsMap.footer_tmemo_doc_id || "");

    // APPLY: driver_order to drivers list in Admin view
    if (settingsMap["driver_order"]) {
      try {
        const orderIds: string[] = JSON.parse(settingsMap["driver_order"]);
        const indexMap = new Map(orderIds.map((id, i) => [id, i]));
        const orderedDrivers = [...(driversRes.data || [])].sort((a: any, b: any) => {
          const ai = indexMap.has(a.id) ? (indexMap.get(a.id) as number) : Number.POSITIVE_INFINITY;
          const bi = indexMap.has(b.id) ? (indexMap.get(b.id) as number) : Number.POSITIVE_INFINITY;
          if (ai !== bi) return ai - bi;
          return (a.name || "").localeCompare(b.name || "");
        });
        setDrivers(orderedDrivers);
      } catch {
        // ignore parse errors
      }
    }

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
        // ignore parse errors
      }
    }
    setPassengers(orderedPassengers);

    // APPLY: destination_order to destinations list in Admin view
    const destOrderStr = settingsMap["destination_order"];
    let orderedDestinations = destinationsRes.data || [];
    if (destOrderStr) {
      try {
        const orderIds: string[] = JSON.parse(destOrderStr);
        const indexMap = new Map(orderIds.map((id, i) => [id, i]));
        orderedDestinations = [...orderedDestinations].sort((a: any, b: any) => {
          const ai = indexMap.has(a.id) ? (indexMap.get(a.id) as number) : Number.POSITIVE_INFINITY;
          const bi = indexMap.has(b.id) ? (indexMap.get(b.id) as number) : Number.POSITIVE_INFINITY;
          if (ai !== bi) return ai - bi;
          return (a.name || "").localeCompare(b.name || "");
        });
      } catch {
        // ignore parse errors and keep name order
      }
    }

    // NEW: Ensure 'eta_update' template exists; seed if missing so it appears in Admin
    let templatesData = templatesRes.data || [];
    const hasEtaUpdate = templatesData.some((t: any) => t.template_key === "eta_update");
    if (!hasEtaUpdate) {
      const { data: inserted, error: insertError } = await supabase
        .from("message_templates")
        .insert([
          {
            template_key: "eta_update",
            template_text: "Due to delay [driver] has a new ETA [eta]. please be aware",
            description: "Message when driver updates ETA due to delay",
          },
        ])
        .select()
        .single();
      if (!insertError && inserted) {
        templatesData = [...templatesData, inserted];
      } else {
        console.error("Failed to seed eta_update template:", insertError);
      }
    }

    setTemplates(templatesData);
    setDestinations(orderedDestinations);
    setDocuments(documentsRes.data || []);
  }

  async function upsertSetting(key: string, value: string) {
    const { data: existing } = await supabase
      .from("app_settings")
      .select("id")
      .eq("setting_key", key)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("app_settings")
        .update({ setting_value: value })
        .eq("setting_key", key);
    } else {
      await supabase.from("app_settings").insert([{ setting_key: key, setting_value: value }]);
    }
  }

  async function saveFooterButtons() {
    await upsertSetting("footer_crewlist_label", footerCrewLabel);
    await upsertSetting("footer_pcmemo_label", footerPcLabel);
    await upsertSetting("footer_tmemo_label", footerTLabel);
    await upsertSetting("footer_crewlist_doc_id", footerCrewDocId);
    await upsertSetting("footer_pcmemo_doc_id", footerPcDocId);
    await upsertSetting("footer_tmemo_doc_id", footerTDocId);

    toast({ title: "Footer buttons updated" });
    loadData();
  }

  function safeFileName(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  }

  async function uploadDocumentRecord(name: string, file: File) {
    const path = `docs/${Date.now()}_${safeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage.from("driver-docs").upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

    if (uploadError) {
      console.error("Document upload error:", uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage.from("driver-docs").getPublicUrl(path);
    const fileUrl = urlData.publicUrl;

    const { data: inserted, error: insertError } = await supabase
      .from("documents")
      .insert([{ name, file_path: path, file_url: fileUrl }])
      .select("id")
      .single();

    if (insertError) {
      console.error("Document insert error:", insertError);
      throw insertError;
    }

    return inserted?.id as string;
  }

  async function uploadFooterDoc(kind: "crew" | "pc" | "t") {
    const file = kind === "crew" ? footerCrewFile : kind === "pc" ? footerPcFile : footerTFile;
    const label = kind === "crew" ? footerCrewLabel : kind === "pc" ? footerPcLabel : footerTLabel;

    if (!file) {
      toast({ title: "Please choose a file", variant: "destructive" });
      return;
    }

    setUploadingFooterDoc(kind);
    try {
      const id = await uploadDocumentRecord(`${label} (Footer)`, file);
      if (kind === "crew") {
        setFooterCrewDocId(id);
        setFooterCrewFile(null);
      } else if (kind === "pc") {
        setFooterPcDocId(id);
        setFooterPcFile(null);
      } else {
        setFooterTDocId(id);
        setFooterTFile(null);
      }

      toast({ title: "Document uploaded and linked" });
      await loadData();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setUploadingFooterDoc(null);
    }
  }

  async function uploadDocument() {
    const cleanName = docName.trim();
    if (!cleanName) {
      toast({ title: "Please enter a document name", variant: "destructive" });
      return;
    }
    if (!docFile) {
      toast({ title: "Please choose a file", variant: "destructive" });
      return;
    }

    try {
      await uploadDocumentRecord(cleanName, docFile);
      toast({ title: "Document uploaded" });
      setDocName("");
      setDocFile(null);
      await loadData();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message ?? "", variant: "destructive" });
    }
  }

  async function deleteDocument(doc: any) {
    const ok = window.confirm(`Delete document "${doc.name}"?`);
    if (!ok) return;

    if (doc.file_path) {
      const { error: removeError } = await supabase.storage.from("driver-docs").remove([doc.file_path]);
      if (removeError) {
        console.error("Storage remove error:", removeError);
      }
    }

    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) {
      console.error("Document delete error:", error);
      toast({ title: "Failed to delete document", variant: "destructive" });
      return;
    }

    toast({ title: "Document deleted" });
    await loadData();
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

    // Ensure immediate refresh so the new task appears in Active Tasks
    await loadData();

    setShowTaskDialog(false);
    setEditingTask(null);
    setTaskForm({ passenger_name: "", pickup_location: "", dropoff_location: "", task_name: "", notes: "", deadline: "" });
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
      { key: "project_name", value: settings.project_name },
    ];

    for (const update of updates) {
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("setting_key", update.key)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("app_settings")
          .update({ setting_value: update.value })
          .eq("setting_key", update.key);
      } else {
        await supabase
          .from("app_settings")
          .insert([{ setting_key: update.key, setting_value: update.value }]);
      }
    }

    toast({ title: "Settings updated" });
  }

  // ADDED: handle project picture file selection with validation
  function handleProjectFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setProjectFile(null);
      return;
    }
    const isValidType = file.type === "image/jpeg" || file.type === "image/png";
    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (!isValidType) {
      toast({ title: "Invalid file type", description: "Please upload a JPEG or PNG image.", variant: "destructive" });
      e.target.value = "";
      setProjectFile(null);
      return;
    }
    if (file.size > maxSize) {
      toast({ title: "File too large", description: "Max size is 5 MB.", variant: "destructive" });
      e.target.value = "";
      setProjectFile(null);
      return;
    }
    setProjectFile(file);
  }

  // ADDED: upload project picture to Supabase Storage and save public URL in app_settings
  async function uploadProjectPicture() {
    if (!projectFile) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }

    const ext = projectFile.name.split(".").pop()?.toLowerCase();
    if (!ext || (ext !== "jpg" && ext !== "jpeg" && ext !== "png")) {
      toast({ title: "Invalid extension", description: "Allowed: .jpg, .jpeg, .png", variant: "destructive" });
      return;
    }

    const filePath = `project_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase
      .storage
      .from("project-pictures")
      .upload(filePath, projectFile, { upsert: true, contentType: projectFile.type });

    if (uploadError) {
      console.error("Project picture upload error:", uploadError);
      toast({
        title: "Upload failed",
        description: "Ensure a public storage bucket named 'project-pictures' exists in Supabase.",
        variant: "destructive",
      });
      return;
    }

    const { data: pub } = supabase.storage.from("project-pictures").getPublicUrl(filePath);
    const publicUrl = pub?.publicUrl;
    if (!publicUrl) {
      toast({ title: "Failed to get public URL", variant: "destructive" });
      return;
    }

    const { data: existing } = await supabase
      .from("app_settings")
      .select("id")
      .eq("setting_key", "project_picture_url")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("app_settings")
        .update({ setting_value: publicUrl })
        .eq("setting_key", "project_picture_url");
    } else {
      await supabase
        .from("app_settings")
        .insert([{ setting_key: "project_picture_url", setting_value: publicUrl }]);
    }

    setSettings({ ...settings, project_picture_url: publicUrl });
    setProjectFile(null);
    toast({ title: "Project picture updated" });
  }

  // ADDED: clear project picture setting
  async function clearProjectPicture() {
    const { data: existing } = await supabase
      .from("app_settings")
      .select("id")
      .eq("setting_key", "project_picture_url")
      .maybeSingle();

    if (existing) {
      await supabase.from("app_settings").delete().eq("setting_key", "project_picture_url");
      setSettings({ ...settings, project_picture_url: "" });
      toast({ title: "Project picture removed" });
    } else {
      toast({ title: "No project picture set" });
    }
  }

  async function saveDriverOrder() {
    const orderIds = drivers.map((d) => d.id);
    const value = JSON.stringify(orderIds);
    const { data: existing } = await supabase
      .from("app_settings")
      .select("*")
      .eq("setting_key", "driver_order")
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("app_settings")
        .update({ setting_value: value })
        .eq("setting_key", "driver_order");
      if (error) {
        toast({ title: "Failed to save driver order", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { error } = await supabase
        .from("app_settings")
        .insert([{ setting_key: "driver_order", setting_value: value }]);
      if (error) {
        toast({ title: "Failed to save driver order", description: error.message, variant: "destructive" });
        return;
      }
    }
    toast({ title: "Driver order saved" });
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

    if (completed.length === 0) {
      toast({ title: "Nothing to export", description: "There are no completed tasks." });
      return;
    }

    const driverMap = new Map((drivers || []).map((d) => [d.id, d.name]));

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
      "trip_started_at",
      "five_min_warning_sent_at",
      "completed_at",
      "updated_at",
      "driver_id",
      "driver_name",
      "eta",
      "delay_minutes",
    ];

    const rows = completed.map((t) => {
      const driverName = t.driver_id ? driverMap.get(t.driver_id) || "" : "";
      return [
        escapeCSV(t.id),
        escapeCSV(t.task_name),
        escapeCSV(t.passenger_name),
        escapeCSV(t.pickup_location),
        escapeCSV(t.dropoff_location),
        escapeCSV(t.notes),
        escapeCSV(t.status),
        escapeCSV(t.created_at),
        escapeCSV(t.accepted_at),
        escapeCSV(t.trip_started_at),
        escapeCSV(t.five_min_warning_sent_at),
        escapeCSV(t.completed_at),
        escapeCSV(t.updated_at),
        escapeCSV(t.driver_id),
        escapeCSV(driverName),
        escapeCSV(t.eta),
        escapeCSV(t.delay_minutes),
      ].join(",");
    });

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

    toast({ title: `Exported ${completed.length} completed tasks.` });
  }

  async function exportAndClearOlderCompletedPdf() {
    const completed = [...(tasks || [])]
      .filter((t) => t.status === "completed")
      .sort((a, b) => new Date(a.completed_at || 0).getTime() - new Date(b.completed_at || 0).getTime());

    if (completed.length === 0) {
      toast({ title: "Nothing to export", description: "There are no completed tasks." });
      return;
    }

    const driverMap = new Map((drivers || []).map((d) => [d.id, d.name]));

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 40;
    const pageRight = 555;
    let y = 60;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Completed Tasks Export", marginX, y);

    y += 18;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const ts = new Date().toLocaleString();
    doc.text(`Generated: ${ts}`, marginX, y);

    y += 10;
    doc.setDrawColor(200);
    doc.line(marginX, y, pageRight, y);
    y += 22;

    const line = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, marginX, y);
      doc.setFont("helvetica", "normal");
      doc.text(value || "—", marginX + 110, y);
      y += 16;
    };

    for (const t of completed) {
      if (y > 760) {
        doc.addPage();
        y = 60;
      }

      const driverName = t.driver_id ? driverMap.get(t.driver_id) || "" : "";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(t.task_name || "Unnamed Task", marginX, y);
      y += 18;
      doc.setFontSize(11);

      line("Passenger", t.passenger_name || "");
      line("From", t.pickup_location || "");
      line("To", t.dropoff_location || "");
      line("Driver", driverName ? `${driverName} (${t.driver_id})` : (t.driver_id || ""));
      line("Created", t.created_at ? new Date(t.created_at).toLocaleString() : "");
      line("Accepted", t.accepted_at ? new Date(t.accepted_at).toLocaleString() : "");
      line("Trip started", t.trip_started_at ? new Date(t.trip_started_at).toLocaleString() : "");
      line(
        "5-min warning",
        t.five_min_warning_sent_at ? new Date(t.five_min_warning_sent_at).toLocaleString() : "",
      );
      line("Completed", t.completed_at ? new Date(t.completed_at).toLocaleString() : "");
      line("Updated", t.updated_at ? new Date(t.updated_at).toLocaleString() : "");

      y += 6;
      doc.setDrawColor(230);
      doc.line(marginX, y, pageRight, y);
      y += 18;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    doc.save(`completed_tasks_export_${timestamp}.pdf`);

    toast({ title: `Exported ${completed.length} completed tasks to PDF.` });
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

  // ADD: Save destination order function
  async function saveDestinationOrder() {
    const orderIds = destinations.map((d) => d.id);
    const value = JSON.stringify(orderIds);
    const { data: existing } = await supabase
      .from("app_settings")
      .select("*")
      .eq("setting_key", "destination_order")
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("app_settings")
        .update({ setting_value: value })
        .eq("setting_key", "destination_order");
      if (error) {
        toast({ title: "Failed to save destination order", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { error } = await supabase
        .from("app_settings")
        .insert([{ setting_key: "destination_order", setting_value: value }]);
      if (error) {
        toast({ title: "Failed to save destination order", description: error.message, variant: "destructive" });
        return;
      }
    }
    toast({ title: "Destination order saved" });
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
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1">
            <TabsTrigger value="tasks" className="w-full text-xs sm:text-sm">Tasks</TabsTrigger>
            <TabsTrigger value="drivers" className="w-full text-xs sm:text-sm">Drivers</TabsTrigger>
            <TabsTrigger value="passengers" className="w-full text-xs sm:text-sm">Passengers</TabsTrigger>
            <TabsTrigger value="destinations" className="w-full text-xs sm:text-sm">Destinations</TabsTrigger>
            <TabsTrigger value="templates" className="w-full text-xs sm:text-sm">Templates</TabsTrigger>
            <TabsTrigger value="settings" className="w-full text-xs sm:text-sm">Settings</TabsTrigger>
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

            {/* Export completed tasks */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={exportAndClearOlderCompleted}>
                Export completed to CSV
              </Button>
              <Button variant="outline" onClick={exportAndClearOlderCompletedPdf}>
                Export completed to PDF
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

            <DriverSortable
              drivers={drivers}
              onReorder={(next) => setDrivers(next)}
              onEdit={(driver) => {
                setEditingDriver(driver);
                setDriverForm({
                  name: driver.name,
                  email: driver.email || "",
                  phone: driver.phone || "",
                  pin_password: driver.pin_password,
                });
                setShowDriverDialog(true);
              }}
              onDelete={(id) => deleteDriver(id)}
            />

            <div className="flex justify-end">
              <Button variant="outline" onClick={saveDriverOrder}>
                Save Order
              </Button>
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
            <DestinationSortable
              destinations={destinations}
              onReorder={(next) => setDestinations(next)}
              onEdit={(destination) => {
                setEditingDestination(destination);
                setDestinationForm({
                  name: destination.name,
                  address: destination.address || "",
                });
                setShowDestinationDialog(true);
              }}
              onDelete={(id) => deleteDestination(id)}
            />
            <div className="flex justify-end">
              <Button variant="outline" onClick={saveDestinationOrder}>
                Save Order
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
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
                    <Button size="sm" onClick={() => updateTemplate(template.id, template.template_text)}>
                      Save Template
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Docs section */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-xl font-bold">Docs</h3>
              </div>
              <Card className="p-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Document name</Label>
                    <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g. Safety rules" />
                  </div>
                  <div className="space-y-2">
                    <Label>File</Label>
                    <Input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={uploadDocument} disabled={!docName.trim() || !docFile}>
                    Upload document
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-base">Uploaded documents</Label>
                  {documents.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No documents uploaded yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">{doc.name}</div>
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-muted-foreground underline underline-offset-2"
                            >
                              Open
                            </a>
                          </div>
                          <Button size="icon" variant="destructive" onClick={() => deleteDocument(doc)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Footer buttons configuration */}
              <div className="mt-6">
                <h3 className="text-xl font-bold mb-2">Footer Buttons</h3>
                <Card className="p-6 space-y-5">
                  <div className="grid gap-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Crewlist button text</Label>
                        <Input value={footerCrewLabel} onChange={(e) => setFooterCrewLabel(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Crewlist document</Label>
                        <Select value={footerCrewDocId} onValueChange={setFooterCrewDocId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose document" />
                          </SelectTrigger>
                          <SelectContent>
                            {documents.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Or upload a new Crewlist document</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input type="file" onChange={(e) => setFooterCrewFile(e.target.files?.[0] || null)} />
                          <Button
                            variant="outline"
                            className="shrink-0"
                            onClick={() => uploadFooterDoc("crew")}
                            disabled={!footerCrewFile || uploadingFooterDoc !== null}
                          >
                            {uploadingFooterDoc === "crew" ? "Uploading..." : "Upload & Link"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>PC-Memo button text</Label>
                        <Input value={footerPcLabel} onChange={(e) => setFooterPcLabel(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>PC-Memo document</Label>
                        <Select value={footerPcDocId} onValueChange={setFooterPcDocId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose document" />
                          </SelectTrigger>
                          <SelectContent>
                            {documents.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Or upload a new PC-Memo document</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input type="file" onChange={(e) => setFooterPcFile(e.target.files?.[0] || null)} />
                          <Button
                            variant="outline"
                            className="shrink-0"
                            onClick={() => uploadFooterDoc("pc")}
                            disabled={!footerPcFile || uploadingFooterDoc !== null}
                          >
                            {uploadingFooterDoc === "pc" ? "Uploading..." : "Upload & Link"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>T-Memo button text</Label>
                        <Input value={footerTLabel} onChange={(e) => setFooterTLabel(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>T-Memo document</Label>
                        <Select value={footerTDocId} onValueChange={setFooterTDocId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose document" />
                          </SelectTrigger>
                          <SelectContent>
                            {documents.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Or upload a new T-Memo document</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input type="file" onChange={(e) => setFooterTFile(e.target.files?.[0] || null)} />
                          <Button
                            variant="outline"
                            className="shrink-0"
                            onClick={() => uploadFooterDoc("t")}
                            disabled={!footerTFile || uploadingFooterDoc !== null}
                          >
                            {uploadingFooterDoc === "t" ? "Uploading..." : "Upload & Link"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={saveFooterButtons}>Save Footer Buttons</Button>
                  </div>
                </Card>
              </div>
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

              {/* ADDED: Project Picture upload */}
              <div className="space-y-2">
                <Label>Project Picture (JPEG/PNG, max 5 MB)</Label>

                <div className="w-full overflow-hidden rounded-xl border border-border">
                  <div className="h-32 sm:h-40 w-full">
                    <img
                      src={settings.project_picture_url ? settings.project_picture_url : logo}
                      alt="Project"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* NEW: Project name (used in driver Hours PDF) */}
                <div>
                  <Label>Project Name</Label>
                  <Input
                    value={settings.project_name || ""}
                    onChange={(e) => setSettings({ ...settings, project_name: e.target.value })}
                    placeholder="Enter project name"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Input type="file" accept="image/png,image/jpeg" onChange={handleProjectFileChange} />
                  <Button onClick={uploadProjectPicture} disabled={!projectFile}>Upload</Button>
                  {settings.project_picture_url && (
                    <Button variant="outline" onClick={clearProjectPicture}>Remove</Button>
                  )}
                </div>
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