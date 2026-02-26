const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

let changed = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Si tiene la importacion (casi todos la tienen ya), procedemos
    if (content.includes('import api from \'../api/client\';') || content.includes('import api from "../../api/client";')) {
        let original = content;

        // 1. fetch('/ruta') puro
        content = content.replace(/await fetch\((.*?)\)/g, "await api.get($1)");

        // 2. Errores de pase 1: await fetch(`/ruta`) que quedaron mal
        content = content.replace(/await fetch\(`(.*?)`\)/g, "await api.get(`$1`)");

        // 3. Casos de response.ok -> response.data (heuristicos simples)
        content = content.replace(/if\s*\(\s*response\.ok\s*\)/g, "if (response.data)");

        // 4. Casos de .json()
        content = content.replace(/await\s+([a-zA-Z0-9_]+)\.json\(\)/g, "$1.data");
        content = content.replace(/\.then\(res => res\.json\(\)\)/g, ".then(res => res.data)");

        if (original !== content) {
            fs.writeFileSync(filePath, content);
            changed++;
        }
    }
}

console.log(`Archivos migrados/limpiados en pase 3: ${changed}`);
