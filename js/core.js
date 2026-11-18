/* GoldZip Admin Portal — static demo
   core.js: state store, router, UI helpers, toasts, modals, security-key + approval write pattern. */
'use strict';

const VERSION = '2.3.1';
const STORE_KEY = 'gz-admin-demo-v1';
const SESSION_KEY = 'gz-admin-demo-session';

/* ------------------------------------------------------------------ helpers */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const uid = (p = 'id') => p + '-' + Math.random().toString(36).slice(2, 8);
const fmtN = (n, d = 2) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtInt = (n) => Number(n).toLocaleString('en-US');
const pad2 = (n) => String(n).padStart(2, '0');
const nowStamp = () => { const d = new Date(); return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const nowDash = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; };
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
const isNum = (v) => /^-?\d+(\.\d+)?$/.test(String(v ?? '').replace(/,/g, '').trim());
const toNum = (v) => Number(String(v ?? '').replace(/,/g, ''));
const randHex = (n) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
const shortHash = (h) => (h && h.length > 14 ? h.slice(0, 6) + '…' + h.slice(-6) : h || '---');
const val = (id) => { const el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : ''; };

/* icons — vendored lucide-static SVGs, drawn as CSS masks so they inherit colour */
const ic = (name, size = 16, style = '') =>
  `<i class="ic" aria-hidden="true" style="-webkit-mask-image:url('assets/icons/${name}.svg');mask-image:url('assets/icons/${name}.svg');width:${size}px;height:${size}px;${style}"></i>`;

/* ------------------------------------------------------------------ store */
const Store = {
  data: null,
  load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { this.data = JSON.parse(raw); if (this.data.__v === SEED_VERSION) return; }
    } catch (e) { /* storage blocked: fall back to fresh seed */ }
    this.reset(false);
  },
  save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ } },
  reset(save = true) { this.data = buildSeed(); if (save) this.save(); },
};
const S = () => Store.data;

const Session = {
  get() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return Session._mem || null; } },
  set(v) { Session._mem = v; try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  clear() { Session._mem = null; try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ } },
};
const me = () => Session.get()?.user || null;
const isSuper = () => (me()?.roles || []).includes('SuperAdmin');

