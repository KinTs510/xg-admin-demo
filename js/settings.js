/* GoldZip Admin Portal — static demo
   settings.js: 08 Settings. Every save / create / edit / delete runs the security key, then Success or Awaiting Approval.
   Old values stay live until a change is approved. Blocked Dates always go to approval. */
'use strict';

const ST = () => S().settings;
UI.edit = UI.edit || {};
const pendingChip = (key) => (ST().pending[key] ? pill('Change pending approval', 'warn') : '');
const editBtns = (key) => {
  if (ST().pending[key]) return pendingChip(key);
  return UI.edit[key] ? `<div style="display:flex;gap:8px"><button class="btn sec sm" onclick="UI.edit['${key}']=false;UI.errs={};refresh()">Cancel</button><button class="btn pri sm" onclick="saveCard('${key}')">Save</button></div>`
    : `<button class="rowmenu" data-menu title="More" onclick="rowMenu(this,[{label:'Edit',icon:'pencil',run:()=>{UI.edit['${key}']=true;refresh();}}])">${ic('ellipsis-vertical', 20)}</button>`;
};
UI.errs = UI.errs || {};
function listPendingRows(list) {
  return S().approvals.filter((a) => a.status === 'pending' && a.action.type === 'set.list' && a.action.params.list === list);
}
async function settingsWrite({ key, title, action, success, force = false }) {
  action.params.key = key;   // the action clears exactly the pending marker it was created with
  return write({
    title, module: 'Settings', ref: title, action, forceApproval: force,
    mark: (ap) => { ST().pending[key] = ap; },
    success: success || 'Success', pending: force ? 'Waiting for approval' : 'Awaiting Approval · old values stay live until approved',
  });
}
Actions['set.value'] = ({ key, field, value }) => { ST()[field] = value; delete ST().pending[key]; };
Actions['set.list'] = ({ key, list, op, item }) => {
  const arr = ST()[list];
  if (op === 'add') arr.push({ ...item, id: Math.max(0, ...arr.map((x) => x.id)) + 1 });
  if (op === 'update') { const i = arr.findIndex((x) => x.id === item.id); if (i >= 0) arr[i] = { ...arr[i], ...item }; }
  if (op === 'delete') ST()[list] = arr.filter((x) => x.id !== item.id);
  delete ST().pending[key];
};
Actions['set.holidays'] = ({ key, list, id, holidays }) => { const loc = ST()[list].find((x) => x.id === id); if (loc) loc.holidays = holidays; delete ST().pending[key]; };

function rowMenu(el, items) { popMenu(el, items, { alignRight: true }); }

/* =============================== General =============================== */
route('/settings/general', {
  group: 'settings', item: 'General', title: 'General Settings',
  render: () => {
    const tab = UI.genTab || 'pay';
    return `${pageHead('General Settings', 'Payment details, gold brands and blocked dates')}
      ${tabs('genTab', [['pay', 'Payment'], ['brand', 'Gold Brand'], ['blocked', 'Blocked Dates']], 'refresh()', 'line')}
      ${tab === 'pay' ? paymentTab() : tab === 'brand' ? brandTab() : blockedTab()}`;
  },
});

