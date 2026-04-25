const https = require('https');

function translateBatch(texts, targetLang) {
  return new Promise((resolve, reject) => {
    const textStr = texts.join(' ||| ');
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=' + targetLang + '&dt=t&q=' + encodeURIComponent(textStr);
    
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          let translated = '';
          if (parsed && parsed[0]) {
            parsed[0].forEach(item => {
              if (item[0]) translated += item[0];
            });
          }
          resolve(translated.split(/\s*\|\|\|\s*/));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
  });
}

async function run() {
  const res = await translateBatch(['Hello', 'How are you', 'Good morning'], 'fr');
  console.log(res);
}

run();
