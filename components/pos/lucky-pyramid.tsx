"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePyramid } from "@/hooks/use-pyramid";
import { Flame, Snowflake, Triangle, Calendar, RefreshCw } from "lucide-react";

export function LuckyPyramid() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const { data, isLoading, mutate } = usePyramid(selectedDate);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleRefresh = () => {
    mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Piramide de la Suerte</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="w-40"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pyramid" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pyramid" className="gap-2">
            <Triangle className="h-4 w-4" />
            Piramide
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <Flame className="h-4 w-4" />
            Numeros Calientes/Frios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pyramid" className="mt-6">
          <Card className="border-primary/20">
            <CardHeader className="text-center pb-2">
              <CardTitle className="flex items-center justify-center gap-2">
                <Triangle className="h-5 w-5 text-primary" />
                Piramide Numerica
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Fecha: {new Date(selectedDate).toLocaleDateString("es-NI", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : data?.pyramid ? (
                <div className="flex flex-col items-center space-y-3 py-6">
                  {data.pyramid.rows.map((row: number[], rowIndex: number) => (
                    <div key={rowIndex} className="flex gap-2">
                      {row.map((num: number, colIndex: number) => (
                        <div
                          key={colIndex}
                          className={`
                            w-12 h-12 flex items-center justify-center rounded-lg font-bold text-lg
                            transition-all duration-300 hover:scale-110
                            ${rowIndex === data.pyramid.rows.length - 1
                              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-primary/50"
                              : rowIndex === 0
                              ? "bg-secondary text-secondary-foreground"
                              : "bg-muted text-foreground"
                            }
                          `}
                        >
                          {num}
                        </div>
                      ))}
                    </div>
                  ))}
                  
                  <div className="mt-6 text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Numero de la Suerte</p>
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-3xl font-bold shadow-xl">
                      {data.pyramid.luckyNumber}
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-muted/50 rounded-lg w-full max-w-md">
                    <h4 className="font-semibold mb-2 text-center">Como se calcula:</h4>
                    <ol className="text-sm text-muted-foreground space-y-1">
                      <li>1. Se toma la fecha: {selectedDate}</li>
                      <li>2. Se separan los digitos: {data.pyramid.rows[0]?.join(", ")}</li>
                      <li>3. Se suman los digitos adyacentes</li>
                      <li>4. Se reduce cada suma a un solo digito si es mayor a 9</li>
                      <li>5. Se repite hasta obtener un solo numero</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No se pudo calcular la piramide
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Numeros Calientes */}
            <Card className="border-red-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500">
                  <Flame className="h-5 w-5" />
                  Numeros Calientes
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Los numeros que mas han salido recientemente
                </p>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
                  </div>
                ) : data?.hotNumbers && data.hotNumbers.length > 0 ? (
                  <div className="space-y-3">
                    {data.hotNumbers.map((item: { number: string; count: number }, index: number) => (
                      <div
                        key={item.number}
                        className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 hover:bg-red-500/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={`
                              w-8 h-8 rounded-full flex items-center justify-center
                              ${index === 0 ? "bg-red-500 text-white border-red-500" : "border-red-500/50 text-red-500"}
                            `}
                          >
                            {index + 1}
                          </Badge>
                          <span className="font-mono text-2xl font-bold">{item.number}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-semibold">{item.count}</span>
                          <span className="text-sm text-muted-foreground ml-1">veces</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No hay suficientes datos historicos
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Numeros Frios */}
            <Card className="border-blue-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-500">
                  <Snowflake className="h-5 w-5" />
                  Numeros Frios
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Los numeros que menos han salido
                </p>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  </div>
                ) : data?.coldNumbers && data.coldNumbers.length > 0 ? (
                  <div className="space-y-3">
                    {data.coldNumbers.map((item: { number: string; count: number }, index: number) => (
                      <div
                        key={item.number}
                        className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 hover:bg-blue-500/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={`
                              w-8 h-8 rounded-full flex items-center justify-center
                              ${index === 0 ? "bg-blue-500 text-white border-blue-500" : "border-blue-500/50 text-blue-500"}
                            `}
                          >
                            {index + 1}
                          </Badge>
                          <span className="font-mono text-2xl font-bold">{item.number}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-semibold">{item.count}</span>
                          <span className="text-sm text-muted-foreground ml-1">veces</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No hay suficientes datos historicos
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Estadisticas generales */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Estadisticas Generales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {data?.totalResults || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Sorteos</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-500">
                    {data?.totalWinners || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Ganadores</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-500">
                    {data?.hotNumbers?.[0]?.number || "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">Mas Caliente</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-500">
                    {data?.coldNumbers?.[0]?.number || "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">Mas Frio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