/* ---- Payment ---- */
function paymentTab() {
  const s = ST(), e = UI.errs;
  const w = s.wallets.find((x) => x.addr === s.paymentWallet);
  const bankName = (code) => (s.banks.find(([c]) => c === code) || [, '—'])[1];
  const fees = s.fees;
  const feeView = (k, label) => `<div style="flex:1;min-width:240px">${subh(label)}<div style="margin-top:12px">${kv([['Application Fee', fmtN(fees[k].appFee) + ' USDT', { mono: true }], ['Gold Price', fmtN(fees[k].goldPrice) + ' USD/Kg', { mono: true }], ['Fee Rate', fmtN(fees[k].rate) + ' %', { mono: true }]], 3)}</div></div>`;
  const feeEdit = (k, label) => `<div style="flex:1;min-width:240px;display:flex;flex-direction:column;gap:12px">${subh(label)}
    ${field(`fee-${k}-app`, 'Application Fee (USDT)', { req: true, mono: true, value: fmtN(fees[k].appFee), err: e[`fee-${k}-app`] })}
    ${field(`fee-${k}-gp`, 'Gold Price (USD/Kg)', { req: true, mono: true, value: fmtN(fees[k].goldPrice), err: e[`fee-${k}-gp`] })}
    ${field(`fee-${k}-rate`, 'Fee Rate (%)', { req: true, mono: true, value: fmtN(fees[k].rate), err: e[`fee-${k}-rate`] })}</div>`;
  const ex = 3 * fees.supply.goldPrice * (fees.supply.rate / 100);
  return `
    ${card('Payment Wallet', UI.edit.wallet
      ? `<div class="field"><span class="flabel">Account</span>${s.wallets.map((x) => `<label class="signer"><input type="radio" name="pw" value="${esc(x.addr)}" ${x.addr === s.paymentWallet ? 'checked' : ''}><b>${esc(x.name)}</b><small>${esc(x.addr)}</small>${pill(x.tag, x.tag === 'Multisig' ? 'gold' : 'info')}</label>`).join('')}</div>`
      : kv([['Account', `<span class="mono">${esc(s.paymentWallet)}</span> <span class="muted">· ${esc(w?.name || '')} (${esc(w?.tag || '')})</span>`, { html: true }]], 1),
    { desc: 'Designated wallet to receive USDT Transfers for client payments.', right: editBtns('wallet') })}
    ${card('Fee Variables', `<div style="display:flex;gap:28px;flex-wrap:wrap">${UI.edit.fees ? feeEdit('supply', 'Supply') + feeEdit('redemption', 'Redemption') : feeView('supply', 'Supply') + feeView('redemption', 'Redemption')}</div>
      <div class="hint">Formula inferred from the design sample (confirm with backend): Supply fee = weight_kg × gold_price × fee_rate%. Example for 3 kg: ${fmtN(ex)} USDT + ${fmtN(fees.supply.appFee)} application fee = ${fmtN(ex + fees.supply.appFee)} USDT.</div>`,
    { desc: 'Applicable handling fee per kg for issuance and redemption.', right: editBtns('fees') })}
    ${card('Payment Account', UI.edit.bank
      ? `<div class="grid g3">${field('bk-bank', 'Bank', { req: true, options: s.banks.map(([c, n]) => [c, `${n} · ${c}`]), value: s.bank.code, onchange: "document.getElementById('bk-code').value=this.value", span: 2 })}
        ${field('bk-code', 'Bank Code', { readonly: true, value: s.bank.code, hint: 'From the selected bank' })}${field('bk-holder', 'Account Holder Name', { req: true, value: s.bank.holder, err: e['bk-holder'] })}
        ${field('bk-branch', 'Branch Code', { req: true, mono: true, value: s.bank.branch, err: e['bk-branch'] })}${field('bk-acc', 'Account', { req: true, mono: true, value: s.bank.account, err: e['bk-acc'] })}</div>`
      : kv([['Bank', bankName(s.bank.code)], ['Account Holder Name', s.bank.holder.replace(/(\w{5})\w*/g, '$1***')], ['Bank Code', s.bank.code, { mono: true }], ['Branch Code', s.bank.branch, { mono: true }], ['Account', '***-***' + s.bank.account.replace(/\D/g, '').slice(-6, -3) + '-' + s.bank.account.slice(-3), { mono: true }]], 3),
    { desc: 'Account details for cash transfers for client payments.', right: editBtns('bank') })}
    ${demoInline('Edit Fee Variables and type “138k” in a field, then Save, to see “Must be a number”. Turn on Approval mode to see “old values stay live until approved”.')}`;
}
async function saveCard(key) {
  const s = ST(), e = {};
  if (key === 'wallet') {
    const v = document.querySelector('input[name=pw]:checked')?.value;
    UI.edit.wallet = false;
    await settingsWrite({ key, title: 'Payment Wallet', action: { type: 'set.value', params: { key, field: 'paymentWallet', value: v } } });
    return;
  }
  if (key === 'fees') {
    const fees = {};
    for (const k of ['supply', 'redemption']) {
      fees[k] = {};
      [['app', 'appFee'], ['gp', 'goldPrice'], ['rate', 'rate']].forEach(([id, f]) => {
        const v = val(`fee-${k}-${id}`);
        if (!v) e[`fee-${k}-${id}`] = 'Required';
        else if (!isNum(v)) e[`fee-${k}-${id}`] = 'Must be a number';
        fees[k][f] = toNum(v);
      });
    }
    UI.errs = e;
    if (Object.keys(e).length) { refresh(); return; }
    UI.edit.fees = false;
    await settingsWrite({ key, title: 'Fee Variables', action: { type: 'set.value', params: { key, field: 'fees', value: fees } } });
    return;
  }
  if (key === 'bank') {
    const b = { code: val('bk-bank'), holder: val('bk-holder'), branch: val('bk-branch'), account: val('bk-acc') };
    if (!b.holder) e['bk-holder'] = 'Required';
    if (!b.branch) e['bk-branch'] = 'Required'; else if (!/^\d{3}$/.test(b.branch)) e['bk-branch'] = 'Enter a 3-digit branch code';
    if (!b.account) e['bk-acc'] = 'Required';
    UI.errs = e;
    if (Object.keys(e).length) { refresh(); return; }
    UI.edit.bank = false;
    await settingsWrite({ key, title: 'Payment Account', action: { type: 'set.value', params: { key, field: 'bank', value: b } } });
    return;
  }
  if (key === 'escrow') {
    const v = { counterParty: val('es-cp'), broadcaster: val('es-bc') };
    UI.edit.escrow = false;
    await settingsWrite({ key, title: 'Escrow Settings', action: { type: 'set.value', params: { key, field: 'escrow', value: v } } });
  }
}

