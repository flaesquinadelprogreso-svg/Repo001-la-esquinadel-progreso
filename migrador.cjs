const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

let changed = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Si tiene la importacion, procedemos a limpiar vestigios
    if (content.includes('import api from \'../api/client\';') || content.includes('import api from "../../api/client";')) {
        let original = content;

        // Literal concatenado simple: fetch(`${API_URL}/ruta`) -> api.get('/ruta')
        content = content.replace(/fetch\(`\$\{API_URL\}(.*?)`\)/g, "api.get('$1')");

        // Literal con opciones: fetch(`${API_URL}/ruta`, {...}) -> api.request({url: '/ruta', ...})
        // Como es multilinea, es difícil con simple Regex global. Vamos a reemplazar API_URL globalmente.
        content = content.replace(/\$\{API_URL\}/g, "");
        content = content.replace(/API_URL \+ /g, "");
        content = content.replace(/ \+ API_URL/g, "");

        // Arreglar casos donde quedó api.get('') en lugar de api.get('/')
        content = content.replace(/api\.get\(''\)/g, "api.get('/')");

        // Casos que quedaron como fetch('/ruta')
        content = content.replace(/fetch\('(.*?)'\)/g, "api.get('$1')");
        content = content.replace(/fetch\(`(.*?)`\)/g, "api.get(`$1`)");

        if (original !== content) {
            fs.writeFileSync(filePath, content);
            changed++;
        }
    }
}

console.log(`Archivos migrados/limpiados en pase 2: ${changed}`);
