import fs from 'fs';

const content = fs.readFileSync('src/lib/i18n.ts', 'utf8');

const translations: Record<string, Record<string, string>> = {
  "en": {
    "battery_optimization": "Battery Optimization",
    "battery_optimized_desc": "Optimized for background detection",
    "battery_restricted_desc": "Restricted (Detection may fail)"
  },
  "fr": {
    "battery_optimization": "Optimisation de la batterie",
    "battery_optimized_desc": "Optimisé pour la détection en arrière-plan",
    "battery_restricted_desc": "Restreint (la détection peut échouer)"
  },
  "es": {
    "battery_optimization": "Optimización de batería",
    "battery_optimized_desc": "Optimizado para detección en segundo plano",
    "battery_restricted_desc": "Restringido (la detección puede fallar)"
  },
  "de": {
    "battery_optimization": "Akku-Optimierung",
    "battery_optimized_desc": "Optimiert für Hintergrunderkennung",
    "battery_restricted_desc": "Eingeschränkt (Erkennung kann fehlschlagen)"
  },
  "pt": {
    "battery_optimization": "Otimização de Bateria",
    "battery_optimized_desc": "Otimizado para detecção em segundo plano",
    "battery_restricted_desc": "Restrito (A detecção pode falhar)"
  },
  "sw": {
    "battery_optimization": "Uboreshaji wa Betri",
    "battery_optimized_desc": "Imeboreshwa kwa utambuzi wa usuli",
    "battery_restricted_desc": "Imezuiliwa (Utambuzi unaweza kushindwa)"
  },
  "ar": {
    "battery_optimization": "تحسين البطارية",
    "battery_optimized_desc": "مُحسّن للاكتشاف في الخلفية",
    "battery_restricted_desc": "مقيد (قد يفشل الاكتشاف)"
  },
  "zh": {
    "battery_optimization": "电池优化",
    "battery_optimized_desc": "针对后台检测进行了优化",
    "battery_restricted_desc": "受限（检测可能失败）"
  },
  "it": {
    "battery_optimization": "Ottimizzazione Batteria",
    "battery_optimized_desc": "Ottimizzato per rilevamento in background",
    "battery_restricted_desc": "Limitato (il rilevamento potrebbe fallire)"
  },
  "ja": {
    "battery_optimization": "バッテリー最適化",
    "battery_optimized_desc": "バックグラウンド検出用に最適化",
    "battery_restricted_desc": "制限あり（検出に失敗する可能性があります）"
  },
  "ko": {
    "battery_optimization": "배터리 최적화",
    "battery_optimized_desc": "백그라운드 감지에 최적화됨",
    "battery_restricted_desc": "제한됨 (감지 실패 가능성 있음)"
  },
  "ru": {
    "battery_optimization": "Оптимизация батареи",
    "battery_optimized_desc": "Оптимизировано для фонового обнаружения",
    "battery_restricted_desc": "Ограничено (обнаружение может завершиться ошибкой)"
  },
  "hi": {
    "battery_optimization": "बैटरी अनुकूलन",
    "battery_optimized_desc": "पृष्ठभूमि पहचान के लिए अनुकूलित",
    "battery_restricted_desc": "प्रतिबंधित (पहचान विफल हो सकती है)"
  }
};

let output = content;

Object.keys(translations).forEach(lang => {
  const trans = translations[lang];
  // Find `"${lang}": {` then inside it find `"settings": {` then append
  
  const langRegex = new RegExp(`"${lang}":\\s*\\{[\\s\\S]*?"settings":\\s*\\{`, 'm');
  const match = output.match(langRegex);
  if (match) {
    const insertStr = `\n        "battery_optimization": ${JSON.stringify(trans.battery_optimization)},\n        "battery_optimized_desc": ${JSON.stringify(trans.battery_optimized_desc)},\n        "battery_restricted_desc": ${JSON.stringify(trans.battery_restricted_desc)},`;
    output = output.slice(0, match.index! + match[0].length) + insertStr + output.slice(match.index! + match[0].length);
  } else {
    // If language doesn't have "settings": {
    console.log(`Could not find settings block for ${lang}`);
  }
});

fs.writeFileSync('src/lib/i18n.ts', output);
console.log('Script completed');