/* ---- Gold Brand ---- */
function brandTab() {
  const pend = listPendingRows('brands');
  return `<div class="bar" style="justify-content:flex-end"><button class="btn pri" onclick="brandModal()">${ic('plus', 15)}Create Brand</button></div>
    ${pend.length ? banner('warn', `${pend.length} brand change(s) waiting for approval`, 'The list below shows the live values until each change is approved in Approvals.') : ''}
    ${table(['No.', 'Name of Brand', 'Country of Origin', 'Refinery Address', ''], ST().brands.map((b, i) => [mono(i + 1), `<b>${esc(b.name)}</b> ${pendingChip('brands:' + b.id)}`, esc(b.country), esc(b.address),
      ST().pending['brands:' + b.id] ? '' : `<button class="rowmenu" data-menu onclick="rowMenu(this,[{label:'Edit',icon:'pencil',run:()=>brandModal(${b.id})},{label:'Delete',icon:'trash-2',danger:true,run:()=>deleteItem('brands',${b.id},'Delete GoldBrand')}])">${ic('ellipsis-vertical', 16)}</button>`]),
    { noAction: true, align: ['', '', '', '', 'r'] })}<div class="hint">Used by the Brand dropdown in Redemption → Vault Management and the supply bar lists.</div>`;
}
function brandModal(id, errs = {}, vals) {
  const b = vals || (id ? ST().brands.find((x) => x.id === id) : { name: '', country: '', address: '' });
  const html = modalFrame({
    title: id ? 'Edit Gold Brand' : 'New Gold Brand', width: 520,
    body: `${subh('Basic Information')}${field('gb-name', 'Name of Brand', { req: true, value: b.name, err: errs.name })}
      ${field('gb-country', 'Country', { req: true, value: b.country, err: errs.country, options: ['', 'Australia', 'Canada', 'China', 'Germany', 'Hong Kong SAR', 'Japan', 'Singapore', 'South Africa', 'Switzerland', 'United Kingdom', 'United States'].map((c) => [c, c || 'Select country']) })}
      ${field('gb-addr', 'Refinery Address', { req: true, value: b.address, err: errs.address, area: true })}
      ${id ? '' : demoInline(`<button class="demo-btn" onclick="brandModal(null,{},{name:'Royal Canadian Mint',country:'Canada',address:'320 Sussex Drive, Ottawa, ON K1A 0G8, Canada'})">Fill demo brand</button>`)}`,
    foot: `<button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn pri" onclick="saveBrand(${id || 'null'})">Confirm</button>`,
  });
  if (modalStack.length) updateModal(html); else openModal(html);
}
async function saveBrand(id) {
  const item = { name: val('gb-name'), country: val('gb-country'), address: val('gb-addr') };
  const e = {};
  ['name', 'country', 'address'].forEach((k) => { if (!item[k]) e[k] = 'Required'; });
  if (Object.keys(e).length) { brandModal(id, e, item); return; }
  closeModal();
  if (id) item.id = id;
  await settingsWrite({ key: 'brands:' + (id || 'new-' + Date.now()), title: id ? `Edit Gold Brand · ${item.name}` : `New Gold Brand · ${item.name}`, action: { type: 'set.list', params: { key: 'brands:' + (id || 'new'), list: 'brands', op: id ? 'update' : 'add', item } }, success: id ? 'Success · brand updated' : 'Success · brand added' });
}
async function deleteItem(list, id, title) {
  const ok = await confirmDialog({ title, text: 'Please double check all the details. It may affect to receiving process.', okText: 'Delete' });
  if (!ok) return;
  const item = ST()[list].find((x) => x.id === id);
  await settingsWrite({ key: `${list}:${id}`, title: `${title} · ${item.name}`, action: { type: 'set.list', params: { key: `${list}:${id}`, list, op: 'delete', item: { id } } }, success: 'Success · deleted' });
}

/* ---- Blocked Dates ---- */
UI.hol = UI.hol || {};
function blockedTab() {
  const sub = UI.bdTab || 'depositLocations';
  const locs = ST()[sub];
  return `<div class="seg">${[['depositLocations', 'Deposit Location'], ['redemptionLocations', 'Redemption Location']].map(([k, l]) => `<button class="${sub === k ? 'on' : ''}" onclick="UI.bdTab='${k}';refresh()">${l}</button>`).join('')}</div>
    <div>${locs.map((l, i) => holidayAcc(sub, l, i)).join('')}</div>
    <div class="hint">Clients cannot pick these dates for hand-over (deposit) or collection (redemption). Saving always goes to approval.</div>`;
}
function holidayAcc(list, l, i) {
  const key = `hol:${list}:${l.id}`;
  const open = UI.hol[key + ':open'] ?? i === 0;
  const editing = UI.hol[key];
  let body = '';
  if (open) {
    if (ST().pending[key]) body = `${banner('warn', 'Waiting for approval', 'The holiday list below stays live until the change is approved.')}`;
    if (editing) {
      body += `${editing.map((h, j) => `<div class="grid" style="grid-template-columns:minmax(0,1fr) 200px 40px;align-items:start">
          ${field(`hn-${j}`, j ? '' : 'Name', { value: h.name, ph: 'Input Name', err: h.eName, oninput: `UI.hol['${key}'][${j}].name=this.value` })}
          ${field(`hd-${j}`, j ? '' : 'Date', { type: 'date', value: h.date, err: h.eDate, attrs: `onchange="UI.hol['${key}'][${j}].date=this.value"` })}
          <button class="rowmenu" style="margin-top:${j ? 4 : 24}px" onclick="UI.hol['${key}'].splice(${j},1);refresh()">${ic('trash-2', 15)}</button></div>`).join('')}
        <div style="display:flex;justify-content:space-between;gap:8px"><button class="btn sec sm" onclick="UI.hol['${key}'].push({name:'',date:''});refresh()">${ic('plus', 14)}Add</button>
        <div style="display:flex;gap:8px"><button class="btn sec sm" onclick="delete UI.hol['${key}'];refresh()">Cancel</button><button class="btn pri sm" onclick="saveHolidays('${list}',${l.id})">Save</button></div></div>`;
    } else {
      body += l.holidays.length ? table(['Name', 'Date'], l.holidays.map((h) => [esc(h.name), mono(h.date)]), { compact: true }) : `<div class="empty" style="padding:16px">Holiday hasn't been set up</div>`;
      if (!ST().pending[key]) body += `<div><button class="btn sec sm" onclick="editHolidays('${list}',${l.id})">${ic('pencil', 13)}Edit list</button></div>`;
    }
  }
  return `<div class="acc"><div class="ah" onclick="UI.hol['${key}:open']=${!open};refresh()"><span class="no">${pad2(i + 1)}</span><b>${esc(l.name)}</b><span class="muted" style="font-size:12px">No. of Holiday</span><span class="chip">${l.holidays.length}</span>${pendingChip(key)}${ic(open ? 'chevron-up' : 'chevron-down', 16)}</div>
    ${open ? `<div class="ab">${body}</div>` : ''}</div>`;
}
const dmy2iso = (d) => { const [a, b, c] = d.split('-'); return `${c}-${b}-${a}`; };
const iso2dmy = (d) => { const [a, b, c] = d.split('-'); return `${c}-${b}-${a}`; };
function editHolidays(list, id) {
  const l = ST()[list].find((x) => x.id === id);
  UI.hol[`hol:${list}:${id}`] = l.holidays.map((h) => ({ name: h.name, date: dmy2iso(h.date) }));
  if (!l.holidays.length) UI.hol[`hol:${list}:${id}`].push({ name: '', date: '' });
  refresh();
}
async function saveHolidays(list, id) {
  const key = `hol:${list}:${id}`;
  const rows = UI.hol[key];
  let bad = false;
  rows.forEach((h) => { h.eName = h.name.trim() ? '' : 'Name is required'; h.eDate = h.date ? '' : 'Date is required'; if (h.eName || h.eDate) bad = true; });
  if (bad) { refresh(); return; }
  const holidays = rows.map((h) => ({ name: h.name.trim(), date: iso2dmy(h.date) })).sort((a, b) => dmy2iso(a.date).localeCompare(dmy2iso(b.date)));
  delete UI.hol[key];
  const l = ST()[list].find((x) => x.id === id);
  await settingsWrite({ key, title: `Blocked Dates · ${l.name}`, force: true, action: { type: 'set.holidays', params: { key, list, id, holidays } } });
}

