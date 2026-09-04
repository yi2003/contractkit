/*
 * i18n.js —— 合同小刀的中英文文案与切换。
 * 浏览器：顶栏切换按钮写入 localStorage；静态文案用 [data-i18n] 标注，动态文案走 I18N.t()。
 * Node：同样可 require（挂到 globalThis.ContractKit.i18n），供测试用。
 * 零网络请求：文案全部内嵌在本文件。
 */
(function (global) {
  'use strict';

  var STORE_KEY = 'contractkit_lang';
  var LANG = 'zh';

  var ZH = {
    /* meta / 顶栏 */
    'html.title': '合同小刀 · 合同 PDF 三件套（合并 / 水印 / 抽页）—— 全程本地处理',
    'html.desc': '合同小刀：纯浏览器里的合同 PDF 小工具。合并分章为整本、一键盖「仅供投标/仅供查阅」水印、按页抽印章页。文件不出本机、不上传服务器。',
    'brand.name': '合同小刀',
    'brand.sub': '合同 / 标书 PDF 三件套 —— 合并 · 水印 · 抽页',
    'privacy.pill': '文件不出本机 · 不上传服务器',
    'hero.text': '扫描件、分章 PDF 想在本地拼成整本投标文件？想盖「仅供投标」防冒用？只想抽出第 3–7 页的印章页？这三件事，在浏览器里就能办。文件从读取、处理到下载都在你电脑的内存里完成，本页没有任何网络请求。',

    /* 页签 */
    'tab.merge.t': '合并',
    'tab.merge.s': '分章拼整本 · 投标 / 归档',
    'tab.watermark.t': '加水印',
    'tab.watermark.s': '仅供投标 / 仅供××查阅',
    'tab.extract.t': '抽页',
    'tab.extract.s': '印章页 / 附录单独导出',
    'nav.aria': '选择工具',

    /* 面板：合并 */
    'p.merge.head': '合并 —— 把扫描件 / 分章 PDF 合成一整本',
    'p.merge.desc': '按下面列表的顺序拼接成一份整本，可调整顺序、可删除。适合把几个章节、几份扫描件合成投标 / 归档文件。',
    'p.merge.dz.main': '把 PDF 拖到这里，或点击选择文件（可多选）',
    'p.merge.dz.sub': '支持扫描件 PDF / 电子 PDF，按需排好顺序即可',
    'p.merge.dz.aria': '添加 PDF 文件（可多选）',
    'p.merge.col': '文件（按此顺序合并）',
    'p.merge.up': '上移',
    'p.merge.down': '下移',
    'p.merge.del': '移除',
    'p.merge.name': '导出文件名',
    'p.merge.run': '合并并下载',
    'p.out.name': '导出文件名',

    /* 面板：水印 */
    'p.wm.head': '加水印 —— 一键盖「仅供投标 / 仅供××查阅」',
    'p.wm.desc': '水印直接画进每一页的内容之上，导出后是普通软件去不掉的斜向文字印，防止文件被拿去当正式件乱传。',
    'p.wm.dz.main': '放入一份 PDF —— 拖入或点击选择',
    'p.wm.dz.sub': '将在这份 PDF 的每一页（或指定页）上盖水印，原文件不动',
    'p.wm.dz.aria': '添加一份 PDF',
    'p.wm.f.text': '水印文字',
    'p.wm.f.angle': '方向',
    'p.wm.angle.n45': '斜 ↗ 45°',
    'p.wm.angle.flat': '水平',
    'p.wm.angle.p45': '斜 ↘ 45°',
    'p.wm.f.color': '颜色',
    'p.wm.color.gray': '深灰',
    'p.wm.color.red': '警示红',
    'p.wm.color.black': '纯黑',
    'p.wm.f.opacity': '透明度',
    'p.wm.f.font': '字号',
    'p.wm.f.density': '疏密',
    'p.wm.dense': '密',
    'p.wm.mid': '中',
    'p.wm.sparse': '疏',
    'p.wm.f.range': '盖到哪些页',
    'p.wm.range.all': '全部页面',
    'p.wm.range.pages': '指定页',
    'p.wm.pages.ph': '如：1-3、5、8-12（第 1 页开始）',
    'p.wm.run': '加水印并下载',

    /* 面板：抽页 */
    'p.ex.head': '抽页 —— 只要印章页 / 附录，导出小份',
    'p.ex.desc': '按页码抽出需要的页（如第 3–7 页的盖章页、附录），导出一小份。原文件保留不动。',
    'p.ex.tip': '小技巧：先在系统阅读器里翻一下原 PDF，记下目标页码再回来填。',
    'p.ex.dz.main': '放入一份 PDF —— 拖入或点击选择',
    'p.ex.dz.sub': '一次处理一份；多选时只取第一份',
    'p.ex.dz.aria': '添加一份 PDF',
    'p.ex.f.pages': '要抽出的页码（逗号 / 短横均可，从 1 开始）',
    'p.ex.f.pages.soft': '（逗号 / 短横均可，从 1 开始）',
    'p.ex.pages.ph': '如：3-7、9、12-15，或 3- 表示第 3 页到最后',
    'p.ex.run': '抽出并下载',

    /* FAQ */
    'faq.title': '关于「本地处理」，你可能想问',
    'faq.q1': '我的合同会被传到网上吗？',
    'faq.a1': '不会。这个页面没有任何服务器、也没有任何网络请求——程序（含 PDF 处理引擎）在你打开网页的瞬间就已全部进入浏览器。你的 PDF 从读取、处理到下载，都只在你电脑的内存里进行，关掉页面即彻底消失。',
    'faq.q2': '支持什么样的 PDF？',
    'faq.a2': '普通可读的 PDF 都可以，包括扫描件（扫描件本质就是一张张图片组成的 PDF）。加密、带打开密码的 PDF 无法处理。',
    'faq.q3': '文件大小 / 页数有限制吗？',
    'faq.a3': '上限取决于你电脑的内存，一般单个几十 MB、几百页以内的合同都很流畅。超大文件处理时请稍等状态提示。',
    'faq.q4': '水印能去掉吗？加错了会损坏原文件吗？',
    'faq.a4': '水印是直接画进每一页页面内容里的，普通 PDF 软件删不掉。原文件始终是只读的，处理失败也不会动它——导出的都是新文件。',
    'faq.q5': '需要联网 / 注册 / 装软件吗？',
    'faq.a5': '首次打开需要网络加载页面（之后可整站下载到本地断网使用），无需注册、无需安装、无广告。整站就是几个静态文件，可随时审查。',

    /* 页脚 */
    'foot.text': '合同小刀 · 纯前端静态站，pdf-lib 驱动，无构建、可离线 · 只做合同 PDF 的三件小事，文件永不离开你的电脑。',
    'ns.text': '需要启用 JavaScript 才能在浏览器里处理 PDF。',

    /* 通用状态 */
    'st.empty': '还没有文件，先放入一份 PDF。',
    'st.reading': '正在读取《{name}》…',
    'meta.pages': '{n} 页 · {size}',

    /* 合并状态 / 提示 */
    'st.merge.empty': '还没有文件，先拖入或选择至少 2 份 PDF。',
    'st.merge.reading': '正在读取 PDF…',
    'st.merge.bad': '{n} 份文件无法读取，请移除后重试。',
    'st.merge.needTwo': '还需要至少 2 份 PDF 才能合并（当前 1 份）。',
    'st.merge.ready': '已就绪：{n} 份 · 共 {total} 页，将按列表顺序合成一份。',
    'st.merge.working': '正在合并 {cur}/{total} · {name}',
    'st.merge.saving': '正在生成文件…',
    'st.merge.done': '完成 ✔ 已下载《{name}》（{size}）',
    'st.merge.fail': '合并失败：{msg}',
    'busy.merge': '合并中…',

    /* 水印状态 / 提示 */
    'st.wm.ready': '已载入《{name}》· {pages} 页。设置水印后点下方按钮导出。',
    'st.wm.textEmpty': '请先填写水印文字。',
    'st.wm.texture': '正在生成水印纹理…',
    'st.wm.working': '正在盖水印 {cur}/{total} 页…',
    'st.wm.done': '完成 ✔ 已下载《{name}》（{size}）· 水印已画进页面，删不掉',
    'st.wm.fail': '加水印失败：{msg}',
    'busy.wm': '正在盖水印…',
    'hint.wm.pages': '将在这 {n} 页上盖水印：第 {summ} 页',

    /* 抽页状态 / 提示 */
    'st.ex.ready': '已载入《{name}》· 共 {total} 页。填写要抽的页码后导出。',
    'st.ex.done': '完成 ✔ 已下载《{name}》· {n} 页 · {size}',
    'st.ex.fail': '抽页失败：{msg}',
    'busy.ex': '正在抽页…',
    'hint.ex.ok': '→ 将抽出 {n} 页（共 {total} 页）：第 {summ} 页',

    /* Toast */
    'toast.merge.done': '合并完成：{name}',
    'toast.merge.fail': '合并失败，请重试',
    'toast.wm.done': '水印完成：{name}',
    'toast.wm.fail': '加水印失败，请重试',
    'toast.ex.done': '抽页完成：{name}',
    'toast.ex.fail': '抽页失败，请重试',
    'toast.skipNonPdf': '已跳过非 PDF 文件：{name}',
    'toast.onlyFirst': '{n} 份只处理第一份，其余已忽略',
    'toast.unreadable': '《{name}》无法读取：可能不是有效的 PDF，或带打开密码',

    /* 错误 / 加载 */
    'err.unreadable': '无法读取：可能不是有效的 PDF，或带打开密码',
    'err.pdfOnly': '只支持 PDF 文件：{name}',

    /* 页码解析报错 */
    'pg.empty': '请先填写页码范围',
    'pg.startOne': '页码从 1 开始',
    'pg.startOneNum': '页码从 1 开始，不能是 {n}',
    'pg.beyond': '第 {n} 页超出范围（本文件共 {total} 页）',
    'pg.badToken': '看不懂「{tok}」——示例：3-7、9、12-15',
    'pg.noPages': '没有可抽取的页面',

    /* 文件名建议 */
    'name.mergeInit': '整本合并',
    'name.mergeDefault': '{base}等{n}份_合并',
    'name.wm': '{base}_{piece}',
    'name.wmPlain': '{base}_水印',
    'name.ex': '{base}_第{summ}页',
    'name.exPlain': '{base}_抽页',

    /* 语言切换 */
    'lang.label': '语言',
  };

  var EN = {
    'html.title': 'ContractKit · Contract PDF toolkit (Merge / Watermark / Extract) — runs 100% in your browser',
    'html.desc': 'ContractKit: a browser-only PDF knife for contracts. Merge scans & chapters into one book, stamp "FOR BID ONLY" watermarks, extract seal & appendix pages. Files never leave your computer.',
    'brand.name': 'ContractKit',
    'brand.sub': 'Contract / bid PDF toolkit — merge · watermark · extract',
    'privacy.pill': 'Files stay on your device · never uploaded',
    'hero.text': 'Want to assemble scanned chapters into one bid document locally? Stamp it “FOR BID ONLY” so it cannot be passed off as the official copy? Or pull out just the seal pages 3–7? All three are done right here in your browser. Files are read, processed and downloaded entirely in your computer\u2019s memory — this page makes no network requests at all.',

    'tab.merge.t': 'Merge',
    'tab.merge.s': 'Chapters → one book · bid / archive',
    'tab.watermark.t': 'Watermark',
    'tab.watermark.s': '"FOR BID ONLY" & custom stamps',
    'tab.extract.t': 'Extract',
    'tab.extract.s': 'Export seal & appendix pages',
    'nav.aria': 'Choose a tool',

    'p.merge.head': 'Merge — combine scanned / chapter PDFs into one file',
    'p.merge.desc': 'Pages are joined in list order below; reorder or remove entries freely. Ideal for assembling bid / archive books from several chapters or scans.',
    'p.merge.dz.main': 'Drop PDFs here, or click to choose files (multiple allowed)',
    'p.merge.dz.sub': 'Scanned or digital PDFs — just arrange them in the order you want',
    'p.merge.dz.aria': 'Add PDF files (multiple allowed)',
    'p.merge.col': 'Files (merged in this order)',
    'p.merge.up': 'Move up',
    'p.merge.down': 'Move down',
    'p.merge.del': 'Remove',
    'p.merge.name': 'Output file name',
    'p.merge.run': 'Merge & download',
    'p.out.name': 'Output file name',

    'p.wm.head': 'Watermark — stamp “FOR BID ONLY” / “FOR internal review” in one click',
    'p.wm.desc': 'Watermarks are drawn into the page content itself, so the exported file keeps an unremovable diagonal stamp — a deterrent against the file being passed off as an official copy.',
    'p.wm.dz.main': 'Drop in one PDF — or click to choose',
    'p.wm.dz.sub': 'Every page (or the pages you pick) gets the stamp; the original file stays untouched',
    'p.wm.dz.aria': 'Add a single PDF',
    'p.wm.f.text': 'Watermark text',
    'p.wm.f.angle': 'Angle',
    'p.wm.angle.n45': 'Diag ↗ 45°',
    'p.wm.angle.flat': 'Horizontal',
    'p.wm.angle.p45': 'Diag ↘ 45°',
    'p.wm.f.color': 'Color',
    'p.wm.color.gray': 'Grey',
    'p.wm.color.red': 'Red',
    'p.wm.color.black': 'Black',
    'p.wm.f.opacity': 'Opacity',
    'p.wm.f.font': 'Size',
    'p.wm.f.density': 'Spacing',
    'p.wm.dense': 'Dense',
    'p.wm.mid': 'Normal',
    'p.wm.sparse': 'Sparse',
    'p.wm.f.range': 'Apply to',
    'p.wm.range.all': 'All pages',
    'p.wm.range.pages': 'Pages…',
    'p.wm.pages.ph': 'e.g. 1-3, 5, 8-12 (start at 1)',
    'p.wm.run': 'Watermark & download',

    'p.ex.head': 'Extract — keep only the seal / appendix pages',
    'p.ex.desc': 'Pick pages by number (e.g. pages 3–7 with seals, or an appendix) and export a smaller file. The original is never modified.',
    'p.ex.tip': 'Tip: skim the PDF in your system reader first, note the page numbers, then come back.',
    'p.ex.dz.main': 'Drop in one PDF — or click to choose',
    'p.ex.dz.sub': 'One file at a time; extra files in a multi-drop are ignored',
    'p.ex.dz.aria': 'Add a single PDF',
    'p.ex.f.pages': 'Pages to extract (commas / dashes OK, start at 1)',
    'p.ex.f.pages.soft': '(commas / dashes OK, start at 1)',
    'p.ex.pages.ph': 'e.g. 3-7, 9, 12-15 — “3-” means from page 3 to the end',
    'p.ex.run': 'Extract & download',

    'faq.title': 'About running 100% locally, you may wonder',
    'faq.q1': 'Will my contracts be uploaded anywhere?',
    'faq.a1': 'No. This page has no server and makes no network requests — the program (including the PDF engine) is fully loaded into your browser the moment you open it. Your PDF is read, processed and downloaded entirely in your computer\u2019s memory, and disappears when you close the tab.',
    'faq.q2': 'Which PDFs are supported?',
    'faq.a2': 'Any readable PDF, including scans (a scan is just a PDF of page images). Password-protected / encrypted PDFs cannot be processed.',
    'faq.q3': 'Are there file-size / page-count limits?',
    'faq.a3': 'Only your computer\u2019s memory sets the ceiling — contracts of tens of MB and a few hundred pages are smooth. For very large files just wait for the progress message.',
    'faq.q4': 'Can the watermark be removed? Can a mistake damage the original?',
    'faq.a4': 'The watermark is drawn into the page content itself and cannot be stripped by ordinary PDF software. The original file is always read-only — exports are brand-new files, so nothing can corrupt it.',
    'faq.q5': 'Do I need internet / an account / an install?',
    'faq.a5': 'Only the first load needs internet to fetch the page (after that you can save the whole folder and use it offline). No registration, no install, no ads. The whole site is a handful of static files you can audit anytime.',

    'foot.text': 'ContractKit · pure front-end static site powered by pdf-lib · no build step, works offline · just three PDF chores for contracts, and files never leave your machine.',
    'ns.text': 'Please enable JavaScript to process PDFs in the browser.',

    'st.empty': 'No file yet — drop in a PDF.',
    'st.reading': 'Loading “{name}”…',
    'meta.pages': '{n} pages · {size}',

    'st.merge.empty': 'No files yet — drop in at least 2 PDFs.',
    'st.merge.reading': 'Loading PDFs…',
    'st.merge.bad': '{n} file(s) could not be read — remove them and retry.',
    'st.merge.needTwo': 'Need at least 2 PDFs to merge (1 so far).',
    'st.merge.ready': 'Ready: {n} files · {total} pages — will merge in list order.',
    'st.merge.working': 'Merging {cur}/{total} · {name}',
    'st.merge.saving': 'Building file…',
    'st.merge.done': 'Done ✔ downloaded “{name}” ({size})',
    'st.merge.fail': 'Merge failed: {msg}',
    'busy.merge': 'Merging…',

    'st.wm.ready': 'Loaded “{name}” · {pages} pages. Tune the stamp, then download.',
    'st.wm.textEmpty': 'Type the watermark text first.',
    'st.wm.texture': 'Rendering watermark texture…',
    'st.wm.working': 'Watermarking page {cur}/{total}…',
    'st.wm.done': 'Done ✔ downloaded “{name}” ({size}) — watermark is baked into the pages',
    'st.wm.fail': 'Watermark failed: {msg}',
    'busy.wm': 'Watermarking…',
    'hint.wm.pages': 'Will stamp {n} pages: {summ}',

    'st.ex.ready': 'Loaded “{name}” · {total} pages. Enter the pages to extract.',
    'st.ex.done': 'Done ✔ downloaded “{name}” · {n} pages · {size}',
    'st.ex.fail': 'Extract failed: {msg}',
    'busy.ex': 'Extracting…',
    'hint.ex.ok': '→ Will extract {n} pages (of {total}): {summ}',

    'toast.merge.done': 'Merged: {name}',
    'toast.merge.fail': 'Merge failed, please try again',
    'toast.wm.done': 'Watermarked: {name}',
    'toast.wm.fail': 'Watermark failed, please try again',
    'toast.ex.done': 'Extracted: {name}',
    'toast.ex.fail': 'Extract failed, please try again',
    'toast.skipNonPdf': 'Skipped non-PDF file: {name}',
    'toast.onlyFirst': '{n} files — only the first is processed, the rest are ignored',
    'toast.unreadable': 'Could not read “{name}”: not a valid PDF, or it is password-protected',

    'err.unreadable': 'Cannot read: not a valid PDF, or it is password-protected',
    'err.pdfOnly': 'Only PDF files are supported: {name}',

    'pg.empty': 'Enter a page range first',
    'pg.startOne': 'Page numbers start at 1',
    'pg.startOneNum': 'Page numbers start at 1 — got {n}',
    'pg.beyond': 'Page {n} is out of range (this file has {total} pages)',
    'pg.badToken': 'Could not understand “{tok}” — e.g. 3-7, 9, 12-15',
    'pg.noPages': 'No extractable pages',

    'name.mergeInit': 'merged',
    'name.mergeDefault': '{base}_merged_{n}',
    'name.wm': '{base}_{piece}',
    'name.wmPlain': '{base}_watermarked',
    'name.ex': '{base}_pages-{summ}',
    'name.exPlain': '{base}_extract',

    'lang.label': 'Language',
  };

  var DICT = { zh: ZH, en: EN };

  function getLang() { return LANG; }

  function setLang(lang, opts) {
    opts = opts || {};
    var next = lang === 'en' ? 'en' : 'zh';
    if (next === LANG && !opts.force) return LANG;
    LANG = next;
    try { localStorage.setItem(STORE_KEY, LANG); } catch (e) { /* file:// 或隐私模式忽略 */ }
    if (opts.apply !== false) applyDom();
    return LANG;
  }

  function detect() {
    try {
      var stored = localStorage.getItem(STORE_KEY);
      if (stored === 'zh' || stored === 'en') return stored;
    } catch (e) { /* ignore */ }
    return 'zh'; /* 国内产品默认中文 */
  }

  function t(key, vars) {
    var dict = DICT[LANG] || ZH;
    var s = dict[key];
    if (s == null) s = ZH[key]; /* 缺词回退中文 */
    if (s == null) return key;
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (_, k) {
        var v = vars[k];
        return v == null ? ('{' + k + '}') : String(v);
      });
    }
    return s;
  }

  function translate() {
    if (!global.document) return;
    document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : 'en';
    document.title = t('html.title');
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('html.desc'));
    document.querySelectorAll('[data-i18n]').forEach(function (n) {
      n.textContent = t(n.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (n) {
      n.placeholder = t(n.dataset.i18nPh);
    });
    document.querySelectorAll('[data-i18n-ttl]').forEach(function (n) {
      n.title = t(n.dataset.i18nTtl);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (n) {
      n.setAttribute('aria-label', t(n.dataset.i18nAria));
    });
  }

  function applyDom() {
    translate();
    if (global.document) {
      var evt;
      try { evt = new CustomEvent('ck:lang', { detail: { lang: LANG } }); }
      catch (e) {
        evt = document.createEvent('Event');
        evt.initEvent('ck:lang', true, false);
        evt.detail = { lang: LANG };
      }
      document.dispatchEvent(evt);
    }
  }

  /* 快捷水印 chips：每项 [中文, English]，顺序固定 */
  var CHIPS = [
    ['仅供投标', 'FOR BID ONLY'],
    ['仅供查阅', 'FOR REVIEW ONLY'],
    ['合同专用', 'CONTRACT ONLY'],
    ['内部资料', 'INTERNAL USE']
  ];

  /* 页码解析用的报错文案（helpers 按 code 返回，这里按当前语言生成最终句子） */
  function pageMessages() {
    return {
      empty: t('pg.empty'),
      startAtOne: t('pg.startOne'),
      startAtOneNum: function (n) { return t('pg.startOneNum', { n: n }); },
      beyond: function (n, total) { return t('pg.beyond', { n: n, total: total }); },
      badToken: function (tok) { return t('pg.badToken', { tok: tok }); },
      noPages: t('pg.noPages')
    };
  }

  LANG = detect();

  global.ContractKit = global.ContractKit || {};
  global.ContractKit.i18n = {
    t: t,
    getLang: getLang,
    setLang: setLang,
    chips: CHIPS,
    pageMessages: pageMessages,
    applyDom: applyDom
  };
})(typeof self !== 'undefined' ? self : globalThis);
