import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDriver } from "@/contexts/DriverContext";
import logo from "@/assets/j-app-logo.jpg";

export default function Splash() {
  const navigate = useNavigate();
  const { currentDriver, isLoading } = useDriver();

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (currentDriver) {
        navigate("/dashboard");
      } else {
        navigate("/login");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentDriver, isLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-secondary to-accent animate-in fade-in duration-1000">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <img src={logo} alt="J-App Logo" className="w-32 h-32 rounded-3xl shadow-2xl animate-in zoom-in duration-500" />
        </div>
        <h1 className="text-5xl font-bold text-white drop-shadow-lg">J-App</h1>
        <p className="text-white/90 text-lg">Driver Management System</p>
        <div className="flex justify-center pt-4">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
}
