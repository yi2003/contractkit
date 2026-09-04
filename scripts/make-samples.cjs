/*
 * make-samples.cjs —— 生成一批示例 PDF 到 samples/，方便直接拖进页面试玩。
 * 用法：npm run samples   （或 node scripts/make-samples.cjs）
 * 页面文字用内置 Helvetica（仅 ASCII），刻意保持简单；红圈模拟“印章页”。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const OUT_DIR = path.join(__dirname, '..', 'samples');
const A4 = [595.28, 841.89];

async function pageWithSkeleton(doc, font, opts) {
  const [w, h] = opts.size || A4;
  const page = doc.addPage([w, h]);
  page.drawText(opts.header, { x: opts.x, y: opts.y, size: 15, font, color: rgb(0.1, 0.1, 0.15) });
  page.drawText(`page ${opts.pageNo} / ${opts.total}`, { x: w - 90, y: h - 40, size: 9, font, color: rgb(0.45, 0.45, 0.5) });
  page.drawText('ContractKit sample file - generated locally, safe to share', {
    x: 40, y: 24, size: 8, font, color: rgb(0.6, 0.6, 0.62),
  });
  return page;
}

function addSeal(page, cx, cy, r) {
  page.drawCircle({ x: cx, y: cy, size: r, color: rgb(0.82, 0.12, 0.12), opacity: 0.92 });
  page.drawCircle({ x: cx, y: cy, size: r * 0.82, borderColor: rgb(1, 1, 1), borderWidth: 3, color: rgb(0.82, 0.12, 0.12), opacity: 0.92 });
}

async function chapterDoc(name, pages) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const page = await pageWithSkeleton(doc, font, {
      header: `${name}  |  chapter part ${i + 1} of ${pages}`,
      x: 40, y: A4[1] - 56, pageNo: i + 1, total: pages,
    });
    page.drawText(`(placeholder content block ${String.fromCharCode(65 + i)})`, { x: 40, y: A4[1] - 120, size: 11, font, color: rgb(0.3, 0.32, 0.38) });
  }
  return doc;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const t0 = Date.now();

  /* 1) 合并示例：商务标三章 */
  const c1 = await chapterDoc('BIDDING DOC PART 1', 3);
  const c2 = await chapterDoc('BIDDING DOC PART 2', 5);
  await write(c1, '商务标_第一部分.pdf');
  await write(c2, '商务标_第二部分.pdf');

  const scan = await PDFDocument.create();
  const scanFont = await scan.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 2; i++) {
    const page = scan.addPage([842, 595]); /* 横向，模拟扫描件 */
    page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: rgb(0.955, 0.955, 0.95) });
    page.drawText('QUALIFICATION CERTIFICATE (scanned copy)', { x: 60, y: 480, size: 17, font: scanFont, color: rgb(0.1, 0.12, 0.16) });
    page.drawText(`scan page ${i + 1} of 2`, { x: 60, y: 420, size: 10, font: scanFont, color: rgb(0.4, 0.42, 0.46) });
    addSeal(page, 660, 330, 62);
  }
  await write(scan, '资格证明_扫描件.pdf');

  /* 2) 水印示例：技术协议（8 页） */
  const tech = await PDFDocument.create();
  const techFont = await tech.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 8; i++) {
    const page = await pageWithSkeleton(tech, techFont, {
      header: 'TECHNICAL AGREEMENT', x: 40, y: A4[1] - 56,
      pageNo: i + 1, total: 8,
    });
    page.drawText(`clause ${i + 1} - sample term text for watermark preview`, { x: 40, y: A4[1] - 130, size: 11, font: techFont, color: rgb(0.28, 0.3, 0.36) });
  }
  await write(tech, '合同_技术协议.pdf');

  /* 3) 抽页示例：完整投标文件 15 页，第 5-7 页是红章页，第 13-15 页是附录 */
  const full = await PDFDocument.create();
  const fullFont = await full.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 15; i++) {
    const n = i + 1;
    const page = await pageWithSkeleton(full, fullFont, {
      header: `BID DOCUMENT page ${n} of 15`, x: 40, y: A4[1] - 56,
      pageNo: n, total: 15,
    });
    const zone = n >= 5 && n <= 7 ? '[SEALED]' : n >= 13 ? '[APPENDIX]' : '';
    page.drawText(`page ${n} content zone ${zone}`, { x: 40, y: A4[1] - 130, size: 11, font: fullFont, color: rgb(0.28, 0.3, 0.36) });
    if (n >= 5 && n <= 7) addSeal(page, 320, 300, 90);
    if (n >= 13) page.drawText('APPENDIX', { x: 300, y: A4[1] - 56, size: 15, font: fullFont, color: rgb(0.82, 0.12, 0.12) });
  }
  await write(full, '投标文件_完整版_15页.pdf');

  console.log(`示例 PDF 已生成到 samples/（${Date.now() - t0}ms）：`);
  fs.readdirSync(OUT_DIR).forEach((f) => console.log('  - ' + f));

  async function write(doc, name) {
    const bytes = await doc.save();
    fs.writeFileSync(path.join(OUT_DIR, name), bytes);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
