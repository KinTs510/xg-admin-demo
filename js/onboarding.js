/* GoldZip Admin Portal — static demo
   onboarding.js: 05 Client Onboarding (Incoming Request, KYC/KYB Verification, Verfication Decision, History, Registered Users). */
'use strict';

const TYPE_TABS = ['All', 'KYC', 'HKGX KYB', 'Non HKGX KYB'];
function typeTabs(key, list) {
  return tabs(key, TYPE_TABS.map((t) => [t, t, t === 'All' ? list.length : list.filter((c) => c.type === t).length]));
}
const byType = (key, list) => { const t = UI[key] || 'All'; return t === 'All' ? list : list.filter((c) => c.type === t); };
const reportSt = (c) => (c.reportStatus === 'done' ? 'done' : c.reportStatus === 'pend' ? 'pend' : 'none');

/* applicant info block used by every onboarding modal */
function caseFields(c, mode) {
  const i = caseInfo(c);
  const docs = i.individual
    ? [['ID/Passport Proof', `HKID-${i.contact.replace(/ /g, '-')}.pdf`], ['Proof of Valid ID', `Passport-${i.contact.replace(/ /g, '-')}.pdf`], ['Personal Address Proof', 'Utility-bill-2026-09.pdf']]
    : [['Proof of Valid Business Registration', 'BR-Certificate-2026.pdf'], ['Proof of Valid Address Registration', 'Bank-statement-2026-09.pdf'], ['Proof of Valid ID', `HKID-${i.contact.replace(/ /g, '-')}.pdf`]];
  const docKv = docs.map(([k, f]) => [k, docTag(f), { html: true }]);
  if (i.individual) {
    return kv([['Reference ID', c.ref, { mono: true }], ['Phone', i.phone, { mono: true }], ['Email Address', i.email], ['Date Of Birth', c.dob, { mono: true }],
      ['ID/Passport No.', 'Y456***(2)', { mono: true }], ['Personal Address', i.address, { span: 2 }], ...docKv], 3);
  }
  const full = mode === 'full';
  return kv([['Reference ID', c.ref, { mono: true }], ['Applicant Name', i.contact], full && ['Date Of Birth', c.dob, { mono: true }], full && ['Applicant Contact No.', i.phone, { mono: true }],
    ['Applicant Email', i.email], ['Registration No.', i.reg, { mono: true }], ...docKv,
    c.type === 'HKGX KYB' && ['HKXG/CGSE Member ID', i.cgse, { mono: true }], full && ['Company Address', i.address, { span: 2 }], ['Country of Incorporation', 'Hong Kong SAR'],
    full && ['Website', i.website], full && ['Primary Contact Person', i.contact], full && ['Email', 'ops@' + (i.website !== '—' ? i.website : 'example.hk')], full && ['Contact Number', '+852 2810 0000', { mono: true }]], 3);
}
const caseTitle = (c) => { const i = caseInfo(c); return `${esc(i.business !== '—' ? i.business : i.contact)} ${typePill(c.type)}`; };

