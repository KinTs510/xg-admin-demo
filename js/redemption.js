/* GoldZip Admin Portal — static demo
   redemption.js: 07 Redemption (XGZ in → gold out → burn). Reject Order / Reject Stock / Cancel Redemption return the escrowed XGZ. */
'use strict';

const roCo = (o) => CO[o.co];
const roName = (o) => (roCo(o).individual ? roCo(o).contact : roCo(o).business);
const xgz = (n) => fmtN(n, 3) + ' XGZ';
function roStatus(o) {
  if (o.stage === 'deposit') return ['Deposit XGZ', 'warn'];
  if (o.stage === 'vault') return ['Preparing Stock', 'warn'];
  if (o.stage === 'approval') return ['Stock Approval', 'warn'];
  if (o.stage === 'escrow') return { grace: ['Process Escrow', 'info'], cancelreq: ['Process Escrow · Cancel requested', 'warn'], lock: ['Lock Period', 'info'], collect: ['Collection Day', 'warn'], confirm: ['Confirmation', 'warn'] }[o.phase];
  return o.status === 'Success' ? ['Completed', 'ok'] : [o.status, 'dan'];
}
const roActive = (o) => !['history'].includes(o.stage);
const flowStrip = (on) => `<div class="flow">${[['Order List', '/redemption/orders'], ['Vault Management', '/redemption/vault'], ['Vault Approval', '/redemption/approval'], ['Escrow', '/redemption/escrow'], ['History', '/redemption/history']]
  .map(([t, p], i) => `${i ? ic('chevron-right', 12) : ''}<a href="#${p}" class="${t === on ? 'on' : ''}">${i + 1} · ${t}</a>`).join('')}</div>`;
const ESC_ORDER = ['grace', 'cancelreq', 'lock', 'collect', 'confirm'];
function roStep(o, step) {
  // steps: 0 deposit, 1 stock retrieval, 2 approval, 3 process escrow, 4 receipt upload, 5 release
  if (o.stage === 'history') {
    if (o.status !== 'Success') { const failAt = o.endedAt ?? 2; return step < failAt ? 'done' : step === failAt ? 'fail' : 'wait'; }
    return 'done';
  }
  const idx = o.stage === 'deposit' ? 0 : o.stage === 'vault' ? 1 : o.stage === 'approval' ? 2 : o.phase === 'collect' ? 4 : o.phase === 'confirm' ? 5 : 3;
  if (step < idx) return 'done';
  if (step === idx) return o.pending ? 'pend' : 'none';
  return 'wait';
}
const roHeadCells = ['Applied Date', 'Business / Contact Name', 'Request By', 'Reference / Client Ref. ID'];
const roCells = (o) => [mono(o.applied), two(roName(o), roCo(o).contact), esc(o.requestBy), two(o.id, o.cref, true)];

/* ---------------- shared cards ---------------- */
const txLink = (h) => (h ? `<span class="lnk">${esc(h)}</span>` : '---');
function escrowCard(o) {
  const released = !!o.releaseTx, returned = !!o.cancelTx;
  const stp = !o.deposit ? pill('Awaiting client deposit', 'warn') : released ? pill('Released', 'ok') : returned ? pill('Returned to client', 'n') : pill('Held in escrow', 'info');
  return card('XGZ Escrow Deposit', kv([['Escrow Contract', o.escrow, { mono: true }], ['Expected Amount', xgz(o.grams), { mono: true }], ['From (client wallet)', roCo(o).walletShort, { mono: true }],
    ['Deposited', o.deposit ? xgz(o.grams) : '---', { mono: true }], ['Deposit tx', txLink(o.deposit?.tx), { html: true }], ['Deposited at (UTC+8)', o.deposit?.at || '---', { mono: true }],
    ['Release Funds tx', txLink(o.releaseTx), { html: true }], ['Cancel tx', txLink(o.cancelTx), { html: true }]], 3), { right: stp });
}
function logisticsCardRo(o) {
  return card('Redemption Logistics', `${kv([['Pick-Up Location', o.location], ['Collection Date', o.collection, { mono: true }], ['Method of Redemption', o.method], ['Pick-Up Time (Preferred Time)', o.slot, { mono: true }]], 4)}
    <div class="hr"></div>${subh('Authorised Person for Collection')}${kv([['Name', o.person.name], ['ID/Passport No.', o.person.id, { mono: true }], ['Phone Number', o.person.phone, { mono: true }], ['Relationship to company', o.person.rel]], 4)}`,
  { right: pill(o.stage === 'escrow' ? `Collection ${o.collection} · ${o.slot}` : 'Set by client at order creation', o.stage === 'escrow' ? 'info' : 'n') });
}
function summaryCard(o, withRetrieved = true) {
  const it = o.items[0];
  return card('Redemption Summary', `${kv([['Bars', `${it.qty} × ${it.type}`], ['Total weight', fmtInt(o.grams) + ' g', { mono: true }], ['XGZ to redeem', xgz(o.grams), { mono: true }], ['Redemption Fee', fmtN(o.fee) + ' USDT', { mono: true }]], 4)}
    ${withRetrieved && o.retrieved.length ? table(['Brand', 'Serial No.', 'Weight (g)', 'COA Certificate No.'], o.retrieved.map((b) => [esc(b.brand), mono(b.serial), mono(b.weight), mono(b.coa)]), { compact: true })
      : table(['Type', 'Quantity', 'Total Weight (g)'], o.items.map((x) => [esc(x.type), mono(x.qty), mono(fmtN(x.weight))]), { compact: true })}`);
}
function clientCard(o) {
  const c = roCo(o);
  return card('Basic Information', `${subh('Client')}${kv([['Business Name', c.business], ['Email', c.email], ['Phone', c.phone, { mono: true }], ['Client Ref. ID', o.cref, { mono: true }]], 2)}
    <div class="hr"></div>${subh('Applicant Information')}${kv([['Address', c.address, { span: 2 }], ['Registration No.', c.reg, { mono: true }], ['CGSE Member ID', c.cgse, { mono: true }], ['ERC Wallet', c.walletShort, { mono: true }]], 2)}`);
}
const agreementCardRo = (o) => card('Agreement', doc(o.agreement, `Signed by client · ${o.signedAt}`));
const supportCard = (o) => card('Supporting Document', [doc('Payment Receipt', o.receiptNo), doc('Digital Asset Agreement'), doc('Escrow Deposit tx', o.deposit?.tx || '---'), doc('Stock Retrieval document', o.stockOut || '—')].join(''));
const depositedBanner = (o) => banner('ok', `XGZ deposited · ${xgz(o.grams)} held in escrow`, `Deposit tx ${o.deposit?.tx} · collection ${o.collection} · ${o.slot}`);
function roNotFound(path, label) { return `${backLink(label, path)}<div class="tbl"><div class="empty">Order not found. It may have been reset.</div></div>`; }