/* =============================== Deposit =============================== */
route('/settings/deposit', {
  group: 'settings', item: 'Deposit', title: 'Deposit Settings',
  render: () => {
    const tab = UI.depTab || 'loc';
    const s = ST();
    const pend = listPendingRows(tab === 'loc' ? 'depositLocations' : 'methods');
    return `${pageHead('Deposit Settings', 'Where and how suppliers deliver gold', `<button class="btn pri" data-menu onclick="popMenu(this,[{label:'New Location',icon:'map-pin',run:()=>go('/settings/deposit/location/new')},{label:'New Method',icon:'truck',run:()=>methodModal()}],{alignRight:true})">${ic('plus', 15)}Create New${ic('chevron-down', 14)}</button>`)}
      ${tabs('depTab', [['loc', 'Location'], ['method', 'Method']], 'refresh()', 'line')}
      ${pend.length ? banner('warn', `${pend.length} change(s) waiting for approval`, 'Live values are shown until each change is approved.') : ''}
      ${tab === 'loc'
    ? table(['No.', 'Location Name', 'Address', 'Country', 'Method', ''], s.depositLocations.map((l, i) => [mono(i + 1), `<b>${esc(l.name)}</b> ${pendingChip('depositLocations:' + l.id)}`, esc(`${l.street}, ${l.city}`), esc(l.country), esc(l.methods.join(', ')),
      s.pending['depositLocations:' + l.id] ? '' : `<button class="rowmenu" data-menu onclick="rowMenu(this,[{label:'Details',icon:'eye',run:()=>go('/settings/deposit/location/${l.id}?view=1')},{label:'Edit',icon:'pencil',run:()=>go('/settings/deposit/location/${l.id}')},{label:'Delete',icon:'trash-2',danger:true,run:()=>deleteItem('depositLocations',${l.id},'Delete Location')}])">${ic('ellipsis-vertical', 16)}</button>`]), { noAction: true, align: ['', '', '', '', '', 'r'] })
    : table(['No.', 'Method', ''], s.methods.map((m, i) => [mono(i + 1), `<b>${esc(m.name)}</b> ${pendingChip('methods:' + m.id)}`,
      s.pending['methods:' + m.id] ? '' : `<button class="rowmenu" data-menu onclick="rowMenu(this,[{label:'Edit',icon:'pencil',run:()=>methodModal(${m.id})},{label:'Delete',icon:'trash-2',danger:true,run:()=>deleteItem('methods',${m.id},'Delete Method')}])">${ic('ellipsis-vertical', 16)}</button>`]), { noAction: true, align: ['', '', 'r'] })}
      <div class="hint">Suppliers pick a location and method when they create a supply order. That choice feeds “Gold Drop-Off Logistics” in Supply Management.</div>`;
  },
});
function methodModal(id, err = '', v) {
  const m = id ? ST().methods.find((x) => x.id === id) : { name: '' };
  const html = modalFrame({ title: id ? 'Edit Method' : 'New Method', width: 460,
    body: `${subh('Basic Information')}${field('mt-name', 'Method Name', { req: true, value: v ?? m.name, err })}${id ? '' : demoInline(`<button class="demo-btn" onclick="methodModal(null,'','Courier Delivery')">Fill demo method</button>`)}`,
    foot: `<button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn pri" onclick="saveMethod(${id || 'null'})">Confirm</button>` });
  if (modalStack.length) updateModal(html); else openModal(html);
}
async function saveMethod(id) {
  const name = val('mt-name');
  if (!name) { methodModal(id, 'Required', name); return; }
  closeModal();
  await settingsWrite({ key: 'methods:' + (id || 'new-' + Date.now()), title: `${id ? 'Edit' : 'New'} Method · ${name}`, action: { type: 'set.list', params: { key: 'methods:' + (id || 'new'), list: 'methods', op: id ? 'update' : 'add', item: id ? { id, name } : { name } } }, success: id ? 'Success · method updated' : 'Success · method added' });
}

