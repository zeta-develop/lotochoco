"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/pos/main-layout";
import { Dashboard } from "@/components/pos/dashboard";
import { POSSale } from "@/components/pos/pos-sale";
import { GamesManager } from "@/components/pos/games-manager";
import { ResultsManager } from "@/components/pos/results-manager";
import { WinnersManager } from "@/components/pos/winners-manager";
import { Reports } from "@/components/pos/reports";
import { CashRegister } from "@/components/pos/cash-register";
import { LuckyPyramid } from "@/components/pos/lucky-pyramid";
import { Settings } from "@/components/pos/settings";

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

  useEffect(() => {
    // Check for dark mode preference
    const savedTheme = localStorage.getItem("pos-theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    }
    setIsLoaded(true);
  }, []);

  const renderModule = () => {
    switch (activeModule) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveModule} />;
      case "pos":
        return <POSSale />;
      case "games":
        return <GamesManager />;
      case "results":
        return <ResultsManager />;
      case "winners":
        return <WinnersManager />;
      case "reports":
        return <Reports />;
      case "cash":
        return <CashRegister />;
      case "pyramid":
        return <LuckyPyramid />;
      case "settings":
        return <Settings />;
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

  return (
    <MainLayout activeModule={activeModule} onModuleChange={setActiveModule}>
      {renderModule()}
    </MainLayout>
  );
}
