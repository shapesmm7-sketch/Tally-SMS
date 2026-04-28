import fs from 'fs';
import path from 'path';

async function translateText(text, targetLang) {
  try {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
    const data = await response.json();
    return data[0].map(item => item[0]).join('');
  } catch (e) {
    console.error(`Failed to translate to ${targetLang}:`, e);
    return text;
  }
}

async function bulkTranslate(obj, lang) {
  const result = {};
  const entries = Object.entries(obj);
  
  const translations = await Promise.all(entries.map(async ([key, value]) => {
    if (typeof value === 'string') {
      let translated = await translateText(value, lang);
      translated = translated.replace(/\{\{\s*(count)\s*\}\}/g, '{{count}}');
      return { key, value: translated };
    } else {
      return { key, value: await bulkTranslate(value, lang) };
    }
  }));

  for (const { key, value } of translations) {
    result[key] = value;
  }
  return result;
}

const cameraEnglish = {
  title: 'Scan SMS',
  instructions: 'Point the camera at a mobile money SMS on another phone. For Live Scan, slowly scroll down to capture all details. You can also use Take Photo to capture a screen directly, or upload screenshots from Gallery.',
  live_scan: 'Live Scan',
  take_photo: 'Take Photo',
  upload_image: 'Upload Image',
  transactions_found_one: '{{count}} Transaction Found!',
  transactions_found_other: '{{count}} Transactions Found!',
  processing: 'Processing image...',
  no_transactions: 'No valid transactions detected in this file.',
  cancel: 'Cancel',
  save_transactions_one: 'Save {{count}} Transaction',
  save_transactions_other: 'Save {{count}} Transactions',
  save_success: 'Saved successfully!',
  camera_denied: 'Camera Access Denied',
  upload_gallery: 'Upload from Gallery',
  unknown_line: 'Unknown',
  stop_scan: 'Stop Scan'
};

const file = path.join(process.cwd(), 'src', 'lib', 'i18n.ts');
let content = fs.readFileSync(file, 'utf-8');

const regex = /([a-z]{2,3}):\s*\{\s*["']?translation["']?:\s*\{/g;
let match;
const languages = [];
while ((match = regex.exec(content)) !== null) {
  languages.push(match[1]);
}

async function run() {
  for (const lang of languages) {
    if (lang === 'en') continue; // already processed
    
    // check if it already has 'camera:' in its block
    const blockStart = content.indexOf(`${lang}: {`);
    const nextBlockStart = content.indexOf(`: {`, blockStart + 5);
    const blockText = content.substring(blockStart, nextBlockStart !== -1 ? nextBlockStart : content.length);
    if (blockText.includes('camera: {') || blockText.includes('"camera": {') || blockText.includes("'camera': {")) {
        console.log(`Skipping ${lang}`);
        continue;
    }

    console.log(`Translating to ${lang}...`);
    // for specific lang fixes
    let target = lang;
    if (target === 'zh') target = 'zh-CN';
    
    // translate
    const translated = await bulkTranslate(cameraEnglish, target);
    const injectStr = `\n      camera: ${JSON.stringify(translated, null, 8).replace(/\n/g, '\n      ')},`;
    
    const reg = new RegExp(`${lang}:\\s*\\{\\s*["']?translation["']?:\\s*\\{`);
    const match = content.match(reg);
    if (match) {
        content = content.replace(reg, match[0] + injectStr);
        fs.writeFileSync(file, content);
    }
  } // closing for
  console.log('Done mapping.');
}

run();
