import fs from 'fs';

const raw = fs.readFileSync('src/lib/i18n.ts', 'utf-8');
const startMatch = raw.indexOf('en: {');
const endMatch = raw.indexOf('fr: {');

let englishText = raw.substring(startMatch, endMatch);
console.log(englishText.slice(-100));
