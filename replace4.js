const fs = require('fs');

function replaceFile(path, replacements) {
    let content = fs.readFileSync(path, 'utf8');
    for (const [from, to] of replacements) {
        content = content.replace(from, to);
    }
    fs.writeFileSync(path, content, 'utf8');
}

replaceFile('./components/pos/reports.tsx', [
    [/\{salesReport\.totalTickets\}/g, '{(salesReport?.totalTickets || 0)}'],
]);