/* ---------------- 5.1 Incoming Request ---------------- */
route('/onboarding/incoming', {
  group: 'onboarding', item: 'Incoming Request', title: 'Incoming Request',
  render: () => {
    const all = S().cases.filter((c) => c.stage === 'incoming');
    const list = byType('obIn', all);
    const pg = paged('obIn', list);
    return `${pageHead('New Clients', 'Incoming Request · applications submitted in the client app')}
      ${typeTabs('obIn', all)}
      ${table(['Application Date / Time', 'Type', 'Reference ID', 'Business Name', 'Supplier Name', ''], pg.rows.map((c) => {
        const i = caseInfo(c);
        return [mono(c.appDate), typePill(c.type), mono(c.ref), esc(i.business), esc(i.contact),
          c.pending ? pill('Awaiting approval', 'warn') : viewBtn(true, `incomingModal('${c.ref}')`)];
      }), { pager: pager('obIn', pg), align: ['', '', '', '', '', 'r'], empty: 'No incoming requests. New applications from the client app appear here.' })}`;
  },
});
function incomingModal(ref) {
  const c = caseByRef(ref);
  openModal(modalFrame({
    title: caseTitle(c), sub: 'Request Information – Please review details to request KYC / KYB check.', width: 820,
    body: `${caseFields(c, 'full')}<div class="hint">Cancel withdraws the client's verification request. Use ✕ to close without acting.</div>`,
    foot: `<button class="btn dan" onclick="cancelIncoming('${ref}')">Cancel</button><button class="btn pri" onclick="requestCheck('${ref}')">Request KYC / KYB Check</button>`,
  }));
}
async function requestCheck(ref) {
  closeModal();
  await write({
    title: 'Request KYC / KYB check', module: 'Client Onboarding', ref, action: { type: 'kyc.request', params: { ref } },
    mark: (id) => { caseByRef(ref).pending = id; },
    success: `Success · ${ref} moved to KYC/KYB Verification`, pending: 'Awaiting Approval · a second admin must approve this check',
  });
}
async function cancelIncoming(ref) {
  const ok = await confirmDialog({ title: 'Withdraw verification request', text: `The client's verification request ${ref} is withdrawn. The client sees it as cancelled in the client app.`, okText: 'Withdraw request' });
  if (!ok) return;
  closeAllModals();
  await write({
    title: 'Withdraw verification request', module: 'Client Onboarding', ref, action: { type: 'kyc.cancel', params: { ref } },
    mark: (id) => { caseByRef(ref).pending = id; }, success: `Success · request ${ref} withdrawn`,
  });
}
Actions['kyc.request'] = ({ ref }) => { const c = caseByRef(ref); c.stage = 'verification'; c.pending = null; c.reportStatus = 'none'; };
Actions['kyc.cancel'] = ({ ref }) => { const d = S(); d.cases = d.cases.filter((c) => c.ref !== ref); };

/* ---------------- 5.2 KYC/KYB Verification ---------------- */
route('/onboarding/verification', {
  group: 'onboarding', item: 'KYC/KYB Verification', title: 'KYC/KYB Verification',
  render: () => {
    const all = S().cases.filter((c) => c.stage === 'verification');
    const list = byType('obVer', all);
    const pg = paged('obVer', list);
    return `${pageHead('KYC / KYB Verification', 'Upload the compliance report for each requested check')}
      <div class="bar">${typeTabs('obVer', all)}</div>
      ${table(['Application Date / Time', 'Type', 'Reference ID', 'Business Name', 'Supplier Name', 'Compliance Report', ''], pg.rows.map((c) => {
        const i = caseInfo(c);
        return [mono(c.appDate), typePill(c.type), mono(c.ref), esc(i.business), esc(i.contact), `${st(reportSt(c))} <span class="muted" style="font-size:12px;margin-left:6px">${ST_TEXT[reportSt(c)]}</span>`,
          viewBtn(!c.pending && c.reportStatus === 'none', `verifyModal('${c.ref}')`, 'Verification')];
      }), { pager: pager('obVer', pg), align: ['', '', '', '', '', '', 'r'] })}
      ${legend()}`;
  },
});
function verifyModal(ref, err) {
  const c = caseByRef(ref);
  const key = 'kyc-' + ref;
  modalRerender = () => updateModal(verifyHtml(c, key, false));
  openModal(verifyHtml(c, key, err), { onClose: () => { modalRerender = null; } });
}
function verifyHtml(c, key, err) {
  return modalFrame({
    title: caseTitle(c), sub: 'KYC / KYB Verification – upload the compliance report for this case.', width: 820,
    body: `${caseFields(c, 'short')}<div class="hr"></div>${dropZone(key, 'Upload KYC compliance Report', { req: true, types: 'PDF, JPG or PNG · max 10 MB', sample: `Compliance-Report-${c.ref}.pdf`, err: err ? 'Please upload the compliance report' : '' })}`,
    foot: `<button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn pri" onclick="submitReport('${c.ref}')">Confirm</button>`,
  });
}
async function submitReport(ref) {
  const key = 'kyc-' + ref;
  if (!FileSlots[key]) { updateModal(verifyHtml(caseByRef(ref), key, true)); return; }
  const file = FileSlots[key].name;
  closeModal();
  await write({
    title: 'Upload compliance report', module: 'Client Onboarding', ref, action: { type: 'kyc.report', params: { ref, file } },
    mark: (id) => { const c = caseByRef(ref); c.pending = id; c.report = file; c.reportStatus = 'pend'; },
    success: `Success · report for ${ref} approved, case moved to Verfication Decision`, pending: 'Awaiting Approval · report sent to approver',
    after: () => delete FileSlots[key],
  });
}
Actions['kyc.report'] = ({ ref, file }) => { const c = caseByRef(ref); if (!c) return; c.report = file; c.reportStatus = 'done'; c.pending = null; c.stage = 'decision'; };

