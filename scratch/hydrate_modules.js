const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else {
            try {
                fs.readFileSync(fullPath);
            } catch (e) {
                console.error('Failed reading:', fullPath, e.message);
            }
        }
    }
}

console.log('Hydrating lucide-react files...');
walkDir(path.join(__dirname, '../node_modules/lucide-react'));
console.log('Done hydrating lucide-react files.');
