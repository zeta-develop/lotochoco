"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePyramid } from "@/features/pyramid/hooks/use-pyramid";
import { useSalesStore } from "@/features/sales/store/sales.store";
import { toast } from "@/components/ui/use-toast";
import { 
  Flame, 
  Snowflake, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Bolt, 
  Search, 
  Plus, 
  ArrowRight, 
  Sparkles, 
  Dices,
  RotateCcw
} from "lucide-react";
import { format, subDays, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface LuckyPyramidProps {
  onNavigate?: (module: string) => void;
}

const DREAM_SYMBOLS = [
  { emoji: "🐎", number: "24", name: "Caballo", tag: "Frecuente hoy", type: "secondary" },
  { emoji: "⭐", number: "48", name: "Estrella", tag: "Poder Máximo", type: "tertiary" },
  { emoji: "💵", number: "10", name: "Dinero", tag: "Suerte activa", type: "primary" },
  { emoji: "🐕", number: "04", name: "Perro", tag: "Fiel 30d", type: "neutral" },
  { emoji: "🦋", number: "18", name: "Mariposa", tag: "Esperanza", type: "neutral" },
  { emoji: "🐈", number: "05", name: "Gato", tag: "Intuición", type: "neutral" },
  { emoji: "🐍", number: "33", name: "Serpiente", tag: "Sorpresa", type: "neutral" },
  { emoji: "🕊️", number: "02", name: "Paloma", tag: "Paz", type: "neutral" },
  { emoji: "💍", number: "55", name: "Anillo", tag: "Compromiso", type: "neutral" },
  { emoji: "🚗", number: "21", name: "Carro", tag: "Viaje", type: "neutral" },
  { emoji: "🦁", number: "88", name: "León", tag: "Fuerza", type: "neutral" },
  { emoji: "👶", number: "15", name: "Bebé", tag: "Comienzo", type: "neutral" },
];

export function LuckyPyramid({ onNavigate }: LuckyPyramidProps) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dreamSearch, setDreamSearch] = useState("");
  const { data, isLoading, mutate } = usePyramid(selectedDate);
  const { addToCart, selectedGame, selectedSchedule } = useSalesStore();

  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    setSelectedDate(format(subDays(current, 1), "yyyy-MM-dd"));
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    setSelectedDate(format(addDays(current, 1), "yyyy-MM-dd"));
  };

  const filteredDreams = useMemo(() => {
    if (!dreamSearch.trim()) return DREAM_SYMBOLS;
    const query = dreamSearch.toLowerCase();
    return DREAM_SYMBOLS.filter(
      (d) => d.name.toLowerCase().includes(query) || d.number.includes(query)
    );
  }, [dreamSearch]);

  const mainLucky = String(data?.pyramid?.luckyNumber || "48").padStart(2, "0");
  const secondaryLucky = String(data?.luckyNumbers?.double?.[0] || "24").padStart(2, "0");
  const tertiaryLucky = String(data?.luckyNumbers?.double?.[1] || "04").padStart(2, "0");

  const handleAddNumber = (num: string, label?: string) => {
    const formatted = num.padStart(2, "0");
    addToCart({
      gameId: selectedGame?.id || "diaria-default",
      gameName: selectedGame?.name || "La Diaria",
      number: formatted,
      amount: 20,
      multiplier: selectedGame?.multiplier ?? 70,
      schedule: selectedSchedule?.time || "11:00 AM",
      scheduleName: selectedSchedule?.name || "Sorteo 11:00 AM",
      client: label ? `Sueño: ${label}` : undefined,
    });
    toast({ title: `Número ${formatted} añadido a la venta (C$20)` });
  };

  const handleLoadPyramidCombo = () => {
    handleAddNumber(mainLucky, "Pirámide Apex");
    handleAddNumber(secondaryLucky, "Pirámide Secundario");
    if (onNavigate) {
      onNavigate("pos");
    }
  };

  const handleBetLuckyCombo = () => {
    handleAddNumber(mainLucky, "Combo Estrella");
    handleAddNumber(secondaryLucky, "Combo Caballo");
    handleAddNumber(tertiaryLucky, "Combo Especial");
    if (onNavigate) {
      onNavigate("pos");
    }
  };

  return (
    <div className="space-y-4 pb-36 max-w-lg mx-auto select-none">
      {/* SCREEN HEADER & DATE STRIP */}
      <section className="bg-[#131b2e] p-3.5 rounded-xl border border-[#3c4a42]/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#171f33] flex items-center justify-center border border-[#3c4a42] text-[#4cd7f6]">
              <Dices className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-mono text-lg font-bold text-[#dae2fd] flex items-center gap-1.5">
                Pirámide de la Suerte
                <Sparkles className="h-4 w-4 text-[#f59e0b]" />
              </h1>
              <p className="font-mono text-xs text-[#bbcabf]">
                Pronósticos basados en fecha y numerología
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 rounded-lg bg-[#171f33] border-[#3c4a42] text-[#bbcabf]"
            onClick={() => mutate()}
            title="Actualizar pronósticos"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* DATE SELECTOR AND ACTIVE DRAW CHIP */}
        <div className="pt-2 border-t border-[#3c4a42]/50 flex flex-col gap-2 font-mono">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handlePrevDay}
              className="px-3 py-1.5 rounded-lg bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] text-xs font-bold border border-[#3c4a42] flex items-center gap-1 active:scale-95 transition-transform"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Ayer
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0b1326] border border-[#4cd7f6] text-[#4cd7f6] text-xs font-bold">
              <Calendar className="h-3.5 w-3.5" />
              <span>{format(new Date(selectedDate), "dd / MM / yyyy")}</span>
            </div>
            <button
              onClick={handleNextDay}
              className="px-3 py-1.5 rounded-lg bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] text-xs font-bold border border-[#3c4a42] flex items-center gap-1 active:scale-95 transition-transform"
            >
              Mañana
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#171f33] border border-[#3c4a42]/60">
            <div className="flex items-center gap-2 text-[#dae2fd] text-xs">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
              <span className="font-bold">Sorteo Activo: {selectedSchedule?.name || "3:00 PM"}</span>
            </div>
            <span className="font-mono text-[10px] text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/30 px-2 py-0.5 rounded font-bold">
              Alta Frecuencia
            </span>
          </div>
        </div>
      </section>

      {/* THE GEOMETRIC LUCKY PYRAMID */}
      <section className="bg-[#131b2e] p-4 rounded-xl border border-[#3c4a42]/70 relative overflow-hidden space-y-3">
        {/* Glow background effects */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#10b981]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-[#4cd7f6]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between pb-2 border-b border-[#3c4a42]/50 font-mono">
          <div className="flex items-center gap-1.5 text-xs text-[#10b981] font-bold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>PIRÁMIDE NUMEROLÓGICA DE HOY</span>
          </div>
          <span className="text-[10px] text-[#86948a]">Algoritmo Místico</span>
        </div>

        {/* Pyramid Visual Stack */}
        <div className="flex flex-col items-center gap-2.5 py-2">
          {/* APEX / POWER NUMBERS */}
          <div className="flex items-center justify-center gap-6 mb-2 font-mono">
            {/* Main Apex */}
            <div 
              className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform"
              onClick={() => handleAddNumber(mainLucky, "Estrella")}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#f59e0b] text-[#001f26] flex flex-col items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] border-2 border-[#ffddb8] group-hover:scale-105 transition-transform">
                <span className="text-[10px] font-bold leading-none -mt-1">★</span>
                <span>{mainLucky}</span>
              </div>
              <span className="mt-1 text-[11px] text-[#f59e0b] font-bold">Estrella · 70x</span>
            </div>

            {/* Secondary Apex */}
            <div 
              className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform"
              onClick={() => handleAddNumber(secondaryLucky, "Caballo")}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#4cd7f6] text-[#001f26] flex flex-col items-center justify-center font-black text-xl shadow-[0_0_18px_rgba(76,215,246,0.35)] border-2 border-[#acedff] group-hover:scale-105 transition-transform">
                <span className="text-[10px] font-bold leading-none -mt-1">♞</span>
                <span>{secondaryLucky}</span>
              </div>
              <span className="mt-1 text-[11px] text-[#4cd7f6] font-bold">Caballo · 70x</span>
            </div>
          </div>

          {/* Stepped Numeric Rows */}
          {isLoading ? (
            <div className="py-8 text-center text-[#86948a] font-mono text-xs animate-pulse">
              Calculando pirámide numerológica...
            </div>
          ) : data?.pyramid ? (
            <div className="flex flex-col items-center gap-1.5 font-mono">
              {data.pyramid.rows.map((row: number[], rowIndex: number) => {
                const isBase = rowIndex === data.pyramid!.rows.length - 1;
                const isApexRow = rowIndex === 0;
                return (
                  <div key={rowIndex} className="flex items-center justify-center gap-1.5">
                    {row.map((digit: number, colIndex: number) => (
                      <div
                        key={colIndex}
                        className={cn(
                          "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-transform hover:scale-110",
                          isBase
                            ? "bg-[#0b1326] border border-[#10b981] text-[#10b981] shadow-sm font-black"
                            : isApexRow
                            ? "bg-[#10b981] text-[#003824] font-black active-glow"
                            : "bg-[#171f33] border border-[#3c4a42] text-[#dae2fd]"
                        )}
                      >
                        {digit}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-[#86948a] font-mono text-xs">
              Sin datos para esta fecha
            </div>
          )}

          {/* Quick Action Under Pyramid */}
          <Button
            className="w-full mt-2 h-11 rounded-xl bg-[#171f33] hover:bg-[#222a3d] text-[#10b981] border border-[#10b981]/50 font-mono text-xs font-bold flex items-center justify-center gap-2 active:scale-98 transition-transform active-glow"
            onClick={handleLoadPyramidCombo}
          >
            <Bolt className="h-4 w-4 text-[#10b981]" />
            Cargar Números de la Pirámide a Venta ({mainLucky}, {secondaryLucky})
          </Button>
        </div>
      </section>

      {/* GUÍA DE LOS SUEÑOS (Traditional Dream Dictionary) */}
      <section className="bg-[#131b2e] p-3.5 rounded-xl border border-[#3c4a42]/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌙</span>
            <div>
              <h2 className="font-mono text-sm font-bold text-[#dae2fd]">
                Guía de los Sueños
              </h2>
              <p className="font-mono text-xs text-[#bbcabf]">
                Significado místico y números asociados
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-[#4cd7f6] bg-[#171f33] px-2 py-0.5 rounded border border-[#3c4a42]">
            {filteredDreams.length} símbolos
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86948a] h-4 w-4" />
          <Input
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0b1326] border-[#3c4a42] text-xs font-mono text-[#dae2fd] placeholder:text-[#86948a] focus:border-[#4cd7f6]"
            placeholder="Buscar símbolo o sueño (ej. Caballo, Dinero, Gato)..."
            value={dreamSearch}
            onChange={(e) => setDreamSearch(e.target.value)}
          />
        </div>

        {/* Horizontal Cards Carousel */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          {filteredDreams.map((item) => (
            <div
              key={item.name}
              className={cn(
                "flex-shrink-0 w-28 bg-[#171f33] p-2.5 rounded-xl border flex flex-col justify-between transition-transform hover:scale-102",
                item.type === "secondary"
                  ? "border-[#4cd7f6]/50 cyan-glow"
                  : item.type === "tertiary"
                  ? "border-[#f59e0b]/50 amber-glow"
                  : item.type === "primary"
                  ? "border-[#10b981]/50 active-glow"
                  : "border-[#3c4a42]"
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xl">{item.emoji}</span>
                  <span className={cn(
                    "font-mono text-base font-bold",
                    item.type === "secondary" ? "text-[#4cd7f6]" :
                    item.type === "tertiary" ? "text-[#f59e0b]" :
                    item.type === "primary" ? "text-[#10b981]" : "text-[#dae2fd]"
                  )}>
                    {item.number}
                  </span>
                </div>
                <p className="font-mono text-xs font-bold text-[#dae2fd] mt-1 truncate">
                  {item.name}
                </p>
                <span className="text-[10px] font-mono text-[#86948a] block truncate">
                  {item.tag}
                </span>
              </div>
              <button
                onClick={() => handleAddNumber(item.number, item.name)}
                className="mt-2.5 w-full py-1 rounded-lg bg-[#0b1326] hover:bg-[#020617] text-[#dae2fd] border border-[#3c4a42] text-[11px] font-mono font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
              >
                <Plus className="h-3 w-3" />
                Añadir
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* NÚMEROS CALIENTES Y FRÍOS (Estadísticas Históricas) */}
      <section className="bg-[#131b2e] p-3.5 rounded-xl border border-[#3c4a42]/70 space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <div>
              <h2 className="text-sm font-bold text-[#dae2fd]">
                Termómetro de Números
              </h2>
              <p className="text-xs text-[#bbcabf]">
                Histórico de salidas recientes
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#171f33] text-[11px] text-[#86948a] border border-[#3c4a42]">
            120 sorteos
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Calientes */}
          <div className="bg-[#0b1326] p-2.5 rounded-xl border border-[#f59e0b]/40 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-[#f59e0b] font-bold pb-1.5 border-b border-[#3c4a42]/50">
              <Flame className="h-4 w-4" />
              <span>Calientes</span>
            </div>
            <div className="space-y-1.5">
              {[
                { num: "48", count: "14 veces", tag: "Top 1", highlight: true },
                { num: "24", count: "11 veces", tag: "Racha" },
                { num: "04", count: "9 veces", tag: "Alto" },
              ].map((item) => (
                <div
                  key={item.num}
                  onClick={() => handleAddNumber(item.num, "Caliente")}
                  className="flex items-center justify-between p-1.5 rounded-lg bg-[#171f33] border border-[#3c4a42] cursor-pointer hover:border-[#f59e0b]/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-[#f59e0b] text-[#001f26] text-xs font-black flex items-center justify-center">
                      {item.num}
                    </span>
                    <span className="text-[11px] text-[#dae2fd]">{item.count}</span>
                  </div>
                  <span className="text-[9px] bg-[#f59e0b]/20 text-[#f59e0b] px-1 py-0.2 rounded font-bold">
                    {item.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Fríos */}
          <div className="bg-[#0b1326] p-2.5 rounded-xl border border-[#4cd7f6]/40 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-[#4cd7f6] font-bold pb-1.5 border-b border-[#3c4a42]/50">
              <Snowflake className="h-4 w-4" />
              <span>Fríos / Atraso</span>
            </div>
            <div className="space-y-1.5">
              {[
                { num: "99", count: "0 salidas", tag: "Máx" },
                { num: "71", count: "1 salida", tag: "-28d" },
                { num: "13", count: "1 salida", tag: "-24d" },
              ].map((item) => (
                <div
                  key={item.num}
                  onClick={() => handleAddNumber(item.num, "Frío")}
                  className="flex items-center justify-between p-1.5 rounded-lg bg-[#171f33] border border-[#3c4a42] cursor-pointer hover:border-[#4cd7f6]/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-[#171f33] border border-[#4cd7f6] text-[#4cd7f6] text-xs font-black flex items-center justify-center">
                      {item.num}
                    </span>
                    <span className="text-[11px] text-[#dae2fd]">{item.count}</span>
                  </div>
                  <span className="text-[9px] bg-[#4cd7f6]/20 text-[#4cd7f6] px-1 py-0.2 rounded font-bold">
                    {item.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STICKY FLOATING BOTTOM QUICK BET CTA */}
      <aside className="fixed bottom-14 left-0 w-full z-40 px-3 py-2 pointer-events-none">
        <div className="max-w-lg mx-auto bg-[#171f33]/95 backdrop-blur-md p-3 rounded-2xl border border-[#10b981]/60 shadow-[0_8px_24px_rgba(0,0,0,0.7)] flex items-center justify-between gap-3 pointer-events-auto active-glow">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
              <span className="text-xs font-mono font-bold text-[#dae2fd]">Combo de la Suerte:</span>
              <div className="flex items-center gap-1 font-mono text-xs">
                <span className="px-1.5 py-0.2 rounded bg-[#0b1326] font-bold border border-[#f59e0b]/40 text-[#f59e0b]">{mainLucky}</span>
                <span className="px-1.5 py-0.2 rounded bg-[#0b1326] font-bold border border-[#4cd7f6]/40 text-[#4cd7f6]">{secondaryLucky}</span>
                <span className="px-1.5 py-0.2 rounded bg-[#0b1326] font-bold border border-[#3c4a42] text-[#dae2fd]">{tertiaryLucky}</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono text-base text-[#10b981] font-black">C$ 60.00</span>
              <span className="text-[10px] font-mono text-[#86948a]">(3 jugadas · C$20 c/u)</span>
            </div>
          </div>
          <Button
            onClick={handleBetLuckyCombo}
            className="h-11 px-4 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#003824] font-mono font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-transform shrink-0"
          >
            <span>Apostar</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </aside>
    </div>
  );
}