/* ---------------- 5.3 Verfication Decision ---------------- */
route('/onboarding/decision', {
  group: 'onboarding', item: 'Verfication Decision', title: 'KYC / KYB Decision',
  render: () => {
    const all = S().cases.filter((c) => c.stage === 'decision');
    const list = byType('obDec', all);
    const pg = paged('obDec', list);
    return `${pageHead('KYC / KYB Decision', 'Pass or fail each case once its compliance report is approved')}
      ${typeTabs('obDec', all)}
      ${table(['Application Date / Time', 'Type', 'Reference ID', 'Business Name', 'Supplier Name', 'Compliance Report', ''], pg.rows.map((c) => {
        const i = caseInfo(c);
        const s = c.decisionPending ? 'pend' : reportSt(c);
        return [mono(c.appDate), typePill(c.type), mono(c.ref), esc(i.business), esc(i.contact), `${st(s)} <span class="muted" style="font-size:12px;margin-left:6px">${c.decisionPending ? 'Decision pending approval' : ST_TEXT[s]}</span>`,
          viewBtn(c.reportStatus === 'done' && !c.pending, `decisionModal('${c.ref}')`, 'KYC / KYB Decision')];
      }), { pager: pager('obDec', pg), align: ['', '', '', '', '', '', 'r'] })}
      ${legend()}`;
  },
});
UI.dec = {};
function decisionModal(ref) {
  UI.dec = { ref, choice: '', expiry: '', errors: {} };
  openModal(decisionHtml());
}
function decisionHtml() {
  const c = caseByRef(UI.dec.ref), e = UI.dec.errors;
  const def = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); })();
  return modalFrame({
    title: caseTitle(c), sub: 'KYC / KYB Decision – review the case and the compliance report.', width: 820,
    body: `${caseFields(c, 'short')}<div class="field"><span class="flabel">Kyc File</span>${doc(c.report || `Compliance-Report-${c.ref}.pdf`, 'Approved compliance report')}</div>
      <div class="hr"></div>
      <div class="field"><span class="flabel"><span>Decision for KYC / KYB<span class="req"> *</span></span></span>
        <div class="grid g2">
          <label class="radio-card"><input type="radio" name="dec" value="Pass" ${UI.dec.choice === 'Pass' ? 'checked' : ''} onchange="UI.dec.choice='Pass';updateModal(decisionHtml())"><span><b>Pass</b><small>Client becomes verified until the expiry date.</small></span></label>
          <label class="radio-card"><input type="radio" name="dec" value="Fail" ${UI.dec.choice === 'Fail' ? 'checked' : ''} onchange="UI.dec.choice='Fail';updateModal(decisionHtml())"><span><b>Fail</b><small>Client sees the rejection in the client app.</small></span></label>
        </div>${e.choice ? `<span class="ferr">${ic('circle-alert', 12)}${e.choice}</span>` : ''}</div>
      ${UI.dec.choice === 'Pass' ? `<div style="max-width:320px">${field('dec-exp', 'Expiry Date', { type: 'date', req: true, value: UI.dec.expiry || def, err: e.expiry, hint: 'Shown as dd-MM-yyyy' })}</div>` : ''}`,
    foot: `<button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn pri" onclick="submitDecision()">Confirm</button>`,
  });
}
async function submitDecision() {
  const e = {};
  if (!UI.dec.choice) e.choice = 'Please choose Pass or Fail';
  let exp = '';
  if (UI.dec.choice === 'Pass') {
    const raw = val('dec-exp');
    UI.dec.expiry = raw;
    if (!raw) e.expiry = 'Required';
    else if (raw <= new Date().toISOString().slice(0, 10)) e.expiry = 'Expiry date must be in the future';
    else { const [y, m, d] = raw.split('-'); exp = `${d}-${m}-${y}`; }
  }
  UI.dec.errors = e;
  if (Object.keys(e).length) { updateModal(decisionHtml()); return; }
  const { ref, choice } = UI.dec;
  const c = caseByRef(ref), i = caseInfo(c);
  const name = i.business !== '—' ? i.business : i.contact;
  closeModal();
  await write({
    title: `KYC / KYB decision · ${choice}`, module: 'Client Onboarding', ref, action: { type: 'kyc.decision', params: { ref, choice, exp } },
    mark: (id) => { c.pending = id; c.decisionPending = true; },
    success: choice === 'Pass' ? `Success · ${name} verified until ${exp}` : `Success · ${name} rejected`,
  });
}
Actions['kyc.decision'] = ({ ref, choice, exp }) => {
  const c = caseByRef(ref); if (!c) return;
  Object.assign(c, { stage: 'history', result: choice, expiry: choice === 'Pass' ? exp : null, verifDate: nowStamp(), pending: null, decisionPending: false });
};