/* ---------------- 7.1 Order List ---------------- */
route('/redemption/orders', {
  group: 'redemption', item: 'Order List', title: 'Redemption Order List',
  render: () => {
    const v1 = S().demo.redemptionFlow === 'v1';
    const list = S().redemption.filter((o) => roActive(o) && (v1 || o.stage !== 'deposit'));
    const pg = paged('roOL', list);
    return `${pageHead('Order List', v1 ? 'Track the client’s XGZ deposit for submitted orders' : 'Submitted redemption orders, ready for stock preparation', pill(v1 ? 'Design option v1 · two steps' : 'Design option v2 · one step', 'gold'))}
      ${flowStrip('Order List')}<div class="bar">${legend()}</div>
      ${table([...roHeadCells, 'Client Submission', ...(v1 ? ['Deposit XGZ'] : []), ''], pg.rows.map((o) => [...roCells(o), st('done'), ...(v1 ? [st(o.deposit ? 'done' : 'none')] : []), viewBtn(true, `go('/redemption/orders/${o.id}')`)]),
        { pager: pager('roOL', pg), align: ['', '', '', '', 'c', 'c', 'r'] })}
      <div class="hint">${v1 ? 'Client Submission = redemption-fee payment + signed agreement, submitted together (always complete once an order appears here). Deposit XGZ is tracked separately.'
        : 'Client Submission = redemption-fee payment + signed agreement + XGZ deposit, submitted together on one page (always complete once an order appears here).'} Switch v1 / v2 in Demo controls.</div>`;
  },
});
route('/redemption/orders/:id', {
  group: 'redemption', item: 'Order List', title: 'Redemption order',
  render: ({ id }) => {
    const o = roById(id);
    if (!o) return roNotFound('/redemption/orders', 'Order List');
    const v1 = S().demo.redemptionFlow === 'v1';
    let stTxt = roStatus(o);
    if (o.stage === 'vault') stTxt = [v1 ? 'Deposit Received' : 'Submitted', 'ok'];
    let note;
    if (!o.deposit) note = banner('warn', 'Waiting for the client’s XGZ deposit', `The client approves and deposits ${xgz(o.grams)} from their bound wallet. This page updates when the deposit is confirmed on-chain.`)
      + demoInline(`<button class="demo-btn" onclick="demoDeposit('${id}')">Client deposits ${xgz(o.grams)}</button>`);
    else if (o.stage === 'history') note = banner(o.status === 'Success' ? 'ok' : 'dan', o.status === 'Success' ? 'Order completed' : `Order ${o.status.toLowerCase()}`, o.endedNote || `See <a href="#/redemption/history/${id}">History</a>.`);
    else note = banner('ok', v1 ? 'XGZ deposit confirmed' : 'Client submission received', `${v1 ? '' : 'Fee paid, agreement signed and '}${xgz(o.grams)} is held in escrow. The order is in <a href="#${{ vault: '/redemption/vault/', approval: '/redemption/approval/', escrow: '/redemption/escrow/' }[o.stage] + id}">${{ vault: 'Vault Management', approval: 'Vault Approval', escrow: 'Escrow' }[o.stage]}</a>.`);
    const canReject = ['deposit', 'vault'].includes(o.stage) && !o.pending;
    return `${backLink('Order List', '/redemption/orders')}${pageHead(`RO Order ID: ${esc(o.id)}`, '', canReject ? `<button class="btn dan" onclick="roEnd('${id}','reject')">Reject Order</button>` : '')}
      ${v1 ? stepper([['Client Submission', 'Fee paid + agreement signed'], ['Deposit XGZ', 'Client deposits XGZ into escrow']], o.deposit ? 2 : 1, { all: !!o.deposit }) : ''}
      ${statusCard(o.id, o.cref, stTxt[0], stTxt[1])}${o.pending ? waitingBanner() : ''}
      <div class="detail"><div>${escrowCard(o)}${logisticsCardRo(o)}${summaryCard(o, false)}</div><div>${clientCard(o)}${note}${agreementCardRo(o)}</div></div>`;
  },
});
function demoDeposit(id) {
  const o = roById(id);
  o.deposit = { tx: '0x' + randHex(4) + '…' + randHex(4), at: nowDash() };
  o.stage = 'vault';
  Store.save();
  refresh();
  toast('ok', 'Deposit confirmed · order moved to Vault Management');
}
/* Reject Order / Reject Stock / Cancel Order / Cancel Redemption / Accept cancellation all end the order and return XGZ */
const END_TEXT = {
  reject: ['Reject Order', 'Rejected', 'Order rejected · escrowed XGZ returned', 2],
  stock: ['Reject Stock', 'Rejected', 'Stock rejected · escrowed XGZ returned', 2],
  cancel: ['Cancel Order', 'Cancelled', 'Order cancelled by admin · escrowed XGZ returned', 3],
  accept: ['Accept cancellation request', 'Cancelled', 'Client cancellation accepted · escrowed XGZ returned, redemption fee not refunded', 3],
  redemption: ['Cancel Redemption', 'Cancelled', 'Redemption cancelled on collection day · escrowed XGZ returned', 4],
};
async function roEnd(id, kind) {
  const [title, , note] = END_TEXT[kind];
  const o = roById(id);
  const ok = await confirmDialog({ title, text: `${esc(title)} for ${id}? The order ends and ${o.deposit ? xgz(o.grams) + ' is returned to the client' : 'no XGZ needs to be returned'}. The redemption fee is not refunded.`, okText: title });
  if (!ok) return;
  await write({
    title, module: 'Redemption', ref: id, action: { type: 'ro.end', params: { id, kind } },
    mark: (ap) => { roById(id).pending = ap; }, success: `Success · ${note}`,
  });
}
Actions['ro.end'] = ({ id, kind }) => {
  const o = roById(id);
  const [, status, note, at] = END_TEXT[kind];
  Object.assign(o, { stage: 'history', status, burn: 'Void', pending: null, endedNote: note, endedAt: at, cancelTx: o.deposit ? '0x' + randHex(4) + '…' + randHex(6) : null, phase: null });
};