/* ------------------------------------------------------------------ router */
const Routes = {};          // path -> { render, title, group, item, auth }
let currentRoute = null;
function route(path, def) { Routes[path] = def; }
function go(path) { if (location.hash === '#' + path) render(); else location.hash = path; }
function parseHash() {
  const h = location.hash.replace(/^#/, '') || '/login';
  const [path, qs] = h.split('?');
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  // match /a/b/:id style routes
  if (Routes[path]) return { path, def: Routes[path], params };
  for (const k of Object.keys(Routes)) {
    if (!k.includes(':')) continue;
    const a = k.split('/'), b = path.split('/');
    if (a.length !== b.length) continue;
    const p = {};
    if (a.every((seg, i) => (seg.startsWith(':') ? (p[seg.slice(1)] = decodeURIComponent(b[i]), true) : seg === b[i]))) return { path: k, def: Routes[k], params: { ...params, ...p } };
  }
  return { path: '/404', def: Routes['/404'], params };
}
function render() {
  closeMenus();
  const r = parseHash();
  const sess = Session.get();
  if (r.def.auth !== false && !sess?.signedIn) { location.hash = '/login'; return; }
  if (r.def.auth === false && sess?.signedIn && r.def.redirectIfSignedIn) { location.hash = '/dashboard'; return; }
  currentRoute = r;
  const app = $('#app');
  if (r.def.auth === false) {
    app.innerHTML = r.def.render(r.params);
    document.title = (r.def.title || 'Sign in') + ' · GoldZip Admin';
  } else {
    const keepScroll = currentRoute && app.dataset.path === location.hash;
    const prevScroll = keepScroll ? ($('.content')?.scrollTop || 0) : 0;
    app.innerHTML = Shell.render(r, r.def.render(r.params));
    app.dataset.path = location.hash;
    document.title = (r.def.title || 'Admin') + ' · GoldZip Admin';
    if (keepScroll && $('.content')) $('.content').scrollTop = prevScroll;
  }
  r.def.after && r.def.after(r.params);
  Idle.reset();
}
/* re-render the current page but keep scroll position */
function refresh() {
  const sc = $('.content')?.scrollTop || 0;
  render();
  if ($('.content')) $('.content').scrollTop = sc;
}
window.addEventListener('hashchange', render);

/* ------------------------------------------------------------------ toasts */
function toast(kind, text, ms = 3800) {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; document.body.appendChild(box); }
  box.classList.toggle('auth-t', !Session.get()?.signedIn);
  const icon = { ok: 'check', warn: 'clock', dan: 'x', info: 'info' }[kind] || 'info';
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.innerHTML = `<div class="ti">${ic(icon, 14)}</div><span>${esc(text)}</span><button class="tx" aria-label="Close">${ic('x', 15)}</button>`;
  t.querySelector('.tx').onclick = () => t.remove();
  box.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

/* ------------------------------------------------------------------ modals */
let modalStack = [];
function openModal(html, opts = {}) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = html;
  if (opts.z) ov.style.zIndex = opts.z;
  ov.addEventListener('mousedown', (e) => { if (e.target === ov && opts.dismiss !== false) closeModal(); });
  document.body.appendChild(ov);
  modalStack.push({ ov, onClose: opts.onClose });
  const first = ov.querySelector('input:not([type=hidden]):not([disabled]), select, textarea');
  if (first && opts.focus !== false) setTimeout(() => first.focus(), 30);
  return ov;
}
function closeModal() {
  const m = modalStack.pop();
  if (!m) return;
  m.ov.remove();
  m.onClose && m.onClose();
}
function closeAllModals() { while (modalStack.length) closeModal(); }
function updateModal(html) { const m = modalStack[modalStack.length - 1]; if (m) m.ov.innerHTML = html; }
const modalFrame = ({ title, sub = '', pill = '', body, foot = '', width = 640, between = false }) => `
  <div class="modal" style="width:${width}px" role="dialog" aria-modal="true">
    <div class="mh"><div><h2>${title} ${pill}</h2>${sub ? `<p>${sub}</p>` : ''}</div>
      <button class="x" onclick="closeModal()" aria-label="Close">${ic('x', 18)}</button></div>
    <div class="mb">${body}</div>
    ${foot ? `<div class="mf ${between ? 'between' : ''}">${foot}</div>` : ''}
  </div>`;

function confirmDialog({ title, text, okText = 'Delete', danger = true }) {
  return new Promise((resolve) => {
    let done = false;
    openModal(modalFrame({
      title, width: 440,
      body: `<p style="margin:0;font-size:14px;line-height:1.5;color:var(--s5)">${text}</p>`,
      foot: `<button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn ${danger ? 'danF' : 'pri'}" id="cfm-ok">${okText}</button>`,
    }), { onClose: () => { if (!done) resolve(false); } });
    $('#cfm-ok').onclick = () => { done = true; closeModal(); resolve(true); };
  });
}

/* close popovers on outside click */
function closeMenus() { $$('.pop[data-temp]').forEach((p) => p.remove()); }
document.addEventListener('mousedown', (e) => { if (!e.target.closest('.pop') && !e.target.closest('[data-menu]')) closeMenus(); });
function popMenu(anchor, items, opts = {}) {
  closeMenus();
  const r = anchor.getBoundingClientRect();
  const m = document.createElement('div');
  m.className = 'pop menu';
  m.dataset.temp = '1';
  m.style.position = 'fixed';
  m.style.top = r.bottom + 6 + 'px';
  m.style.left = Math.max(8, (opts.alignRight ? r.right - 170 : r.left)) + 'px';
  m.innerHTML = items.map((it, i) => `<button data-i="${i}" class="${it.danger ? 'dan' : ''} ${it.on ? 'on' : ''}">${it.icon ? ic(it.icon, 14) : ''}<span style="flex:1">${esc(it.label)}</span>${it.on ? ic('check', 14) : ''}</button>`).join('');
  m.querySelectorAll('button').forEach((b) => (b.onclick = () => { closeMenus(); items[+b.dataset.i].run(); }));
  document.body.appendChild(m);
}

