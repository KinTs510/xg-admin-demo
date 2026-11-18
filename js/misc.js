/* GoldZip Admin Portal — static demo
   misc.js: Dashboard, Approvals, Transaction Requests, 404. */
'use strict';

/* ---------------- Dashboard ---------------- */
UI.dash = UI.dash || { tab: 'wallet', method: '', from: '', to: '' };
route('/dashboard', {
  group: 'dashboard', title: 'Dashboard', crumb: ['Dashboard'],
  render: () => {
    const d = S(), db = d.dashboard, f = UI.dash;
    const tabsDef = [['wallet', 'Wallet Transactions'], ['holders', 'Token Holders'], ['tokens', 'Wallet Tokens'], ['token', 'Token Transactions']];
    const inRange = (t) => {
      const day = t.slice(0, 10);
      return (!f.from || day >= f.from) && (!f.to || day <= f.to);
    };
    let head, rows, csv;
    if (f.tab === 'wallet' || f.tab === 'token') {
      const src = (f.tab === 'wallet' ? db.walletTx : db.tokenTx).filter((t) => (!f.method || t.method === f.method) && inRange(t.time));
      head = ['TX hash', 'Method', 'Value', 'Send', 'Receive', 'Timestamp'];
      const lnk = (t) => `<span class="lnk" style="text-decoration:none">${esc(t)}</span>`;
      rows = src.map((t) => [`<span class="lnk" style="text-decoration:none" title="${t.hash}">${shortHash(t.hash)}</span>`, esc(t.method),
        typeof t.value === 'number' ? `${fmtInt(t.value)} XGZ` : esc(t.value), lnk(t.from), lnk(t.to), esc(t.time.replace(/-/g, '/'))]);
      csv = [head, ...src.map((t) => [t.hash, t.method, t.value, t.from, t.to, t.time])];
    } else if (f.tab === 'holders') {
      head = ['Rank', 'Address', 'Quantity (XGZ)', 'Percentage', 'Value (USD)'];
      rows = db.tokenHolders.map((h) => [esc(h.rank), `<span class="lnk" style="text-decoration:none">${esc(h.address)}</span>`, fmtN(h.qty, 4), h.pct.toFixed(2) + '%', '$' + fmtN(h.usd)]);
      csv = [head, ...db.tokenHolders.map((h) => [h.rank, h.address, h.qty, h.pct.toFixed(4), h.usd.toFixed(2)])];
    } else {
      head = ['Token', 'Contract Address', 'Balance', 'Value (USD)'];
      rows = db.walletTokens.map((t) => [esc(t.token), t.contract === 'Native' ? '—' : `<span class="lnk" style="text-decoration:none">${esc(t.contract)}</span>`, esc(t.balance), '$' + fmtN(t.usd)]);
      csv = [head, ...db.walletTokens.map((t) => [t.token, t.contract, t.balance, t.usd])];
    }
    UI.dashCsv = csv;
    const showFilter = f.tab === 'wallet' || f.tab === 'token';
    const pg = paged('dash-' + f.tab, rows);
    const tabLabel = tabsDef.find(([k]) => k === f.tab)[1];
    return `<div class="dash-head">${ic('house', 32)}<h1>Dashboard</h1></div>
      <div style="height:12px"></div>
      <div class="seg lg">${tabsDef.map(([k, l]) => `<button class="${f.tab === k ? 'on' : ''}" onclick="UI.dash.tab='${k}';UI.dash.method='';refresh()">${l}</button>`).join('')}</div>
      <div class="dash-body">
        <div class="dh2"><h2>${tabLabel}</h2><div class="bar" style="gap:14px">
          ${showFilter ? `<button class="btn outline" onclick="dashFilter(this)">Filter${f.method || f.from || f.to ? ' · on' : ''}${ic('chevron-down', 18, 'margin-left:22px;opacity:.7')}</button>` : ''}
          <button class="btn sec" ${rows.length ? 'onclick="exportDashCsv()"' : 'disabled'}>${ic('download', 18)}Export to CSV</button></div></div>
        ${table(head, pg.rows, { pager: rows.length ? pager('dash-' + f.tab, pg) : '' })}
        ${showFilter ? demoInline(`Set a filter that matches nothing (for example a future date) to see the empty state: “No records to display” and a disabled Export.`) : ''}
      </div>`;
  },
});
function dashFilter(el) {
  const f = UI.dash;
  const methods = f.tab === 'token' ? ['Mint', 'Transfer', 'Burn'] : ['Transfer', 'Approve', 'Execute'];
  openModal(modalFrame({
    title: 'Filter', width: 420,
    body: `${field('df-method', 'Method', { options: [['', 'All methods'], ...methods.map((m) => [m, m])], value: f.method })}
      <div class="grid g2">${field('df-from', 'From', { type: 'date', value: f.from })}${field('df-to', 'To', { type: 'date', value: f.to })}</div>`,
    foot: `<button class="btn sec" onclick="UI.dash.method='';UI.dash.from='';UI.dash.to='';closeModal();refresh()">Clear</button><button class="btn pri" onclick="UI.dash.method=val('df-method');UI.dash.from=val('df-from');UI.dash.to=val('df-to');closeModal();refresh()">Apply</button>`,
  }));
}
function exportDashCsv() {
  const rows = UI.dashCsv || [];
  const text = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = `goldzip-${UI.dash.tab}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  toast('ok', `Exported ${rows.length - 1} rows`);
}

/* ---------------- Approvals ---------------- */
route('/approvals', {
  group: 'approvals', title: 'Approvals', crumb: ['Approvals'],
  render: () => {
    const d = S();
    const tab = UI.apTab || 'pending';
    const list = d.approvals.filter((a) => (tab === 'pending' ? a.status === 'pending' : a.status !== 'pending'));
    const pg = paged('ap', list);
    return `${pageHead('Approvals', 'Maker / checker: a second admin approves each pending write before it takes effect')}
      ${banner('info', 'Not drawn in the design file', 'Approvals has no screens in design v2.3.1 (open point 1). This page is a working stand-in so the approval flow can be tested end to end.')}
      ${tabs('apTab', [['pending', 'Pending', d.approvals.filter((a) => a.status === 'pending').length], ['done', 'Decided', d.approvals.filter((a) => a.status !== 'pending').length]])}
      ${table(['Request ID', 'Requested', 'Requested by', 'Module', 'Action', 'Reference', 'Status', ''], pg.rows.map((a) => [
        mono(a.id), mono(a.created), esc(a.by), esc(a.module), `<b>${esc(a.title)}</b>`, mono(a.ref),
        a.status === 'pending' ? pill('Pending', 'warn') : a.status === 'approved' ? pill('Approved', 'ok') : pill('Rejected', 'dan'),
        a.status === 'pending' ? `<div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn sec sm" onclick="decideApproval('${a.id}',false)">Reject</button><button class="btn pri sm" onclick="decideApproval('${a.id}',true)">Approve</button></div>`
          : `<span class="muted" style="font-size:12px">${esc(a.decidedBy || '')} · ${esc(a.decidedAt || '')}</span>`,
      ]), { pager: pager('ap', pg), empty: tab === 'pending' ? 'Nothing is waiting for approval. Turn on Approval mode in Demo controls to queue writes here.' : 'No decided requests yet' })}`;
  },
});
const ACTION_LABEL = {};
async function decideApproval(id, approve) {
  const a = S().approvals.find((x) => x.id === id);
  const sameUser = a.by === me().name;
  const ok = await confirmDialog({
    title: approve ? 'Approve request' : 'Reject request',
    text: `${esc(a.title)} · ${esc(a.ref)} (${esc(a.module)})<br><br>${approve ? 'The change takes effect now.' : 'The change is dropped and the item returns to its previous state.'}${sameUser ? '<br><br><i>Demo note: in the live portal a different admin must approve. The demo lets you approve your own request.</i>' : ''}`,
    okText: approve ? 'Approve' : 'Reject', danger: !approve,
  });
  if (!ok) return;
  if (!(await securityKey())) return;
  a.status = approve ? 'approved' : 'rejected';
  a.decidedBy = me().name;
  a.decidedAt = nowStamp();
  if (approve) runAction(a.action);
  else clearPending(a);
  Store.save();
  refresh();
  toast(approve ? 'ok' : 'info', approve ? `Approved · ${a.title}` : `Rejected · ${a.title}`);
}
/* when an approval is rejected, release the "waiting for approvals" lock on its entity */
function clearPending(a) {
  const d = S();
  const strip = (o) => { if (o && o.pending === a.id) o.pending = null; };
  d.cases.forEach(strip); d.users.forEach(strip); d.supply.forEach(strip); d.redemption.forEach(strip);
  Object.keys(d.settings.pending).forEach((k) => { if (d.settings.pending[k] === a.id) delete d.settings.pending[k]; });
  const c = d.cases.find((x) => x.ref === a.ref);
  if (c && a.action.type === 'kyc.report') { c.reportStatus = 'none'; c.report = null; }
  if (c && a.action.type === 'kyc.decision') { c.reportStatus = 'done'; }
  const r = d.redemption.find((x) => x.id === a.ref);
  if (r && a.action.type === 'burn.approve') r.burn = 'NotStarted';
}

/* ---------------- Transaction Requests ---------------- */
route('/transactions', {
  group: 'tx', title: 'Transaction Requests', crumb: ['Transaction Requests'],
  render: () => {
    const d = S();
    const tab = UI.txTab || 'pending';
    const list = d.txRequests.filter((t) => (tab === 'pending' ? t.status === 'pending' : t.status !== 'pending'));
    return `${pageHead('Transaction Requests', 'Multisig signers sign and execute approved on-chain mint and burn requests')}
      ${banner('info', 'Not drawn in the design file', 'Transaction Requests has no screens in design v2.3.1 (open point 1). Signing is simulated: no transaction is sent to any chain.')}
      ${tabs('txTab', [['pending', 'Waiting for signers', d.txRequests.filter((t) => t.status === 'pending').length], ['done', 'Executed', d.txRequests.filter((t) => t.status !== 'pending').length]])}
      ${list.length ? list.map(txCard).join('') : `<div class="tbl"><div class="empty">No transaction requests here.</div></div>`}`;
  },
});
function txCard(t) {
  const all = t.signers.every((s) => s.signed);
  return card(`${pill(t.type, t.type === 'Mint' ? 'ok' : 'dan')} ${esc(t.id)} <span class="muted" style="font:500 13px var(--f)">· ${esc(t.ref)}</span>`, `
    ${kv([['Wallet', t.wallet + ' · Multisig', { mono: true }], ['Token', t.token], ['Amount', fmtInt(t.amount) + ' XGZ', { mono: true }], ['Recipient', t.to, { mono: true }], ['Created', t.created, { mono: true }], ['Status', t.status === 'pending' ? (all ? 'Ready to execute' : 'Collecting signatures') : `Executed · ${t.executedAt}`]], 3)}
    <div class="hr"></div>${subh('Signers')}
    <div style="display:flex;flex-direction:column;gap:8px">${t.signers.map((s, i) => `<div class="signer" style="cursor:default"><span class="chip">${esc(s.role)}</span><b>${esc(s.name)}</b><small>${esc(s.addr)}</small>
      ${s.signed ? pill('Signed', 'ok') : t.status === 'pending' ? `<button class="btn sec sm" onclick="signTx('${t.id}',${i})">${ic('pen-line', 13)}Sign</button>` : pill('Not signed', 'n')}</div>`).join('')}</div>`,
  { right: t.status === 'pending' ? `<button class="btn pri sm" ${all ? `onclick="executeTx('${t.id}')"` : 'disabled'}>Execute</button>` : `<span class="mono muted">${esc(t.hash || '')}</span>` });
}
function signTx(id, i) {
  const t = S().txRequests.find((x) => x.id === id);
  t.signers[i].signed = true;
  Store.save();
  refresh();
  toast('ok', `${t.signers[i].name} signed ${t.id}`);
}
function executeTx(id) {
  const t = S().txRequests.find((x) => x.id === id);
  t.status = 'executed';
  t.hash = '0x' + randHex(4) + '…' + randHex(6);
  t.fullHash = '0x' + randHex(64);
  t.executedAt = nowStamp();
  runAction({ type: t.type === 'Mint' ? 'mint.executed' : 'burn.executed', params: { id: t.ref, tx: t } });
  Store.save();
  refresh();
  toast('ok', `${t.type} executed on ${S().demo.network} · ${t.hash}`);
}
function createTxRequest(type, ref, amount, to, signers) {
  const d = S();
  const t = { id: 'TX-' + String(d.seq.tx++).padStart(5, '0'), created: nowStamp(), type, ref, wallet: '0xGZ1s…Issuer', token: 'XGZ', amount, to, signers: signers.map((s) => ({ ...s, signed: false })), status: 'pending' };
  d.txRequests.unshift(t);
  return t;
}

route('/404', {
  group: null, title: 'Not found', crumb: ['Not found'],
  render: () => `${pageHead('Page not found', 'This route is not part of the demo.')}<div><a class="btn pri" href="#/dashboard">Go to Dashboard</a></div>`,
});