/* ---------------- 7.2 Vault Management ---------------- */
route('/redemption/vault', {
  group: 'redemption', item: 'Vault Management', title: 'Redemption Vault Management',
  render: () => {
    const list = S().redemption.filter((o) => ['vault', 'approval'].includes(o.stage));
    const pg = paged('roVM', list);
    return `${pageHead('Vault Management', 'Allocate bars for orders whose XGZ is already in escrow')}${flowStrip('Vault Management')}<div class="bar">${legend()}</div>
      ${table([...roHeadCells, 'Deposit XGZ', 'Stock Retrieval', 'Approval', ''], pg.rows.map((o) => [...roCells(o), st('done'), st(roStep(o, 1)), st(roStep(o, 2)), viewBtn(true, `go('/redemption/vault/${o.id}')`)]),
        { pager: pager('roVM', pg), align: ['', '', '', '', 'c', 'c', 'c', 'r'] })}`;
  },
});
UI.sr = {};
route('/redemption/vault/:id', {
  group: 'redemption', item: 'Vault Management', title: 'Stock retrieval',
  render: ({ id }) => {
    const o = roById(id);
    if (!o) return roNotFound('/redemption/vault', 'Vault Management');
    const [stTxt, stK] = roStatus(o);
    let left;
    if (o.stage === 'vault' && !o.pending) {
      const s = UI.sr[id] || (UI.sr[id] = { rows: [{ brand: '', serial: '', weight: '', coa: '' }], errors: {} });
      const brands = S().settings.brands.map((b) => b.name);
      const total = s.rows.reduce((a, r) => a + (isNum(r.weight) ? toNum(r.weight) : 0), 0);
      const e = s.errors;
      const qty = o.items[0].qty;
      left = card('Stock Retrieval Summary', `
        <div class="tbl"><table><thead><tr><th>Brand</th><th>Serial No.</th><th>Weight (g)</th><th>COA Certificate No.</th><th></th></tr></thead><tbody>
        ${s.rows.map((r, i) => `<tr><td style="height:auto;padding:8px 10px;vertical-align:top"><div class="input ${e['b' + i] ? 'err' : ''}"><select onchange="UI.sr['${id}'].rows[${i}].brand=this.value"><option value="">Select brand</option>${brands.map((b) => `<option ${r.brand === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>${ic('chevron-down', 14)}</div>${e['b' + i] ? `<span class="ferr" style="margin-top:4px">${ic('circle-alert', 12)}Brand is required</span>` : ''}</td>
          <td style="height:auto;padding:8px 10px;vertical-align:top"><div class="input mono ${e['s' + i] ? 'err' : ''}"><input value="${esc(r.serial)}" placeholder="Insert Serial No." oninput="UI.sr['${id}'].rows[${i}].serial=this.value"></div>${e['s' + i] ? `<span class="ferr" style="margin-top:4px">${ic('circle-alert', 12)}Serial No. is required</span>` : ''}</td>
          <td style="height:auto;padding:8px 10px;vertical-align:top;width:130px"><div class="input mono ${e['w' + i] ? 'err' : ''}"><input value="${esc(r.weight)}" placeholder="Weight" oninput="UI.sr['${id}'].rows[${i}].weight=this.value" onblur="refresh()"></div>${e['w' + i] ? `<span class="ferr" style="margin-top:4px">${ic('circle-alert', 12)}Enter a number</span>` : ''}</td>
          <td style="height:auto;padding:8px 10px;vertical-align:top"><div class="input mono"><input value="${esc(r.coa)}" placeholder="Insert COA Certificate No." oninput="UI.sr['${id}'].rows[${i}].coa=this.value"></div></td>
          <td style="height:auto;padding:8px 10px;vertical-align:top;width:40px">${s.rows.length > 1 ? `<button class="rowmenu" title="Remove row" onclick="UI.sr['${id}'].rows.splice(${i},1);refresh()">${ic('trash-2', 15)}</button>` : ''}</td></tr>`).join('')}
        </tbody></table></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><button class="btn sec sm" onclick="UI.sr['${id}'].rows.push({brand:'',serial:'',weight:'',coa:''});refresh()">${ic('plus', 14)}Add</button>
          <button class="demo-btn" onclick="demoStock('${id}')">${ic('sparkles', 13)}Fill demo bars</button></div>
        <div class="hr"></div>
        ${kv([['Totals · Weight (g)', fmtN(total, 3), { mono: true }], ['Requested', fmtInt(o.grams) + ' g', { mono: true }], ['Bars', `${s.rows.length} of ${qty} requested`]], 3)}
        ${e.match ? banner('dan', 'Bars do not match the request', e.match) : `<div class="hint">Bars must match the requested ${qty} × ${esc(o.items[0].type)}.</div>`}
        ${dropZone('so-' + id, 'Upload Vault Stock-Out-Summary', { req: true, err: e.file, sample: `Stock-Out-Summary-${id}.pdf` })}
        <div style="display:flex;justify-content:flex-end"><button class="btn pri" onclick="submitStock('${id}')">Submit</button></div>`, { right: '' });
    } else {
      left = (o.pending ? waitingBanner() : banner('ok', 'Stock prepared', o.stage === 'approval' ? `Waiting for <a href="#/redemption/approval/${id}">Vault Approval</a>.` : 'Stock retrieval is complete.'))
        + card('Stock Retrieval Summary', `${o.retrieved.length ? table(['Brand', 'Serial No.', 'Weight (g)', 'COA Certificate No.'], o.retrieved.map((b) => [esc(b.brand), mono(b.serial), mono(b.weight), mono(b.coa)]), { compact: true }) : '<div class="hint">Not retrieved yet.</div>'}${o.stockOut ? doc(o.stockOut, 'Vault Stock-Out-Summary') : ''}`);
    }
    return `${backLink('Vault Management', '/redemption/vault')}${pageHead(`RO Order ID: ${esc(o.id)}`)}
      ${stepper([['Preparing Stock', 'Vault allocates the bars'], ['Stock Approval', 'Ops checks the retrieved stock']], o.stage === 'vault' ? 0 : o.stage === 'approval' ? 1 : 2, { all: !['vault', 'approval'].includes(o.stage) })}
      ${statusCard(o.id, o.cref, stTxt, stK)}
      <div class="detail"><div>${left}</div><div>${summaryCard(o, false)}${logisticsCardRo(o)}${o.deposit ? depositedBanner(o) : ''}</div></div>`;
  },
});
function demoStock(id) {
  const o = roById(id);
  const n = o.items[0].qty;
  UI.sr[id] = { rows: Array.from({ length: n }, (_, i) => ({ brand: 'PAMP', serial: `HK-00391${pad2(i + 2)}`, weight: '999.999', coa: `COA-PA-6122${i}` })), errors: {} };
  FileSlots['so-' + id] = { name: `Stock-Out-Summary-${id}.pdf`, meta: 'PDF · 0.9 MB · uploaded just now' };
  refresh();
}
async function submitStock(id) {
  const o = roById(id), s = UI.sr[id];
  const e = {};
  s.rows.forEach((r, i) => {
    if (!r.brand) e['b' + i] = true;
    if (!r.serial.trim()) e['s' + i] = true;
    if (!isNum(r.weight)) e['w' + i] = true;
  });
  const qty = o.items[0].qty;
  const total = s.rows.reduce((a, r) => a + (isNum(r.weight) ? toNum(r.weight) : 0), 0);
  const perBar = o.items[0].weight / qty;
  if (s.rows.length !== qty) e.match = `The request is ${qty} × ${o.items[0].type}; ${s.rows.length} bar(s) entered.`;
  else if (Math.abs(total - o.grams) > qty * perBar * 0.001) e.match = `Retrieved weight ${fmtN(total, 3)} g is outside the tolerance for ${fmtInt(o.grams)} g.`;
  if (!FileSlots['so-' + id]) e.file = 'Please upload the Vault Stock-Out-Summary';
  s.errors = e;
  if (Object.keys(e).length) { refresh(); if (Object.keys(e).some((k) => /^s\d/.test(k))) toast('dan', 'Serial No. is required'); return; }
  await write({
    title: 'Submit stock retrieval', module: 'Redemption', ref: id, action: { type: 'ro.stock', params: { id, rows: s.rows, file: FileSlots['so-' + id].name } },
    mark: (ap) => { o.pending = ap; }, success: `Success · stock submitted, ${id} moved to Vault Approval`,
    after: () => { delete UI.sr[id]; delete FileSlots['so-' + id]; },
  });
}
Actions['ro.stock'] = ({ id, rows, file }) => { const o = roById(id); o.retrieved = rows.map((r) => ({ ...r, weight: fmtN(toNum(r.weight), 3) })); o.stockOut = file; o.stage = 'approval'; o.pending = null; };

/* ---------------- 7.3 Vault Approval ---------------- */
route('/redemption/approval', {
  group: 'redemption', item: 'Vault Approval', title: 'Vault Approval',
  render: () => {
    const list = S().redemption.filter((o) => ['vault', 'approval'].includes(o.stage));
    const pg = paged('roVA', list);
    return `${pageHead('Vault Approval', 'Approve the retrieved stock')}${flowStrip('Vault Approval')}<div class="bar">${legend()}</div>
      ${table([...roHeadCells, 'Deposit XGZ', 'Stock Retrieval', 'Approval', ''], pg.rows.map((o) => [...roCells(o), st('done'), st(roStep(o, 1)), st(roStep(o, 2)), viewBtn(o.stage === 'approval', `go('/redemption/approval/${o.id}')`)]),
        { pager: pager('roVA', pg), align: ['', '', '', '', 'c', 'c', 'c', 'r'] })}`;
  },
});
route('/redemption/approval/:id', {
  group: 'redemption', item: 'Vault Approval', title: 'Vault Approval',
  render: ({ id }) => {
    const o = roById(id);
    if (!o) return roNotFound('/redemption/approval', 'Vault Approval');
    const [stTxt, stK] = roStatus(o);
    const decision = o.stage !== 'approval' ? banner('ok', 'Stock decided', `This order is at ${esc(stTxt)}.`)
      : o.pending ? waitingBanner()
        : card('Stock decision', `<div class="cd" style="margin-top:0">Approving moves the order to Escrow and tells the client the bars are ready. Rejecting ends the order and returns the escrowed XGZ.</div>
          <div style="display:flex;gap:10px"><button class="btn pri" onclick="approveStock('${id}')">Approve Stock</button><button class="btn dan" onclick="roEnd('${id}','stock')">Reject Stock</button></div>`);
    return `${backLink('Vault Approval', '/redemption/approval')}${pageHead(`RO Order ID: ${esc(o.id)}`)}
      ${stepper([['Preparing Stock', 'Vault allocates the bars'], ['Stock Approval', 'Ops checks the retrieved stock']], 1, { all: o.stage !== 'approval' })}
      ${statusCard(o.id, o.cref, stTxt, stK)}
      <div class="detail"><div>${summaryCard(o)}${logisticsCardRo(o)}${clientCard(o)}</div><div>${o.deposit ? depositedBanner(o) : ''}${supportCard(o)}${decision}</div></div>`;
  },
});
async function approveStock(id) {
  await write({
    title: 'Approve Stock', module: 'Redemption', ref: id, action: { type: 'ro.approveStock', params: { id } },
    mark: (ap) => { roById(id).pending = ap; }, success: `Success · stock approved, ${id} moved to Escrow`,
  });
}
Actions['ro.approveStock'] = ({ id }) => { const o = roById(id); Object.assign(o, { stage: 'escrow', phase: 'grace', pending: null, timerTo: Date.now() + ((4 * 24 + 14) * 60 + 22) * 60000 }); };

/* ---------------- 7.4 Escrow ---------------- */
const collStatus = (o) => ({ grace: ['Scheduled', 'info'], lock: ['Scheduled', 'info'], cancelreq: ['Cancel requested', 'warn'], collect: ['Collection today', 'warn'], confirm: ['Collected', 'ok'] }[o.phase] || ['—', 'n']);
route('/redemption/escrow', {
  group: 'redemption', item: 'Escrow', title: 'Escrow',
  render: () => {
    const list = S().redemption.filter((o) => o.stage === 'escrow');
    const pg = paged('roES', list);
    return `${pageHead('Escrow', 'Process escrow until collection, upload the receipt, then release funds')}${flowStrip('Escrow')}<div class="bar">${legend()}</div>
      ${table(['Applied Date', 'Business / Contact Name', 'Reference / Client Ref. ID', 'Deposit XGZ', 'Process Escrow', 'Receipt Upload', 'Release', 'Collection Status', 'Collection Date', ''], pg.rows.map((o) => {
        const [cs, ck] = collStatus(o);
        return [mono(o.applied), two(roName(o), roCo(o).contact), two(o.id, o.cref, true), st('done'), st(roStep(o, 3)), st(roStep(o, 4)), st(roStep(o, 5)), pill(cs, ck), mono(o.collection), viewBtn(true, `go('/redemption/escrow/${o.id}')`)];
      }), { pager: pager('roES', pg), align: ['', '', '', 'c', 'c', 'c', 'c', '', '', 'r'], empty: 'No orders in escrow. Approve stock in Vault Approval to move an order here.' })}`;
  },
});
let roTimer = null;
function timerHtml(to) {
  const ms = Math.max(0, to - Date.now());
  const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4), s = Math.floor((ms % 6e4) / 1e3);
  return [[d, 'days'], [h, 'hrs'], [m, 'min'], [s, 'sec']].map(([v, l]) => `<div><b>${pad2(v)}</b><small>${l}</small></div>`).join('');
}
UI.rc = {};
route('/redemption/escrow/:id', {
  group: 'redemption', item: 'Escrow', title: 'Escrow',
  render: ({ id }) => {
    const o = roById(id);
    if (!o) return roNotFound('/redemption/escrow', 'Escrow');
    const [stTxt, stK] = roStatus(o);
    const done = o.stage === 'history';
    const cur = done ? 4 : { grace: 0, cancelreq: 0, lock: 0, collect: 1, confirm: 2 }[o.phase];
    let top = '', action = '';
    if (done) {
      top = o.status === 'Success' ? banner('ok', 'Funds released', `${xgz(o.grams)} released · tx ${o.releaseTx}`) : banner('dan', `Order ${o.status.toLowerCase()}`, o.endedNote || '');
    } else if (o.pending) action = waitingBanner();
    else if (o.phase === 'grace') {
      action = card('Order Timer (Grace Period)', `<div class="timer" id="ro-timer" data-to="${o.timerTo}">${timerHtml(o.timerTo)}</div>
        <div class="hint">The client can change the collection date or cancel up to 72 hours before the collection date/time. After that the Lock Period starts.</div>
        <button class="btn dan full" onclick="roEnd('${id}','cancel')">Cancel Order</button>
        ${demoInline(`<button class="demo-btn" onclick="roPhase('${id}','cancelreq')">Client requests cancellation</button><button class="demo-btn" onclick="roPhase('${id}','lock')">Jump to Lock Period (72 h before)</button>`)}`, { right: ic('timer', 18, 'opacity:.6') });
    } else if (o.phase === 'cancelreq') {
      action = card('Order Cancellation Request', `<div class="cd" style="margin-top:0">The client of <b class="mono">${esc(id)}</b> has requested to cancel. Accepting returns the escrowed XGZ; the redemption fee is not refunded.</div>
        <div style="display:flex;gap:10px"><button class="btn pri" onclick="roEnd('${id}','accept')">Accept Request</button><button class="btn sec" onclick="denyCancel('${id}')">Deny Request</button></div>`);
    } else if (o.phase === 'lock') {
      action = card('Order Timer (Lock Period)', `<div class="timer" id="ro-timer" data-to="${o.timerTo}">${timerHtml(o.timerTo)}</div>
        <div class="hint">The Lock Period started 72 h before collection. The collection date can no longer be changed. Upload Receipt opens on the collection day.</div>
        ${banner('info', `Waiting for collection day · ${esc(o.collection)}`)}
        ${demoInline(`<button class="demo-btn" onclick="roPhase('${id}','collect')">Collection day arrives</button>`)}`, { right: ic('timer', 18, 'opacity:.6') });
    } else if (o.phase === 'collect') action = receiptForm(o);
    else if (o.phase === 'confirm') {
      top = card('Release Funds', `<div class="cd" style="margin-top:0">Receipt uploaded and gold collected. Release the escrowed ${xgz(o.grams)} to GoldZip for burning.</div><div><button class="btn pri" onclick="releaseFunds('${id}')">Release Funds</button></div>`);
    }
    const receipt = o.receipt ? card('Receipt', `<div class="cd" style="margin-top:0">Receipt No. ${esc(o.receipt.no)} · collected ${esc(o.receipt.at)} · uploaded ${esc(o.receipt.uploadedAt)}</div>${o.receipt.files.map((f) => doc(f.name, f.meta)).join('')}${o.receipt.remarks ? `<div class="hint">Remarks: ${esc(o.receipt.remarks)}</div>` : ''}`) : '';
    return `${backLink('Escrow', '/redemption/escrow')}${pageHead(`RO Order ID: ${esc(o.id)}`)}${top}
      ${stepper([['Process Escrow', 'Grace period until collection'], ['Upload Receipt', 'Collection receipt on the day'], ['Confirmation', 'Release funds'], ['Completed', 'Funds released']], cur, { all: done && o.status === 'Success', fail: done && o.status !== 'Success' })}
      ${statusCard(o.id, o.cref, stTxt, stK)}
      <div class="detail"><div>${escrowCard(o)}${logisticsCardRo(o)}${summaryCard(o)}</div><div>${action}${receipt}</div></div>`;
  },
  after: () => {
    clearInterval(roTimer);
    const el = $('#ro-timer');
    if (el) roTimer = setInterval(() => { const t = $('#ro-timer'); if (!t) { clearInterval(roTimer); return; } t.innerHTML = timerHtml(+t.dataset.to); }, 1000);
  },
});
function roPhase(id, phase) {
  const o = roById(id);
  o.phase = phase;
  if (phase === 'lock') o.timerTo = Date.now() + (22 * 60 + 10) * 60000;
  Store.save();
  refresh();
  toast('info', { cancelreq: 'Client requested to cancel the order', lock: 'Lock Period started · the collection date can no longer change', collect: 'Collection day · Upload Receipt is open' }[phase]);
}
async function denyCancel(id) {
  await write({
    title: 'Deny cancellation request', module: 'Redemption', ref: id, action: { type: 'ro.deny', params: { id } },
    mark: (ap) => { roById(id).pending = ap; }, success: 'Success · cancellation denied, the order continues',
  });
}
Actions['ro.deny'] = ({ id }) => { const o = roById(id); o.phase = 'grace'; o.pending = null; };

function receiptForm(o) {
  const id = o.id;
  const r = UI.rc[id] || (UI.rc[id] = { idCheck: false, no: '', at: '', files: [], remarks: '', errors: {} });
  const e = r.errors;
  return card('Upload Receipt', `<div class="cd" style="margin-top:0">Collection day. Check the authorised person’s ID against the Redemption Instruction, then upload the receipt files as proof of collection.</div>
    <label class="check ${e.idCheck ? 'err' : ''}"><input type="checkbox" ${r.idCheck ? 'checked' : ''} onchange="UI.rc['${id}'].idCheck=this.checked"><span>ID/Passport of ${esc(o.person.name)} (${esc(o.person.id)}) checked at the vault</span></label>
    ${e.idCheck ? `<span class="ferr">${ic('circle-alert', 12)}Confirm the ID check</span>` : ''}
    <div class="grid g2">${field('rc-no', 'Receipt No.', { req: true, mono: true, value: r.no, err: e.no, oninput: `UI.rc['${id}'].no=this.value` })}${field('rc-at', 'Collected at (UTC+8)', { req: true, type: 'datetime-local', value: r.at, err: e.at, attrs: `onchange="UI.rc['${id}'].at=this.value"` })}</div>
    <div class="field"><span class="flabel"><span>Upload receipt files for proof<span class="req"> *</span></span><span class="muted" style="font-weight:500">${r.files.length} of 10 files</span></span>
      <span class="hint" style="margin-top:-2px">Signed collection receipt, ID check photo and handover photo. PDF, JPG or PNG · max 10 MB each.</span>
      ${r.files.map((f, i) => `<div class="file">${ic('file-check-2', 18)}<div class="fn"><b>${esc(f.name)}</b><small>${esc(f.meta)}</small></div><div class="acts"><button class="link" onclick="previewDoc('${esc(f.name)}')">Preview</button><button class="link dan" onclick="UI.rc['${id}'].files.splice(${i},1);refresh()">Remove</button></div></div>`).join('')}
      ${r.files.length < 10 ? `<div class="drop ${e.files ? 'err' : ''}" onclick="pickReceipts('${id}')">${ic('cloud-upload', 22)}<b>${r.files.length ? 'Drop more files or' : 'Drop files here or'} <span>browse</span></b><small>PDF, JPG or PNG · max 10 MB each</small></div>` : ''}
      ${e.files ? `<span class="ferr">${ic('circle-alert', 12)}${e.files}</span>` : ''}</div>
    ${field('rc-rem', 'Remarks', { area: true, value: r.remarks, ph: 'Optional', attrs: '' })}
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <button class="demo-btn" onclick="demoReceipt('${id}')">${ic('sparkles', 13)}Fill demo receipt</button>
      <div style="display:flex;gap:10px"><button class="btn dan" onclick="roEnd('${id}','redemption')">Cancel Redemption</button><button class="btn pri" onclick="confirmRedemption('${id}')">Confirm Redemption</button></div></div>`);
}
function pickReceipts(id) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.multiple = true; inp.accept = '.pdf,.jpg,.jpeg,.png';
  inp.onchange = () => {
    const r = UI.rc[id];
    r.remarks = val('rc-rem');
    for (const f of inp.files) {
      if (r.files.length >= 10) { toast('dan', 'Up to 10 files'); break; }
      if (f.size > 10 * 1048576) { toast('dan', `${f.name} is larger than 10 MB`); continue; }
      if (!/\.(pdf|jpe?g|png)$/i.test(f.name)) { toast('dan', `${f.name}: PDF, JPG or PNG only`); continue; }
      r.files.push({ name: f.name, meta: `${f.name.split('.').pop().toUpperCase()} · ${(f.size / 1048576).toFixed(1)} MB` });
    }
    r.errors.files = null;
    refresh();
  };
  inp.click();
}
function demoReceipt(id) {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  const o = roById(id);
  UI.rc[id] = { idCheck: true, no: `RCPT-COL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${id.slice(-4)}`, at: d.toISOString().slice(0, 16),
    files: [{ name: `Collection-Receipt-${id}.pdf`, meta: `PDF · 0.4 MB · signed by ${o.person.name}` }, { name: `ID-check-${o.person.name.replace(/ /g, '-')}.jpg`, meta: 'JPG · 1.2 MB' }, { name: 'Handover-photo-HKGX-Vault.jpg', meta: 'JPG · 2.8 MB' }],
    remarks: `${o.items[0].qty} × ${o.items[0].type} handed over, serials checked.`, errors: {} };
  refresh();
}
async function confirmRedemption(id) {
  const r = UI.rc[id];
  r.no = val('rc-no'); r.at = val('rc-at'); r.remarks = val('rc-rem');
  const e = {};
  if (!r.idCheck) e.idCheck = true;
  if (!r.no) e.no = 'Required';
  if (!r.at) e.at = 'Required';
  if (!r.files.length) e.files = 'Upload at least one receipt file';
  r.errors = e;
  if (Object.keys(e).length) { refresh(); return; }
  const receipt = { no: r.no, at: r.at.replace('T', ' '), uploadedAt: nowDash().slice(0, 16), files: r.files, remarks: r.remarks };
  await write({
    title: 'Confirm Redemption (receipt)', module: 'Redemption', ref: id, action: { type: 'ro.receipt', params: { id, receipt } },
    mark: (ap) => { roById(id).pending = ap; }, success: 'Success · receipt uploaded, release the funds to finish',
    after: () => delete UI.rc[id],
  });
}
Actions['ro.receipt'] = ({ id, receipt }) => { const o = roById(id); o.receipt = receipt; o.phase = 'confirm'; o.pending = null; };
async function releaseFunds(id) {
  await write({
    title: 'Release Funds', module: 'Redemption', ref: id, action: { type: 'ro.release', params: { id } },
    mark: (ap) => { roById(id).pending = ap; }, success: 'Success · funds released, order moved to History',
  });
}
Actions['ro.release'] = ({ id }) => { const o = roById(id); Object.assign(o, { stage: 'history', status: 'Success', burn: 'NotStarted', releaseTx: '0x' + randHex(4) + '…' + randHex(6), phase: null, pending: null }); };

/* ---------------- 7.5 History and burn ---------------- */
const burnPill = (b) => pill(b, { NotStarted: 'n', WaitingApproval: 'warn', ApprovalSuccess: 'info', Completed: 'ok', Void: 'n' }[b]);
route('/redemption/history', {
  group: 'redemption', item: 'History', title: 'Redemption History',
  render: () => {
    UI.rhBurn = UI.rhBurn ?? '';
    const list = S().redemption.filter((o) => o.stage === 'history' && (!UI.rhBurn || o.burn === UI.rhBurn));
    const pg = paged('roH', list);
    return `${pageHead('History', 'Completed and ended redemption orders')}${flowStrip('History')}
      <div class="bar"><label class="sel"><span>Burn Processed</span><select onchange="UI.rhBurn=this.value;refresh()">${['', 'NotStarted', 'WaitingApproval', 'ApprovalSuccess', 'Completed', 'Void'].map((b) => `<option value="${b}" ${UI.rhBurn === b ? 'selected' : ''}>${b || 'All'}</option>`).join('')}</select>${ic('chevron-down', 14)}</label></div>
      ${table([...roHeadCells, 'Token Amount', 'Status', 'Burn Processed', ''], pg.rows.map((o) => [...roCells(o), mono(fmtInt(o.grams) + ' XGZ'), pill(o.status, o.status === 'Success' ? 'ok' : 'dan'), burnPill(o.burn), viewBtn(true, `go('/redemption/history/${o.id}')`)]),
        { pager: pager('roH', pg), align: ['', '', '', '', 'r', '', '', 'r'] })}
      <div class="hint">Burn Processed: NotStarted → WaitingApproval → ApprovalSuccess → Completed. Void = rejected or cancelled orders (nothing to burn).</div>`;
  },
});
route('/redemption/history/:id', {
  group: 'redemption', item: 'History', title: 'Redemption History',
  render: ({ id }) => {
    const o = roById(id);
    if (!o) return roNotFound('/redemption/history', 'History');
    if (o.stage !== 'history') return `${backLink('History', '/redemption/history')}${banner('info', 'Order still in progress', `Open it in <a href="#/redemption/orders/${id}">Order List</a>.`)}`;
    let burn;
    const tx = S().txRequests.find((t) => t.ref === id && t.status === 'pending');
    if (o.burn === 'Void') burn = `<div class="hint">${esc(o.endedNote || 'Rejected or cancelled order')} · nothing to burn.</div>`;
    else if (o.burn === 'NotStarted') burn = `<button class="btn pri" onclick="burnWizard('${id}')">Burn Token Request</button>`;
    else if (o.burn === 'WaitingApproval') burn = banner('warn', 'Waiting for approvals', tx ? `Approved. Signers execute the burn in <a href="#/transactions">Transaction Requests</a> (${tx.id}).` : 'The burn request is with approvers in <a href="#/approvals">Approvals</a>, then the signers in Transaction Requests.');
    else if (o.burn === 'ApprovalSuccess') burn = o.pending ? waitingBanner() : `<div class="hint">The burn transaction was executed on-chain. Confirm to complete.</div><button class="btn pri" onclick="confirmBurn('${id}')">Confirm</button>`;
    else burn = banner('ok', 'Burn completed', `${fmtInt(o.grams)} XGZ burned${o.burnTx ? ' · tx ' + esc(o.burnTx) : ''}.`);
    return `${backLink('History', '/redemption/history')}${pageHead(`RO Order ID: ${esc(o.id)} ${pill(o.status, o.status === 'Success' ? 'ok' : 'dan')}`)}
      ${statusCard(o.id, o.cref, o.status === 'Success' ? 'Completed' : o.status, o.status === 'Success' ? 'ok' : 'dan')}
      ${o.status !== 'Success' ? banner('dan', o.endedNote || 'Order ended') : ''}
      <div class="detail"><div>${escrowCard(o)}${summaryCard(o)}${clientCard(o)}</div>
        <div>${card('Burn', `${kv([['Burn Processed', burnPill(o.burn), { html: true }], ['Burn Amount', o.burn === 'Void' ? '—' : fmtInt(o.grams) + ' XGZ', { mono: true }]], 2)}${burn}`)}
        ${o.receipt ? card('Receipt', o.receipt.files.map((f) => doc(f.name, f.meta)).join('')) : ''}</div></div>`;
  },
});
const BURN_SIGNERS = {
  owner: [{ name: 'GoldZip Treasury', addr: '0x51A2…c09E' }],
  trustee: [{ name: 'Trustee — HK Trust Co.', addr: '0x2F9c…7a30' }, { name: 'Trustee — backup', addr: '0xC41d…e5F2' }],
  admin: SIGNERS.admin,
};
UI.bw = null;
function burnWizard(id) {
  UI.bw = { id, step: 1, mode: 'ownerTrustee', owner: ['GoldZip Treasury'], trustee: ['Trustee — HK Trust Co.'], admin: [], err: '' };
  openModal(burnHtml(), { dismiss: false });
}
function burnSignerList(group, req, label) {
  const w = UI.bw;
  return `<div class="field"><span class="flabel"><span>${label} · ${req} of ${req} required</span><span class="muted" style="font-weight:500">${w[group].length} selected</span></span>
    ${BURN_SIGNERS[group].map((s) => `<label class="signer"><input type="checkbox" ${w[group].includes(s.name) ? 'checked' : ''} onchange="bwToggle('${group}','${s.name}',this.checked)"><b>${s.name}</b><small>${s.addr}</small></label>`).join('')}</div>`;
}
function bwToggle(g, n, on) { const w = UI.bw; w[g] = on ? [...w[g], n] : w[g].filter((x) => x !== n); w.err = ''; updateModal(burnHtml()); }
function burnHtml() {
  const w = UI.bw, o = roById(w.id);
  let body, foot;
  if (w.step === 1) {
    body = `<div class="grid g2">${field('bw-token', 'Token', { options: ['XGZ'], disabled: true })}<div class="kv" style="grid-template-columns:repeat(3,1fr);align-content:center">
      <div><span>Amount Circ.</span><b class="mono">${fmtInt(S().dashboard.circ)}</b></div><div><span>Max Supply</span><b class="mono">1,000,000</b></div><div><span>Balance</span><b class="mono">${fmtInt(o.grams)}</b></div></div></div>
      ${field('bw-amt', 'Amount', { readonly: true, value: fmtInt(o.grams), hint: 'Locked to the released escrow amount (1 g = 1 XGZ).' })}`;
    foot = `<button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn pri" onclick="UI.bw.step=2;updateModal(burnHtml())">Next</button>`;
  } else if (w.step === 2) {
    body = `<div class="hint">The XGZ wallet is a multisig. Pick enough signers to meet its threshold.</div>
      <div class="grid g2"><label class="radio-card"><input type="radio" name="bw-mode" ${w.mode === 'admin' ? 'checked' : ''} onchange="UI.bw.mode='admin';UI.bw.err='';updateModal(burnHtml())"><span><b>Admin mode</b><small>Admin signers · 2 of 3</small></span></label>
      <label class="radio-card"><input type="radio" name="bw-mode" ${w.mode === 'ownerTrustee' ? 'checked' : ''} onchange="UI.bw.mode='ownerTrustee';UI.bw.err='';updateModal(burnHtml())"><span><b>Owner + Trustee mode</b><small>Owner 1 of 1 · Trustee 1 of 1</small></span></label></div>
      ${w.mode === 'admin' ? burnSignerList('admin', 2, 'Admin') : burnSignerList('owner', 1, 'Owner') + burnSignerList('trustee', 1, 'Trustee')}
      ${w.err ? `<span class="ferr">${ic('circle-alert', 12)}${w.err}</span>` : ''}`;
    foot = `<button class="btn sec" onclick="UI.bw.step=1;updateModal(burnHtml())">Back</button><button class="btn pri" onclick="bwNext()">Next</button>`;
  } else {
    const appr = w.mode === 'admin' ? [['Admin', w.admin.join(', ')]] : [['Owner', w.owner.join(', ')], ['Trustee', w.trustee.join(', ')]];
    body = `${kv([['Wallet', '0xGZ1s…Issuer · Multisig', { mono: true }], ['Token', 'XGZ'], ['Balance', fmtInt(o.grams) + ' XGZ', { mono: true }], ['Burn Amount', fmtInt(o.grams) + ' XGZ', { mono: true }]], 2)}
      <div class="hr"></div>${subh('Approvers')}${kv(appr, 2)}
      ${banner('info', 'After confirming', 'Burn Processed becomes WaitingApproval. It is approved in Approvals and signed in Transaction Requests.')}`;
    foot = `<button class="btn sec" onclick="UI.bw.step=2;updateModal(burnHtml())">Back</button><button class="btn pri" onclick="bwConfirm()">Confirm</button>`;
  }
  return modalFrame({ title: 'Burn Token', sub: wizHead(['Basic Information', 'Approvers', 'Preview'], w.step), body, foot, width: 620 });
}
function bwNext() {
  const w = UI.bw;
  const ok = w.mode === 'admin' ? w.admin.length >= 2 : w.owner.length >= 1 && w.trustee.length >= 1;
  if (!ok) { w.err = w.mode === 'admin' ? 'Select 2 Admin signers' : 'Select 1 Owner and 1 Trustee'; updateModal(burnHtml()); return; }
  w.step = 3;
  updateModal(burnHtml());
}
async function bwConfirm() {
  const w = UI.bw, o = roById(w.id);
  const pick = (g, role) => w[g].map((n) => ({ role, name: n, addr: BURN_SIGNERS[g].find((s) => s.name === n).addr }));
  const signers = w.mode === 'admin' ? pick('admin', 'Admin') : [...pick('owner', 'Owner'), ...pick('trustee', 'Trustee')];
  closeModal();
  await write({
    title: 'Burn token request', module: 'Redemption', ref: o.id, forceApproval: true, action: { type: 'burn.approve', params: { id: o.id, signers } },
    mark: () => { o.burn = 'WaitingApproval'; }, pending: 'Awaiting Approval · burn request sent to Approvals',
  });
}
Actions['burn.approve'] = ({ id, signers }) => {
  const o = roById(id);
  createTxRequest('Burn', id, o.grams, '—', signers || [{ role: 'Owner', name: 'GoldZip Treasury', addr: '0x51A2…c09E' }, { role: 'Trustee', name: 'Trustee — HK Trust Co.', addr: '0x2F9c…7a30' }]);
  o.burn = 'WaitingApproval';
};
Actions['burn.executed'] = ({ id, tx }) => { const o = roById(id); o.burn = 'ApprovalSuccess'; o.burnTx = tx.hash; };
async function confirmBurn(id) {
  await write({
    title: 'Confirm burn', module: 'Redemption', ref: id, action: { type: 'burn.confirm', params: { id } },
    mark: (ap) => { roById(id).pending = ap; }, success: `Success · burn completed for ${id}`,
  });
}
Actions['burn.confirm'] = ({ id }) => { const o = roById(id); o.burn = 'Completed'; o.pending = null; S().dashboard.circ -= o.grams; };