/* Deposit location form page */
UI.dl = {};
route('/settings/deposit/location/:id', {
  group: 'settings', item: 'Deposit', title: 'Location',
  render: ({ id, view }) => {
    const isNew = id === 'new';
    const l = isNew ? { name: '', street: '', city: '', country: 'Hong Kong SAR', postal: '', methods: [] } : ST().depositLocations.find((x) => String(x.id) === id);
    if (!l) return `${backLink('Deposit Settings', '/settings/deposit')}<div class="tbl"><div class="empty">Location not found.</div></div>`;
    const f = UI.dl[id] || clone(l), e = f.errors || {};
    UI.dl[id] = f;
    const ro = !!view;
    return `${backLink('Location', '/settings/deposit')}${pageHead(isNew ? 'New Location' : ro ? esc(l.name) : `Edit · ${esc(l.name)}`, 'Suppliers choose this drop-off location when they create a supply order',
      ro ? `<a class="btn sec" href="#/settings/deposit/location/${id}">${ic('pencil', 14)}Edit</a>` : `<a class="btn sec" href="#/settings/deposit" onclick="delete UI.dl['${id}']">Cancel</a><button class="btn pri" onclick="saveDepLoc('${id}')">Confirm</button>`)}
      ${card('Basic Information', `<div class="grid g2">${field('dl-name', 'Location Name', { req: true, value: f.name, err: e.name, readonly: ro, span: 2 })}
        ${field('dl-street', 'Street', { req: true, value: f.street, err: e.street, readonly: ro })}${field('dl-city', 'City', { req: true, value: f.city, err: e.city, readonly: ro })}
        ${ro ? field('dl-country', 'Country', { readonly: true, value: f.country }) : field('dl-country', 'Country', { req: true, value: f.country, options: ['Hong Kong SAR', 'Macau SAR', 'Singapore', 'China'] })}${field('dl-postal', 'Postal Code', { value: f.postal, ph: 'Optional', readonly: ro })}</div>`)}
      ${card('Method', `<div class="hint" style="margin-top:-8px">Delivery methods suppliers can use at this location.</div>
        <div class="days">${ST().methods.map((m) => `<label><input type="checkbox" class="dl-m" value="${esc(m.name)}" ${f.methods.includes(m.name) ? 'checked' : ''} ${ro ? 'disabled' : ''}>${esc(m.name)}</label>`).join('')}</div>
        ${e.methods ? `<span class="ferr">${ic('circle-alert', 12)}${e.methods}</span>` : ''}`)}
      ${isNew ? demoInline(`<button class="demo-btn" onclick="UI.dl.new={name:'Loomis Vault · Chai Wan',street:'28 Lee Chung Street',city:'Hong Kong',country:'Hong Kong SAR',postal:'',methods:['Pay by Sender','Armoured Transport']};refresh()">Fill demo location</button>`) : ''}`;
  },
});
async function saveDepLoc(id) {
  const f = { name: val('dl-name'), street: val('dl-street'), city: val('dl-city'), country: val('dl-country'), postal: val('dl-postal'), methods: $$('.dl-m:checked').map((x) => x.value) };
  const e = {};
  ['name', 'street', 'city', 'country'].forEach((k) => { if (!f[k]) e[k] = 'Required'; });
  if (!f.methods.length) e.methods = 'Select at least one method';
  UI.dl[id] = { ...f, errors: e };
  if (Object.keys(e).length) { refresh(); return; }
  const isNew = id === 'new';
  const item = isNew ? { ...f, holidays: [] } : { ...f, id: +id };
  delete UI.dl[id];
  go('/settings/deposit');
  await settingsWrite({ key: 'depositLocations:' + (isNew ? 'new-' + Date.now() : id), title: `${isNew ? 'New' : 'Edit'} Location · ${f.name}`, action: { type: 'set.list', params: { key: 'depositLocations:' + id, list: 'depositLocations', op: isNew ? 'add' : 'update', item } }, success: isNew ? 'Success · location added' : 'Success · location updated' });
}