/* ------------------------------------------------------------------ security key + write pattern */
function securityKey() {
  return new Promise((resolve) => {
    if (isSuper()) { resolve(true); return; }
    let done = false;
    openModal(`<div class="modal center" style="width:440px"><div class="mb">
        <div class="keyring"><div>${ic('usb', 32)}</div></div>
        <div><div style="font:600 20px/1.25 var(--f)">Please insert the registered Security Key</div>
        <div style="font:400 14px/1.5 var(--f);color:var(--s5);margin-top:8px">Plug-in your security key and activate it to confirm this action.</div></div>
        <span class="waiting">${ic('fingerprint', 15)}Waiting for your browser prompt…</span>
        <div class="demo-card" style="width:100%;text-align:left"><div class="dh">${ic('sparkles', 13)}Demo</div>
          <div class="dt">No real WebAuthn key is needed. Simulate touching the bound key (YK-5C-2094-7731).</div>
          <div class="row"><button class="demo-btn solid" id="sk-ok">${ic('key-round', 13)}Touch security key</button></div></div>
        <button class="btn sec" id="sk-cancel">Cancel</button>
      </div></div>`, { dismiss: false, z: 300, onClose: () => { if (!done) resolve(false); } });
    $('#sk-ok').onclick = () => { done = true; closeModal(); resolve(true); };
    $('#sk-cancel').onclick = () => { closeModal(); toast('dan', 'Security key cancelled · nothing was submitted'); };
  });
}

/**
 * The portal's write pattern: security key (skipped for SuperAdmin) → approval mode decides whether
 * the change lands now (Success) or waits for a second admin in Approvals (Awaiting Approval).
 *  action: { type, params }          dispatched through Actions[type](params)
 *  mark:   fn(approvalId|null)       marks the entity as pending while it waits (optional)
 *  forceApproval: always go to Approvals (Blocked Dates, on-chain mint/burn)
 */
async function write({ title, module, ref, action, mark, success, pending, forceApproval = false, after }) {
  const ok = await securityKey();
  if (!ok) return false;
  const d = S();
  if (d.demo.approvalMode || forceApproval) {
    const ap = { id: 'AP-' + String(d.seq.ap++).padStart(5, '0'), created: nowStamp(), by: me().name, module, title, ref, action, status: 'pending' };
    d.approvals.unshift(ap);
    mark && mark(ap.id);
    Store.save();
    toast('warn', pending || 'Awaiting Approval · a second admin must approve this change');
  } else {
    runAction(action);
    Store.save();
    toast('ok', success || 'Success');
  }
  after && after();
  refresh();
  return true;
}

const Actions = {};               // filled by module files: Actions[type] = (params) => void
function runAction(action) {
  const fn = Actions[action.type];
  if (!fn) { console.warn('No action handler', action.type); return; }
  fn(action.params || {});
}

/* ------------------------------------------------------------------ small UI builders */
const pill = (t, k = 'n') => `<span class="pill ${k}">${esc(t)}</span>`;
const typePill = (t) => pill(t, t === 'KYC' ? 'info' : t === 'HKGX KYB' ? 'gold' : 'n');
const ST_ICON = { done: 'check', pend: 'clock', wait: 'ellipsis', none: 'minus', fail: 'x' };
const ST_TEXT = { done: 'Done', pend: 'Pending approval', wait: 'Waiting', none: 'Not started', fail: 'Rejected / failed' };
const st = (k) => `<span class="st ${k}" title="${ST_TEXT[k]}">${ic(ST_ICON[k], 13)}</span>`;
const legend = () => `<div class="legend">${Object.keys(ST_TEXT).map((k) => `<span>${st(k)}${ST_TEXT[k]}</span>`).join('')}</div>`;
const mono = (t) => `<span class="mono">${esc(t)}</span>`;
const two = (a, b, m = false) => `<div class="two ${m ? 'mono' : ''}"><b>${esc(a)}</b><small>${esc(b)}</small></div>`;
const kv = (pairs, n = 3) => `<div class="kv" style="grid-template-columns:repeat(${n},minmax(0,1fr))">${pairs.filter(Boolean).map(([k, v, o = {}]) =>
  `<div style="${o.span ? `grid-column:span ${o.span};` : ''}"><span>${esc(k)}</span><b class="${o.mono ? 'mono' : ''}">${o.html ? v : esc(v ?? '—')}</b></div>`).join('')}</div>`;
const card = (title, body, opts = {}) => `<div class="card" ${opts.id ? `id="${opts.id}"` : ''} style="${opts.style || ''}">
  ${title ? `<div class="ch"><h3>${title}</h3>${opts.right || ''}</div>` : ''}${opts.desc ? `<div class="cd">${opts.desc}</div>` : ''}${body}</div>`;
