/* GoldZip Admin Portal — static demo
   supply.js: 06 Supply Management (gold in → XGZ minted). 1 g of gold deposited = 1 XGZ minted. */
'use strict';

const SO_STAGES = ['countersign', 'vault', 'testing', 'inspection', 'result', 'issue', 'issuing', 'completed'];
const SO_STATUS = {
  countersign: ['Countersign Pending', 'warn'], vault: ['Pending Vault Summary', 'warn'], testing: ['Testing Application', 'warn'],
  inspection: ['Assay Inspection in Progress', 'info'], result: ['Assay Result', 'warn'], issue: ['Issue Request', 'warn'], issuing: ['Issuing Token', 'info'],
  completed: ['Completed', 'ok'], failed: ['Failed · Assay', 'dan'], rejected: ['Rejected', 'dan'],
};
const soIdx = (o) => (o.stage === 'failed' ? 5 : o.stage === 'rejected' ? 0.5 : SO_STAGES.indexOf(o.stage));
const grams = (o) => o.bars.reduce((a, b) => a + Number(b.qty), 0);
function soStatus(o) {
  if (o.stage === 'rejected') return o.refund ? ['Rejected · Refunded', 'dan'] : [o.kyb === 'Rejected' ? 'Rejected · KYB' : 'Rejected', 'dan'];
  return SO_STATUS[o.stage];
}
/* list icon for a workflow step index */
function soStep(o, step) {
  if (step === -1) return 'done';                         // client submission
  if (o.stage === 'rejected') return step === 0 ? 'fail' : 'wait';
  if (o.stage === 'failed') return step < 4 ? 'done' : step === 4 ? 'fail' : 'wait';
  const i = soIdx(o);
  if (step < i) return 'done';
  if (step === i) return o.pending ? 'pend' : (step === 0 && !o.fee.valid ? 'wait' : 'none');
  return 'wait';
}

/* ---------------- shared cards ---------------- */
const coInfo = (o) => CO[o.co];
function soBasicCard(o) {
  const c = coInfo(o);
  return card('Basic Information', `${subh('Incoming Supplier')}${kv([['Business Name', c.business], ['Email', c.email], ['Phone', c.phone, { mono: true }], ['Reference ID', c.ref, { mono: true }]], 2)}
    <div class="hr"></div>${subh('Applicant Information')}${kv([['Address', c.address, { span: 2 }], ['Website', c.website], ['Registration No.', c.reg, { mono: true }], ['CGSE Member ID', c.cgse, { mono: true }], ['ERC Wallet', c.walletShort, { mono: true }]], 2)}`);
}
function logisticsCard(o) {
  return card('Gold Drop-Off Logistics', `${kv([['Drop-Off Location', o.location], ['Hand-over Date', o.handover, { mono: true }], ['Drop-Off Time (Est. Arrival)', o.slot, { mono: true }], ['Payment', o.payMethod]], 4)}
    ${banner('info', 'Hand-over notice shown to the client', `“Bring your gold bars to ${esc(o.location)} on ${esc(o.handover)}, ${esc(o.slot)}, after GoldZip countersigns.”`)}`, { right: pill('Set by client', 'n') });
}
function barsTable(bars, sel) {
  const head = [...(sel ? [''] : []), 'Brand', 'Country of Origin', 'Serial No.', 'Quantity (g)', 'COA Certificate No.'];
  return table(head, bars.map((b, i) => [...(sel ? [`<input type="checkbox" id="bar-${i}" ${sel.includes(i) ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--ink)" onchange="toggleBar(${i},this.checked)">`] : []),
    esc(b.brand), esc(b.country), mono(b.serial), mono(fmtN(b.qty)), mono(b.coa)]), { compact: true });
}
function feeCard(o) {
  const f = o.fee;
  const total = f.appFee + f.supplyFee;
  return card('Supply Fee Payment', `${kv([['Transfer type', f.type], ['Transfer Hash', f.valid ? shortHash(f.hash) : f.hash, { mono: true }], ['Hash source', f.source], ['From', f.from, { mono: true }],
    ['Paid at (UTC+8)', f.paidAt, { mono: true }], ['Receipt No.', f.receipt, { mono: true }], ['Amount', fmtN(total) + ' USDT', { mono: true }], ['Application Fee', fmtN(f.appFee) + ' USDT', { mono: true }],
    ['Supply Fee', fmtN(f.supplyFee) + ' USDT', { mono: true }], ['Gold Price (USD/Kg)', fmtN(f.goldPrice), { mono: true }], ['Fee Rate (%)', fmtN(f.rate), { mono: true }]], 3)}
    ${f.valid ? `<span style="display:flex;gap:6px;align-items:center;font:600 12px var(--f);color:var(--ok)">${ic('circle-check', 14)}Hash format valid · found on-chain · amount matches</span>`
      : banner('dan', 'Transfer hash does not match the expected format', 'Expected 0x followed by 64 hex characters. Ask the client to re-paste the hash from MetaMask → Activity → Copy transaction ID.')}`,
  { right: f.valid ? pill('Verified', 'ok') : pill('Check needed', 'dan') });
}
function kybCard(o) {
  return card('Client KYB', `${kv([['KYB type', o.kybType], ['Membership', o.membership], ['KYB status', pill(o.kyb, o.kyb === 'Verified' ? 'ok' : o.kyb === 'Rejected' ? 'dan' : 'warn'), { html: true }], ['Declared at', o.declaredAt, { mono: true }]], 2)}
    ${o.kyb === 'KYB pending' && o.stage === 'countersign' ? banner('info', 'KYB pending · client declared HKGX membership', 'The client paid and submitted before KYB approval. You can countersign now. If KYB is rejected, reject the order and record the supply-fee refund.')
      + demoInline(`Simulate the KYB result from Client Onboarding: <button class="demo-btn" onclick="demoKyb('${o.id}','Verified')">KYB verified</button><button class="demo-btn" onclick="demoKyb('${o.id}','Rejected')">KYB rejected</button>`) : ''}`);
}
function demoKyb(id, result) {
  const o = soById(id);
  o.kyb = result;
  if (result === 'Verified') o.membership = 'HKGX member · verified';
  else if (o.stage === 'countersign') { o.stage = 'rejected'; o.rejectReason = 'kyb'; }
  Store.save();
  refresh();
  toast(result === 'Verified' ? 'ok' : 'dan', result === 'Verified' ? 'KYB verified' : 'KYB rejected · order rejected, record the supply-fee refund');
}
const agreementCard = (o) => card('Asset Exchange Agreement', doc(o.agreement, `Signed by client with the order · ${o.signedAt}`));
const docsCard = (o) => card('Supporting Document', ['Vault Stock-In Summary', `Transfer Hash · ${shortHash(o.fee.hash)}`, 'Inspection Report', 'Asset Exchange Agreement', 'Payment Receipt', 'KYB Document'].map((n) => doc(n)).join(''));

