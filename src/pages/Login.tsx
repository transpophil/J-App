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
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [pin, setPin] = useState("");

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
    </div>
  );
}