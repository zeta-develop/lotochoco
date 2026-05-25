#!/bin/bash

# Find all files with toLocaleString()
FILES=$(find ./components -name "*.tsx")

for FILE in $FILES; do
    sed -i -E "s/\\{currency\\}\\{([a-zA-Z0-9_.]+)\.toLocaleString\(\)\\}/\\{currency\\}\\{\(\1 \|\| 0\)\.toLocaleString\(\)\\}/g" "$FILE"
    sed -i -E "s/\\{currency\\}([a-zA-Z0-9_.]+)\.toLocaleString\(\)/\\{currency\\}\\{\(\1 \|\| 0\)\.toLocaleString\(\)\\}/g" "$FILE"

    # Dashboard specific
    sed -i -E "s/value: \\\`\\\$\\{currency\\}\\\$\\{([a-zA-Z0-9_.]+)\.toLocaleString\(\)\\\}\\\`/value: \\\`\\\$\\{currency\\}\\\$\\{\(\1 \|\| 0\)\.toLocaleString\(\)\\\}\\\`/g" "$FILE"

    # ui/chart.tsx specific
    sed -i -E "s/\\{item\.value\.toLocaleString\(\)\\}/\\{\(item\.value \|\| 0\)\.toLocaleString\(\)\\}/g" "$FILE"

    # Reports formatter specific
    sed -i -E "s/formatter=\\{\(val: number\) => \\\\[\\\`\\\$\\{currency\\}\\\$\\{val\.toLocaleString\(\)\\\}\\\`, 'Ventas'\\\\]\\}/formatter=\\{\(val: number\) => \\\\[\\\`\\\$\\{currency\\}\\\$\\{\(val \|\| 0\)\.toLocaleString\(\)\\\}\\\`, 'Ventas'\\\\]\\}/g" "$FILE"
done