/* ---------------- lists ---------------- */
function soFilterBar(key, processes) {
  const f = UI[key] || (UI[key] = { proc: '', status: '' });
  return `<div class="bar">
    ${processes ? `<label class="sel"><span>Process</span><select onchange="UI['${key}'].proc=this.value;refresh()"><option value="">All</option>${processes.map((p, i) => `<option value="${i}" ${String(f.proc) === String(i) ? 'selected' : ''}>${p}</option>`).join('')}</select>${ic('chevron-down', 14)}</label>` : ''}
    <label class="sel"><span>Status</span><select onchange="UI['${key}'].status=this.value;refresh()"><option value="">All</option>${Object.entries(ST_TEXT).map(([k, t]) => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${t}</option>`).join('')}</select>${ic('chevron-down', 14)}</label>
    ${legend()}</div>`;
}
function soFilter(key, list, steps) {
  const f = UI[key] || {};
  if (!f.status) return list;
  return list.filter((o) => (f.proc !== '' && f.proc != null ? soStep(o, steps[+f.proc]) === f.status : steps.some((s) => soStep(o, s) === f.status)));
}
const soRowHead = ['Applied Date', 'Reference ID', 'Client Ref. ID', 'Business Name', 'Supplier Name'];
const soRowCells = (o) => [mono(o.applied), mono(o.id), mono(o.cref), esc(coInfo(o).business), esc(coInfo(o).contact)];

route('/supply/orders', {
  group: 'supply', item: 'Order List', title: 'Order List',
  render: () => {
    UI.soKyb = UI.soKyb ?? '';
    let list = S().supply.filter((o) => !['completed', 'failed'].includes(o.stage));
    if (UI.soKyb) list = list.filter((o) => o.kyb === UI.soKyb);
    list = soFilter('soOL', list, [-1, 0]);
    const pg = paged('soOL', list);
    return `${pageHead('Order List', 'One-page supply orders: form, agreement and fee are submitted together')}
      <div class="bar"><label class="sel"><span>KYB</span><select onchange="UI.soKyb=this.value;refresh()">${['', 'Verified', 'KYB pending', 'Rejected'].map((k) => `<option value="${k}" ${UI.soKyb === k ? 'selected' : ''}>${k || 'All'}</option>`).join('')}</select>${ic('chevron-down', 14)}</label>
        <label class="sel"><span>Status</span><select onchange="UI.soOL=UI.soOL||{};UI.soOL.status=this.value;refresh()"><option value="">All</option>${Object.entries(ST_TEXT).map(([k, t]) => `<option value="${k}" ${(UI.soOL || {}).status === k ? 'selected' : ''}>${t}</option>`).join('')}</select>${ic('chevron-down', 14)}</label>${legend()}</div>
      ${table(['Applied Date', 'Reference / Client Ref. ID', 'Business Name', 'Supplier Name', 'KYB', 'Client Submission', 'Company Countersign', 'Hand-over', ''], pg.rows.map((o) => [
        mono(o.applied), two(o.id, o.cref, true), esc(coInfo(o).business), esc(coInfo(o).contact), pill(o.kyb, o.kyb === 'Verified' ? 'ok' : o.kyb === 'Rejected' ? 'dan' : 'warn'),
        st('done'), st(soStep(o, 0)), two(o.handover, o.slot, true), viewBtn(true, `go('/supply/orders/${o.id}')`)]), { pager: pager('soOL', pg), align: ['', '', '', '', '', 'c', 'c', '', 'r'] })}
      <div class="hint">Client Submission = order form + signed agreement + supply-fee payment, submitted in one go. Drafts are no longer auto-cancelled. Declared HKGX members can submit before KYB approval.</div>`;
  },
});

/* ---------------- 6.1 Order detail ---------------- */
route('/supply/orders/:id', {
  group: 'supply', item: 'Order List', title: 'Supply order',
  render: ({ id }) => {
    const o = soById(id);
    if (!o) return notFound('/supply/orders', 'Order List');
    const [stTxt, stK] = soStatus(o);
    const cur = o.stage === 'countersign' ? 1 : o.stage === 'rejected' ? 1 : o.stage === 'vault' ? 2 : 3;
    return `${backLink('Order List', '/supply/orders')}${pageHead(`SO Order ID: ${esc(o.id)}`)}
      ${stepper([['Client Submission', 'Form, agreement and supply fee submitted together'], ['Company Countersign', 'Admin countersigns the agreement'], ['Stock Transferral', 'Client hands over the bars at the vault']], cur, { fail: o.stage === 'rejected', all: cur === 3 })}
      ${statusCard(o.id, o.cref, stTxt, stK)}
      ${o.stage === 'rejected' ? banner('dan', o.rejectReason === 'admin' ? 'Order rejected by admin' : 'Order rejected · client KYB rejected', o.rejectReason === 'admin' ? 'The order stops at Company Countersign. Record the supply-fee refund below.' : 'Self-declared HKGX membership could not be verified. The order stops at Company Countersign.') : ''}
      ${cur >= 2 && o.stage !== 'rejected' ? banner('ok', 'Countersigned', `The order is past Company Countersign. Continue in <a href="#/supply/vault/${o.id}">Vault Management</a>.`) : ''}
      <div class="detail"><div>${logisticsCard(o)}${card('Gold bars', barsTable(o.bars))}${feeCard(o)}${o.stage === 'rejected' ? refundCard(o) : ''}</div>
        <div>${soBasicCard(o)}${kybCard(o)}${agreementCard(o)}${o.stage === 'countersign' ? countersignCard(o) : ''}</div></div>`;
  },
});
function notFound(path, label) { return `${backLink(label, path)}<div class="tbl"><div class="empty">Order not found. It may have been reset.</div></div>`; }
function countersignCard(o) {
  if (o.pending) return waitingBanner();
  const e = UI.csErr === o.id;
  if (!o.fee.valid) {
    return card('Company countersignature', `${banner('warn', 'Countersign is on hold', 'Resolve the transfer hash first.')}
      <div style="display:flex;gap:10px"><button class="btn pri" disabled>Submit</button><button class="btn dan" onclick="rejectOrder('${o.id}')">Reject Order</button></div>
      ${demoInline(`<button class="demo-btn" onclick="demoFixHash('${o.id}')">Client re-pastes a valid hash</button>`)}`);
  }
  return card('Company countersignature', `<label class="check ${e ? 'err' : ''}"><input type="checkbox" id="cs-tc" onchange="UI.csErr=null"><span>I hereby acknowledge and confirm that I have read, understood, and agree to the terms and conditions.</span></label>
    ${e ? `<span class="ferr">${ic('circle-alert', 12)}Please agree to the terms and conditions</span>` : ''}
    <div style="display:flex;gap:10px"><button class="btn pri" onclick="countersign('${o.id}')">Submit</button><button class="btn dan" onclick="rejectOrder('${o.id}')">Reject Order</button></div>`);
}
function demoFixHash(id) {
  const o = soById(id);
  Object.assign(o.fee, { hash: '0x' + randHex(64), source: 'Pasted manually', valid: true });
  Store.save(); refresh(); toast('ok', 'Hash re-pasted · format valid, found on-chain, amount matches');
}
async function countersign(id) {
  if (!val('cs-tc')) { UI.csErr = id; refresh(); return; }
  UI.csErr = null;
  await write({
    title: 'Company countersign', module: 'Supply Management', ref: id, action: { type: 'so.countersign', params: { id } },
    mark: (ap) => { soById(id).pending = ap; }, success: `Success · ${id} countersigned, moved to Vault Management`,
  });
}
Actions['so.countersign'] = ({ id }) => { const o = soById(id); o.stage = 'vault'; o.pending = null; o.countersignedAt = nowStamp(); };
async function rejectOrder(id) {
  const ok = await confirmDialog({ title: 'Reject Order', text: `Reject ${id}? The order stops at Company Countersign and the supply fee must be refunded offline, then recorded here. The application fee is not refunded.`, okText: 'Reject Order' });
  if (!ok) return;
  await write({
    title: 'Reject supply order', module: 'Supply Management', ref: id, action: { type: 'so.reject', params: { id } },
    mark: (ap) => { soById(id).pending = ap; }, success: `Success · ${id} rejected, record the supply-fee refund`,
  });
}
Actions['so.reject'] = ({ id }) => { const o = soById(id); o.stage = 'rejected'; o.rejectReason = 'admin'; o.pending = null; };

UI.rf = {};
function refundCard(o) {
  const f = o.fee;
  if (o.refund) {
    const r = o.refund;
    return card('Supply-fee refund', `${kv([['Refund to', f.from, { mono: true }], ['Refund amount', fmtN(f.supplyFee) + ' USDT', { mono: true }], ['Not refunded', fmtN(f.appFee) + ' USDT · application fee', { mono: true }],
      ['Refund tx hash', shortHash(r.hash), { mono: true }], ['Refunded at (UTC+8)', r.at, { mono: true }], ['Recorded by', r.by], r.remarks && ['Remarks', r.remarks, { span: 3 }]], 3)}${doc(r.proof, 'Proof of refund')}`, { right: pill('Refunded', 'ok') });
  }
  if (o.pending) return card('Supply-fee refund', waitingBanner(), { right: pill('Refund pending', 'warn') });
  const e = UI.rf[o.id] || {};
  return card('Supply-fee refund', `<div class="cd" style="margin-top:0">KYB rejected after payment, or order rejected. Refund the supply fee offline, then record it here. The application fee is not refunded (false declaration).</div>
    ${kv([['Refund to', f.from, { mono: true }], ['Refund amount', fmtN(f.supplyFee) + ' USDT', { mono: true }], ['Not refunded', fmtN(f.appFee) + ' USDT · application fee', { mono: true }]], 3)}
    <div class="grid g2">${field('rf-hash', 'Refund tx hash', { req: true, mono: true, ph: '0x…', value: e.hash, err: e.eHash })}${field('rf-at', 'Refunded at (UTC+8)', { req: true, type: 'datetime-local', value: e.at, err: e.eAt })}</div>
    ${dropZone('rf-' + o.id, 'Proof of refund', { req: true, err: e.eProof, sample: `Refund-proof-${o.id}.pdf` })}
    ${field('rf-rem', 'Remarks', { area: true, value: e.rem, ph: 'Optional' })}
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <button class="demo-btn" onclick="demoRefund('${o.id}')">${ic('sparkles', 13)}Fill demo refund</button>
      <button class="btn pri" onclick="recordRefund('${o.id}')">Record Refund</button></div>`, { right: pill('Refund pending', 'warn') });
}
function demoRefund(id) {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  UI.rf[id] = { hash: '0x5b1e94f0' + randHex(48) + 'a3c7a204', at: d.toISOString().slice(0, 16), rem: 'Refunded case by case per HKGX meeting.' };
  FileSlots['rf-' + id] = { name: `Refund-proof-${id}.pdf`, meta: 'PDF · 0.3 MB · uploaded just now' };
  refresh();
}
async function recordRefund(id) {
  const hash = val('rf-hash'), at = val('rf-at'), rem = val('rf-rem');
  const e = { hash, at, rem };
  if (!hash) e.eHash = 'Required'; else if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) e.eHash = 'Enter 0x followed by 64 hex characters';
  if (!at) e.eAt = 'Required';
  if (!FileSlots['rf-' + id]) e.eProof = 'Required';
  UI.rf[id] = e;
  if (e.eHash || e.eAt || e.eProof) { refresh(); return; }
  const o = soById(id);
  await write({
    title: 'Record supply-fee refund', module: 'Supply Management', ref: id,
    action: { type: 'so.refund', params: { id, refund: { hash, at: at.replace('T', ' '), remarks: rem, proof: FileSlots['rf-' + id].name, by: me().name } } },
    mark: (ap) => { o.pending = ap; }, success: `Success · refund of ${fmtN(o.fee.supplyFee)} USDT recorded`,
    after: () => { delete FileSlots['rf-' + id]; delete UI.rf[id]; },
  });
}
Actions['so.refund'] = ({ id, refund }) => { const o = soById(id); o.refund = refund; o.pending = null; };

/* ---------------- 6.2 Vault Management ---------------- */
const VAULT_STEPS = [['Pending Vault Summary', 'Waiting for Admin to handle Vault Summary'], ['Testing Application', 'Waiting for Assay Test'], ['Assay Inspection in Progress', 'Waiting for Admin to upload Assay Results'], ['Assay Result', 'Admin to submit results of Assay']];
const vaultCur = (o) => ({ vault: 0, testing: 1, inspection: 2, result: 3 }[o.stage] ?? 4);
route('/supply/vault', {
  group: 'supply', item: 'Vault Management', title: 'Vault Management',
  render: () => {
    let list = S().supply.filter((o) => SO_STAGES.indexOf(o.stage) >= 1 && !['completed'].includes(o.stage));
    const dates = [...new Set(list.map((o) => o.handover))].sort();
    if (UI.vmDate) list = list.filter((o) => o.handover === UI.vmDate);
    list = soFilter('soVM', list, [1]);
    const pg = paged('soVM', list);
    return `${pageHead('Vault Management', 'Expected hand-overs and stock-in for countersigned supply orders')}
      <div class="bar"><label class="sel"><span>Hand-over date</span><select onchange="UI.vmDate=this.value;refresh()"><option value="">All</option>${dates.map((d) => `<option ${UI.vmDate === d ? 'selected' : ''}>${d}</option>`).join('')}</select>${ic('chevron-down', 14)}</label>
        <label class="sel"><span>Status</span><select onchange="UI.soVM=UI.soVM||{};UI.soVM.status=this.value;refresh()"><option value="">All</option>${Object.entries(ST_TEXT).map(([k, t]) => `<option value="${k}" ${(UI.soVM || {}).status === k ? 'selected' : ''}>${t}</option>`).join('')}</select>${ic('chevron-down', 14)}</label>${legend()}</div>
      ${table([...soRowHead, 'Hand-over (Est. Arrival)', 'Stock-In Document', ''], pg.rows.map((o) => [...soRowCells(o), two(o.handover, o.slot, true), st(soStep(o, 1)), viewBtn(true, `go('/supply/vault/${o.id}')`)]),
        { pager: pager('soVM', pg), align: ['', '', '', '', '', '', 'c', 'r'] })}`;
  },
});
route('/supply/vault/:id', {
  group: 'supply', item: 'Vault Management', title: 'Vault Management',
  render: ({ id }) => {
    const o = soById(id);
    if (!o) return notFound('/supply/vault', 'Vault Management');
    const [stTxt, stK] = soStatus(o);
    const key = 'vault-' + id;
    let action;
    if (o.stage === 'vault') {
      action = o.pending ? waitingBanner() : `${kv([['Expected hand-over', `${o.handover} · ${o.slot} at ${o.location}`]], 1)}<div class="hint">Upload the signed stock-in summary after the bars are received at the vault.</div>
        ${dropZone(key, 'Upload Vault Stock-in-Summary', { req: true, types: 'JPG, PNG or PDF', err: UI.vErr === id ? 'Please upload the Vault Stock-in-Summary' : '', sample: `Stock-in-Summary-${id}.pdf` })}
        <button class="btn pri" onclick="submitVault('${id}')">Submit Vault Summary</button>`;
    } else action = doc(o.vaultFile, `Approved · ${o.vaultAt || ''}`);
    return `${backLink('Vault Management', '/supply/vault')}${pageHead(`SO Order ID: ${esc(o.id)}`)}
      ${stepper(VAULT_STEPS, vaultCur(o), { all: vaultCur(o) > 3 })}${statusCard(o.id, o.cref, stTxt, stK)}
      <div class="detail"><div>${logisticsCard(o)}${card('Gold bars', barsTable(o.bars))}</div><div>${soBasicCard(o)}${card('Vault Stock-in-Summary', action)}</div></div>`;
  },
});
async function submitVault(id) {
  const f = FileSlots['vault-' + id];
  if (!f) { UI.vErr = id; refresh(); return; }
  UI.vErr = null;
  await write({
    title: 'Submit Vault Summary', module: 'Supply Management', ref: id, action: { type: 'so.vault', params: { id, file: f.name } },
    mark: (ap) => { soById(id).pending = ap; }, success: `Success · vault summary submitted, ${id} moved to Testing Application`,
    after: () => delete FileSlots['vault-' + id],
  });
}
Actions['so.vault'] = ({ id, file }) => { const o = soById(id); Object.assign(o, { stage: 'testing', vaultFile: file, vaultAt: nowStamp(), pending: null }); };

/* ---------------- 6.3 Assay Management ---------------- */
const ASSAY_COLS = ['Vault Summary', 'Testing Application', 'Assay Inspection', 'Assay Result'];
function assayList(key, title, sub, base) {
  const list = soFilter(key, S().supply.filter((o) => ['vault', 'testing', 'inspection', 'result'].includes(o.stage) || (o.stage === 'failed' && !o.mint)), [1, 2, 3, 4]);
  const pg = paged(key, list);
  return `${pageHead(title, sub)}${soFilterBar(key, ASSAY_COLS)}
    ${table([...soRowHead, ...ASSAY_COLS, ''], pg.rows.map((o) => [...soRowCells(o), st(soStep(o, 1)), st(soStep(o, 2)), st(soStep(o, 3)), st(soStep(o, 4)),
      viewBtn(['testing', 'inspection', 'result', 'failed'].includes(o.stage), `go('${base}/${o.id}')`)]), { pager: pager(key, pg), align: ['', '', '', '', '', 'c', 'c', 'c', 'c', 'r'] })}`;
}
route('/supply/assay', { group: 'supply', item: 'Assay Management', title: 'Assay Management', render: () => assayList('soAM', 'Assay Management', 'Testing application and assay result', '/supply/assay') });

UI.ta = {};
route('/supply/assay/:id', {
  group: 'supply', item: 'Assay Management', title: 'Assay Management',
  render: ({ id }) => {
    const o = soById(id);
    if (!o) return notFound('/supply/assay', 'Assay Management');
    const [stTxt, stK] = soStatus(o);
    let left = '', right = soBasicCard(o);
    if (o.stage === 'testing') {
      const t = UI.ta[id] || (UI.ta[id] = { bars: [], test: '', other: '', ret: '', reps: [{ name: me().name, id: 'K123***(5)' }], decl: false, errors: {} });
      const e = t.errors;
      left = card('Vault Summary', doc(o.vaultFile, `Approved · ${o.vaultAt || ''}`))
        + card('Select Gold Bars for Testing', `${e.bars ? `<span class="ferr">${ic('circle-alert', 12)}Please select at least one gold bar</span>` : ''}${barsTable(o.bars, t.bars)}`, { right: `<span class="muted" style="font-size:12px">${t.bars.length} of ${o.bars.length} selected</span>` });
      right += o.pending ? waitingBanner() : card('Testing Application', `
        <div class="field"><span class="flabel"><span>Test Required<span class="req"> *</span></span></span>
          <label class="radio-card"><input type="radio" name="ta-test" ${t.test === 'diff' ? 'checked' : ''} onchange="UI.ta['${id}'].test='diff';refresh()"><span><b>Gold content determination by difference method</b></span></label>
          <label class="radio-card"><input type="radio" name="ta-test" ${t.test === 'other' ? 'checked' : ''} onchange="UI.ta['${id}'].test='other';refresh()"><span><b>Others ( Please Specify )</b></span></label>
          ${t.test === 'other' ? `<div class="input"><input id="ta-other" value="${esc(t.other)}" placeholder="Describe the test" oninput="UI.ta['${id}'].other=this.value"></div>` : ''}
          ${e.test ? `<span class="ferr">${ic('circle-alert', 12)}${e.test}</span>` : ''}</div>
        <div class="field"><span class="flabel"><span>Return Sample<span class="req"> *</span></span></span>
          <div class="grid g2">${['Not Return', 'Remnant sample only'].map((r) => `<label class="radio-card"><input type="radio" name="ta-ret" ${t.ret === r ? 'checked' : ''} onchange="UI.ta['${id}'].ret='${r}';refresh()"><span><b>${r}</b></span></label>`).join('')}</div>
          ${e.ret ? `<span class="ferr">${ic('circle-alert', 12)}Required</span>` : ''}</div>
        <div class="field"><span class="flabel"><span>Company Representative Information</span><button class="link" onclick="UI.ta['${id}'].reps.push({name:'',id:''});refresh()">${ic('plus', 13)}Add</button></span>
          ${t.reps.map((r, i) => `<div class="grid g2" style="align-items:end">${field(`ta-rn-${i}`, 'Name', { value: r.name, oninput: `UI.ta['${id}'].reps[${i}].name=this.value`, err: e['rep' + i] })}
            ${field(`ta-ri-${i}`, 'HKID / Passport No.', { value: r.id, oninput: `UI.ta['${id}'].reps[${i}].id=this.value`, labelRight: i ? `<button class="link dan" style="font-size:12px" onclick="UI.ta['${id}'].reps.splice(${i},1);refresh()">Remove</button>` : '' })}</div>`).join('')}</div>
        <div class="hint">We request Hong Kong Precious Metal Assay Centre Limited to test the selected bars. <a href="javascript:previewDoc('HKPMAC-Terms-and-Conditions.pdf')">Read Terms and Conditions</a></div>
        <label class="check ${e.decl ? 'err' : ''}"><input type="checkbox" ${t.decl ? 'checked' : ''} onchange="UI.ta['${id}'].decl=this.checked"><span>I acknowledge the declaration and the terms and conditions.</span></label>
        ${e.decl ? `<span class="ferr">${ic('circle-alert', 12)}Please acknowledge the declaration</span>` : ''}
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><button class="demo-btn" onclick="demoTesting('${id}')">${ic('sparkles', 13)}Fill demo application</button>
        <button class="btn pri" onclick="submitTesting('${id}')">Submit Request for Testing</button></div>`);
    } else if (o.stage === 'inspection') {
      left = card('Vault Summary', doc(o.vaultFile, `Approved · ${o.vaultAt || ''}`)) + card('Bars sent for testing', barsTable(o.testing.bars.map((i) => o.bars[i])));
      right += banner('info', 'Assay Inspection in Progress', `The request is with the Hong Kong Precious Metal Assay Centre. The assay centre uploads the report in <a href="#/supply/inspection/${id}">Assay Inspection</a>.`);
    } else {
      left = assayDataCard(o) + card('Gold bars in this order', barsTable(o.bars));
      if (o.stage === 'result') {
        const r = UI.ar?.[id] || '';
        right += o.pending ? waitingBanner() : card('Assay Pass / Fail Result', `
          <label class="radio-card"><input type="radio" name="ar" ${r === 'Pass' ? 'checked' : ''} onchange="UI.ar=UI.ar||{};UI.ar['${id}']='Pass';refresh()"><span><b>Pass</b><small>Order moves to Issue Request in Minting.</small></span></label>
          <label class="radio-card"><input type="radio" name="ar" ${r === 'Fail' ? 'checked' : ''} onchange="UI.ar=UI.ar||{};UI.ar['${id}']='Fail';refresh()"><span><b>Fail</b><small>Result is recorded. No further step in this dashboard.</small></span></label>
          ${UI.arErr === id ? `<span class="ferr">${ic('circle-alert', 12)}Choose Pass or Fail</span>` : ''}
          <button class="btn pri" onclick="submitAssayResult('${id}')">Submit</button>`);
      } else right += banner(o.stage === 'failed' ? 'dan' : 'ok', `Assay result · ${o.assayResult}`, o.stage === 'failed' ? 'The result is recorded and the flow stops here.' : `Continue in <a href="#/supply/minting/${id}">Minting</a>.`);
    }
    return `${backLink('Assay Management', '/supply/assay')}${pageHead(`SO Order ID: ${esc(o.id)}`)}
      ${stepper(VAULT_STEPS, vaultCur(o), { all: vaultCur(o) > 3 && o.stage !== 'failed', fail: o.stage === 'failed' })}${statusCard(o.id, o.cref, stTxt, stK)}
      <div class="detail"><div>${left}</div><div>${right}</div></div>`;
  },
});
function assayDataCard(o) {
  const a = o.assay || {};
  return card('Assay Inspection', `${kv([['Application No.', a.appNo, { mono: true }], ['Receipt Date', a.receipt, { mono: true }], ['Completed Date', a.completed || '—', { mono: true }],
    ['Test Required', o.testing?.test || '—', { span: 2 }], ['Return Sample', o.testing?.ret || '—'], ['Remarks', a.remarks || '—', { span: 3 }]], 3)}
    ${a.report ? doc(a.report, `Uploaded by assay centre · ${a.completed}`) : ''}`);
}
function toggleBar(i, on) {
  const id = currentRoute.params.id;
  const t = UI.ta[id];
  if (!t) return;
  t.bars = on ? [...new Set([...t.bars, i])].sort() : t.bars.filter((x) => x !== i);
  t.errors.bars = false;
  refresh();
}
function demoTesting(id) {
  const o = soById(id);
  UI.ta[id] = { bars: o.bars.length > 1 ? [0, o.bars.length - 1] : [0], test: 'diff', other: '', ret: 'Not Return', reps: [{ name: me().name, id: 'K123***(5)' }], decl: true, errors: {} };
  refresh();
}
async function submitTesting(id) {
  const t = UI.ta[id];
  const e = {};
  if (!t.bars.length) e.bars = true;
  if (!t.test) e.test = 'Required'; else if (t.test === 'other' && !t.other.trim()) e.test = 'Please specify the test';
  if (!t.ret) e.ret = true;
  t.reps.forEach((r, i) => { if (!r.name.trim()) e['rep' + i] = 'Required'; });
  if (!t.decl) e.decl = true;
  t.errors = e;
  if (Object.keys(e).length) { refresh(); if (e.bars) toast('dan', 'Please select at least one gold bar'); return; }
  const testing = { bars: t.bars, test: t.test === 'diff' ? 'Gold content determination by difference method' : `Others: ${t.other}`, ret: t.ret, reps: t.reps, submittedAt: nowStamp() };
  await write({
    title: 'Submit Request for Testing', module: 'Supply Management', ref: id, action: { type: 'so.testing', params: { id, testing } },
    mark: (ap) => { soById(id).pending = ap; }, success: `Success · testing request sent to the assay centre`,
    after: () => delete UI.ta[id],
  });
}
Actions['so.testing'] = ({ id, testing }) => {
  const o = soById(id);
  Object.assign(o, { stage: 'inspection', testing, pending: null, assay: { appNo: 'HKPMAC-26-' + (1000 + Math.floor(Math.random() * 900)), receipt: new Date().toLocaleDateString('en-GB').replace(/\//g, '-') } });
};
async function submitAssayResult(id) {
  const r = UI.ar?.[id];
  if (!r) { UI.arErr = id; refresh(); return; }
  UI.arErr = null;
  await write({
    title: `Assay result · ${r}`, module: 'Supply Management', ref: id, action: { type: 'so.result', params: { id, result: r } },
    mark: (ap) => { soById(id).pending = ap; }, success: r === 'Pass' ? `Success · ${id} passed, moved to Issue Request in Minting` : `Success · ${id} failed, result recorded`,
  });
}
Actions['so.result'] = ({ id, result }) => { const o = soById(id); o.assayResult = result; o.stage = result === 'Pass' ? 'issue' : 'failed'; o.pending = null; };

/* ---------------- 6.4 Assay Inspection (assay-centre view) ---------------- */
route('/supply/inspection', { group: 'supply', item: 'Assay Inspection', title: 'Assay Inspection', render: () => assayList('soAI', 'Assay Inspection', 'Orders in progress at the assay centre', '/supply/inspection') });
UI.ai = {};
route('/supply/inspection/:id', {
  group: 'supply', item: 'Assay Inspection', title: 'Assay Inspection',
  render: ({ id }) => {
    const o = soById(id);
    if (!o) return notFound('/supply/inspection', 'Assay Inspection');
    const [stTxt, stK] = soStatus(o);
    const bars = (o.testing?.bars || []).map((i) => o.bars[i]).filter(Boolean);
    const f = UI.ai[id] || {}, e = f.errors || {};
    let upload;
    if (o.stage !== 'inspection') upload = o.stage === 'testing' ? banner('info', 'Testing not requested yet', 'The admin submits the Testing Application first.') : assayDataCard(o);
    else if (o.pending) upload = waitingBanner();
    else upload = card('Upload assay result', `
      ${field('ai-date', 'Completed Date', { req: true, type: 'date', value: f.date, err: e.date })}
      ${field('ai-rem', 'Remarks', { req: true, area: true, ph: 'Add remarks', value: f.rem, err: e.rem })}
      ${dropZone('ai-' + id, 'Assay report', { req: true, err: e.file, sample: `Inspection-Report-${o.assay?.appNo || 'HKPMAC'}.pdf` })}
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><button class="demo-btn" onclick="demoInspection('${id}')">${ic('sparkles', 13)}Fill demo result</button><button class="btn pri" onclick="submitInspection('${id}')">Submit</button></div>`);
    return `${backLink('Assay Inspection', '/supply/inspection')}${pageHead(`SO Order ID: ${esc(o.id)} ${pill('Assay centre view', 'gold')}`)}
      ${stepper(VAULT_STEPS, vaultCur(o), { all: vaultCur(o) > 3 && o.stage !== 'failed' })}${statusCard(o.id, o.cref, stTxt, stK)}
      <div class="detail"><div>${card('Vault Summary', doc(o.vaultFile || '—', `Approved · ${o.vaultAt || ''}`))}${bars.length ? card('Bars under test', table(['Brand', 'Serial No.', 'Quantity (g)', 'COA Certificate No.'], bars.map((b) => [esc(b.brand), mono(b.serial), mono(fmtN(b.qty)), mono(b.coa)]), { compact: true })) : ''}
        ${o.testing ? card('Inspection Details', kv([['Test Required', o.testing.test, { span: 2 }], ['Return Sample', o.testing.ret], ['Application No.', o.assay?.appNo, { mono: true }], ['Receipt Date', o.assay?.receipt, { mono: true }]], 3)) : ''}</div>
        <div>${upload}</div></div>`;
  },
});
function demoInspection(id) {
  const d = new Date();
  UI.ai[id] = { date: d.toISOString().slice(0, 10), rem: 'Both sampled bars ≥ 999.9 fineness.' };
  FileSlots['ai-' + id] = { name: `Inspection-Report-${soById(id).assay?.appNo || 'HKPMAC'}.pdf`, meta: 'PDF · 3.2 MB · uploaded just now' };
  refresh();
}
async function submitInspection(id) {
  const date = val('ai-date'), rem = val('ai-rem'), file = FileSlots['ai-' + id];
  const e = {};
  if (!date) e.date = 'Required';
  if (!rem) e.rem = 'Required';
  if (!file) e.file = 'Required';
  UI.ai[id] = { date, rem, errors: e };
  if (Object.keys(e).length) { refresh(); return; }
  const [y, m, d] = date.split('-');
  await write({
    title: 'Upload assay result', module: 'Supply Management', ref: id, action: { type: 'so.inspection', params: { id, completed: `${d}-${m}-${y}`, remarks: rem, report: file.name } },
    mark: (ap) => { soById(id).pending = ap; }, success: `Success · assay report uploaded, ${id} moved to Assay Result`,
    after: () => { delete FileSlots['ai-' + id]; delete UI.ai[id]; },
  });
}
Actions['so.inspection'] = ({ id, completed, remarks, report }) => { const o = soById(id); Object.assign(o.assay, { completed, remarks, report }); o.stage = 'result'; o.pending = null; };

/* ---------------- 6.5 Minting ---------------- */
const MINT_STEPS = [['Issue Request', 'Admin to submit issue token request'], ['Issuing Token', 'Admin to confirm multi-sig and issue directly to user'], ['Completed Order', 'Order Completed']];
route('/supply/minting', {
  group: 'supply', item: 'Minting', title: 'Minting',
  render: () => {
    const list = soFilter('soMI', S().supply.filter((o) => ['issue', 'issuing'].includes(o.stage)), [5, 6, 7]);
    const pg = paged('soMI', list);
    return `${pageHead('Minting', 'Issue XGZ to suppliers after a passed assay')}${soFilterBar('soMI', ['Issue Request', 'Issuing Token', 'Completed Order'])}
      ${table([...soRowHead, 'Issue Request', 'Issuing Token', 'Completed Order', ''], pg.rows.map((o) => [...soRowCells(o), st(soStep(o, 5)), st(soStep(o, 6)), st(soStep(o, 7)), viewBtn(true, `go('/supply/minting/${o.id}')`)]),
        { pager: pager('soMI', pg), align: ['', '', '', '', '', 'c', 'c', 'c', 'r'], empty: 'No orders are waiting for minting. Pass an assay result to send an order here.' })}`;
  },
});
function requisitionCard(o) {
  const g = grams(o);
  return card('Token Minting Requisition', kv([['Depositor', coInfo(o).business], ['Wallet Address', coInfo(o).wallet, { mono: true }], ['Quantity of Gold Bar Deposited', `${o.bars.length} bars · ${fmtN(g)} g`, { mono: true }], ['Token Minting Quantity', `${fmtInt(g)} XGZ`, { mono: true }]], 2));
}
function txCardSo(o) {
  const t = o.mint.tx;
  return card('Transaction', kv([['Type', 'Mint'], ['TX Hash', shortHash(t.hash), { mono: true }], ['Time Stamp', t.time, { mono: true }], ['Block Height', t.block, { mono: true }], ['Recipient', coInfo(o).wallet, { mono: true }],
    ['Amount', fmtInt(grams(o)) + ' XGZ', { mono: true }], ['Gas Fee', t.gas, { mono: true }], ['Status', pill(t.status, 'ok'), { html: true }], o.mint.method === 'manual' && ['Source', 'Manual Issuance']], 3));
}
route('/supply/minting/:id', {
  group: 'supply', item: 'Minting', title: 'Minting',
  render: ({ id }) => {
    const o = soById(id);
    if (!o) return notFound('/supply/minting', 'Minting');
    const [stTxt, stK] = soStatus(o);
    const cur = { issue: 0, issuing: 1, completed: 2 }[o.stage] ?? 0;
    let action;
    if (o.stage === 'issue') {
      if (o.pending) {
        const tx = S().txRequests.find((t) => t.ref === o.id && t.status === 'pending');
        action = tx ? banner('warn', 'Waiting for multisig signers', `Mint request approved. Signers execute it in <a href="#/transactions">Transaction Requests</a> (${tx.id}).`)
          : banner('warn', 'Waiting for approvals', 'The mint request is in <a href="#/approvals">Approvals</a>. After approval, the signers execute it in Transaction Requests.');
      } else {
        action = card('Issue tokens', `<div class="cd" style="margin-top:0">Mint 1 XGZ per gram deposited to the supplier's bound wallet.</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn pri" onclick="mintWizard('${id}')">Request Issue Token</button><button class="btn sec" onclick="manualIssuance('${id}')">Manual Issuance</button></div>
          <div class="hint">Use Manual Issuance only if the tokens were already minted outside this flow.</div>`);
      }
    } else if (o.stage === 'issuing') {
      action = o.pending ? waitingBanner() : card('Confirm issuance', `<div class="cd" style="margin-top:0">Check that the on-chain mint matches the requisition, then confirm to complete the order.</div><button class="btn pri" onclick="confirmMint('${id}')">Confirm</button>`);
    } else action = banner('ok', 'Order completed', `${fmtInt(grams(o))} XGZ issued to ${esc(coInfo(o).walletShort)}.`);
    return `${backLink('Minting', '/supply/minting')}${pageHead(`SO Order ID: ${esc(o.id)}`)}
      ${stepper(MINT_STEPS, cur, { all: o.stage === 'completed' })}${statusCard(o.id, o.cref, stTxt, stK)}
      <div class="detail"><div>${requisitionCard(o)}${o.mint?.tx ? txCardSo(o) : ''}${docsCard(o)}</div><div>${soBasicCard(o)}${action}</div></div>`;
  },
});

/* Request Issue Token: 3-step wizard */
const SIGNERS = {
  operator: [{ name: 'Kelvin Wong', addr: '0x51A2…c09E' }, { name: 'Rita Chan', addr: '0x8E07…11bD' }],
  validator: [{ name: 'Eric Lau', addr: '0x2F9c…7a30' }, { name: 'Joyce Ho', addr: '0xC41d…e5F2' }, { name: 'Sam Yeung', addr: '0x07bB…4dA1' }],
  admin: [{ name: 'Ada Lam', addr: '0x51A2…c09E' }, { name: 'Victor Chu', addr: '0x6b12…f0A9' }, { name: 'Grace Lo', addr: '0x3C88…19dE' }],
};
UI.mw = null;
function mintWizard(id) {
  UI.mw = { id, step: 1, ack: false, mode: 'general', operator: ['Kelvin Wong'], validator: ['Eric Lau', 'Joyce Ho'], admin: [], err: '' };
  openModal(mintWizardHtml(), { dismiss: false });
}
const wizHead = (steps, cur) => `<div class="wiz">${steps.map((s, i) => `${i ? '<span class="ln"></span>' : ''}<span class="${i + 1 === cur ? 'on' : i + 1 < cur ? 'done' : ''}"><i>${i + 1 < cur ? '✓' : i + 1}</i>${s}</span>`).join('')}</div>`;
function signerList(group, req, label) {
  const w = UI.mw;
  return `<div class="field"><span class="flabel"><span>${label}</span><span class="muted" style="font-weight:500">${req} of ${req} required · ${w[group].length} selected</span></span>
    ${SIGNERS[group].map((s) => `<label class="signer"><input type="checkbox" ${w[group].includes(s.name) ? 'checked' : ''} onchange="mwToggle('${group}','${s.name}',this.checked)"><b>${s.name}</b><small>${s.addr}</small></label>`).join('')}</div>`;
}
function mwToggle(group, name, on) {
  const w = UI.mw;
  w[group] = on ? [...w[group], name] : w[group].filter((n) => n !== name);
  w.err = '';
  updateModal(mintWizardHtml());
}
function mintWizardHtml() {
  const w = UI.mw, o = soById(w.id), c = coInfo(o), g = grams(o);
  let body, foot;
  if (w.step === 1) {
    const flagged = c.kyt === 'flag';
    body = `<div class="grid g2">${field('mw-token', 'Token', { req: true, options: ['XGZ · GoldZip Token'], disabled: true })}
      <div class="kv" style="grid-template-columns:repeat(2,1fr);align-content:center"><div><span>Max Issuance</span><b class="mono">1,000,000</b></div><div><span>Amount Circ.</span><b class="mono">${fmtInt(S().dashboard.circ)}</b></div>
      <div><span>Threshold</span><b class="mono">80%</b></div><div><span>Current Issuance</span><b class="mono">${((S().dashboard.circ / 1e6) * 100).toFixed(1)}%</b></div></div></div>
      ${field('mw-to', 'Recipient', { req: true, options: [`${c.wallet} · Registered User`], disabled: true })}
      ${field('mw-amt', 'Amount', { readonly: true, value: fmtInt(g), hint: 'Locked to the total grams deposited (1 g = 1 XGZ).' })}
      ${flagged ? `${banner('warn', `Warning about wallet ${esc(c.walletShort)}`, 'KYT screening flagged this recipient as high risk.')}
        <label class="check ${w.err ? 'err' : ''}"><input type="checkbox" ${w.ack ? 'checked' : ''} onchange="UI.mw.ack=this.checked;UI.mw.err='';updateModal(mintWizardHtml())"><span>I acknowledge that this wallet may pose a risk and will proceed accordingly</span></label>
        ${w.err ? `<span class="ferr">${ic('circle-alert', 12)}${w.err}</span>` : ''}`
      : banner('ok', `Confirmed wallet ${esc(c.walletShort)}`, 'KYT screening passed.')}`;
    foot = `<button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn pri" onclick="mwNext()">Next</button>`;
  } else if (w.step === 2) {
    body = `<div class="hint">The XGZ issuing wallet is a multisig. Nominate enough approvers to meet its thresholds.</div>
      <div class="grid g2">
        <label class="radio-card"><input type="radio" name="mw-mode" ${w.mode === 'general' ? 'checked' : ''} onchange="UI.mw.mode='general';UI.mw.err='';updateModal(mintWizardHtml())"><span><b>General Approval</b><small>Operator + Validator signers</small></span></label>
        <label class="radio-card"><input type="radio" name="mw-mode" ${w.mode === 'admin' ? 'checked' : ''} onchange="UI.mw.mode='admin';UI.mw.err='';updateModal(mintWizardHtml())"><span><b>Admin-Level Approval</b><small>Admin signers</small></span></label></div>
      ${w.mode === 'general' ? signerList('operator', 1, 'Operator') + signerList('validator', 2, 'Validator') : signerList('admin', 2, 'Admin')}
      ${w.err ? `<span class="ferr">${ic('circle-alert', 12)}${w.err}</span>` : ''}`;
    foot = `<button class="btn sec" onclick="UI.mw.step=1;updateModal(mintWizardHtml())">Back</button><button class="btn pri" onclick="mwNext()">Next</button>`;
  } else {
    const appr = w.mode === 'general' ? [['Operator', w.operator.join(', ')], ['Validator', w.validator.join(', ')]] : [['Admin', w.admin.join(', ')]];
    body = `${kv([['Wallet', '0xGZ1s…Issuer · Multisig', { mono: true }], ['Token', 'XGZ · GoldZip Token'], ['Amount', fmtInt(g) + ' XGZ', { mono: true }], ['Recipient', c.wallet, { mono: true }]], 2)}
      <div class="hr"></div>${subh('Approvers')}${kv(appr, 2)}
      ${banner('info', 'After confirming', 'The mint request goes to Approvals, then the signers execute it in Transaction Requests.')}`;
    foot = `<button class="btn sec" onclick="UI.mw.step=2;updateModal(mintWizardHtml())">Back</button><button class="btn pri" onclick="mwConfirm()">Confirm</button>`;
  }
  return modalFrame({ title: 'Issue Token', sub: wizHead(['Basic Information', 'Approval Mode', 'Preview'], w.step), body, foot, width: 640 });
}
function mwNext() {
  const w = UI.mw, c = coInfo(soById(w.id));
  if (w.step === 1 && c.kyt === 'flag' && !w.ack) { w.err = 'Tick the acknowledgement to continue'; updateModal(mintWizardHtml()); return; }
  if (w.step === 2) {
    const ok = w.mode === 'general' ? w.operator.length >= 1 && w.validator.length >= 2 : w.admin.length >= 2;
    if (!ok) { w.err = w.mode === 'general' ? 'Select 1 Operator and 2 Validators to meet the thresholds' : 'Select 2 Admin signers to meet the threshold'; updateModal(mintWizardHtml()); return; }
  }
  w.step++;
  updateModal(mintWizardHtml());
}
async function mwConfirm() {
  const w = UI.mw, o = soById(w.id);
  const signers = w.mode === 'general'
    ? [...w.operator.map((n) => ({ role: 'Operator', name: n, addr: SIGNERS.operator.find((s) => s.name === n).addr })), ...w.validator.map((n) => ({ role: 'Validator', name: n, addr: SIGNERS.validator.find((s) => s.name === n).addr }))]
    : w.admin.map((n) => ({ role: 'Admin', name: n, addr: SIGNERS.admin.find((s) => s.name === n).addr }));
  closeModal();
  await write({
    title: 'Request issue token (mint)', module: 'Supply Management', ref: o.id, forceApproval: true,
    action: { type: 'mint.request', params: { id: o.id, amount: grams(o), to: coInfo(o).wallet, signers } },
    mark: (ap) => { o.pending = ap; }, pending: 'Awaiting Approval · mint request sent to Approvals',
  });
}
Actions['mint.request'] = ({ id, amount, to, signers }) => {
  const o = soById(id);
  const t = createTxRequest('Mint', id, amount, to, signers);
  o.pending = t.id;
};
Actions['mint.executed'] = ({ id, tx }) => {
  const o = soById(id);
  o.mint = { method: 'request', tx: { hash: tx.fullHash, time: nowDash(), block: fmtInt(21084377 + Math.floor(Math.random() * 5000)), gas: '0.0021 ETH', status: 'Success' } };
  o.stage = 'issuing'; o.pending = null;
};