/* =============================== Redemption =============================== */
route('/settings/redemption', {
  group: 'settings', item: 'Redemption', title: 'Redemption Settings',
  render: () => {
    const tab = UI.rsTab || 'escrow';
    const s = ST();
    const create = tab === 'loc' ? `<a class="btn pri" href="#/settings/redemption/location/new">${ic('plus', 15)}Create New</a>` : tab === 'prod' ? `<a class="btn pri" href="#/settings/redemption/product/new">${ic('plus', 15)}Create New</a>` : '';
    let body;
    if (tab === 'escrow') {
      const name = (a) => (s.escrowWallets.find((w) => w.addr === a) || {}).name || '';
      body = card('Escrow Settings', UI.edit.escrow
        ? `<div class="grid g2">${field('es-cp', 'Counter Party Address', { req: true, options: s.escrowWallets.map((w) => [w.addr, `${w.name} · ${w.addr}`]), value: s.escrow.counterParty, hint: 'Escrow taker wallet' })}
          ${field('es-bc', 'Broadcasting Address', { req: true, options: s.escrowWallets.map((w) => [w.addr, `${w.name} · ${w.addr}`]), value: s.escrow.broadcaster, hint: 'Pays gas fees for escrow transactions' })}</div>`
        : kv([['Counter Party Address', `<span class="mono">${esc(s.escrow.counterParty)}</span> <span class="muted">· ${esc(name(s.escrow.counterParty))}</span>`, { html: true }], ['Broadcasting Address', `<span class="mono">${esc(s.escrow.broadcaster)}</span> <span class="muted">· ${esc(name(s.escrow.broadcaster))}</span>`, { html: true }]], 2),
      { desc: 'Assign a ‘counter party address’ for escrow transactions and a ‘broadcasting address’ for all gas fees for escrow transactions.', right: editBtns('escrow') });
    } else if (tab === 'loc') {
      body = table(['No.', 'Location Name', 'Address', 'Country', 'Lead Days', 'Collection Date', ''], s.redemptionLocations.map((l, i) => [mono(i + 1), `<b>${esc(l.name)}</b> ${pendingChip('redemptionLocations:' + l.id)}`, esc(`${l.street}, ${l.city}`), esc(l.country), mono('T+' + l.lead),
        l.picked.length ? `<div class="two mono"><b>${esc(l.picked[0])}</b>${l.picked.length > 1 ? `<small>+${l.picked.length - 1} more</small>` : ''}</div>` : '<span class="muted">—</span>',
        s.pending['redemptionLocations:' + l.id] ? '' : `<button class="rowmenu" data-menu onclick="rowMenu(this,[{label:'Edit',icon:'pencil',run:()=>go('/settings/redemption/location/${l.id}')},{label:'Delete',icon:'trash-2',danger:true,run:()=>deleteItem('redemptionLocations',${l.id},'Delete Location')}])">${ic('ellipsis-vertical', 16)}</button>`]), { noAction: true, align: ['', '', '', '', '', '', 'r'] })
        + `<div class="hint">Lead Days (T+N): the earliest collection date a client can pick is N working days after the order is created. This applies on top of the location's Blocked Dates. Collection Date shows the next date a client picked under Redemption.</div>`;
    } else {
      body = table(['No.', 'Type', 'Name', 'Weight(g)', ''], s.productTypes.map((p, i) => [mono(i + 1), pill(p.type, p.type === 'Bar' ? 'gold' : 'info'), `<b>${esc(p.name)}</b> ${pendingChip('productTypes:' + p.id)}`, mono(Number(p.weight).toLocaleString('en-US', { maximumFractionDigits: 4 })),
        s.pending['productTypes:' + p.id] ? '' : `<button class="rowmenu" data-menu onclick="rowMenu(this,[{label:'Edit',icon:'pencil',run:()=>go('/settings/redemption/product/${p.id}')},{label:'Delete',icon:'trash-2',danger:true,run:()=>deleteItem('productTypes',${p.id},'Delete Product Type')}])">${ic('ellipsis-vertical', 16)}</button>`]), { noAction: true, align: ['', '', '', '', 'r'] })
        + `<div class="hint">Clients choose from these product types when they create a redemption order.</div>`;
    }
    const pend = tab === 'loc' ? listPendingRows('redemptionLocations') : tab === 'prod' ? listPendingRows('productTypes') : [];
    return `${pageHead('Redemption Settings', 'Escrow wallets, pick-up locations and product types', create)}
      ${tabs('rsTab', [['escrow', 'Escrow Settings'], ['loc', 'Redemption Location'], ['prod', 'Product Type']], 'refresh()', 'line')}
      ${pend.length ? banner('warn', `${pend.length} change(s) waiting for approval`, 'Live values are shown until each change is approved.') : ''}${body}`;
  },
});

