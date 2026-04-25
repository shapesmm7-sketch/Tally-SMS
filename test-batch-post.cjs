const https = require('https');

function translateBatchPost(texts, targetLang) {
  return new Promise((resolve, reject) => {
    const textStr = texts.join(' ||| ');
    
    const postData = 'q=' + encodeURIComponent(textStr);
    
    const options = {
      hostname: 'translate.googleapis.com',
      port: 443,
      path: '/translate_a/single?client=gtx&sl=en&tl=' + targetLang + '&dt=t',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
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
          resolve(translated.split(/(?:\s*\|\|\|\s*)/i));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  const res = await translateBatchPost(['Hello', 'How are you', 'Good morning', '{{days}} days left'], 'fr');
  console.log(res);
}

run();
