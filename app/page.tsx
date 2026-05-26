"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/pos/main-layout";
import { Dashboard } from "@/features/dashboard/components/Dashboard";
import { SalesTerminal } from "@/features/sales/components/SalesTerminal";
import { GamesManager } from "@/features/games/components/GamesManager";
import { ResultsManager } from "@/features/results/components/ResultsManager";
import { WinnersManager } from "@/features/winners/components/WinnersManager";
import { ReportsManager } from "@/features/reports/components/ReportsManager";
import { CashRegister } from "@/features/cash/components/CashRegister";
import { LuckyPyramid } from "@/features/pyramid/components/lucky-pyramid";
import { SettingsManager } from "@/features/settings/components/SettingsManager";
import { useAuthStore } from "@/store/auth-store";
import { LoginScreen } from "@/components/auth/login-screen";

type ActiveModule =
  | "dashboard"
  | "pos"
  | "games"
  | "results"
  | "winners"
  | "reports"
  | "cash"
  | "pyramid"
  | "settings";

export default function HomePage() {
  const [activeModule, setActiveModule] = useState<ActiveModule>("dashboard");
  const [isLoaded, setIsLoaded] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const renderModule = () => {
    switch (activeModule) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveModule} />;
      case "pos":
        return <SalesTerminal />;
      case "games":
        return <GamesManager />;
      case "results":
        return <ResultsManager />;
      case "winners":
        return <WinnersManager />;
      case "reports":
        return <ReportsManager onModuleChange={setActiveModule} />;
      case "cash":
        return <CashRegister />;
      case "pyramid":
        return <LuckyPyramid />;
      case 'settings': return <SettingsManager />;
      default:
        return <Dashboard onNavigate={setActiveModule} />;
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <MainLayout activeModule={activeModule} onModuleChange={setActiveModule}>
      {renderModule()}
    </MainLayout>
  );
}
