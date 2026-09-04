/*
 * helpers.js —— 合同小刀的纯函数工具集（不依赖 DOM / PDFLib，可在 Node 中单测）。
 * 暴露为全局 ContractKit.helpers（浏览器与 Node 均可用）。
 */
(function (global) {
  'use strict';

  var K = {};

  /* 文件名清洗：去掉路径分隔 / 保留字 / 控制字符，去掉首尾点与空格 */
  var BAD = /[\\/:*?"<>|\u0000-\u001f]/g;

  function cleanNamePiece(s) {
    return String(s)
      .replace(BAD, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[.\s]+|[.\s]+$/g, '')
      .slice(0, 80);
  }

  function stripPdfExt(name) {
    return String(name).replace(/\.pdf$/i, '');
  }

  function formatBytes(n) {
    if (n == null || isNaN(n)) return '-';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }

  /* 中文默认报错文案（调用方可传入语言化 messages 覆盖） */
  var DEFAULT_MSG = {
    empty: '请先填写页码范围',
    startAtOne: '页码从 1 开始',
    startAtOneNum: function (n) { return '页码从 1 开始，不能是 ' + n; },
    beyond: function (n, total) { return '第 ' + n + ' 页超出范围（本文件共 ' + total + ' 页）'; },
    badToken: function (tok) { return '看不懂「' + tok + '」——示例：3-7、9、12-15'; },
    noPages: '没有可抽取的页面'
  };

  function resolve(m, args) {
    return typeof m === 'function' ? m.apply(null, args) : m;
  }

  /*
   * 页码输入解析。支持：
   *   - 单个页： 3
   *   - 区间：   3-7  / 3~7 / 3–7 / 3至7 / 3－7
   *   - 开到末： 3-（第 3 页到最后）
   *   - 开到头： -3（第 1 页到第 3 页）
   *   - 关键字： all / 全部 / 整本
   *   - 组合：逗号、中文逗号、顿号、分号、空白均可作分隔
   * 区间可倒写（7-3 等价于 3-7），结果去重并按升序。
   * 返回 { ok:true, list:[1..] } 或 { ok:false, error }；error 文案可经 messages 注入。
   */
  function parsePageInput(input, totalPages, messages) {
    var M = messages || DEFAULT_MSG;
    totalPages = Number(totalPages);
    if (!isFinite(totalPages) || totalPages < 1) {
      return { ok: false, error: M.noPages || resolve(DEFAULT_MSG.noPages) };
    }
    var text = String(input == null ? '' : input).trim();
    if (text === '') return { ok: false, error: resolve(M.empty || DEFAULT_MSG.empty) };

    var lowered = text.toLowerCase();
    if (lowered === 'all' || /^(全部|整本|所有页)$/.test(lowered)) {
      return okAll(totalPages);
    }

    /* 先收拢「3 - 7」「3 ~ 7」这类带空格的连字符，再切 token */
    var collapsed = text.replace(/\s*([-–—~～至－])\s*/g, '$1');
    var tokens = collapsed.split(/[\s,，;；、]+/).filter(function (t) { return t !== ''; });
    if (tokens.length === 0) return { ok: false, error: '请先填写页码范围' };

    var seen = {};
    var list = [];

    function pushOne(n) {
      if (seen[n]) return;
      seen[n] = 1;
      list.push(n);
    }
    function err(msg) { return { ok: false, error: msg }; }

    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i];
      var m;

      if (/^\d+$/.test(tok)) {
        var n = parseInt(tok, 10);
        if (n < 1) return err(resolve(M.startAtOneNum, [n]));
        if (n > totalPages) return err(resolve(M.beyond, [n, totalPages]));
        pushOne(n);
        continue;
      }

      m = tok.match(/^(\d+)\s*[-–—~～至－]\s*(\d+)$/);
      if (m) {
        var a = parseInt(m[1], 10), b = parseInt(m[2], 10);
        if (a < 1 || b < 1) return err(resolve(M.startAtOne));
        if (a > totalPages || b > totalPages) {
          return err(resolve(M.beyond, [Math.max(a, b), totalPages]));
        }
        var lo = Math.min(a, b), hi = Math.max(a, b);
        for (var p = lo; p <= hi; p++) pushOne(p);
        continue;
      }

      m = tok.match(/^(\d+)\s*[-–—~～至－]?$/);
      if (m) { /* "3-" 到末页（或单独的 "3"，已在上方处理过，这里兜底） */
        var from = parseInt(m[1], 10);
        if (from < 1) return err(resolve(M.startAtOneNum, [from]));
        if (from > totalPages) return err(resolve(M.beyond, [from, totalPages]));
        for (var q = from; q <= totalPages; q++) pushOne(q);
        continue;
      }

      m = tok.match(/^[-–—~～至－]\s*(\d+)$/);
      if (m) { /* "-3" 从头到第 3 页 */
        var upto = parseInt(m[1], 10);
        if (upto < 1) return err(resolve(M.startAtOneNum, [upto]));
        if (upto > totalPages) return err(resolve(M.beyond, [upto, totalPages]));
        for (var r = 1; r <= upto; r++) pushOne(r);
        continue;
      }

      return err(resolve(M.badToken, [tok]));
    }

    if (list.length === 0) return { ok: false, error: resolve(M.noPages) };
    list.sort(function (x, y) { return x - y; });
    return { ok: true, list: list };
  }

  function okAll(totalPages) {
    var list = [];
    for (var p = 1; p <= totalPages; p++) list.push(p);
    return { ok: true, list: list };
  }

  /* 把升序页码列表压缩成便于展示 / 命名的形式： [3,4,5,7,9,10] -> "3-5,7,9-10" */
  function summarizePages(list) {
    if (!list || list.length === 0) return '';
    var out = [];
    var start = list[0], prev = list[0];
    for (var i = 1; i <= list.length; i++) {
      var cur = i < list.length ? list[i] : prev + 2; /* 哨兵，强制收尾 */
      if (cur !== prev + 1) {
        out.push(start === prev ? String(start) : start + '-' + prev);
        start = cur;
      }
      prev = cur;
    }
    return out.join(',');
  }

  /* 水印文字放到文件名里（仅保留安全的短文本） */
  function filePieceFromWatermark(text) {
    return cleanNamePiece(stripSpaces(text)).slice(0, 20) || '水印';
  }
  function stripSpaces(s) {
    return String(s).replace(/\s+/g, '_');
  }

  K.cleanNamePiece = cleanNamePiece;
  K.stripPdfExt = stripPdfExt;
  K.formatBytes = formatBytes;
  K.parsePageInput = parsePageInput;
  K.summarizePages = summarizePages;
  K.filePieceFromWatermark = filePieceFromWatermark;

  global.ContractKit = global.ContractKit || {};
  global.ContractKit.helpers = K;
})(typeof self !== 'undefined' ? self : globalThis);
