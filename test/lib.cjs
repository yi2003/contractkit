/* 测试共享工具：造 PDF、手写最小 RGBA PNG（用于模拟浏览器 canvas 水印瓦片） */
'use strict';
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const zlib = require('zlib');

/* 生成一份 n 页、页面宽度各不相同的“测试合同”，页面上画英文页号便于肉眼核对 */
async function makeDoc(n, { prefix = 'D', firstWidth = 320 } = {}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < n; i++) {
    const width = firstWidth + (i % 5) * 11; /* 每页宽度不同 → 可用来验证抽页顺序 */
    const height = 470;
    const page = doc.addPage([width, height]);
    page.drawText(`${prefix} — Page ${i + 1} / ${n}`, {
      x: 40, y: height - 60, size: 16, font,
    });
    page.drawRectangle({
      x: 40, y: 40, width: width - 80, height: 60,
      color: PDFLibColors[i % 4],
      opacity: 0.35,
    });
  }
  return { doc, widths: widthsOf(doc) };
}

const PDFLibColors = [
  [0.83, 0.24, 0.24], [0.16, 0.35, 0.72], [0.12, 0.58, 0.32], [0.9, 0.62, 0.1],
].map(([r, g, b]) => rgb(r, g, b));

function widthsOf(doc) {
  const out = [];
  for (let i = 0; i < doc.getPageCount(); i++) out.push(doc.getPage(i).getWidth());
  return out;
}

async function saveBytes(doc) {
  return doc.save({ useObjectStreams: false });
}

/* ---------- 最小 RGBA PNG 编码器（无依赖） ---------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/* 生成一张宽高为 size 的 RGBA PNG；fill 为回调用 (x,y)->[r,g,b,a] 决定像素 */
function makeRgbaPng(size, fill) {
  const raw = Buffer.alloc(size.height * (1 + size.width * 4));
  let off = 0;
  for (let y = 0; y < size.height; y++) {
    raw[off++] = 0; /* filter: none */
    for (let x = 0; x < size.width; x++) {
      const [r, g, b, a] = fill(x, y);
      raw[off++] = r; raw[off++] = g; raw[off++] = b; raw[off++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size.width, 0);
  ihdr.writeUInt32BE(size.height, 4);
  ihdr[8] = 8;  /* bit depth */
  ihdr[9] = 6;  /* color type RGBA */
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return new Uint8Array(png);
}

module.exports = { makeDoc, widthsOf, saveBytes, makeRgbaPng };