/* ---------------- 5.4 History ---------------- */
route('/onboarding/history', {
  group: 'onboarding', item: 'History', title: 'KYC / KYB History',
  render: () => {
    const all = S().cases.filter((c) => c.stage === 'history').sort((a, b) => (b.verifDate || '').localeCompare(a.verifDate || ''));
    const list = byType('obHis', all);
    const pg = paged('obHis', list);
    return `${pageHead('KYC / KYB History', 'Completed cases · click a row to view')}
      ${typeTabs('obHis', all)}
      ${table(['Application Date / Time', 'Verification Date / Time', 'Type', 'Reference ID', 'Business Name', 'Supplier Name', 'Compliance Report', 'Result / Expiry Date'], pg.rows.map((c) => {
        const i = caseInfo(c);
        return { onclick: `historyModal('${c.ref}')`, cells: [mono(c.appDate), mono(c.verifDate), typePill(c.type), mono(c.ref), esc(i.business), esc(i.contact), st('done'),
          c.result === 'Pass' ? `<div class="two"><b style="color:var(--ok)">Pass</b><small class="mono">${esc(c.expiry)}</small></div>` : `<div class="two"><b style="color:var(--dan)">Fail</b><small>Rejected</small></div>`] };
      }), { pager: pager('obHis', pg) })}`;
  },
});
function historyModal(ref) {
  const c = caseByRef(ref);
  openModal(modalFrame({
    title: caseTitle(c), sub: 'KYC History · read only', width: 820,
    body: `${c.result === 'Pass' ? banner('ok', `This case has been approved | Exp ${esc(c.expiry)}`) : banner('dan', 'This case has been rejected')}
      ${caseFields(c, 'short')}<div class="field"><span class="flabel">Kyc File</span>${doc(c.report || `Compliance-Report-${c.ref}.pdf`)}</div>`,
    foot: `<button class="btn sec" onclick="closeModal()">Close</button>`,
  }));
}

