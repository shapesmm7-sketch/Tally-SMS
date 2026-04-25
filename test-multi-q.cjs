const https = require('https');

function translateMultiQ(texts, targetLang) {
  return new Promise((resolve, reject) => {
    const postData = texts.map(t => 'q=' + encodeURIComponent(t)).join('&');
    
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
          // parsed[0] is an array of items. Each item might correspond to one q, but often they are merged if q wasn't separate.
          // For multiple q, the response structure is slightly different. Let's print it.
          console.log(JSON.stringify(parsed, null, 2));
          resolve(parsed);
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

translateMultiQ(['Hello', 'How are you', 'Good morning', '{{days}} days left'], 'fr');