/* Redemption location form with lead days preview + time slots */
UI.rl = {};
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TZS = ['(UTC+08:00) Hong Kong', '(UTC+08:00) Singapore', '(UTC+09:00) Tokyo', '(UTC+04:00) Dubai', '(UTC+00:00) London', '(UTC−05:00) New York'];
function leadPreview(f) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const hol = new Set((f.holidays || []).map((h) => dmy2iso(h.date)));
  const isWork = (d) => f.days.includes(DOW[d.getDay()]) && !hol.has(d.toISOString().slice(0, 10));
  let n = 0; const lead = Math.max(0, parseInt(f.lead, 10) || 0);
  const cells = [];
  let first = null;
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    let cls = '';
    if (!f.days.includes(DOW[d.getDay()])) cls = 'closed';
    else if (hol.has(d.toISOString().slice(0, 10))) cls = 'closed';
    else if (n < lead) { cls = 'blk'; n++; } else if (!first) { cls = 'first'; first = d; }
    cells.push(`<div class="${cls}"><small>${DOW[d.getDay()]}</small>${d.getDate()}</div>`);
  }
  const fmt = (d) => `${DOW[d.getDay()]} ${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
  return `<div class="field"><span class="flabel">Preview · order created ${fmt(start)}</span><div class="cal">${cells.join('')}</div>
    <span class="hint">Grey = blocked by T+${lead} · light = closed day / holiday · green = ${first ? 'first pickable ' + fmt(first) : 'no pickable day in the next 7 days'}</span></div>`;
}
const hhmm = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
function validateSlots(slots) {
  const errs = slots.map(() => '');
  slots.forEach(([a, b], i) => {
    if (!hhmm(a) || !hhmm(b)) errs[i] = 'Enter both times as HH:MM';
    else if (b <= a) errs[i] = 'End time must be later than start time';
  });
  slots.forEach(([a, b], i) => {
    if (errs[i]) return;
    for (let j = 0; j < i; j++) {
      if (errs[j]) continue;
      const [c, d] = slots[j];
      if (a < d && c < b) { errs[i] = `Overlaps with slot ${pad2(j + 1)}`; break; }
    }
  });
  return errs;
}
route('/settings/redemption/location/:id', {
  group: 'settings', item: 'Redemption', title: 'Redemption Location',
  render: ({ id }) => {
    const isNew = id === 'new';
    const src = isNew ? { name: '', street: '', city: '', country: 'Hong Kong SAR', postal: '', lead: 2, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], tz: TZS[0], slots: [['10:00', '12:00']], holidays: [], picked: [] } : ST().redemptionLocations.find((x) => String(x.id) === id);
    if (!src) return `${backLink('Redemption Location', '/settings/redemption')}<div class="tbl"><div class="empty">Location not found.</div></div>`;
    const f = UI.rl[id] || (UI.rl[id] = clone(src));
    const e = f.errors || {};
    const slotErr = f.slotErr || [];
    return `${backLink('Redemption Location', '/settings/redemption')}
      ${pageHead(isNew ? 'New Redemption Location' : `Edit · ${esc(src.name)}`, isNew ? 'Clients choose this location when they create a redemption order' : 'Changes apply to new orders once approved',
        `<a class="btn sec" href="#/settings/redemption" onclick="delete UI.rl['${id}']">Cancel</a><button class="btn pri" onclick="saveRedLoc('${id}')">${isNew ? 'Confirm' : 'Save'}</button>`)}
      <div class="detail" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><div>
      ${card('Basic Information', `<div class="grid g2">${field('rl-name', 'Location Name', { req: true, value: f.name, err: e.name, span: 2, oninput: `UI.rl['${id}'].name=this.value` })}
        ${field('rl-street', 'Street', { req: true, value: f.street, err: e.street, oninput: `UI.rl['${id}'].street=this.value` })}${field('rl-city', 'City', { req: true, value: f.city, err: e.city, oninput: `UI.rl['${id}'].city=this.value` })}
        ${field('rl-country', 'Country', { req: true, value: f.country, options: ['Hong Kong SAR', 'Macau SAR', 'Singapore', 'China'], onchange: `UI.rl['${id}'].country=this.value` })}${field('rl-postal', 'Postal Code', { value: f.postal, ph: 'Optional', oninput: `UI.rl['${id}'].postal=this.value` })}</div>`)}
      ${card('Collection Time Slots', `<div class="hint" style="margin-top:-8px">24-hour time, HH:MM. Clients pick one slot per order.</div>
        ${f.slots.map(([a, b], i) => `<div class="slot"><span class="no">${pad2(i + 1)}</span>
          <div class="input mono ${slotErr[i] ? 'err' : ''}">${ic('clock', 14)}<input value="${esc(a)}" placeholder="HH:MM" oninput="UI.rl['${id}'].slots[${i}][0]=this.value"></div><span class="muted">–</span>
          <div class="input mono ${slotErr[i] ? 'err' : ''}">${ic('clock', 14)}<input value="${esc(b)}" placeholder="HH:MM" oninput="UI.rl['${id}'].slots[${i}][1]=this.value"></div>
          <button class="rowmenu" onclick="UI.rl['${id}'].slots.splice(${i},1);UI.rl['${id}'].slotErr=[];refresh()" ${f.slots.length < 2 ? 'disabled' : ''}>${ic('trash-2', 15)}</button>
          ${slotErr[i] ? `<span class="ferr">${ic('circle-alert', 12)}${slotErr[i]}</span>` : '<span></span>'}</div>`).join('')}
        <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><button class="btn sec sm" onclick="UI.rl['${id}'].slots.push(['','']);refresh()">${ic('plus', 14)}Add time slot</button>
        <button class="demo-btn" onclick="UI.rl['${id}'].slots=[['10:00','12:00'],['14:00','13:00'],['1600',''],['11:00','13:00']];refresh()">${ic('sparkles', 13)}Load invalid slots (demo)</button></div>`)}
      </div><div>
      ${card('Collection Date Setting', `${field('rl-lead', 'Lead Days (T+N)', { req: true, prefix: 'T+', suffix: 'working days', value: f.lead, err: e.lead, type: 'number', attrs: 'min="0" max="30"', oninput: `UI.rl['${id}'].lead=this.value`, hint: 'Hong Kong default T+2. Dates earlier than T+N are blocked for clients.' })}
        <div style="display:flex;justify-content:flex-end;margin-top:-8px"><button class="link" onclick="refresh()">${ic('refresh-cw', 12)}Update preview</button></div>
        ${leadPreview(f)}
        <div class="field"><span class="flabel"><span>Collection Days<span class="req"> *</span></span></span><div class="days">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<label><input type="checkbox" ${f.days.includes(d) ? 'checked' : ''} onchange="UI.rl['${id}'].days=this.checked?[...UI.rl['${id}'].days,'${d}']:UI.rl['${id}'].days.filter(x=>x!=='${d}');refresh()">${d}</label>`).join('')}</div>
          ${e.days ? `<span class="ferr">${ic('circle-alert', 12)}${e.days}</span>` : ''}</div>
        ${field('rl-tz', 'Time Zone', { req: true, options: TZS, value: f.tz, onchange: `UI.rl['${id}'].tz=this.value`, hint: 'Collection times are shown to clients in this time zone' })}`)}
      </div></div>
      ${isNew ? demoInline(`<button class="demo-btn" onclick="UI.rl.new={...UI.rl.new,name:'Loomis Vault · Chai Wan',street:'28 Lee Chung Street',city:'Hong Kong',slots:[['10:00','12:00'],['12:00','14:00'],['14:00','16:00'],['16:00','18:00']],errors:{},slotErr:[]};refresh()">Fill demo location</button>`) : ''}`;
  },
});
async function saveRedLoc(id) {
  const f = UI.rl[id];
  ['name', 'street', 'city', 'postal'].forEach((k) => { const el = document.getElementById('rl-' + k); if (el) f[k] = el.value.trim(); });
  f.lead = val('rl-lead');
  const e = {};
  ['name', 'street', 'city'].forEach((k) => { if (!f[k]) e[k] = 'Required'; });
  if (f.lead === '' || !/^\d+$/.test(String(f.lead))) e.lead = 'Enter a whole number of working days';
  if (!f.days.length) e.days = 'Pick at least one collection day';
  const slotErr = validateSlots(f.slots);
  const bad = slotErr.filter(Boolean).length;
  f.errors = e; f.slotErr = slotErr;
  if (Object.keys(e).length || bad) { refresh(); if (bad) toast('dan', `Fix ${bad} time slot${bad > 1 ? 's' : ''} before saving`); return; }
  const isNew = id === 'new';
  const item = { name: f.name, street: f.street, city: f.city, country: f.country, postal: f.postal, lead: +f.lead, days: f.days, tz: f.tz, slots: f.slots.slice().sort((a, b) => a[0].localeCompare(b[0])) };
  if (isNew) Object.assign(item, { holidays: [], picked: [] }); else item.id = +id;
  delete UI.rl[id];
  go('/settings/redemption');
  UI.rsTab = 'loc';
  await settingsWrite({ key: 'redemptionLocations:' + (isNew ? 'new-' + Date.now() : id), title: `${isNew ? 'New' : 'Edit'} Redemption Location · ${item.name}`, action: { type: 'set.list', params: { key: 'redemptionLocations:' + id, list: 'redemptionLocations', op: isNew ? 'add' : 'update', item } }, success: isNew ? 'Success · location added' : 'Success · location updated' });
}

