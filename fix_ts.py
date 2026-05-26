import os
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Fix toast
    content = re.sub(r"toast\.success\((['`].*?['`])\)", r"toast({ title: \1 })", content)
    content = re.sub(r"toast\.error\((['`].*?['`])\)", r"toast({ variant: 'destructive', title: \1 })", content)
    content = re.sub(r"toast\.info\((['`].*?['`])\)", r"toast({ title: \1 })", content)
    
    # Fix printer semicolon
    content = content.replace("let y = 58\n      (ticket.items", "let y = 58;\n      (ticket.items")

    # Fix sales.repository
    content = content.replace("ticketsService.getById(", "ticketsService.getTicketById(")

    # Fix app/page.tsx imports
    content = content.replace('import { Reports } from "@/components/pos/reports";', 'import { ReportsManager } from "@/features/reports/components/ReportsManager";')
    content = content.replace('import { CashRegister } from "@/components/pos/cash-register";', 'import { CashRegister } from "@/features/cash/components/CashRegister";')
    content = content.replace('import { LuckyPyramid } from "@/components/pos/lucky-pyramid";', 'import { LuckyPyramid } from "@/features/pyramid/components/lucky-pyramid";')
    content = content.replace('<Reports onModuleChange={setActiveModule} />', '<ReportsManager />')

    # Fix pyramid service import
    content = content.replace("@/services/pyramid", "../services/pyramid")

    # Fix use-updater
    content = content.replace('import packageJson from "../package.json";', 'import packageJson from "../../../package.json";')
    
    # Fix reports repository game_id
    content = content.replace("w.results?.game_id", "(w.results as any)?.game_id")
    content = content.replace("item.games?.name", "(item.games as any)?.name")

    # Fix settings manager
    content = content.replace("...settings, ...newSettings", "...settings, ...(newSettings as Record<string, string>)")
    
    with open(filepath, 'w') as f:
        f.write(content)

for root, _, files in os.walk('.'):
    if 'node_modules' in root or '.git' in root or '.next' in root:
        continue
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            fix_file(os.path.join(root, file))

