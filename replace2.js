const fs = require('fs');

function replaceFile(path, replacements) {
    let content = fs.readFileSync(path, 'utf8');
    for (const [from, to] of replacements) {
        content = content.replace(from, to);
    }
    fs.writeFileSync(path, content, 'utf8');
}

replaceFile('./components/pos/dashboard.tsx', [
    [/\$\{report\.totalSales\.toLocaleString\(\)\}/g, '${(report?.totalSales || 0).toLocaleString()}'],
    [/\$\{report\.pendingPrizes\.toLocaleString\(\)\}/g, '${(report?.pendingPrizes || 0).toLocaleString()}'],
    [/\$\{report\.netProfit\.toLocaleString\(\)\}/g, '${(report?.netProfit || 0).toLocaleString()}'],
]);

replaceFile('./components/pos/cash-register.tsx', [
    [/\{\(session\.salesTotal - session\.prizesTotal\)\.toLocaleString\(\)\}/g, '{((session?.salesTotal || 0) - (session?.prizesTotal || 0)).toLocaleString()}'],
    [/\{\(summary\.salesTotal - summary\.prizesTotal\)\.toLocaleString\(\)\}/g, '{((summary?.salesTotal || 0) - (summary?.prizesTotal || 0)).toLocaleString()}'],
]);

replaceFile('./components/pos/pos-sale.tsx', [
    [/\{\(item\.amount \* item\.multiplier\)\.toLocaleString\(\)\}/g, '{((item?.amount || 0) * (item?.multiplier || 0)).toLocaleString()}'],
]);

replaceFile('./components/pos/reports.tsx', [
    [/\$\{val\.toLocaleString\(\)\}/g, '${(val || 0).toLocaleString()}'],
    [/salesReport\.totalSales \|\| 0/g, 'salesReport?.totalSales || 0'],
    [/salesReport\.totalPrizes \|\| 0/g, 'salesReport?.totalPrizes || 0'],
    [/salesReport\.pendingPrizes \|\| 0/g, 'salesReport?.pendingPrizes || 0'],
    [/salesReport\.netProfit \|\| 0/g, 'salesReport?.netProfit || 0'],
]);
