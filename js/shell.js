/* GoldZip Admin Portal — static demo
   shell.js: app shell (icon rail, side panel, top bar), account popover, demo control panel, My Profile + 2FA. */
'use strict';

const notPending = (x) => !x.pending;
const NAV = () => {
  const d = S();
  const c = (stage, f = () => true) => d.cases.filter((x) => x.stage === stage && f(x)).length;
  const so = (stages, f = notPending) => d.supply.filter((x) => stages.includes(x.stage) && f(x)).length;
  const ro = (stages, f = notPending) => d.redemption.filter((x) => stages.includes(x.stage) && f(x)).length;
  return [
    { key: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', path: '/dashboard' },
    { key: 'onboarding', label: 'Client Onboarding', icon: 'user-check', subs: [
      ['Incoming Request', '/onboarding/incoming', c('incoming', notPending)],
      ['KYC/KYB Verification', '/onboarding/verification', c('verification', (x) => x.reportStatus === 'none' && !x.pending)],
      ['Verfication Decision', '/onboarding/decision', c('decision', (x) => x.reportStatus === 'done' && !x.pending)],
      ['History', '/onboarding/history'],
      ['Registered Users', '/onboarding/users'],
    ] },
    { key: 'supply', label: 'Supply Management', icon: 'vault', subs: [
      ['Order List', '/supply/orders', so(['countersign'], (x) => !x.pending && x.fee.valid) + d.supply.filter((x) => x.stage === 'rejected' && !x.refund).length],
      ['Vault Management', '/supply/vault', so(['vault'])],
      ['Assay Management', '/supply/assay', so(['testing', 'result'])],
      ['Assay Inspection', '/supply/inspection', so(['inspection'])],
      ['Minting', '/supply/minting', so(['issue', 'issuing'])],
      ['History', '/supply/history'],
    ] },
    { key: 'redemption', label: 'Redemption', icon: 'hand-coins', subs: [
      ['Order List', '/redemption/orders', d.demo.redemptionFlow === 'v1' ? ro(['deposit']) : 0],
      ['Vault Management', '/redemption/vault', ro(['vault'])],
      ['Vault Approval', '/redemption/approval', ro(['approval'])],
      ['Escrow', '/redemption/escrow', d.redemption.filter((x) => x.stage === 'escrow' && ['cancelreq', 'collect', 'confirm'].includes(x.phase) && !x.pending).length],
      ['History', '/redemption/history', d.redemption.filter((x) => x.stage === 'history' && ['NotStarted', 'ApprovalSuccess'].includes(x.burn)).length],
    ] },
    { key: 'approvals', label: 'Approvals', icon: 'badge-check', path: '/approvals', count: d.approvals.filter((a) => a.status === 'pending').length },
    { key: 'tx', label: 'Transaction Requests', icon: 'arrow-left-right', path: '/transactions', count: d.txRequests.filter((t) => t.status === 'pending').length },
    { key: 'settings', label: 'Settings', icon: 'settings', subs: [
      ['General', '/settings/general'], ['Deposit', '/settings/deposit'], ['Redemption', '/settings/redemption'],
    ] },
  ];
};
UI.navOpen = UI.navOpen || {};

const Shell = {
  render(r, content) {
    const u = me();
    const group = r.def.group, item = r.def.item;
    const nav = NAV();
    const sideNav = nav.map((g) => {
      const on = g.key === group;
      const open = g.subs && (UI.navOpen[g.key] ?? on);
      const count = g.count ? `<span class="chip" style="margin-left:auto">${g.count}</span>` : '';
      if (!g.subs) return `<a class="top ${on ? 'on cur' : ''}" href="#${g.path}">${ic(g.icon, 19)}<span>${g.label}</span>${count}</a>`;
      return `<a class="top ${on ? 'on' : ''}" onclick="UI.navOpen['${g.key}']=${!open};refresh()">${ic(g.icon, 19)}<span>${g.label}</span>${ic(open ? 'chevron-up' : 'chevron-down', 14, 'margin-left:auto;opacity:.45')}</a>
        ${open ? `<div class="subs">${g.subs.map(([t, p, n]) => `<a class="${on && item === t ? 'on' : ''}" href="#${p}">${t}${n ? `<span class="chip">${n}</span>` : ''}</a>`).join('')}</div>` : ''}`;
    }).join('');
    const railOn = r.def.rail || (group === 'dashboard' || group === 'approvals' || group === 'tx' ? 'data' : group === 'profile' ? 'account' : 'ops');
    const groupLabel = (nav.find((g) => g.key === group) || {}).label;
    const crumb = r.def.crumb || (item ? [groupLabel, item] : [r.def.title]);
    const d = S();
    return `<div class="shell">
      <nav class="rail" aria-label="Sections">
        <div class="mark"><img src="assets/goldzip-mark.png" alt="GoldZip"></div>
        <button class="${railOn === 'account' ? 'on' : ''}" title="Account" onclick="go('/profile')">${ic('user-round', 20)}</button>
        <button class="${railOn === 'data' ? 'on' : ''}" title="Data" onclick="go('/dashboard')">${ic('database', 20)}</button>
        <button class="${railOn === 'ops' ? 'on' : ''}" title="Operations" onclick="go('/supply/orders')">${ic('vault', 20)}</button>
      </nav>
      <aside class="side">
        <div class="who"><span class="n">${esc(u.name)} · ${esc(u.title)}</span><span class="e">${esc(u.email)}</span>
          <div class="roles">${u.roles.filter((x) => x !== u.title || x === 'SuperAdmin').map((x) => `<span class="role">${esc(x)}</span>`).join('')}</div></div>
        <div class="nav">${sideNav}</div>
        <div class="ver">Version ${VERSION}</div>
      </aside>
      <div class="main">
        <header class="topbar">
          <div class="crumb">${crumb.map((c, i) => (i === crumb.length - 1 && crumb.length > 1 ? `<b>${esc(c)}</b>` : `<span>${esc(c)}</span>`)).join('<span>/</span>')}</div>
          <div class="tb-right">
            <button class="net" data-menu onclick="netMenu(this)">${ic('gem', 16)}${esc(d.demo.network)}${ic('chevron-down', 14)}</button>
            ${d.demo.wallet ? `<button class="wallet-on" onclick="walletMenu(this)" data-menu>${ic('wallet', 14)}${esc(d.demo.wallet)}</button>` : `<button class="btn pri" style="padding:11px 16px;font-size:13px" onclick="connectWallet()">Connect Wallet</button>`}
            <div class="avatar" data-menu onclick="toggleAccount(event)" title="Account">${esc(u.initials)}</div>
          </div>
        </header>
        <main class="content" id="content">${content}</main>
      </div>
    </div>${demoFab()}`;
  },
};

/* ---------------- top bar menus ---------------- */
function netMenu(el) {
  popMenu(el, ['Ethereum Mainnet', 'Ethereum Sepolia'].map((n) => ({ label: n, on: S().demo.network === n, run: () => { S().demo.network = n; Store.save(); refresh(); toast('ok', `Network switched to ${n}`); } })));
}
function connectWallet() {
  openModal(modalFrame({
    title: 'Connect Wallet', sub: 'Choose a wallet (simulated WalletConnect session).', width: 460,
    body: `<button class="method" onclick="S().demo.wallet='0x51A2…c09E';Store.save();closeModal();refresh();toast('ok','Wallet connected · 0x51A2…c09E')"><span class="mi"><img src="assets/metamask.png" alt="" style="width:22px"></span>
      <span><b style="display:block">MetaMask</b><small class="mono" style="color:var(--s5)">0x51A2…c09E · GoldZip Treasury signer</small></span></button>
      <button class="method" onclick="S().demo.wallet='0x8E07…11bD';Store.save();closeModal();refresh();toast('ok','Wallet connected · 0x8E07…11bD')"><span class="mi">${ic('qr-code', 18)}</span>
      <span><b style="display:block">WalletConnect</b><small class="mono" style="color:var(--s5)">0x8E07…11bD · Ops Hot Wallet</small></span></button>`,
    foot: `<button class="btn sec" onclick="closeModal()">Cancel</button>`,
  }));
}
function walletMenu(el) {
  popMenu(el, [{ label: 'Copy address', icon: 'copy', run: () => { navigator.clipboard?.writeText(S().demo.wallet); toast('ok', 'Address copied'); } },
    { label: 'Disconnect', icon: 'log-out', danger: true, run: () => { S().demo.wallet = null; Store.save(); refresh(); toast('info', 'Wallet disconnected'); } }], { alignRight: true });
}
function toggleAccount(ev) {
  ev.stopPropagation();
  if ($('#acct-pop')) { closeMenus(); return; }
  closeMenus();
  const u = me();
  const p = document.createElement('div');
  p.className = 'pop acct'; p.id = 'acct-pop'; p.dataset.temp = '1';
  p.innerHTML = `<div class="row"><div class="avatar lg">${esc(u.initials)}</div><div style="min-width:0"><b style="display:block;font-size:14px">${esc(u.name)}</b><span class="muted" style="font-size:12px">${esc(u.email)}</span></div></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${u.roles.map((r) => `<span class="role ${r === 'SuperAdmin' ? '' : 'alt'}">${esc(r)}</span>`).join('')}</div>
    <div class="hr"></div>
    <div class="menu" style="padding:0;min-width:0"><button onclick="closeMenus();go('/profile')">${ic('user-round', 15)}<span style="flex:1">My Profile</span></button>
    <button onclick="closeMenus();logout('Signed out')">${ic('log-out', 15)}<span style="flex:1">Logout</span></button></div>`;
  $('.tb-right').appendChild(p);
}

/* ---------------- demo control panel ---------------- */
UI.demoOpen = false;
function demoFab() {
  const d = S().demo;
  return `<button class="demo-fab" onclick="UI.demoOpen=!UI.demoOpen;refresh()">${ic('sparkles', 15)}Demo controls</button>
  ${UI.demoOpen ? `<div class="demo-panel">
    <h4>${ic('sparkles', 16)}Demo controls<button class="x" style="margin-left:auto;background:none;border:0;cursor:pointer;color:var(--s5)" onclick="UI.demoOpen=false;refresh()">${ic('x', 16)}</button></h4>
    <p>This is a static demo. Data lives in your browser (localStorage). Use these switches to test the different flows.</p>
    <label class="swrow"><span>Approval mode<small>ON: writes wait for a second admin in Approvals. OFF: writes apply at once.</small></span>
      <span class="switch"><input type="checkbox" ${d.approvalMode ? 'checked' : ''} onchange="S().demo.approvalMode=this.checked;Store.save();refresh();toast('info','Approval mode '+(this.checked?'ON':'OFF'))"><i></i></span></label>
    <div class="dp-row"><span>Signed in as</span>
      <div class="seg">${['operator@goldzip.io', 'superadmin@goldzip.io'].map((e) => `<button class="${me().email === e ? 'on' : ''}" onclick="switchUser('${e}')">${ACCOUNTS[e].name} · ${ACCOUNTS[e].title}</button>`).join('')}</div>
      <p>Operators confirm writes with the security key. SuperAdmin skips the key prompt.</p></div>
    <div class="dp-row"><span>Redemption order flow (open point)</span>
      <div class="seg">${[['v1', 'v1 · two steps'], ['v2', 'v2 · one step']].map(([k, l]) => `<button class="${d.redemptionFlow === k ? 'on' : ''}" onclick="S().demo.redemptionFlow='${k}';Store.save();refresh()">${l}</button>`).join('')}</div></div>
    <div class="dp-row"><span>Session</span><div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="demo-btn" onclick="UI.demoOpen=false;refresh();Idle.warn(42)">${ic('timer', 13)}Show idle warning</button>
      <button class="demo-btn" onclick="logout('Signed out')">${ic('log-out', 13)}Sign out</button></div></div>
    <div class="dp-row"><span>Data</span><button class="demo-btn" onclick="resetDemo()">${ic('rotate-ccw', 13)}Reset all demo data</button></div>
  </div>` : ''}`;
}
function switchUser(email) {
  const acct = ACCOUNTS[email];
  Session.set({ signedIn: true, user: { email, ...acct }, at: Date.now() });
  refresh();
  toast('ok', `Now signed in as ${acct.name} (${acct.title})`);
}
async function resetDemo() {
  const ok = await confirmDialog({ title: 'Reset demo data', text: 'All orders, cases, settings, approvals and transaction requests go back to the starting demo data. You stay signed in.', okText: 'Reset', danger: true });
  if (!ok) return;
  Store.reset();
  Object.keys(FileSlots).forEach((k) => delete FileSlots[k]);
  Object.keys(UI).forEach((k) => { if (!['navOpen', 'demoOpen'].includes(k)) delete UI[k]; });
  refresh();
  toast('ok', 'Demo data reset');
}

/* ---------------- 04 · My Profile ---------------- */
UI.prof = UI.prof || { errors: {} };
route('/profile', {
  group: 'profile', title: 'My profile', crumb: ['Account', 'My profile'], rail: 'account',
  render: () => {
    const u = me();
    const twoFA = S().profile2FA[u.email] ?? u.twoFA;
    const e = UI.prof.errors || {};
    const f = UI.prof.form || {};
    const block = (icon, title, body) => `<div style="display:flex;gap:14px;align-items:flex-start;padding:16px 0;border-bottom:1px solid var(--line)"><span class="mi" style="width:36px;height:36px;border-radius:8px;background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--s5)">${ic(icon, 17)}</span><div style="flex:1;min-width:0"><div class="cap" style="font-size:12px;margin-bottom:6px">${title}</div>${body}</div></div>`;
    const pwd = (id, label, k, right = '') => `<div class="field ${e[k] ? 'err' : ''}"><label for="${id}"><span>${label}</span>${right}</label>
      <div class="input"><input id="${id}" type="password" value="${esc(f[k] || '')}" placeholder="${label === 'Current Password' ? 'Enter current password' : label === 'New Password' ? 'Enter new password' : 'Re-enter new password'}" ${k === 'np' ? `oninput="livePolicy('pf-new')"` : ''}>
      <button type="button" class="eye" onclick="togglePwd('${id}')">${ic('eye', 16)}</button></div>${e[k] ? `<span class="ferr">${ic('circle-alert', 12)}${esc(e[k])}</span>` : ''}</div>`;
    return `${pageHead('My profile', 'Your account, bound devices and password')}
    <div class="detail" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><div>
      ${card('Account', `<div>
        ${block('user-round', 'Personal Info', `<b style="font-size:15px">${esc(u.name)}</b><div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">${u.roles.map((r) => `<span class="role ${r === 'SuperAdmin' ? '' : 'alt'}">${esc(r)}</span>`).join('')}</div>`)}
        ${block('building-2', 'Business', `<b>${esc(u.business || 'No Business Entity')}</b>`)}
        ${block('usb', 'Device', u.device ? `<b class="mono">${esc(u.device)}</b>` : '<b class="muted">No Device Bound</b>')}
        ${block('wallet', 'Binded Wallet', u.wallet ? `<b class="mono">${esc(u.wallet)}</b>` : '<b class="muted">No Binded Wallet</b>')}
        <div style="display:flex;gap:14px;align-items:center;padding:16px 0"><span style="width:36px;height:36px;border-radius:8px;background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--s5)">${ic('shield-check', 17)}</span>
          <div style="flex:1"><div class="cap" style="font-size:12px;margin-bottom:6px">Security</div><b>2FA</b><div class="hint">Authenticator app code at sign in</div></div>
          <label class="switch"><input type="checkbox" ${twoFA ? 'checked' : ''} onchange="this.checked=${twoFA ? 'true' : 'false'};${twoFA ? 'disable2FA()' : 'enable2FA()'}"><i></i></label></div>
        <div class="hint" style="background:var(--bg);padding:10px 12px;border-radius:6px">Spec note: the 2FA switch and its dialogs are designed but hidden in the live app, and Disable 2FA does not submit yet. The demo shows them so they can be reviewed.</div>
      </div>`)}
    </div><div>
      ${card('Change Password', `
        ${pwd('pf-cur', 'Current Password', 'cur', '<a href="#/forgot-password" onclick="logout()" style="font-size:12px">Forgot Password</a>')}
        ${pwd('pf-new', 'New Password', 'np', `<button class="link" style="font-size:12px" onclick="const g=genPassword();$('#pf-new').value=g;$('#pf-new').type='text';livePolicy('pf-new')">Generate password</button>`)}
        ${policyHtml(f.np || '')}
        ${pwd('pf-conf', 'Confirm New Password', 'cp')}
        <div class="hint">At least 8 characters, with a lowercase letter, an uppercase letter, a number and a special character (!@#$%^&*).</div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <button class="demo-btn" onclick="UI.prof={form:{cur:DEMO_PASSWORD,np:'Gz#7kLm2q!vR',cp:'Gz#7kLm2q!vR'},errors:{}};refresh()">${ic('sparkles', 13)}Fill demo passwords</button>
          <button class="btn pri" onclick="saveProfile()">Save Change</button></div>`)}
    </div></div>`;
  },
});
function saveProfile() {
  const cur = val('pf-cur'), np = val('pf-new'), cp = val('pf-conf');
  const e = {};
  if (!cur) e.cur = 'Current password is required'; else if (cur !== DEMO_PASSWORD) e.cur = 'Current password is not correct';
  if (!np) e.np = 'New password is required'; else if (!pwdOk(np)) e.np = 'Password does not meet the policy';
  if (cp !== np) e.cp = "Doesn't match with password.";
  UI.prof = { form: { cur, np, cp }, errors: e };
  if (Object.keys(e).length) { refresh(); return; }
  UI.prof = { errors: {} };
  refresh();
  toast('ok', 'Success');
}
function enable2FA(step = 1) {
  const body = `
    <div style="display:flex;gap:14px"><span class="st none" style="background:var(--ink);color:#fff;border:0">1</span><div><b>Install an authenticator app</b><div class="hint">Google Authenticator, Authy, or similar.</div></div></div>
    <div style="display:flex;gap:14px"><span class="st none" style="background:var(--ink);color:#fff;border:0">2</span><div style="flex:1"><b>Scan the QR code</b>
      <div style="display:flex;gap:16px;align-items:center;margin-top:10px"><svg class="qr" viewBox="0 0 21 21" shape-rendering="crispEdges">${fakeQr()}</svg>
      <div class="hint">Can't scan? Enter this key:<div class="mono" style="color:var(--ink);font-size:14px;margin-top:6px">JBSW Y3DP EHPK 3PXP</div></div></div></div></div>
    <div style="display:flex;gap:14px"><span class="st none" style="background:var(--ink);color:#fff;border:0">3</span><div><b>Enter the 6-digit code</b>
      <div class="otp" id="otp2" style="margin-top:10px">${Array.from({ length: 6 }, () => '<input inputmode="numeric" maxlength="1">').join('')}</div></div></div>
    <div class="demo-card"><div class="row"><button class="demo-btn solid" onclick="[...document.querySelectorAll('#otp2 input')].forEach((x,i)=>x.value=DEMO_TOTP[i])">${ic('sparkles', 13)}Fill code ${DEMO_TOTP}</button></div></div>`;
  openModal(modalFrame({ title: 'Enable 2FA', sub: 'Set up authenticator app in 3 steps', width: 520, body,
    foot: `<button class="btn sec" onclick="closeModal()">Go Back</button><button class="btn pri" onclick="confirm2FA(true)">Continue</button>` }));
  bindOtp('otp2', () => {});
}
function disable2FA() {
  openModal(modalFrame({ title: 'Disable 2FA', sub: 'Enter the code from your authenticator app to turn off 2FA.', width: 460,
    body: `<span class="flabel">6-digit code</span><div class="otp" id="otp2">${Array.from({ length: 6 }, () => '<input inputmode="numeric" maxlength="1">').join('')}</div>
      <div class="hint">Per the spec, Disable 2FA does not submit in the live app yet. The demo applies it locally.</div>
      <div class="demo-card"><div class="row"><button class="demo-btn solid" onclick="[...document.querySelectorAll('#otp2 input')].forEach((x,i)=>x.value=DEMO_TOTP[i])">${ic('sparkles', 13)}Fill code ${DEMO_TOTP}</button></div></div>`,
    foot: `<button class="btn sec" onclick="closeModal()">Go Back</button><button class="btn pri" onclick="confirm2FA(false)">Continue</button>` }));
  bindOtp('otp2', () => {});
}
function confirm2FA(on) {
  const code = otpValue('otp2');
  if (code !== DEMO_TOTP) { $('#otp2').classList.add('err'); toast('dan', 'Code is not correct, please try again'); return; }
  S().profile2FA[me().email] = on;
  Store.save();
  closeModal();
  refresh();
  toast('ok', on ? '2FA enabled' : '2FA disabled');
}
function fakeQr() {
  let s = '';
  const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#121A26"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#121A26"/>`;
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
    if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) continue;
    if (((x * 7 + y * 13 + x * y) % 5) < 2) s += `<rect x="${x}" y="${y}" width="1" height="1" fill="#121A26"/>`;
  }
  return s + finder(0, 0) + finder(14, 0) + finder(0, 14);
}
