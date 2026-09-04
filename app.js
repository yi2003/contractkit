/*
 * app.js —— 合同小刀：合并 / 加水印 / 抽页。
 * 全部逻辑在浏览器本地完成；pdf-lib 来自 vendor/pdf-lib.min.js（全局 PDFLib）。
 * 文案经 i18n.js（中 / EN）提供，没有任何网络请求。
 */
(function () {
  'use strict';

  var PDFLib = window.PDFLib;
  var H = globalThis.ContractKit.helpers;
  var I18N = globalThis.ContractKit.i18n;
  if (!PDFLib || !H || !I18N) {
    document.body.insertAdjacentHTML('beforeend',
      '<p class="ns">加载失败：请确认 vendor/pdf-lib.min.js、helpers.js、i18n.js 与本页放在同一目录。</p>');
    return;
  }
  var I = I18N.t; /* 取当前语言文案 */
  var PDFDocument = PDFLib.PDFDocument;
  var isZh = function () { return I18N.getLang() === 'zh'; };

  /* ---------- 小工具 ---------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function parseHex(c) {
    var m = /^#?([0-9a-f]{6})$/i.exec(c);
    if (!m) return { r: 55, g: 65, b: 81 };
    var n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function fq(name) { /* 按语言给文件名加引号/书名号，仅用于展示 */
    return isZh() ? '《' + name + '》' : '“' + name + '”';
  }
  function toast(msg, isErr) {
    var wrap = $('toastwrap');
    var t = el('div', 'toast' + (isErr ? ' err' : ''), msg);
    wrap.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 4200);
    setTimeout(function () { t.remove(); }, 4600);
  }
  function triggerDownload(bytes, filename) {
    var blob = new Blob([bytes], { type: 'application/pdf' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 6000);
  }
  function setStatus(id, text, kind) {
    var s = $(id);
    if (!s) return;
    s.textContent = text || '';
    s.className = 'status' + (kind ? ' ' + kind : '');
    s.hidden = !text;
  }
  /* 运行按钮：只改内部 .btn-label，语言切换后仍可整句替换 */
  function busy(id, on, note) {
    var b = $(id);
    if (!b) return;
    var lbl = b.querySelector('.btn-label') || b;
    b.disabled = on;
    if (on) {
      lbl.dataset.old = lbl.textContent;
      lbl.textContent = note || '';
    } else if (lbl.dataset.old !== undefined) {
      lbl.textContent = lbl.dataset.old;
      delete lbl.dataset.old;
    }
  }

  /* 输入框“默认建议名”：用户没改过就跟着内容自动变 */
  function autoName(input, suggestion) {
    var cur = input.value;
    if (cur === '' || (input._suggest != null && cur === input._suggest)) {
      input.value = suggestion;
      input._suggest = suggestion;
    }
  }

  /* 统一处理“放入文件”的入口（多文件或单文件） */
  function bindDropzone(dzId, inputId, onFiles) {
    var dz = $(dzId), input = $(inputId);
    var depth = 0;
    dz.addEventListener('click', function (e) {
      if (e.target.closest('.btn-icon')) return; /* 列表内按钮不触发弹窗 */
      input.click();
    });
    dz.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) {
        e.preventDefault();
        e.stopPropagation();
        depth++;
        dz.classList.add('drag');
      });
    });
    dz.addEventListener('dragleave', function (e) {
      e.preventDefault();
      depth = Math.max(0, depth - 1);
      if (depth === 0) dz.classList.remove('drag');
    });
    dz.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      depth = 0;
      dz.classList.remove('drag');
      onFiles(Array.prototype.slice.call(e.dataTransfer.files || []));
    });
    input.addEventListener('change', function () {
      onFiles(Array.prototype.slice.call(input.files || []));
      input.value = '';
    });
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('drop', function (e) { e.preventDefault(); });
  }

  /* 读取并解析一个 File，返回 item（含 doc/pageCount 或 errorCode） */
  async function loadFileItem(file) {
    var item = { file: file, name: file.name, size: file.size, errorCode: null };
    try {
      var buf = await file.arrayBuffer();
      var bytes = new Uint8Array(buf);
      var doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      var n = doc.getPageCount();
      if (!n) throw new Error('empty');
      item.doc = doc;
      item.bytes = bytes; /* 保留原始字节：水印重复运行时从这里重建干净文档 */
      item.pageCount = n;
    } catch (e) {
      item.errorCode = 'unreadable'; /* 展示时按当前语言翻译 */
    }
    return item;
  }

  /* ================================================================
   * 页签切换
   * ================================================================ */
  var tabButtons = Array.prototype.slice.call(document.querySelectorAll('.tooltab'));
  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabButtons.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        var p = $('panel-' + b.dataset.tab);
        p.classList.toggle('on', on);
        p.hidden = !on;
      });
    });
  });

  /* ================================================================
   * 工具一：合并
   * ================================================================ */
  var mzFiles = []; /* 列表顺序即合并顺序 */

  function mzRender() {
    var listEl = $('mz-list');
    if (!mzFiles.length) { listEl.hidden = true; listEl.innerHTML = ''; }
    else {
      listEl.innerHTML = '';
      listEl.hidden = false;
      var head = el('div', 'fl-head');
      head.appendChild(el('span', '', '#'));
      head.appendChild(el('span', '', I('p.merge.col')));
      head.appendChild(el('span', '', ''));
      listEl.appendChild(head);

      mzFiles.forEach(function (it, i) {
        var row = el('div', 'filerow');
        var idx = el('span', 'f-idx', String(i + 1));
        var nm = el('div', 'f-name');
        nm.appendChild(el('div', 'f-title', it.name));
        var meta;
        if (it.errorCode) meta = el('span', 'f-meta bad', I('err.unreadable'));
        else if (!it.doc) meta = el('span', 'f-meta', '…');
        else meta = el('span', 'f-meta', I('meta.pages', { n: it.pageCount, size: H.formatBytes(it.size) }));
        nm.appendChild(meta);

        var acts = el('div', 'f-actions');
        var up = el('button', 'btn-icon', '↑');
        up.type = 'button';
        up.title = I('p.merge.up');
        up.disabled = i === 0;
        up.addEventListener('click', function () { mzMove(i, -1); });
        var down = el('button', 'btn-icon', '↓');
        down.type = 'button';
        down.title = I('p.merge.down');
        down.disabled = i === mzFiles.length - 1;
        down.addEventListener('click', function () { mzMove(i, 1); });
        var del = el('button', 'btn-icon del', '✕');
        del.type = 'button';
        del.title = I('p.merge.del');
        del.addEventListener('click', function () { mzRemove(i); });
        acts.appendChild(up);
        acts.appendChild(down);
        acts.appendChild(del);

        row.appendChild(idx);
        row.appendChild(nm);
        row.appendChild(acts);
        listEl.appendChild(row);
      });
    }
    mzUpdateUi();
  }

  function mzMove(i, delta) {
    if (anyBusy('mz')) return;
    var j = i + delta;
    if (j < 0 || j >= mzFiles.length) return;
    var tmp = mzFiles[i]; mzFiles[i] = mzFiles[j]; mzFiles[j] = tmp;
    mzRender();
  }
  function mzRemove(i) {
    if (anyBusy('mz')) return;
    mzFiles.splice(i, 1);
    mzRender();
  }

  async function mzAddFiles(files) {
    if (!files.length) return;
    if (anyBusy('mz')) return;
    setStatus('mz-status', I('st.merge.reading'), 'busy');
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') {
        toast(I('toast.skipNonPdf', { name: f.name }), true);
        continue;
      }
      var it = { name: f.name, size: f.size, file: f, doc: null, pageCount: 0, errorCode: null };
      mzFiles.push(it);
      mzRender();
      var loaded = await loadFileItem(f);
      var k = mzFiles.indexOf(it);
      if (k >= 0) mzFiles[k] = Object.assign(it, loaded);
      await sleep(16);
      mzRender();
      if (loaded.errorCode) toast(I('toast.unreadable', { name: f.name }), true);
    }
    mzUpdateUi();
  }

  function mzUpdateUi() {
    var total = 0, bad = 0, loading = 0;
    mzFiles.forEach(function (it) {
      if (it.errorCode) bad++;
      else if (!it.doc) loading++;
      else total += it.pageCount;
    });
    var run = $('mz-run');
    if (!mzFiles.length) {
      setStatus('mz-status', I('st.merge.empty'));
      run.disabled = true;
    } else if (loading) {
      setStatus('mz-status', I('st.merge.reading'), 'busy');
      run.disabled = true;
    } else if (bad) {
      setStatus('mz-status', I('st.merge.bad', { n: bad }), 'err');
      run.disabled = true;
    } else if (mzFiles.length < 2) {
      setStatus('mz-status', I('st.merge.needTwo'));
      run.disabled = true;
    } else {
      setStatus('mz-status', I('st.merge.ready', { n: mzFiles.length, total: total }), 'ok');
      run.disabled = false;
      autoName($('mz-name'), suggestedMergeName());
    }
  }

  function suggestedMergeName() {
    return I('name.mergeDefault', { base: H.stripPdfExt(mzFiles[0].name), n: mzFiles.length });
  }

  async function mzRun() {
    var runBtn = $('mz-run');
    if (runBtn.disabled) return;
    busy('mz-run', true, I('busy.merge'));
    var nameField = $('mz-name');
    var name = (nameField.value.trim() || suggestedMergeName());
    name = H.cleanNamePiece(name.replace(/\.pdf$/i, '')) + '.pdf';
    try {
      var out = await PDFDocument.create();
      out.setTitle(H.stripPdfExt(name));
      for (var i = 0; i < mzFiles.length; i++) {
        var it = mzFiles[i];
        setStatus('mz-status', I('st.merge.working', { cur: i + 1, total: mzFiles.length, name: it.name }), 'busy');
        await sleep(24); /* 让状态先画出来 */
        var pages = await out.copyPages(it.doc, it.doc.getPageIndices());
        pages.forEach(function (p) { out.addPage(p); });
      }
      setStatus('mz-status', I('st.merge.saving'), 'busy');
      var bytes = await out.save();
      triggerDownload(bytes, name);
      setStatus('mz-status', I('st.merge.done', { name: name, size: H.formatBytes(bytes.length) }), 'ok');
      toast(I('toast.merge.done', { name: fq(name) }));
    } catch (e) {
      console.error(e);
      setStatus('mz-status', I('st.merge.fail', { msg: (e && e.message) || e }), 'err');
      toast(I('toast.merge.fail'), true);
    } finally {
      busy('mz-run', false);
    }
  }

  function anyBusy(kind) {
    var b = $(kind === 'mz' ? 'mz-run' : kind === 'wm' ? 'wm-run' : 'ex-run');
    if (!b || !b.disabled) return false;
    var lbl = b.querySelector('.btn-label') || b;
    return lbl.dataset.old !== undefined;
  }

  /* ================================================================
   * 通用：单文件工具（水印 / 抽页）的载入与卡片
   * ================================================================ */
  function makeSingleTool(kind) {
    var state = { item: null };
    var dzId = kind + '-drop', infoId = kind + '-info', statusId = kind + '-status';
    var runId = kind + '-run';

    function clear() {
      state.item = null;
      $(infoId).hidden = true;
      $(infoId).innerHTML = '';
      setStatus(statusId, I('st.empty'));
      $(runId).disabled = true;
      onAfterClear && onAfterClear();
    }

    async function add(files) {
      if (!files.length) return;
      if (anyBusy(kind)) return;
      var f = files[0];
      if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') {
        var m = I('err.pdfOnly', { name: f.name });
        toast(m, true);
        setStatus(statusId, m, 'err');
        return;
      }
      if (files.length > 1) {
        toast(I('toast.onlyFirst', { n: files.length }), true);
      }
      setStatus(statusId, I('st.reading', { name: f.name }), 'busy');
      var it = await loadFileItem(f);
      if (it.errorCode) {
        toast(I('toast.unreadable', { name: f.name }), true);
        setStatus(statusId, I('err.unreadable'), 'err');
        return;
      }
      state.item = it;
      renderCard();
      onAfterLoad && onAfterLoad(it);
    }

    function renderCard() {
      var it = state.item;
      var box = $(infoId);
      box.innerHTML = '';
      box.hidden = false;
      var nameEl = el('span', 'fc-name', it.name);
      nameEl.title = it.name;
      var meta = el('span', 'fc-meta', I('meta.pages', { n: it.pageCount, size: H.formatBytes(it.size) }));
      var spacer = el('span', '', '');
      spacer.style.flex = '1';
      var del = el('button', 'btn-icon del', '✕');
      del.type = 'button';
      del.title = I('p.merge.del');
      del.addEventListener('click', clear);
      box.appendChild(nameEl);
      box.appendChild(meta);
      box.appendChild(spacer);
      box.appendChild(del);
    }

    bindDropzone(dzId, kind + '-input', add);

    var onAfterLoad = null, onAfterClear = null;
    return {
      state: state,
      clear: clear,
      add: add,
      renderCard: renderCard,
      get afterLoad() { return onAfterLoad; },
      set afterLoad(fn) { onAfterLoad = fn; },
      get afterClear() { return onAfterClear; },
      set afterClear(fn) { onAfterClear = fn; }
    };
  }

  /* ================================================================
   * 工具二：加水印
   * ================================================================ */
  var WAT_COLORS = { gray: '#4b5563', red: '#b91c1c', black: '#111827' };
  var WM_FONT_STACK = '"Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  var TILE_FONT_PX = 160; /* 渲染精度：画布字号，再等比缩放到目标字号 */

  function segValue(segId) {
    var on = $(segId).querySelector('.on');
    return on ? on.dataset.v : null;
  }

  function hexToRgba(hex, a) {
    var c = parseHex(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  /* 渲染一个带旋转文字的水印瓦片（透明底 PNG），返回画布与像素尺寸 */
  function renderTile(text, angleDeg, opacityPct, colorHex, fontPx) {
    var cv = document.createElement('canvas');
    var ctx = cv.getContext('2d');
    var font = 'bold ' + fontPx + 'px ' + WM_FONT_STACK;
    ctx.font = font;
    var w = Math.max(1, ctx.measureText(text).width);
    var h = fontPx * 1.25;
    var rad = angleDeg * Math.PI / 180;
    var cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
    var pad = fontPx * 0.5;
    var W = Math.ceil(w * cos + h * sin) + pad * 2;
    var Hh = Math.ceil(w * sin + h * cos) + pad * 2;
    cv.width = W;
    cv.height = Hh;

    ctx.clearRect(0, 0, W, Hh);
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(W / 2, Hh / 2);
    ctx.rotate(rad);
    ctx.fillStyle = hexToRgba(colorHex, opacityPct / 100);
    ctx.fillText(text, 0, 0);
    return { canvas: cv, widthPx: W, heightPx: Hh };
  }

  function dataUrlToBytes(dataUrl) {
    var bin = atob(dataUrl.split(',')[1]);
    var u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }

  var wm = makeSingleTool('wm');

  /* 快捷 chips：文案与默认文字按语言生成；用户手输的内容不被覆盖 */
  function buildChips() {
    var wrap = $('wm-chips');
    wrap.innerHTML = '';
    var langIdx = I18N.getLang() === 'en' ? 1 : 0;
    var cur = $('wm-text').value.trim();
    var matched = -1;
    I18N.chips.forEach(function (pair, i) {
      if (pair[0] === cur || pair[1] === cur) matched = i;
    });
    if (matched === -1 && cur === '') matched = 0;
    if (matched > -1) {
      var nextVal = I18N.chips[matched][langIdx];
      if (nextVal !== cur) $('wm-text').value = nextVal;
    }
    I18N.chips.forEach(function (pair, i) {
      var label = pair[langIdx];
      var b = el('button', 'chip' + (matched === i ? ' on' : ''), label);
      b.type = 'button';
      b.dataset.t = label;
      b.addEventListener('click', function () {
        $('wm-text').value = label;
        Array.prototype.forEach.call(wrap.querySelectorAll('.chip'), function (c) {
          c.classList.toggle('on', c === b);
        });
        wmNameSuggest();
      });
      wrap.appendChild(b);
    });
  }

  function wmCanRun() {
    var it = wm.state.item;
    var run = $('wm-run');
    if (!it) { run.disabled = true; return; }
    if (segValue('wm-range') === 'pages') {
      var r = H.parsePageInput($('wm-pages').value, it.pageCount, I18N.pageMessages());
      run.disabled = !r.ok;
    } else {
      run.disabled = false;
    }
  }

  wm.afterLoad = function (it) {
    setStatus('wm-status', I('st.wm.ready', { name: it.name, pages: it.pageCount }), 'ok');
    wmNameSuggest();
    wmPagesHint();
    wmCanRun();
  };
  wm.afterClear = function () {
    setStatus('wm-status', I('st.empty'));
    $('wm-pages-hint').textContent = '';
    wmCanRun();
  };

  function wmNameSuggest() {
    var it = wm.state.item;
    if (!it) return;
    var base = H.stripPdfExt(it.name);
    var text = $('wm-text').value.trim();
    var sug = text
      ? I('name.wm', { base: base, piece: H.filePieceFromWatermark(text) })
      : I('name.wmPlain', { base: base });
    autoName($('wm-name'), sug);
  }

  $('wm-text').addEventListener('input', function () {
    /* 手输内容：若与某个默认值相同则点亮对应 chip，否则全部熄灭 */
    var cur = $('wm-text').value;
    var any = false;
    Array.prototype.forEach.call($('wm-chips').querySelectorAll('.chip'), function (c) {
      var on = c.dataset.t === cur;
      c.classList.toggle('on', on);
      if (on) any = true;
    });
    wmNameSuggest();
  });

  /* 控件绑定：滑块输出 + 分段单选 */
  function bindSlider(id, outId, fmt) {
    var s = $(id), o = $(outId);
    function upd() { o.textContent = fmt(s.value); }
    s.addEventListener('input', upd);
    upd();
  }
  bindSlider('wm-opacity', 'wm-opacity-out', function (v) { return v + '%'; });
  bindSlider('wm-font', 'wm-font-out', function (v) { return v; });
  bindSlider('wm-density', 'wm-density-out', function (v) {
    var n = parseFloat(v);
    if (n < 0.95) return I('p.wm.dense');
    if (n > 1.55) return I('p.wm.sparse');
    return I('p.wm.mid');
  });
  function bindSeg(segId, onChange) {
    $(segId).addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      Array.prototype.forEach.call($(segId).querySelectorAll('button'), function (x) {
        x.classList.toggle('on', x === b);
      });
      onChange && onChange(b.dataset.v);
    });
  }
  bindSeg('wm-angle');
  bindSeg('wm-color');
  bindSeg('wm-range', function (v) {
    $('wm-pages').disabled = v !== 'pages';
    if (v === 'pages') $('wm-pages').focus();
    wmPagesHint();
    wmCanRun();
  });
  $('wm-pages').addEventListener('input', function () { wmPagesHint(); wmCanRun(); });

  function wmPagesHint() {
    var hint = $('wm-pages-hint');
    if (segValue('wm-range') !== 'pages') { hint.textContent = ''; hint.className = 'hint'; return; }
    var it = wm.state.item;
    if (!it) { hint.textContent = ''; hint.className = 'hint'; return; }
    var r = H.parsePageInput($('wm-pages').value, it.pageCount, I18N.pageMessages());
    if (r.ok) {
      hint.textContent = I('hint.wm.pages', { n: r.list.length, summ: H.summarizePages(r.list) });
      hint.className = 'hint ok';
    } else {
      hint.textContent = r.error;
      hint.className = 'hint err';
    }
  }

  /* 跑水印 */
  async function wmRun() {
    var it = wm.state.item;
    if (!it || $('wm-run').disabled) return;
    var text = $('wm-text').value.trim();
    if (!text) { setStatus('wm-status', I('st.wm.textEmpty'), 'err'); return; }

    /* 校验页面范围 */
    var wantPages = segValue('wm-range') === 'pages';
    var pageNums = null;
    if (wantPages) {
      var r = H.parsePageInput($('wm-pages').value, it.pageCount, I18N.pageMessages());
      if (!r.ok) {
        setStatus('wm-status', r.error, 'err');
        $('wm-pages').focus();
        return;
      }
      pageNums = r.list;
    }

    var angleDeg = parseInt(segValue('wm-angle'), 10);
    var opacityPct = parseInt($('wm-opacity').value, 10);
    var fontPt = parseInt($('wm-font').value, 10);
    var density = parseFloat($('wm-density').value);
    var colorHex = WAT_COLORS[segValue('wm-color')] || WAT_COLORS.gray;

    var nameField = $('wm-name');
    var name = nameField.value.trim()
      || I('name.wm', { base: H.stripPdfExt(it.name), piece: H.filePieceFromWatermark(text) });
    name = H.cleanNamePiece(name.replace(/\.pdf$/i, '')) + '.pdf';

    busy('wm-run', true, I('busy.wm'));
    var doc, tile, pngImage, pxPerPt;
    try {
      /* 每次从原始字节重建文档：避免同一份文件重复加水印时叠印 */
      doc = await PDFDocument.load(it.bytes, { ignoreEncryption: true });
      /* 渲染瓦片 → PNG，嵌入一次，全部页面复用同一资源 */
      setStatus('wm-status', I('st.wm.texture'), 'busy');
      await sleep(24);
      tile = renderTile(text, angleDeg, opacityPct, colorHex, TILE_FONT_PX);
      pngImage = await doc.embedPng(dataUrlToBytes(tile.canvas.toDataURL('image/png')));
      pxPerPt = fontPt / TILE_FONT_PX;
      var tileWpt = tile.widthPx * pxPerPt;
      var tileHpt = tile.heightPx * pxPerPt;
      var step = tileWpt * density;

      var targets = pageNums || allPages(it.pageCount);
      var done = 0;
      for (var pi = 0; pi < targets.length; pi++) {
        var page = doc.getPage(targets[pi] - 1);
        var pw = page.getWidth();
        var ph = page.getHeight();
        var cols = Math.ceil(pw / step) + 2;
        var rows = Math.ceil(ph / step) + 2;
        var x0 = (pw - (cols - 1) * step) / 2;
        var y0 = (ph - (rows - 1) * step) / 2;
        for (var cx = 0; cx < cols; cx++) {
          for (var cy = 0; cy < rows; cy++) {
            page.drawImage(pngImage, {
              x: x0 + cx * step,
              y: y0 + cy * step,
              width: tileWpt,
              height: tileHpt
            });
          }
        }
        done++;
        if (done % 25 === 0 || done === targets.length) {
          setStatus('wm-status', I('st.wm.working', { cur: done, total: targets.length }), 'busy');
          await sleep(0);
        }
      }

      setStatus('wm-status', I('st.merge.saving'), 'busy');
      var bytes = await doc.save();
      triggerDownload(bytes, name);
      setStatus('wm-status', I('st.wm.done', { name: name, size: H.formatBytes(bytes.length) }), 'ok');
      toast(I('toast.wm.done', { name: fq(name) }));
    } catch (e) {
      console.error(e);
      setStatus('wm-status', I('st.wm.fail', { msg: (e && e.message) || e }), 'err');
      toast(I('toast.wm.fail'), true);
    } finally {
      busy('wm-run', false);
    }
  }

  function allPages(n) {
    var a = [];
    for (var i = 1; i <= n; i++) a.push(i);
    return a;
  }

  /* ================================================================
   * 工具三：抽页
   * ================================================================ */
  var ex = makeSingleTool('ex');

  ex.afterLoad = function (it) {
    setStatus('ex-status', I('st.ex.ready', { name: it.name, total: it.pageCount }), 'ok');
    exNameSuggest();
    exPreview();
  };
  ex.afterClear = function () {
    $('ex-preview').textContent = '';
    $('ex-preview').className = 'hint';
  };

  function exNameSuggest() {
    var it = ex.state.item;
    if (!it) return;
    var base = H.stripPdfExt(it.name);
    var v = $('ex-pages').value.trim();
    var r = H.parsePageInput(v, it.pageCount, I18N.pageMessages());
    var sug = r.ok
      ? I('name.ex', { base: base, summ: H.summarizePages(r.list) })
      : I('name.exPlain', { base: base });
    autoName($('ex-name'), sug);
  }

  function exPreview() {
    var it = ex.state.item;
    var p = $('ex-preview');
    var runBtn = $('ex-run');
    if (!it) {
      p.textContent = '';
      p.className = 'hint';
      runBtn.disabled = true;
      return;
    }
    var v = $('ex-pages').value.trim();
    if (!v) {
      p.textContent = '';
      p.className = 'hint';
      runBtn.disabled = true;
      exNameSuggest();
      return;
    }
    var r = H.parsePageInput(v, it.pageCount, I18N.pageMessages());
    if (r.ok) {
      p.textContent = I('hint.ex.ok', { n: r.list.length, total: it.pageCount, summ: H.summarizePages(r.list) });
      p.className = 'hint ok';
      runBtn.disabled = false;
    } else {
      p.textContent = r.error;
      p.className = 'hint err';
      runBtn.disabled = true;
    }
    exNameSuggest();
  }
  $('ex-pages').addEventListener('input', exPreview);

  async function exRun() {
    var it = ex.state.item;
    var runBtn = $('ex-run');
    if (!it || runBtn.disabled) return;
    var v = $('ex-pages').value.trim();
    var r = H.parsePageInput(v, it.pageCount, I18N.pageMessages());
    if (!r.ok) { exPreview(); return; }
    var name = $('ex-name').value.trim()
      || I('name.ex', { base: H.stripPdfExt(it.name), summ: H.summarizePages(r.list) });
    name = H.cleanNamePiece(name.replace(/\.pdf$/i, '')) + '.pdf';

    busy('ex-run', true, I('busy.ex'));
    try {
      var out = await PDFDocument.create();
      out.setTitle(H.stripPdfExt(name));
      var zeroBased = r.list.map(function (n) { return n - 1; });
      var pages = await out.copyPages(it.doc, zeroBased);
      pages.forEach(function (p) { out.addPage(p); });
      setStatus('ex-status', I('st.merge.saving'), 'busy');
      await sleep(16);
      var bytes = await out.save();
      triggerDownload(bytes, name);
      setStatus('ex-status', I('st.ex.done', { name: name, n: r.list.length, size: H.formatBytes(bytes.length) }), 'ok');
      toast(I('toast.ex.done', { name: fq(name) }));
    } catch (e) {
      console.error(e);
      setStatus('ex-status', I('st.ex.fail', { msg: (e && e.message) || e }), 'err');
      toast(I('toast.ex.fail'), true);
    } finally {
      busy('ex-run', false);
    }
  }

  /* ================================================================
   * 语言切换
   * ================================================================ */
  function syncLangButtons() {
    var on = I18N.getLang();
    [['lang-zh', 'zh'], ['lang-en', 'en']].forEach(function (pair) {
      var b = $(pair[0]);
      var active = pair[1] === on;
      b.classList.toggle('on', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    var group = $('langswitch');
    if (group) group.setAttribute('aria-label', I('lang.label'));
  }

  function onLangChange() {
    syncLangButtons();
    buildChips(); /* 顺带把“默认值”水印文字切成当前语言 */
    autoName($('mz-name'), mzFiles.length ? suggestedMergeName() : I('name.mergeInit'));
    if (mzFiles.length) {
      mzRender(); /* 重渲列表 / 错误提示（语言化） */
    } else {
      setStatus('mz-status', I('st.merge.empty'));
      $('mz-run').disabled = true;
    }
    if (wm.state.item) {
      wm.renderCard();
      wmNameSuggest();
      wmPagesHint();
      wmCanRun();
    } else {
      setStatus('wm-status', I('st.empty'));
      $('wm-run').disabled = true;
    }
    if (ex.state.item) {
      ex.renderCard();
      exNameSuggest();
      exPreview();
    } else {
      setStatus('ex-status', I('st.empty'));
      $('ex-run').disabled = true;
    }
  }

  /* ================================================================
   * 事件接线 & 初始化
   * ================================================================ */
  bindDropzone('mz-drop', 'mz-input', mzAddFiles);
  bindDropzone('wm-drop', 'wm-input', wm.add);
  bindDropzone('ex-drop', 'ex-input', ex.add);
  $('mz-run').addEventListener('click', mzRun);
  $('wm-run').addEventListener('click', wmRun);
  $('ex-run').addEventListener('click', exRun);

  /* 语言切换按钮 */
  Array.prototype.forEach.call(document.querySelectorAll('#langswitch button'), function (b) {
    b.addEventListener('click', function () {
      I18N.setLang(b.dataset.lang);
    });
  });
  document.addEventListener('ck:lang', onLangChange);

  document.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      var activePanel = document.querySelector('.panel.on');
      if (!activePanel) return;
      var runId = activePanel.id.replace('panel-', '') + '-run';
      var b = $(runId);
      if (b && !b.disabled) b.click();
    }
  });

  /* 用存储的语言渲染一次（触发 ck:lang → onLangChange 初始化动态部分） */
  I18N.setLang(I18N.getLang(), { force: true });

  console.log('[ContractKit] ready — merge / watermark / extract, all local, i18n: ' + I18N.getLang());
})();
