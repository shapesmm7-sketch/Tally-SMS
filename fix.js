import fs from 'fs';

const file = 'src/lib/i18n.ts';
let code = fs.readFileSync(file, 'utf-8');

const langs = code.split(/([a-z]{2,3}):\s*\{\s*["']?translation["']?:\s*\{/);

// It splits like:
// [0] -> code before first
// [1] -> 'en'
// [2] -> block inside 'en'
// [3] -> 'fr'
// [4] -> block inside 'fr'

for (let i = 2; i < langs.length; i += 2) {
  let block = langs[i];
  const cameraRegex = /[ \t]*"camera":[\s\S]*?(?=\n[ \t]*"[a-z]+":|\n[ \t]*\})/g;
  const cameraRegex2 = /[ \t]*camera:[\s\S]*?(?=\n[ \t]*[a-zA-Z_]+:|\n[ \t]*\})/g;
  
  let matches = block.match(cameraRegex);
  let matches2 = block.match(cameraRegex2);
  let matchedAll = [...(matches || []), ...(matches2 || [])];
  
  if (matchedAll.length > 1) {
    // Keep only the first one
    for (let j = 1; j < matchedAll.length; j++) {
        block = block.replace(matchedAll[j], '');
    }
  }
  langs[i] = block;
}

let newCode = langs[0];
for (let i = 1; i < langs.length; i += 2) {
  newCode += langs[i] + ": {\n    translation: {" + langs[i+1];
}

fs.writeFileSync(file, newCode);
console.log('Fixed file.');
