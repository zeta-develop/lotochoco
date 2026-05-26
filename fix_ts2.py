import os
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Cash hook fixes
    if 'use-cash-manager.ts' in filepath:
        content = content.replace("import { cashService } from '@/services/cash'", "import { cashService } from '../services/cash.service'")
        content = content.replace("await openCashSession", "await cashService.openSession")
        content = content.replace("await closeCashSession", "await cashService.closeSession")
        content = content.replace("await addCashMovement", "await cashService.addMovement")
        content = content.replace("await getCashSummary", "await cashService.getSummary")
        content = content.replace("await getCashSessions", "await cashService.getSessions")

    # Reports hook fixes
    if 'use-reports-manager.ts' in filepath:
        content = content.replace("import { reportsService } from '@/services/reports'", "import { reportsService } from '../services/reports.service'")
        
    # More toast fixes
    content = re.sub(r"toast\.error\((.*?)\)", r"toast({ variant: 'destructive', title: \1 })", content)
    content = re.sub(r"toast\.success\((.*?)\)", r"toast({ title: \1 })", content)
    content = re.sub(r"toast\.info\((.*?)\)", r"toast({ title: \1 })", content)

    # Game type casting
    content = content.replace("setSelectedGame(game)", "setSelectedGame(game as any)")
    content = content.replace("setSelectedGame(game || null)", "setSelectedGame(game as any)")
    content = content.replace("setSelectedGame(games[0])", "setSelectedGame(games[0] as any)")
    content = content.replace("setSelectedSchedule(games[0].schedules?.[0] || null)", "setSelectedSchedule(games[0].schedules?.[0] as any)")
    content = content.replace("if (game) handleGameSelect(game)", "if (game) handleGameSelect(game as any)")

    with open(filepath, 'w') as f:
        f.write(content)

for root, _, files in os.walk('.'):
    if 'node_modules' in root or '.git' in root or '.next' in root:
        continue
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            fix_file(os.path.join(root, file))

