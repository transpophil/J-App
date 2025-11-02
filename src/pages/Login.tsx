import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDriver } from "@/contexts/DriverContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";
import logo from "@/assets/j-app-logo-large.jpg";
import loginBackground from "@/assets/login-background.jpg";

export default function Login() {
  const navigate = useNavigate();
  const { currentDriver, setCurrentDriver } = useDriver();
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [pin, setPin] = useState("");
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    pin: "",
  });

  useEffect(() => {
    if (currentDriver) {
      navigate("/dashboard");
      return;
    }
    loadDrivers();
  }, [currentDriver, navigate]);

  async function loadDrivers() {
    const { data } = await supabase.from("drivers").select("*").order("name");
    setDrivers(data || []);
  }

  function handleDriverSelect(driver: any) {
    setSelectedDriver(driver);
    setShowPinDialog(true);
    setPin("");
  }

  async function handlePinSubmit() {
    if (!selectedDriver || !pin) return;

    if (pin === selectedDriver.pin_password) {
      setCurrentDriver({
        id: selectedDriver.id,
        name: selectedDriver.name,
        email: selectedDriver.email,
        phone: selectedDriver.phone,
      });
      toast({ title: "Welcome back!", description: `Logged in as ${selectedDriver.name}` });
      navigate("/dashboard");
    } else {
      toast({ title: "Incorrect PIN/password", variant: "destructive" });
    }
  }

  async function handleRegister() {
    const { name, pin } = registerForm;
    if (!name.trim() || !pin.trim()) {
      toast({ title: "Name and PIN are required", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase
      .from("drivers")
      .insert([
        {
          name: name.trim(),
          email: registerForm.email.trim() || null,
          phone: registerForm.phone.trim() || null,
          pin_password: pin,
        },
      ])
      .select()
      .single();

    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Registration successful!", description: `Welcome, ${data.name}` });
    setCurrentDriver({ id: data.id, name: data.name, email: data.email, phone: data.phone });
    setShowRegisterDialog(false);
    navigate("/dashboard");
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
      style={{ backgroundImage: `url(${loginBackground})` }}
    >
      <Card className="w-full max-w-md p-8 shadow-elevated bg-card/95 backdrop-blur-sm">
        <div className="text-center space-y-6">
          <div className="flex flex-col items-center gap-4">
            <img src={logo} alt="Welcome Logo" className="w-40 h-40 rounded-3xl shadow-lg" />
            <h1 className="text-5xl font-bold text-foreground tracking-tight">
              j<span className="text-primary">-</span>app
            </h1>
          </div>
          <div>
            <p className="text-muted-foreground text-lg">Select your profile to continue</p>
          </div>

          <div className="space-y-3">
            {drivers.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No drivers registered yet</p>
            ) : (
              drivers.map((driver) => (
                <Button
                  key={driver.id}
                  variant="outline"
                  className="w-full h-14 text-lg justify-start px-6 hover:bg-primary/5 hover:border-primary transition-all"
                  onClick={() => handleDriverSelect(driver)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 text-primary font-bold">
                    {driver.name[0].toUpperCase()}
                  </div>
                  {driver.name}
                </Button>
              ))
            )}

            <Button
              variant="default"
              className="w-full h-14 text-lg bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all"
              onClick={() => setShowRegisterDialog(true)}
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Register New Driver
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter PIN/Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>PIN/Password for {selectedDriver?.name}</Label>
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
              placeholder="Enter your PIN"
              autoFocus
            />
            <Button onClick={handlePinSubmit} className="w-full">
              Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Driver</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={registerForm.name}
                onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                placeholder="Enter your name"
              />
            </div>
            <div>
              <Label>Email (optional)</Label>
              <Input
                type="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                placeholder="Enter your email"
              />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input
                type="tel"
                value={registerForm.phone}
                onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                placeholder="Enter your phone"
              />
            </div>
            <div>
              <Label>PIN/Password *</Label>
              <Input
                type="password"
                value={registerForm.pin}
                onChange={(e) => setRegisterForm({ ...registerForm, pin: e.target.value })}
                placeholder="Create a PIN"
              />
            </div>
            <Button onClick={handleRegister} className="w-full">
              Register
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
