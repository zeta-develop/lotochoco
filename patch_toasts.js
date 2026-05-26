const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Match toast.success('...'), toast.success(`...`), toast.success(variable)
      // Actually, standard regex: toast\.(success|error|info)\(([^)]+)\)
      const regex = /toast\.(success|error|info)\(([\s\S]*?)\)/g;
      
      content = content.replace(regex, (match, type, args) => {
        changed = true;
        // Trim any extra parens if needed, but the args is everything inside outer parens.
        // We will map success -> { title: args }, error -> { variant: 'destructive', title: args }, info -> { title: args }
        if (type === 'error') {
          return `toast({ variant: 'destructive', title: ${args} })`;
        } else {
          return `toast({ title: ${args} })`;
        }
      });

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Patched:', fullPath);
      }
    }
  }
}

processDir('./components');
processDir('./hooks');
processDir('./features');
console.log('Done.');
