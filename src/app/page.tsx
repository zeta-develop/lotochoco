"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { LoginScreen } from "@/features/auth/components/login-screen";

// Carga dinámica de módulos para optimización de bundle
const Dashboard = dynamic(() => import("@/features/dashboard/components/Dashboard").then(m => m.Dashboard), {
  loading: () => <ModuleLoader label="Tablero" />
});
const SalesTerminal = dynamic(() => import("@/features/sales/components/SalesTerminal").then(m => m.SalesTerminal), {
  loading: () => <ModuleLoader label="Terminal" />
});
const GamesManager = dynamic(() => import("@/features/games/components/GamesManager").then(m => m.GamesManager), {
  loading: () => <ModuleLoader label="Juegos" />
});
const ResultsManager = dynamic(() => import("@/features/results/components/ResultsManager").then(m => m.ResultsManager), {
  loading: () => <ModuleLoader label="Resultados" />
});
const WinnersManager = dynamic(() => import("@/features/winners/components/WinnersManager").then(m => m.WinnersManager), {
  loading: () => <ModuleLoader label="Ganadores" />
});
const ReportsManager = dynamic(() => import("@/features/reports/components/ReportsManager").then(m => m.ReportsManager), {
  loading: () => <ModuleLoader label="Reportes" />
});
const CashRegister = dynamic(() => import("@/features/cash/components/CashRegister").then(m => m.CashRegister), {
  loading: () => <ModuleLoader label="Caja" />
});
const LuckyPyramid = dynamic(() => import("@/features/pyramid/components/lucky-pyramid").then(m => m.LuckyPyramid), {
  loading: () => <ModuleLoader label="Pirámide" />
});
const SettingsManager = dynamic(() => import("@/features/settings/components/SettingsManager").then(m => m.SettingsManager), {
  loading: () => <ModuleLoader label="Ajustes" />
});

function ModuleLoader({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cargando {label}...</p>
      </div>
    </div>
  );
}

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

