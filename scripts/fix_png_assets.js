import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crcBuf = buf.subarray(4, 8 + len);
  const crcVal = crc32(crcBuf);
  buf.writeUInt32BE(crcVal, 8 + len);
  return buf;
}

function createPng(width, height, r = 79, g = 70, b = 229, a = 255) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const rowSize = 1 + width * 4;
  const uncompressed = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    uncompressed[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      uncompressed[pxOffset] = r;
      uncompressed[pxOffset + 1] = g;
      uncompressed[pxOffset + 2] = b;
      uncompressed[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(uncompressed);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function getAllPngFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllPngFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.png')) {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

// 1. Fix root assets
fs.writeFileSync('assets/icon.png', createPng(1024, 1024, 79, 70, 229));
fs.writeFileSync('assets/splash.png', createPng(2732, 2732, 255, 255, 255));
fs.writeFileSync('assets/logo.png', createPng(512, 512, 79, 70, 229));

// 2. Fix all android res png files
const resPngs = getAllPngFiles('android/app/src/main/res');
console.log(`Found ${resPngs.length} PNG files in android/app/src/main/res`);

resPngs.forEach(file => {
  let dim = 96;
  if (file.includes('ldpi')) dim = 36;
  else if (file.includes('mdpi')) dim = 48;
  else if (file.includes('hdpi')) dim = 72;
  else if (file.includes('xhdpi')) dim = 96;
  else if (file.includes('xxhdpi')) dim = 144;
  else if (file.includes('xxxhdpi')) dim = 192;

  if (file.includes('splash.png')) {
    fs.writeFileSync(file, createPng(480, 800, 255, 255, 255));
  } else if (file.includes('background.png')) {
    fs.writeFileSync(file, createPng(dim, dim, 79, 70, 229));
  } else {
    fs.writeFileSync(file, createPng(dim, dim, 79, 70, 229));
  }
});

console.log('Successfully generated valid binary PNG assets for all targets!');