const banner = (k, t, d = '') => `<div class="banner ${k}">${ic({ warn: 'hourglass', ok: 'circle-check', dan: 'circle-alert', info: 'info' }[k], 17)}<div><b>${t}</b>${d ? `<p>${d}</p>` : ''}</div></div>`;
const waitingBanner = () => banner('warn', 'Waiting for approvals', 'This step is waiting for a second admin in Approvals. Actions are hidden until it is decided.');
const doc = (name, meta = '') => `<div class="doc">${ic('file-text', 17)}<div class="fn"><b>${esc(name)}</b>${meta ? `<small>${esc(meta)}</small>` : ''}</div>
  <div class="acts"><button class="link" onclick="previewDoc('${esc(name).replace(/'/g, '')}')">Preview</button><button class="link" onclick="downloadDoc('${esc(name).replace(/'/g, '')}')">Download</button></div></div>`;
const docTag = (name) => `<button class="doctag" onclick="previewDoc('${esc(name).replace(/'/g, '')}')">${ic('file-text', 13)}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(name)}</span></button>`;
const subh = (t) => `<span class="subh">${t}</span>`;
const stepper = (steps, cur, o = {}) => `<div class="stepper">${steps.map(([t, d], i) => {
  const s = o.all || i < cur ? 'done' : i === cur ? (o.fail ? 'fail' : 'now') : 'up';
  return `<div class="s ${s}"><div class="dl"><div class="dot">${s === 'done' ? ic('check', 14) : s === 'fail' ? ic('x', 14) : i + 1}</div>${i < steps.length - 1 ? '<div class="ln"></div>' : ''}</div>
    <div><div class="t">${esc(t)}</div>${d ? `<div class="d">${esc(d)}</div>` : ''}</div></div>`;
}).join('')}</div>`;
const statusCard = (ref, cref, stTxt, k = 'warn') => `<div class="status">
  <div><span>Order Reference ID</span>${mono(ref)}</div><div><span>Order Client Reference ID</span>${mono(cref)}</div><div><span>Order Status</span>${pill(stTxt, k)}</div></div>`;
const backLink = (label, path) => `<a class="back" href="#${path}">${ic('arrow-left', 14)}${esc(label)}</a>`;
const pageHead = (title, sub = '', acts = '', extra = '') => `<div class="ph"><div>${extra}<h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>${acts ? `<div class="acts">${acts}</div>` : ''}</div>`;
const viewBtn = (on, onclick, label = 'View Detail') => `<button class="btn sec sm" ${on ? `onclick="${onclick}"` : 'disabled'}>${label}</button>`;
const demoInline = (html) => `<div class="demo-inline"><b>${ic('sparkles', 12)} Demo</b>${html}</div>`;

/* fields */
function field(id, label, o = {}) {
  const v = o.value ?? '';
  const err = o.err ? `<span class="ferr">${ic('circle-alert', 12)}${esc(o.err)}</span>` : o.hint ? `<span class="hint">${o.hint}</span>` : '';
  let control;
  if (o.options) {
    control = `<select id="${id}" ${o.disabled ? 'disabled' : ''} ${o.onchange ? `onchange="${o.onchange}"` : ''}>${o.placeholder ? `<option value="">${esc(o.placeholder)}</option>` : ''}${o.options.map((op) => {
      const [ov, ol] = Array.isArray(op) ? op : [op, op];
      return `<option value="${esc(ov)}" ${String(ov) === String(v) ? 'selected' : ''}>${esc(ol)}</option>`;
    }).join('')}</select>${ic('chevron-down', 14)}`;
  } else if (o.area) {
    control = `<textarea id="${id}" placeholder="${esc(o.ph || '')}" ${o.disabled ? 'disabled' : ''}>${esc(v)}</textarea>`;
  } else {
    control = `${o.lead ? ic(o.lead, 15) : ''}${o.prefix ? `<span class="muted" style="font-weight:600">${o.prefix}</span>` : ''}<input id="${id}" type="${o.type || 'text'}" value="${esc(v)}" placeholder="${esc(o.ph || '')}" ${o.readonly ? 'readonly' : ''} ${o.disabled ? 'disabled' : ''} ${o.oninput ? `oninput="${o.oninput}"` : ''} ${o.attrs || ''} autocomplete="off">${o.suffix ? `<span class="muted" style="font-size:12px;white-space:nowrap">${o.suffix}</span>` : ''}${o.readonly ? ic('lock', 13) : ''}${o.cal ? ic('calendar', 14) : ''}`;
  }
  return `<div class="field ${o.err ? 'err' : ''}" style="${o.span ? `grid-column:span ${o.span};` : ''}">
    <label for="${id}"><span>${esc(label)}${o.req ? '<span class="req"> *</span>' : ''}</span>${o.labelRight || ''}</label>
    <div class="input ${o.readonly ? 'ro' : ''} ${o.mono ? 'mono' : ''}">${control}</div>${err}</div>`;
}

