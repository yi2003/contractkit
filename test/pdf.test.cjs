'use strict';
/* pdf-lib 管线冒烟测试：合并 / 抽页 / 带透明 PNG 的水印叠加 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { PDFDocument } = require('pdf-lib');

const L = require('./lib.cjs');
const { makeDoc, widthsOf, saveBytes, makeRgbaPng } = L;

require('../helpers.js');
const H = globalThis.ContractKit.helpers;

test('合并：两份文档按顺序拼接，页数与页面尺寸顺序正确', async () => {
  const a = await makeDoc(3, { prefix: 'A' });
  const b = await makeDoc(5, { prefix: 'B', firstWidth: 500 });
  const ba = await saveBytes(a.doc);
  const bb = await saveBytes(b.doc);
  assert.equal(ba[0], 0x25); /* '%' */

  const aReloaded = await PDFDocument.load(ba);
  const bReloaded = await PDFDocument.load(bb);
  const out = await PDFDocument.create();
  out.setTitle('合并测试');
  for (const src of [aReloaded, bReloaded]) {
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  assert.equal(out.getPageCount(), 8);

  const expected = a.widths.concat(b.widths);
  assert.deepEqual(widthsOf(out), expected);

  const bytes = await out.save();
  const reloaded = await PDFDocument.load(bytes);
  assert.equal(reloaded.getPageCount(), 8);
  assert.deepEqual(widthsOf(reloaded), expected);
});

test('抽页：3-7、10-12 与 "3-" 的页数与顺序', async () => {
  const d = await makeDoc(12, { prefix: 'SRC' });

  async function extract(expr) {
    const r = H.parsePageInput(expr, d.doc.getPageCount());
    assert.equal(r.ok, true, expr);
    const out = await PDFDocument.create();
    const pages = await out.copyPages(d.doc, r.list.map((n) => n - 1));
    pages.forEach((p) => out.addPage(p));
    const bytes = await saveBytes(out);
    const reloaded = await PDFDocument.load(bytes);
    return {
      count: reloaded.getPageCount(),
      widths: widthsOf(reloaded),
      expected: r.list.map((n) => d.widths[n - 1]),
    };
  }

  const t1 = await extract('3-7, 10-12');
  assert.equal(t1.count, 8);
  assert.deepEqual(t1.widths, t1.expected);

  const t2 = await extract('3-');
  assert.equal(t2.count, 10);
  assert.deepEqual(t2.widths, t2.expected);

  const t3 = await extract('12,1');
  assert.deepEqual(t3.widths, t3.expected); /* 倒序自动升序为 1,12 */
});

test('水印叠加：RGBA PNG（透明底）嵌入并平铺绘制后可正常保存重载', async () => {
  const d = await makeDoc(3, { prefix: 'WM' });
  const srcBytes = await saveBytes(d.doc);
  const doc = await PDFDocument.load(srcBytes);

  /* 模拟浏览器 canvas 生成的水印瓦片：白底文字等价物 = 红斜杠 + 四角透明 */
  const png = makeRgbaPng(
    { width: 32, height: 24 },
    (x, y) => (Math.abs(x - y) <= 2 && x > 2 && x < 30 ? [200, 30, 30, 255] : [0, 0, 0, 0])
  );
  const img = await doc.embedPng(png);

  const tileW = 180, step = 260;
  for (let i = 0; i < doc.getPageCount(); i++) {
    const page = doc.getPage(i);
    const pw = page.getWidth();
    const ph = page.getHeight();
    for (let x = -step; x < pw + step; x += step) {
      for (let y = -step; y < ph + step; y += step) {
        page.drawImage(img, { x, y, width: tileW, height: tileW * (24 / 32) });
      }
    }
  }

  const bytes = await doc.save();
  assert.equal(bytes[0], 0x25);
  const text = Buffer.from(bytes).toString('latin1');
  assert.ok(text.includes('/SMask'), '透明 PNG 应生成 SMask（保留 alpha）');
  assert.ok(text.includes('/Image'), '应嵌入图片 XObject');

  const reloaded = await PDFDocument.load(bytes);
  assert.equal(reloaded.getPageCount(), 3);
});