/* ---------------- 5.5 Registered Users ---------------- */
UI.ru = UI.ru || { status: '', q: '' };
route('/onboarding/users', {
  group: 'onboarding', item: 'Registered Users', title: 'Registered Users',
  render: () => {
    const f = UI.ru;
    const list = S().users.filter((u) => (!f.status || u.status === f.status) && (!f.q || (u.email + ' ' + u.first + ' ' + u.last).toLowerCase().includes(f.q.toLowerCase())));
    const pg = paged('ru', list);
    return `${pageHead('Registered Users', 'Client accounts in the client app')}
      <div class="bar"><label class="sel"><span>Status</span><select onchange="UI.ru.status=this.value;Paging.ru=1;refresh()">${['', 'Inactive', 'Active', 'Terminated', 'Restricted'].map((s) => `<option value="${s}" ${f.status === s ? 'selected' : ''}>${s || 'All'}</option>`).join('')}</select>${ic('chevron-down', 14)}</label>
        <label class="sel" style="min-width:280px">${ic('search', 15)}<input id="ru-q" placeholder="Search email or name" value="${esc(f.q)}" onkeydown="if(event.key==='Enter'){UI.ru.q=this.value;Paging.ru=1;refresh()}" onblur="if(UI.ru.q!==this.value){UI.ru.q=this.value;Paging.ru=1;refresh()}"></label></div>
      ${table(['Created At', 'User ID', 'Name', 'Business Name', 'User Status'], pg.rows.map((u) => ({ onclick: `go('/onboarding/users/${encodeURIComponent(u.email)}')`,
        cells: [mono(u.created), esc(u.email), esc(u.first + ' ' + u.last), esc(u.business), userPill(u.status) + (u.pending ? ' ' + pill('Change pending', 'warn') : '')] })), { pager: pager('ru', pg) })}`;
  },
});
const userPill = (s) => pill(s, { Active: 'ok', Inactive: 'n', Restricted: 'warn', Terminated: 'dan', Invalid: 'dan', Default: 'info' }[s] || 'n');

