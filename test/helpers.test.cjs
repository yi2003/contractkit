'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

require('../helpers.js');
const H = globalThis.ContractKit.helpers;

test('parsePageInput：基本区间与组合', () => {
  const r = H.parsePageInput('3-7, 9、12-15', 40);
  assert.equal(r.ok, true);
  assert.deepEqual(r.list, [3, 4, 5, 6, 7, 9, 12, 13, 14, 15]);
});

test('parsePageInput：中文分隔符 / 波浪号 / 至', () => {
  assert.deepEqual(H.parsePageInput('3，5', 40).list, [3, 5]);
  assert.deepEqual(H.parsePageInput('3;5', 40).list, [3, 5]);
  assert.deepEqual(H.parsePageInput('2～4', 10).list, [2, 3, 4]);
  assert.deepEqual(H.parsePageInput('2~4', 10).list, [2, 3, 4]);
  assert.deepEqual(H.parsePageInput('2至4', 10).list, [2, 3, 4]);
  assert.deepEqual(H.parsePageInput('3 - 7', 10).list, [3, 4, 5, 6, 7]);
  assert.deepEqual(H.parsePageInput('3-5 7', 10).list, [3, 4, 5, 7]);
});

test('parsePageInput：倒写区间、去重、升序', () => {
  assert.deepEqual(H.parsePageInput('7-3', 10).list, [3, 4, 5, 6, 7]);
  assert.deepEqual(H.parsePageInput('3-3', 10).list, [3]);
  assert.deepEqual(H.parsePageInput('5,1,5,1', 10).list, [1, 5]);
});

test('parsePageInput：3- 到末页 / -3 到开头 / 全部关键字', () => {
  assert.deepEqual(H.parsePageInput('3-', 8).list, [3, 4, 5, 6, 7, 8]);
  assert.deepEqual(H.parsePageInput('-3', 8).list, [1, 2, 3]);
  assert.deepEqual(H.parsePageInput('全部', 5).list, [1, 2, 3, 4, 5]);
  assert.deepEqual(H.parsePageInput('all', 2).list, [1, 2]);
});

test('parsePageInput：错误与越界', () => {
  assert.equal(H.parsePageInput('', 10).ok, false);
  assert.equal(H.parsePageInput('  ', 10).ok, false);
  assert.equal(H.parsePageInput('abc', 10).ok, false);
  assert.equal(H.parsePageInput('0', 10).ok, false);
  assert.equal(H.parsePageInput('11', 10).ok, false);
  assert.equal(H.parsePageInput('2-11', 10).ok, false);
  assert.equal(H.parsePageInput('3-x', 10).ok, false);
  assert.ok(H.parsePageInput('11', 10).error.includes('超出范围'));
});

test('summarizePages：连续段压缩', () => {
  assert.equal(H.summarizePages([3, 4, 5, 7, 9, 10]), '3-5,7,9-10');
  assert.equal(H.summarizePages([1]), '1');
  assert.equal(H.summarizePages([1, 2, 3]), '1-3');
  assert.equal(H.summarizePages([1, 3, 5]), '1,3,5');
  assert.equal(H.summarizePages([]), '');
});

test('formatBytes / 文件名清洗', () => {
  assert.equal(H.formatBytes(500), '500 B');
  assert.equal(H.formatBytes(2048), '2.0 KB');
  assert.equal(H.formatBytes(3 * 1024 * 1024), '3.0 MB');
  assert.equal(H.cleanNamePiece('a/b\\c:d*e?f"g<h>i|j'), 'a b c d e f g h i j');
  assert.equal(H.cleanNamePiece('  前后空格.  '), '前后空格');
  assert.equal(H.stripPdfExt('合同.pdf'), '合同');
  assert.equal(H.stripPdfExt('合同.PDF'), '合同');
  assert.equal(H.filePieceFromWatermark('仅供××查阅'), '仅供××查阅');
});