/* simulated file uploads. FileSlots[key] = { name, size } */
const FileSlots = {};
function dropZone(key, label, o = {}) {
  const f = FileSlots[key];
  const head = label ? `<span class="flabel"><span>${esc(label)}${o.req ? '<span class="req"> *</span>' : ''}</span></span>` : '';
  if (f) {
    return `<div class="field">${head}<div class="file">${ic('file-check-2', 18)}<div class="fn"><b>${esc(f.name)}</b><small>${esc(f.meta || '')}</small></div>
      <div class="acts"><button class="link" onclick="previewDoc('${esc(f.name).replace(/'/g, '')}')">Preview</button><button class="link dan" onclick="removeFile('${key}')">Remove</button></div></div></div>`;
  }
  return `<div class="field">${head}<div class="drop ${o.err ? 'err' : ''}" onclick="pickFile('${key}','${o.accept || '.pdf,.jpg,.jpeg,.png'}')">
      ${ic('cloud-upload', 22)}<b>Drop file here or <span>browse</span></b><small>${esc(o.types || 'PDF')}</small>
    </div>${o.err ? `<span class="ferr">${ic('circle-alert', 12)}${esc(o.err)}</span>` : ''}
    <button class="link" style="align-self:flex-start;font-size:12px" onclick="sampleFile('${key}','${esc(o.sample || 'Sample-document.pdf')}')">${ic('sparkles', 12)}Use demo file</button></div>`;
}
function pickFile(key, accept) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = accept;
  inp.onchange = () => {
    const f = inp.files[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast('dan', 'File is larger than 10 MB'); return; }
    const ext = (f.name.split('.').pop() || '').toUpperCase();
    FileSlots[key] = { name: f.name, meta: `${ext} · ${(f.size / 1048576).toFixed(1)} MB · uploaded just now` };
    refreshModalOrPage();
  };
  inp.click();
}
function sampleFile(key, name) {
  const ext = (name.split('.').pop() || 'pdf').toUpperCase();
  FileSlots[key] = { name, meta: `${ext} · ${(0.3 + Math.random() * 2.5).toFixed(1)} MB · uploaded just now` };
  refreshModalOrPage();
}
function removeFile(key) { delete FileSlots[key]; refreshModalOrPage(); }
let modalRerender = null;   // modules set this while a modal with drop zones is open
function refreshModalOrPage() { if (modalStack.length && modalRerender) modalRerender(); else refresh(); }