/* Product type form */
UI.pt = {};
route('/settings/redemption/product/:id', {
  group: 'settings', item: 'Redemption', title: 'Product Type',
  render: ({ id }) => {
    const isNew = id === 'new';
    const src = isNew ? { type: 'Bar', name: '', weight: '' } : ST().productTypes.find((x) => String(x.id) === id);
    if (!src) return `${backLink('Product Type', '/settings/redemption')}<div class="tbl"><div class="empty">Product type not found.</div></div>`;
    const f = UI.pt[id] || (UI.pt[id] = clone(src));
    const e = f.errors || {};
    return `${backLink('Product Type', '/settings/redemption')}
      ${pageHead(isNew ? 'New Product Type' : `Edit · ${esc(src.name)}`, 'Clients choose from these product types when they create a redemption order', `<a class="btn sec" href="#/settings/redemption" onclick="delete UI.pt['${id}']">Cancel</a><button class="btn pri" onclick="saveProduct('${id}')">Confirm</button>`)}
      ${card('Basic Information', `<div class="grid g3">${field('pt-type', 'Type', { req: true, options: ['Bar', 'Coin'], value: f.type })}${field('pt-name', 'Name', { req: true, value: f.name, err: e.name })}
        ${field('pt-weight', 'Weight(g)', { req: true, mono: true, value: f.weight, err: e.weight, hint: 'Grams per unit, e.g. 250 or 31.1035' })}</div>`)}
      ${isNew ? demoInline(`<button class="demo-btn" onclick="UI.pt.new={type:'Bar',name:'250 g bar',weight:'250'};refresh()">Fill demo product</button><button class="demo-btn" onclick="UI.pt.new={type:'Bar',name:'250 g bar',weight:'250g'};refresh()">Fill “250g” (not a number)</button>`) : ''}`;
  },
});
async function saveProduct(id) {
  const f = { type: val('pt-type'), name: val('pt-name'), weight: val('pt-weight') };
  const e = {};
  if (!f.name) e.name = 'Required';
  if (!f.weight) e.weight = 'Required'; else if (!isNum(f.weight) || toNum(f.weight) <= 0) e.weight = 'Enter a number';
  UI.pt[id] = { ...f, errors: e };
  if (Object.keys(e).length) { refresh(); if (e.weight === 'Enter a number') toast('dan', 'Weight(g) must be a number'); return; }
  const isNew = id === 'new';
  delete UI.pt[id];
  go('/settings/redemption');
  UI.rsTab = 'prod';
  await settingsWrite({ key: 'productTypes:' + (isNew ? 'new-' + Date.now() : id), title: `${isNew ? 'New' : 'Edit'} Product Type · ${f.name}`, action: { type: 'set.list', params: { key: 'productTypes:' + id, list: 'productTypes', op: isNew ? 'add' : 'update', item: isNew ? f : { ...f, id: +id } } }, success: isNew ? 'Success · product type added' : 'Success · product type updated' });
}
