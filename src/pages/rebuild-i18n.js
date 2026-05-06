import fs from 'fs';
import path from 'path';

async function translateText(text, targetLang) {
  try {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
    const data = await response.json();
    return data[0].map(item => item[0]).join('');
  } catch (e) {
    console.error(`Failed to translate to ${targetLang}:`, e.message);
    return text;
  }
}

async function bulkTranslate(obj, lang) {
  const result = {};
  const entries = Object.entries(obj);
  
  // Use Promise.all to translate in parallel. 
  // Map over entries and translate concurrently.
  await Promise.all(entries.map(async ([key, value]) => {
    if (typeof value === 'string') {
      let translated = await translateText(value, lang);
      translated = translated.replace(/\{\{\s*(.*?)\s*\}\}/g, '{{$1}}');
      result[key] = translated;
    } else if (typeof value === 'object' && value !== null) {
      result[key] = await bulkTranslate(value, lang);
    }
  }));
  return result;
}

const file = 'src/lib/i18n.ts';
const raw = fs.readFileSync(file, 'utf-8');

// The file now has "const resources = {" followed by a JSON object. We can isolate the JSON.
let resourcesStr = raw.substring(raw.indexOf('const resources = ') + 18);
resourcesStr = resourcesStr.substring(0, resourcesStr.indexOf(';\n\ni18n'));

let enObj;
try {
  enObj = JSON.parse(resourcesStr).en.translation;
} catch (e) {
  console.error("Parse failed:", e);
  process.exit(1);
}

const languages = [
  'fr', 'es', 'de', 'pt', 'sw', 'ar', 'bn', 'zh', 'cs', 'da', 
  'nl', 'fi', 'el', 'he', 'hi', 'hu', 'id', 'it', 'ja', 'ko',
  'ms', 'mr', 'no', 'fa', 'pl', 'ro', 'ru', 'sv', 'tl', 'ta',
  'te', 'th', 'tr', 'uk', 'ur', 'vi'
];

async function run() {
  const finalResources = {
    en: { translation: enObj }
  };
  
  const beforeEnd = raw.indexOf('const resources = {');
  const fileHeader = raw.substring(0, beforeEnd);

  function saveFile() {
    let newFile = fileHeader + 'const resources = ' + JSON.stringify(finalResources, null, 2) + ';\n\n' +
      "i18n\n" +
      "  .use(LanguageDetector)\n" +
      "  .use(initReactI18next)\n" +
      "  .init({\n" +
      "    resources,\n" +
      "    fallbackLng: 'en',\n" +
      "    detection: {\n" +
      "      order: ['navigator'],\n" +
      "    },\n" +
      "    interpolation: {\n" +
      "      escapeValue: false,\n" +
      "    }\n" +
      "  });\n\n" +
      "export default i18n;\n";

    fs.writeFileSync(file, newFile);
  }

  // Restore already working languages from raw file (optional, but let's just retranslate quickly)

  console.log("Translating multiple languages in sequence with internal chunking...");
  
  for (const lang of languages) {
    console.log(`Translating: ${lang}...`);
    let target = lang === 'zh' ? 'zh-CN' : lang;
    const translated = await bulkTranslate(enObj, target);
    finalResources[lang] = { translation: translated };
    saveFile();
  }
  
  console.log("Done!");
}

run();
