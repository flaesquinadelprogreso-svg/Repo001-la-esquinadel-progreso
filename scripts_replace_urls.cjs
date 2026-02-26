const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else {
            results.push(file);
        }
    });
    return results;
}

const files = walkDir('./src').filter(f => f.endsWith('.js') || f.endsWith('.jsx'));
let c = 0;
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('http://localhost:3001')) {
        const regexApiTick = /`http:\/\/localhost:3001\/api/g;
        const regexApiQuote = /['"]http:\/\/localhost:3001\/api/g;
        const regexTick = /`http:\/\/localhost:3001/g;
        const regexQuote = /['"]http:\/\/localhost:3001/g;

        content = content.replace(regexApiTick, '`${import.meta.env.VITE_API_URL}');
        content = content.replace(regexApiQuote, 'import.meta.env.VITE_API_URL + \'');
        content = content.replace(regexTick, '`${import.meta.env.VITE_API_URL.replace("/api", "")}');
        content = content.replace(regexQuote, 'import.meta.env.VITE_API_URL.replace("/api", "") + \'');

        fs.writeFileSync(file, content);
        c++;
    }
}
console.log('Archivos reemplazados: ' + c);