route('/onboarding/users/:email', {
  group: 'onboarding', item: 'Registered Users', title: 'User detail',
  render: ({ email }) => {
    const u = S().users.find((x) => x.email === email);
    if (!u) return `${backLink('Registered Users', '/onboarding/users')}<div class="tbl"><div class="empty">User not found.</div></div>`;
    const editing = UI.ruEdit === email;
    return editing ? userEdit(u) : userView(u);
  },
});
function userView(u) {
  const co = u.co ? CO[u.co] : null;
  return `${backLink('Registered Users', '/onboarding/users')}
    ${pageHead(`${esc(u.email)} ${userPill(u.status)}`, `Registered user · last updated ${esc(u.updated)}`, u.pending ? '' : `<button class="btn sec" onclick="startUserEdit('${esc(u.email)}')">${ic('pencil', 14)}Edit</button>`)}
    ${u.pending ? waitingBanner() : ''}
    ${card('Applicant Information', kv([['Email', u.email], ['Status', userPill(u.status), { html: true }], ['Wallet Address', u.wallet, { mono: true }], ['First Name', u.first], ['Last Name', u.last], ['Alias', u.alias || '—'],
      ['Occupation', u.occupation], ['Contact No.', u.phone, { mono: true }], ['Date of Birth', u.dob, { mono: true }],
      ['Residential Address', [u.room && 'Flat ' + u.room, u.street, u.district].filter(Boolean).join(', '), { span: 2 }], ['ID / Passport No.', u.idNo, { mono: true }],
      ['Proof of Personal Address', docTag(u.proofAddress), { html: true }], ['ID / Passport Proof', docTag(u.proofId), { html: true }]], 3))}
    ${co ? card('Business Information', kv([['Company Name', co.business], ['UEN/Incorporation No./Registration No.', co.reg, { mono: true }], ['HKGAX / CGSE Membership ID', co.cgse, { mono: true }],
      ['Company Website', co.website], ['Country of Incorporation', 'Hong Kong SAR'], ['Business Registration Proof', docTag('BR-Certificate-2026.pdf'), { html: true }],
      ['Corporate Address', co.address, { span: 2 }], ['Primary Contact Phone Number', '+852 2810 0000', { mono: true }], ['Primary Contact Person', co.contact], ['Primary Contact Email Address', 'ops@' + co.website]], 3)) : ''}`;
}
function startUserEdit(email) {
  const u = S().users.find((x) => x.email === email);
  UI.ruEdit = email;
  UI.ruForm = clone(u);
  UI.ruErr = {};
  FileSlots['ru-addr'] = { name: u.proofAddress, meta: 'PDF · 0.8 MB' };
  FileSlots['ru-id'] = { name: u.proofId, meta: 'PDF · 0.6 MB' };
  refresh();
}
function userEdit(u) {
  const f = UI.ruForm, e = UI.ruErr || {};
  const F = (k, label, o = {}) => field('ru-' + k, label, { value: f[k], err: e[k], ...o });
  return `${backLink('Registered Users', '/onboarding/users')}
    ${pageHead(esc(u.email), '', `<button class="btn sec" onclick="UI.ruEdit=null;refresh()">Cancel</button><button class="btn pri" onclick="saveUser('${esc(u.email)}')">Save Change</button>`)}
    ${banner('info', 'Editing · changes need passkey and may need approval')}
    ${card('Applicant Information', `<div class="grid g3">
      ${F('status', 'Status', { req: true, options: ['Active', 'Inactive', 'Restricted', 'Terminated', 'Invalid', 'Default'] })}
      ${F('email', 'Email', { req: true })}${F('first', 'First Name', { req: true })}${F('last', 'Last Name', { req: true })}${F('alias', 'Alias')}
      ${F('occupation', 'Occupation', { req: true })}${F('phone', 'Phone Number', { req: true })}${F('idNo', 'ID / Passport No.', { readonly: true })}</div>
      <div class="hr"></div>${subh('Residential Address')}
      <div class="grid g4">${F('street', 'Street', { req: true, span: 2 })}${F('room', 'Room')}${F('floor', 'Floor')}${F('building', 'Building')}${F('district', 'District')}
      ${F('town', 'Town', { req: true })}${F('country', 'Country', { req: true, options: ['Hong Kong SAR', 'Macau SAR', 'Singapore', 'China', 'United Kingdom'] })}${F('postal', 'Postal Code')}</div>
      <div class="grid g2">${dropZone('ru-addr', 'Proof of Address', { req: true, err: e.proof, sample: 'Bank-statement-2026-10.pdf' })}${dropZone('ru-id', 'ID / Passport Proof', { sample: 'HKID-scan.pdf' })}</div>`)}
    ${demoInline(`Clear Email or Phone, or remove the proof of address, then press Save Change to see the validation states.`)}`;
}
function readUserForm() {
  const f = UI.ruForm;
  ['status', 'email', 'first', 'last', 'alias', 'occupation', 'phone', 'street', 'room', 'floor', 'building', 'district', 'town', 'country', 'postal'].forEach((k) => { const el = document.getElementById('ru-' + k); if (el) f[k] = el.value.trim(); });
  return f;
}
async function saveUser(email) {
  const f = readUserForm();
  const e = {};
  if (!f.status) e.status = 'Required';
  if (!f.email) e.email = 'Required'; else if (!isEmail(f.email)) e.email = 'Enter a valid email';
  ['first', 'last', 'occupation', 'phone', 'street', 'town', 'country'].forEach((k) => { if (!f[k]) e[k] = 'Required'; });
  if (!FileSlots['ru-addr']) e.proof = 'Required';
  UI.ruErr = e;
  if (Object.keys(e).length) { refresh(); toast('dan', 'Fix the highlighted fields'); return; }
  const changes = { ...f, proofAddress: FileSlots['ru-addr'].name, proofId: FileSlots['ru-id']?.name || f.proofId };
  await write({
    title: 'Edit registered user', module: 'Client Onboarding', ref: email, action: { type: 'user.edit', params: { email, changes } },
    mark: (id) => { S().users.find((x) => x.email === email).pending = id; },
    success: 'Success · profile changes submitted',
    after: () => { UI.ruEdit = null; if (changes.email !== email && !S().demo.approvalMode) go('/onboarding/users/' + encodeURIComponent(changes.email)); },
  });
}
Actions['user.edit'] = ({ email, changes }) => {
  const u = S().users.find((x) => x.email === email);
  if (!u) return;
  Object.assign(u, changes, { id: changes.email, pending: null, updated: nowStamp() });
};