/* Manual Issuance */
function manualIssuance(id, hash = '', err = '', okMsg = '') {
  const o = soById(id);
  const html = modalFrame({
    title: 'Manual Issuance', sub: 'Record tokens that were already minted outside this flow.', width: 560,
    body: `<div class="grid g2">${field('mi-token', 'Token', { readonly: true, value: 'XGZ' })}${field('mi-amt', 'Amount', { readonly: true, value: fmtInt(grams(o)) })}</div>
      ${field('mi-hash', 'Transaction Hash', { req: true, mono: true, ph: '0x…', value: hash, err })}${okMsg ? `<span style="display:flex;gap:6px;align-items:center;font:600 12px var(--f);color:var(--ok);margin-top:-8px">${ic('circle-check', 13)}${okMsg}</span>` : ''}
      ${demoInline(`<button class="demo-btn" onclick="manualIssuanceRe('${id}','0x7a1c4e0b9d${randHex(44)}02c8e93f04')">Fill a valid hash</button><button class="demo-btn" onclick="manualIssuanceRe('${id}','0x7a1c4e0b9d…02c8e93f')">Fill an invalid hash</button>`)}`,
    foot: `<button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn pri" onclick="submitManual('${id}')">Next</button>`,
  });
  if (modalStack.length) updateModal(html); else openModal(html);
}
function manualIssuanceRe(id, hash) {
  const valid = /^0x[0-9a-fA-F]{64}$/.test(hash);
  manualIssuance(id, hash, valid ? '' : 'Invalid transaction hash. The token or amount do not match.', valid ? 'Valid transaction hash.' : '');
}
async function submitManual(id) {
  const hash = val('mi-hash');
  if (!hash) { manualIssuance(id, hash, 'Required'); return; }
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) { manualIssuance(id, hash, 'Invalid transaction hash. The token or amount do not match.'); return; }
  closeModal();
  await write({
    title: 'Manual issuance', module: 'Supply Management', ref: id, action: { type: 'mint.manual', params: { id, hash } },
    mark: (ap) => { soById(id).pending = ap; }, success: 'Success · manual issuance recorded, confirm the transaction',
  });
}
Actions['mint.manual'] = ({ id, hash }) => {
  const o = soById(id);
  o.mint = { method: 'manual', tx: { hash, time: nowDash(), block: fmtInt(21080000 + Math.floor(Math.random() * 5000)), gas: '0.0019 ETH', status: 'Success' } };
  o.stage = 'issuing'; o.pending = null;
};
async function confirmMint(id) {
  await write({
    title: 'Confirm token issuance', module: 'Supply Management', ref: id, action: { type: 'mint.confirm', params: { id } },
    mark: (ap) => { soById(id).pending = ap; }, success: `Success · ${id} completed, moved to History`,
  });
}
Actions['mint.confirm'] = ({ id }) => {
  const o = soById(id);
  o.stage = 'completed'; o.pending = null; o.mint.completedAt = nowStamp();
  S().dashboard.circ += grams(o);
};

