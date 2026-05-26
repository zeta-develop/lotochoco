'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Store, Printer, UserCircle } from 'lucide-react'
import { GeneralSettingsTab } from './GeneralSettingsTab'
import { PrinterSettingsTab } from './PrinterSettingsTab'
import { AccountSettingsTab } from './AccountSettingsTab'

export function SettingsManager() {
  const [activeTab, setActiveTab] = useState('general')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">Configuración</h2>
          <p className="text-muted-foreground mt-1">Gestiona los ajustes generales, dispositivos y tu cuenta.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex overflow-x-auto w-full sm:inline-flex h-auto gap-2 p-1.5 bg-card/50 backdrop-blur-sm border border-white/5 rounded-2xl whitespace-nowrap">
          <TabsTrigger value="general" className="flex-1 sm:flex-none rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300">
            <Store className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="printer" className="flex-1 sm:flex-none rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300">
            <Printer className="h-4 w-4 mr-2" />
            Impresora
          </TabsTrigger>
          <TabsTrigger value="account" className="flex-1 sm:flex-none rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300">
            <UserCircle className="h-4 w-4 mr-2" />
            Cuenta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <GeneralSettingsTab />
        </TabsContent>

        <TabsContent value="printer" className="mt-4">
          <PrinterSettingsTab />
        </TabsContent>

        <TabsContent value="account" className="mt-4">
          <AccountSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
