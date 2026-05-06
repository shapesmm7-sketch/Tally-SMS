import fs from 'fs';

const translations: Record<string, {
  battery_optimization: string;
  battery_optimized_desc: string;
  battery_restricted_desc: string;
}> = {
  "cs": {
    "battery_optimization": "Optimalizace baterie",
    "battery_optimized_desc": "Optimalizováno pro detekci na pozadí",
    "battery_restricted_desc": "Omezeno (detekce může selhat)"
  },
  "da": {
    "battery_optimization": "Batterioptimering",
    "battery_optimized_desc": "Optimeret til baggrundsdetektion",
    "battery_restricted_desc": "Begrænset (detektion kan fejle)"
  },
  "nl": {
    "battery_optimization": "Batterij-optimalisatie",
    "battery_optimized_desc": "Geoptimaliseerd voor detectie op de achtergrond",
    "battery_restricted_desc": "Beperkt (detectie kan mislukken)"
  },
  "fi": {
    "battery_optimization": "Akun optimointi",
    "battery_optimized_desc": "Optimoitu taustatunnistukseen",
    "battery_restricted_desc": "Rajoitettu (tunnistus saattaa epäonnistua)"
  },
  "el": {
    "battery_optimization": "Βελτιστοποίηση Μπαταρίας",
    "battery_optimized_desc": "Βελτιστοποιημένο για ανίχνευση στο παρασκήνιο",
    "battery_restricted_desc": "Περιορισμένο (η ανίχνευση μπορεί να αποτύχει)"
  },
  "he": {
    "battery_optimization": "אופטימיזציית סוללה",
    "battery_optimized_desc": "מותאם לזיהוי ברקע",
    "battery_restricted_desc": "מוגבל (זיהוי עלול להיכשל)"
  },
  "hu": {
    "battery_optimization": "Akkumulátor optimalizálása",
    "battery_optimized_desc": "Háttérbeli észleléshez optimalizálva",
    "battery_restricted_desc": "Korlátozott (az észlelés sikertelen lehet)"
  },
  "id": {
    "battery_optimization": "Optimasi Baterai",
    "battery_optimized_desc": "Dioptimalkan untuk deteksi latar belakang",
    "battery_restricted_desc": "Dibatasi (deteksi mungkin gagal)"
  },
  "ms": {
    "battery_optimization": "Pengoptimuman Bateri",
    "battery_optimized_desc": "Dioptimumkan untuk pengesanan latar belakang",
    "battery_restricted_desc": "Terhad (pengesanan mungkin gagal)"
  },
  "mr": {
    "battery_optimization": "बॅटरी ऑप्टिमायझेशन",
    "battery_optimized_desc": "पार्श्वभूमी ओळखण्यासाठी ऑप्टिमाइझ केले",
    "battery_restricted_desc": "प्रतिबंधित (ओळख अयशस्वी होऊ शकते)"
  },
  "no": {
    "battery_optimization": "Batterioptimalisering",
    "battery_optimized_desc": "Optimalisert for bakgrunnsdeteksjon",
    "battery_restricted_desc": "Begrenset (deteksjon kan mislykkes)"
  },
  "fa": {
    "battery_optimization": "بهینه‌سازی باتری",
    "battery_optimized_desc": "بهینه‌شده برای تشخیص در پس‌زمینه",
    "battery_restricted_desc": "محدود شده (تشخیص ممکن است ناموفق باشد)"
  },
  "pl": {
    "battery_optimization": "Optymalizacja baterii",
    "battery_optimized_desc": "Zoptymalizowane pod kątem wykrywania w tle",
    "battery_restricted_desc": "Ograniczone (wykrywanie może się nie powieść)"
  },
  "ro": {
    "battery_optimization": "Optimizarea bateriei",
    "battery_optimized_desc": "Optimizat pentru detectare în fundal",
    "battery_restricted_desc": "Restricționat (detectarea poate eșua)"
  },
  "sv": {
    "battery_optimization": "Batterioptimering",
    "battery_optimized_desc": "Optimerad för bakgrundsdetektering",
    "battery_restricted_desc": "Begränsad (detektering kan misslyckas)"
  },
  "tl": {
    "battery_optimization": "Pag-optimize ng Baterya",
    "battery_optimized_desc": "Na-optimize para sa background detection",
    "battery_restricted_desc": "Pinaghihigpitan (maaaring mabigo ang detection)"
  },
  "ta": {
    "battery_optimization": "பேட்டரி மேம்பாடு",
    "battery_optimized_desc": "பின்னணி கண்டறிதலுக்கு மேம்படுத்தப்பட்டது",
    "battery_restricted_desc": "கட்டுப்படுத்தப்பட்டுள்ளது (கண்டறிதல் தோல்வியடையலாம்)"
  },
  "te": {
    "battery_optimization": "బ్యాటరీ ఆప్టిమైజేషన్",
    "battery_optimized_desc": "బ్యాక్‌గ్రౌండ్ గుర్తింపు కోసం ఆప్టిమైజ్ చేయబడింది",
    "battery_restricted_desc": "పరిమితం చేయబడింది (గుర్తింపు విఫలం కావచ్చు)"
  },
  "th": {
    "battery_optimization": "การเพิ่มประสิทธิภาพแบตเตอรี่",
    "battery_optimized_desc": "ปรับให้เหมาะสมสำหรับการตรวจจับในพื้นหลัง",
    "battery_restricted_desc": "ถูกจำกัด (การตรวจจับอาจล้มเหลว)"
  },
  "tr": {
    "battery_optimization": "Pil Optimizasyonu",
    "battery_optimized_desc": "Arka plan algılaması için optimize edildi",
    "battery_restricted_desc": "Kısıtlı (algılama başarısız olabilir)"
  },
  "uk": {
    "battery_optimization": "Оптимізація батареї",
    "battery_optimized_desc": "Оптимізовано для фонового виявлення",
    "battery_restricted_desc": "Обмежено (виявлення може не вдатися)"
  },
  "ur": {
    "battery_optimization": "بیٹری کی بہتری",
    "battery_optimized_desc": "پس منظر کی نشاندہی کے لیے بہتر بنایا گیا",
    "battery_restricted_desc": "محدود (نشاندہی ناکام ہو سکتی ہے)"
  },
  "vi": {
    "battery_optimization": "Tối ưu hóa Pin",
    "battery_optimized_desc": "Được tối ưu hóa để phát hiện trong nền",
    "battery_restricted_desc": "Bị hạn chế (phát hiện có thể thất bại)"
  },
  "bn": {
    "battery_optimization": "ব্যাটারি অপ্টিমাইজেশন",
    "battery_optimized_desc": "ব্যাকগ্রাউন্ড সনাক্তকরণের জন্য অপ্টিমাইজ করা হয়েছে",
    "battery_restricted_desc": "সীমাবদ্ধ (সনাক্তকরণ ব্যর্থ হতে পারে)"
  }
};

let content = fs.readFileSync('src/lib/i18n.ts', 'utf-8');

for (const [lang, trans] of Object.entries(translations)) {
  // Regex to find the start of the language block
  const langRegex = new RegExp(`"${lang}":\\s*{[\\s\\S]*?"settings":\\s*{`);
  const match = content.match(langRegex);
  
  if (match) {
    if (match[0].includes("battery_optimization")) {
      console.log(`Skipping ${lang}, already has battery_optimization`);
      continue;
    }
    
    // Inject right after "settings": {
    const insertStr = `\n        "battery_optimization": ${JSON.stringify(trans.battery_optimization)},\n        "battery_optimized_desc": ${JSON.stringify(trans.battery_optimized_desc)},\n        "battery_restricted_desc": ${JSON.stringify(trans.battery_restricted_desc)},`;
    
    content = content.replace(match[0], match[0] + insertStr);
    console.log(`Added translations for ${lang}`);
  } else {
    console.log(`Could not find language block for ${lang} or it doesn't have "settings"`);
  }
}

fs.writeFileSync('src/lib/i18n.ts', content);
console.log('Done!');
