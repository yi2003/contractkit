'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

require('../helpers.js');
require('../i18n.js');
const I18N = globalThis.ContractKit.i18n;
const H = globalThis.ContractKit.helpers;

test('i18n：默认英文，可切换中文并记忆', () => {
  assert.equal(I18N.getLang(), 'en');
  assert.equal(I18N.t('brand.name'), 'ContractKit');
  assert.equal(I18N.t('tab.extract.t'), 'Extract');
  I18N.setLang('zh', { apply: false });
  assert.equal(I18N.getLang(), 'zh');
  assert.equal(I18N.t('brand.name'), '合同小刀');
  assert.equal(I18N.t('p.wm.run'), '加水印并下载');
  I18N.setLang('en', { apply: false });
  assert.equal(I18N.t('brand.name'), 'ContractKit');
});

test('i18n：占位符插值', () => {
  I18N.setLang('en', { apply: false });
  assert.equal(I18N.t('st.merge.ready', { n: 3, total: 40 }), 'Ready: 3 files · 40 pages — will merge in list order.');
  I18N.setLang('zh', { apply: false });
  assert.equal(I18N.t('st.merge.ready', { n: 3, total: 40 }), '已就绪：3 份 · 共 40 页，将按列表顺序合成一份。');
});

test('i18n：页码解析报错随语言走（helpers 注入 messages）', () => {
  I18N.setLang('zh', { apply: false });
  const zhPg = I18N.pageMessages();
  const r1 = H.parsePageInput('11', 10, zhPg);
  assert.equal(r1.ok, false);
  assert.ok(r1.error.includes('超出范围'), r1.error);

  I18N.setLang('en', { apply: false });
  const enPg = I18N.pageMessages();
  const r2 = H.parsePageInput('11', 10, enPg);
  assert.equal(r2.ok, false);
  assert.ok(r2.error.includes('out of range'), r2.error);

  const r3 = H.parsePageInput('x-y', 10, enPg);
  assert.ok(r3.error.includes('Could not understand'), r3.error);

  I18N.setLang('zh', { apply: false });
});

test('i18n：chips 双语数据成对', () => {
  assert.ok(I18N.chips.length >= 4);
  I18N.chips.forEach((pair) => {
    assert.equal(pair.length, 2);
    assert.ok(typeof pair[0] === 'string' && pair[0].length > 0);
    assert.ok(typeof pair[1] === 'string' && pair[1].length > 0);
  });
});
