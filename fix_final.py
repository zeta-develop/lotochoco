import os

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r') as f: content = f.read()
    with open(path, 'w') as f: f.write(content.replace(old, new))

replace_in_file('app/page.tsx', '<ReportsManager />', '<ReportsManager onModuleChange={setActiveModule} />')
replace_in_file('components/auth/login-screen.tsx', 'toast.error("Error al iniciar sesión", {', 'toast({ variant: "destructive", title: "Error al iniciar sesión",')
replace_in_file('features/cash/components/CashRegister.tsx', 'if (!result.success)', 'if (!result)')
replace_in_file('features/cash/components/CashRegister.tsx', 'result.message || ', '')
replace_in_file('features/reports/components/ReportsManager.tsx', 'if (!result.success)', 'if (!result)')
replace_in_file('features/reports/components/ReportsManager.tsx', 'result.message || ', '')
replace_in_file('features/settings/hooks/use-settings-manager.ts', 'setSettings(finalSettings)', 'setSettings(finalSettings as Record<string, string>)')