function previewDoc(name) {
  openModal(modalFrame({
    title: esc(name), sub: 'Document preview (demo placeholder)', width: 560,
    body: `<div style="border:1px solid var(--line);border-radius:6px;background:var(--bg);height:360px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--s5)">
      ${ic('file-text', 40)}<b style="color:var(--ink)">${esc(name)}</b><span style="font-size:12px">In the live portal the file opens here. This static demo has no stored files.</span></div>`,
    foot: `<button class="btn sec" onclick="closeModal()">Close</button><button class="btn pri" onclick="downloadDoc('${esc(name).replace(/'/g, '')}')">${ic('download', 15)}Download</button>`,
  }), { z: 400 });
}
function downloadDoc(name) {
  const blob = new Blob([`GoldZip Admin Portal demo\n\nPlaceholder for: ${name}\nGenerated ${new Date().toISOString()}\n`], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name.replace(/\.(pdf|jpg|jpeg|png)$/i, '') + '.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* simple paging over arrays */
const Paging = {};
function paged(key, rows, size = 10) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Paging[key] || 1, pages);
  return { rows: rows.slice((p - 1) * size, p * size), p, pages, total: rows.length, size };
}
function pager(key, pg) {
  const from = pg.total ? (pg.p - 1) * pg.size + 1 : 0;
  const to = Math.min(pg.total, pg.p * pg.size);
  const nums = Array.from({ length: pg.pages }, (_, i) => i + 1);
  return `<div class="pager"><span>Showing ${from}–${to} of ${pg.total}</span><div class="pg">
    <button ${pg.p <= 1 ? 'disabled' : ''} onclick="Paging['${key}']=${pg.p - 1};refresh()">‹</button>
    ${nums.map((n) => `<button class="${n === pg.p ? 'on' : ''}" onclick="Paging['${key}']=${n};refresh()">${n}</button>`).join('')}
    <button ${pg.p >= pg.pages ? 'disabled' : ''} onclick="Paging['${key}']=${pg.p + 1};refresh()">›</button></div></div>`;
}
function table(head, rows, o = {}) {
  const body = rows.length ? rows.map((r) => {
    const cells = Array.isArray(r) ? r : r.cells;
    const click = !Array.isArray(r) && r.onclick ? ` class="click" onclick="${r.onclick}"` : '';
    return `<tr${click}>${cells.map((c, i) => `<td class="${(o.align || [])[i] || ''}">${c ?? ''}</td>`).join('')}</tr>`;
  }).join('') : `<tr><td colspan="${head.length}" style="height:auto"><div class="empty">${o.empty || 'No records to display'}</div></td></tr>`;
  return `<div class="tbl ${o.compact ? 'compact' : ''}"><table><thead><tr>${head.map((h, i) => `<th class="${(o.align || [])[i] || ''}">${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>${o.pager || ''}</div>`;
}

/* tabs bound to a UI state key */
const UI = {};   // transient UI state (tabs, filters, edit modes)
function tabs(key, list, onchange = 'refresh()') {
  const cur = UI[key] ?? list[0][0];
  return `<div class="tabs">${list.map(([v, label, n]) => `<button class="${v === cur ? 'on' : ''}" onclick="UI['${key}']='${v}';Paging['${key}']=1;${onchange}">${esc(label)}${n != null ? `<span class="cnt">${n}</span>` : ''}</button>`).join('')}</div>`;
}

/* ------------------------------------------------------------------ idle timeout */
const Idle = {
  limit: 15 * 60 * 1000,     // show "Still there?" after 15 min without input
  grace: 60,                 // seconds on the countdown
  t: null, c: null, open: false,
  reset() {
    if (!Session.get()?.signedIn || this.open) return;
    clearTimeout(this.t);
    this.t = setTimeout(() => this.warn(), this.limit);
  },
  warn(seconds = 42) {
    if (!Session.get()?.signedIn) return;
    this.open = true;
    let left = seconds;
    const fmt = () => `${Math.floor(left / 60)}:${pad2(left % 60)}`;
    openModal(`<div class="modal center" style="width:420px"><div class="mb">
      <div class="ok-ic" style="background:var(--warn-bg);color:var(--warn)">${ic('timer', 28)}</div>
      <div><div style="font:600 20px/1.25 var(--f)">Still there?</div><div style="font-size:14px;color:var(--s5);margin-top:8px;line-height:1.5">You have been idle for some time. You will be logged out soon.</div></div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:center"><span class="muted" style="font-size:12px">Logging out in</span><b id="idle-cd" style="font:600 32px/1 var(--m)">${fmt()}</b></div>
      <div style="display:flex;gap:10px;width:100%"><button class="btn sec full" id="idle-no">No</button><button class="btn pri full" id="idle-yes">Continue</button></div>
    </div></div>`, { dismiss: false, z: 500 });
    clearInterval(this.c);
    this.c = setInterval(() => { left--; const el = $('#idle-cd'); if (el) el.textContent = fmt(); if (left <= 0) this.logout(); }, 1000);
    $('#idle-no').onclick = () => this.logout();
    $('#idle-yes').onclick = () => { clearInterval(this.c); this.open = false; closeModal(); this.reset(); toast('ok', 'Session extended'); };
  },
  logout() { clearInterval(this.c); this.open = false; closeAllModals(); logout('You were logged out after being idle'); },
};
['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'].forEach((ev) => document.addEventListener(ev, () => Idle.reset(), { passive: true, capture: true }));

function logout(msg) {
  Session.clear();
  closeAllModals();
  location.hash = '/login';
  if (msg) setTimeout(() => toast('info', msg), 50);
}