/* ---------------- 6.6 History ---------------- */
route('/supply/history', {
  group: 'supply', item: 'History', title: 'Supply History',
  render: () => {
    const list = S().supply.filter((o) => ['completed', 'failed'].includes(o.stage));
    const pg = paged('soH', list);
    return `${pageHead('History', 'Completed supply orders · read only')}
      ${table(['Applied Date', 'Reference ID', 'Client Ref. ID', 'Supplier Name', 'Deposit Gold', 'Sent Token', 'Status', ''], pg.rows.map((o) => [mono(o.applied), mono(o.id), mono(o.cref), esc(coInfo(o).contact),
        mono(fmtN(grams(o)) + ' g'), mono(o.stage === 'completed' ? fmtInt(grams(o)) + ' XGZ' : '—'), o.stage === 'completed' ? pill('Success', 'ok') : pill('Failed', 'dan'), viewBtn(true, `go('/supply/history/${o.id}')`)]),
      { pager: pager('soH', pg), align: ['', '', '', '', 'r', 'r', '', 'r'] })}`;
  },
});
route('/supply/history/:id', {
  group: 'supply', item: 'History', title: 'Supply History',
  render: ({ id }) => {
    const o = soById(id);
    if (!o) return notFound('/supply/history', 'History');
    return `${backLink('History', '/supply/history')}${pageHead(`SO Order ID: ${esc(o.id)} ${o.stage === 'completed' ? pill('Completed Order', 'ok') : pill('Failed · Assay', 'dan')} ${pill('Read only', 'n')}`)}
      <div class="detail"><div>${requisitionCard(o)}${o.mint?.tx ? txCardSo(o) : banner('dan', 'No tokens issued', 'The assay result was Fail, so the flow stopped before minting.')}${assayDataCard(o)}</div>
        <div>${soBasicCard(o)}${docsCard(o)}</div></div>`;
  },
});
