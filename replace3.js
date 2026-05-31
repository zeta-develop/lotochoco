const fs = require('fs');

function replaceFile(path, replacements) {
    let content = fs.readFileSync(path, 'utf8');
    for (const [from, to] of replacements) {
        content = content.replace(from, to);
    }
    fs.writeFileSync(path, content, 'utf8');
}

replaceFile('./components/pos/reports.tsx', [
    [/salesReport\.netProfit >= 0/g, '(salesReport?.netProfit || 0) >= 0'],
    [/salesReport\.totalSales > 0/g, '(salesReport?.totalSales || 0) > 0'],
    [/\(salesReport\.netProfit \/ salesReport\.totalSales\)/g, '((salesReport?.netProfit || 0) / (salesReport?.totalSales || 1))'],
    [/\(salesReport\.totalSales \|\| 1\)/g, '(salesReport?.totalSales || 1)'],
]);
