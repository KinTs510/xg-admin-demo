/* GoldZip Admin Portal — static demo
   auth.js: 01 Sign in · 02 Second factor · 03 Password recovery. Every credential step has a demo "fill" button. */
'use strict';

const Auth = {
  pending: null,          // { email } between password and second factor
  form: {},               // remembered input between re-renders
  errors: {},
  method: null,           // 'wallet' | 'device'
  connecting: false,
  pwdShown: false,
  resetEmail: '',
};
function authPending() {
  if (Auth.pending) return Auth.pending;
  try { Auth.pending = JSON.parse(sessionStorage.getItem('gz-pending') || 'null'); } catch (e) { /* ignore */ }
  return Auth.pending;
}
function setPending(p) { Auth.pending = p; try { p ? sessionStorage.setItem('gz-pending', JSON.stringify(p)) : sessionStorage.removeItem('gz-pending'); } catch (e) { /* ignore */ } }

const authLayout = (inner) => `
  <div class="auth">
    <div class="auth-art"><div class="pat"></div><img class="logo" src="assets/goldzip-logo.png" alt="GoldZip 數碼黃金"></div>
    <div class="auth-main"><div class="auth-box">${inner}</div>
      <div class="auth-foot"><span>Any problems, please contact <a href="mailto:service@goldzip.io">service team</a></span><span class="ver">Version ${VERSION}</span></div></div>
  </div>`;
const demoCard = (text, buttons) => `<div class="demo-card"><div class="dh">${ic('sparkles', 13)}Demo data</div>${text ? `<div class="dt">${text}</div>` : ''}<div class="row">${buttons}</div></div>`;
const errLine = (msg) => (msg ? `<span class="ferr">${ic('circle-alert', 12)}${esc(msg)}</span>` : '');

/* ---------------- 01 · Sign in ---------------- */
route('/login', {
  auth: false, redirectIfSignedIn: true, title: 'Sign in',
  render: () => {
    const f = Auth.form, e = Auth.errors;
    return authLayout(`
      <div><h1>Sign in your account</h1><div class="sub">Back-office access for GoldZip operators.</div></div>
      <form id="login-form" onsubmit="event.preventDefault();doLogin()" style="display:flex;flex-direction:column;gap:16px" novalidate>
        <div class="field ${e.email ? 'err' : ''}"><label for="li-email">User ID</label>
          <div class="input"><input id="li-email" type="email" placeholder="Email address" value="${esc(f.email || '')}" autocomplete="username"></div>${errLine(e.email)}</div>
        <div class="field ${e.password ? 'err' : ''}"><label for="li-pwd"><span>Password</span><a href="#/forgot-password" class="ulink">Forgot Password</a></label>
          <div class="input"><input id="li-pwd" type="${Auth.pwdShown ? 'text' : 'password'}" placeholder="Password" value="${esc(f.password || '')}" autocomplete="current-password">
            <button type="button" class="eye" onclick="togglePwd('li-pwd')" aria-label="Show password">${ic(Auth.pwdShown ? 'eye-off' : 'eye', 16)}</button></div>${errLine(e.password)}</div>
        <button class="btn pri full" type="submit">Login</button>
      </form>
      ${demoCard('Static demo: pick an account to fill its credentials, then press Login. Every account uses the password <b>' + DEMO_PASSWORD + '</b>.', `
        <button class="demo-btn solid" onclick="demoLogin()">${ic('log-in', 13)}Demo login (one click)</button>
        <button class="demo-btn" onclick="fillLogin('operator@goldzip.io')">Operator · TOTP</button>
        <button class="demo-btn" onclick="fillLogin('superadmin@goldzip.io')">SuperAdmin · Wallet / Key</button>
        <button class="demo-btn" onclick="fillLogin('validator@goldzip.io')">Validator · no device</button>
        <button class="demo-btn" onclick="fillLogin('blocked@goldzip.io')">Blocked account</button>`)}
    `);
  },
});
function togglePwd(id) {
  const inp = document.getElementById(id);
  Auth.pwdShown = inp.type === 'password';
  inp.type = Auth.pwdShown ? 'text' : 'password';
  inp.nextElementSibling.innerHTML = ic(Auth.pwdShown ? 'eye-off' : 'eye', 16);
}
function fillLogin(email) {
  Auth.form = { email, password: DEMO_PASSWORD };
  Auth.errors = {};
  render();
  toast('info', `Filled ${email} · ${ACCOUNTS[email].note}`, 4500);
}
function demoLogin() {
  // one click: operator account, password, TOTP — straight to the dashboard
  fillLogin('operator@goldzip.io');
  setTimeout(() => {
    doLogin(true);
  }, 350);
}
function doLogin(skipSecond = false) {
  const email = val('li-email'), password = val('li-pwd');
  Auth.form = { email, password };
  const e = {};
  if (!email) e.email = 'User ID is required'; else if (!isEmail(email)) e.email = 'Must be a valid email';
  if (!password) e.password = 'Password is required';
  Auth.errors = e;
  if (Object.keys(e).length) { render(); return; }
  const acct = ACCOUNTS[email.toLowerCase()];
  if (!acct || password !== DEMO_PASSWORD) { render(); toast('dan', 'Incorrect user ID or password'); return; }
  if (acct.blocked) { setPending({ email: email.toLowerCase() }); go('/account-blocked'); return; }
  setPending({ email: email.toLowerCase() });
  if (skipSecond === true) { finishSignIn('Signed in with demo login'); return; }
  go(acct.second === 'totp' ? '/verify-authenticator' : '/authentication-method');
}
function finishSignIn(msg = 'Signed in') {
  const p = authPending();
  const acct = ACCOUNTS[p.email];
  Session.set({ signedIn: true, user: { email: p.email, ...acct }, at: Date.now() });
  setPending(null);
  Auth.form = {}; Auth.errors = {}; Auth.method = null; Auth.connecting = false;
  go('/dashboard');
  setTimeout(() => toast('ok', `${msg} · welcome, ${acct.name}`), 60);
}

route('/account-blocked', {
  auth: false, title: 'Account blocked',
  render: () => authLayout(`
    <div class="blocked-ic">${ic('ban', 28)}</div>
    <div><h1>Account blocked</h1><div class="sub mono" style="margin-top:10px">${esc(authPending()?.email || '')}</div></div>
    <p style="margin:0;font-size:14px;line-height:1.6;color:var(--s5)">Your account has been blocked. Please contact the admin to request unblocking.</p>
    <a class="back" href="#/login" onclick="setPending(null)">${ic('arrow-left', 14)}Back to sign in</a>`),
});

/* ---------------- 02A · Authenticator app (TOTP) ---------------- */
route('/verify-authenticator', {
  auth: false, title: 'Verify Authenticator',
  render: () => {
    if (!authPending()) { setTimeout(() => go('/login')); return ''; }
    return authLayout(`
      <a class="back" href="#/login" onclick="setPending(null)">${ic('arrow-left', 14)}Back to sign in</a>
      <div><h1>Verify Authenticator</h1><div class="sub">Enter the 6-digit code generated by the Authenticator App.</div></div>
      <div class="otp ${Auth.errors.otp ? 'err' : ''}" id="otp">${Array.from({ length: 6 }, (_, i) => `<input inputmode="numeric" maxlength="1" aria-label="Digit ${i + 1}" data-i="${i}">`).join('')}</div>
      ${Auth.errors.otp ? errLine(Auth.errors.otp) : '<span class="hint">The code submits automatically after the 6th digit.</span>'}
      <button class="btn pri full" onclick="submitOtp()">Submit</button>
      ${demoCard(`The demo authenticator code is <b>${DEMO_TOTP}</b>. Any other code shows the error state.`, `
        <button class="demo-btn solid" onclick="fillOtp('${DEMO_TOTP}', true)">${ic('sparkles', 13)}Fill code ${DEMO_TOTP}</button>
        <button class="demo-btn" onclick="fillOtp('482193', true)">Try a wrong code</button>`)}`);
  },
  after: () => bindOtp('otp', submitOtp),
});
function bindOtp(boxId, onComplete) {
  const box = document.getElementById(boxId);
  if (!box) return;
  const inputs = [...box.querySelectorAll('input')];
  inputs.forEach((inp, i) => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '').slice(-1);
      if (inp.value && i < inputs.length - 1) inputs[i + 1].focus();
      if (inputs.every((x) => x.value)) onComplete();
    });
    inp.addEventListener('keydown', (ev) => { if (ev.key === 'Backspace' && !inp.value && i > 0) inputs[i - 1].focus(); });
    inp.addEventListener('paste', (ev) => {
      const t = (ev.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      if (!t) return;
      ev.preventDefault();
      t.split('').forEach((d, j) => { if (inputs[j]) inputs[j].value = d; });
      if (t.length === 6) onComplete();
    });
  });
  setTimeout(() => inputs[0].focus(), 30);
}
const otpValue = (boxId) => [...document.querySelectorAll(`#${boxId} input`)].map((x) => x.value).join('');
function fillOtp(code, submit) {
  const inputs = [...document.querySelectorAll('#otp input')];
  code.split('').forEach((d, i) => { inputs[i].value = d; });
  if (submit) submitOtp();
}
function submitOtp() {
  const code = otpValue('otp');
  if (code.length < 6) { Auth.errors.otp = 'Enter all 6 digits'; render(); return; }
  if (code !== DEMO_TOTP) {
    Auth.errors.otp = 'Code is not correct, please try again';
    render();
    const inputs = [...document.querySelectorAll('#otp input')];
    code.split('').forEach((d, i) => { inputs[i].value = d; });
    return;
  }
  Auth.errors = {};
  finishSignIn();
}

/* ---------------- 02B · Authentication method ---------------- */
route('/authentication-method', {
  auth: false, title: 'Authentication method',
  render: () => {
    const p = authPending();
    if (!p) { setTimeout(() => go('/login')); return ''; }
    const m = Auth.method;
    const opt = (key, icon, title, desc) => `<button class="method ${m === key ? 'on' : ''}" onclick="Auth.method='${key}';render()" ${Auth.connecting ? 'disabled' : ''}>
      <span class="mi">${ic(icon, 18)}</span><span><b style="display:block;font:600 14px/1.3 var(--f)">${title}</b><small style="display:block;font-size:12px;color:var(--s5);margin-top:4px;line-height:1.45">${desc}</small></span>
      <input class="radio" type="radio" ${m === key ? 'checked' : ''} tabindex="-1" style="accent-color:var(--ink)"></button>`;
    return authLayout(`
      <a class="back" href="#/login" onclick="setPending(null)">${ic('arrow-left', 14)}Back to sign in</a>
      <div><h1>Authentication method</h1><div class="sub">Select a login method.</div></div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${opt('wallet', 'wallet', 'Wallet Connect', 'Login using your wallet with Wallet Connect protocol.')}
        ${opt('device', 'key-round', 'Security Device', 'Log in using your registered security device.')}
      </div>
      <div style="display:flex;gap:10px"><button class="btn sec full" onclick="setPending(null);go('/login')">Cancel</button>
        <button class="btn pri full" ${!m || Auth.connecting ? 'disabled' : ''} onclick="authMethodNext()">${Auth.connecting ? 'Connecting...' : 'Next'}</button></div>
      ${demoCard(`Signed in as <b>${esc(p.email)}</b>. Wallet Connect and the security key are simulated: choose a method, press Next, then use the demo buttons in the prompt.`, `
        <button class="demo-btn solid" onclick="Auth.method='wallet';authMethodNext()">${ic('wallet', 13)}Use Wallet Connect</button>
        <button class="demo-btn" onclick="Auth.method='device';authMethodNext()">${ic('key-round', 13)}Use Security Device</button>`)}`);
  },
});
function authMethodNext() {
  const acct = ACCOUNTS[authPending().email];
  if (Auth.method === 'wallet') {
    openModal(modalFrame({
      title: 'WalletConnect', sub: 'Choose the wallet to sign the login message (simulated).', width: 460,
      body: `<div style="display:flex;flex-direction:column;gap:10px">
        <button class="method" onclick="walletPick(true)"><span class="mi"><img src="assets/metamask.png" alt="" style="width:22px"></span><span><b style="display:block">MetaMask · bound wallet</b><small class="mono" style="color:var(--s5)">${esc(acct.wallet)}</small></span></button>
        <button class="method" onclick="walletPick(false)"><span class="mi"><img src="assets/metamask.png" alt="" style="width:22px"></span><span><b style="display:block">MetaMask · another wallet</b><small class="mono" style="color:var(--s5)">0x77d1…b0a3 (not bound to this account)</small></span></button></div>`,
      foot: `<button class="btn sec" onclick="closeModal()">Cancel</button>`,
    }));
  } else if (Auth.method === 'device') {
    if (!acct.device) { toast('dan', 'Please contact team to bind security device first'); return; }
    go('/security-key');
  }
}
function walletPick(correct) {
  closeModal();
  Auth.connecting = true;
  render();
  setTimeout(() => {
    Auth.connecting = false;
    if (correct) finishSignIn('Wallet verified');
    else { render(); toast('dan', 'Authentication failed, please check your wallet'); }
  }, 1400);
}

route('/security-key', {
  auth: false, title: 'Security key',
  render: () => {
    if (!authPending()) { setTimeout(() => go('/login')); return ''; }
    return authLayout(`
      <a class="back" href="#/authentication-method">${ic('arrow-left', 14)}Back to authentication method</a>
      <div style="display:flex;flex-direction:column;align-items:center;gap:20px;text-align:center;padding:12px 0">
        <div class="keyring"><div>${ic('usb', 32)}</div></div>
        <div><h1 style="font-size:22px">Please insert the registered Security Key</h1><div class="sub">Plug-in your security key and activate it.</div></div>
        <span class="waiting">${ic('fingerprint', 15)}Waiting for your browser prompt…</span>
      </div>
      ${demoCard('No WebAuthn hardware is needed in the demo. Simulate a touch on the bound key.', `
        <button class="demo-btn solid" onclick="finishSignIn('Security key verified')">${ic('key-round', 13)}Touch security key</button>`)}`);
  },
});

/* ---------------- 03 · Password recovery ---------------- */
route('/forgot-password', {
  auth: false, title: 'Forgot Password',
  render: () => authLayout(`
    <a class="back" href="#/login">${ic('arrow-left', 14)}Back to sign in</a>
    <div><h1>Forgot Password</h1><div class="sub">Enter your user ID to receive an update password link.</div></div>
    <div class="field ${Auth.errors.reset ? 'err' : ''}"><label for="fp-email">UserID</label>
      <div class="input"><input id="fp-email" type="email" placeholder="Email Address" value="${esc(Auth.resetEmail)}"></div>${errLine(Auth.errors.reset)}</div>
    <button class="btn pri full" onclick="sendResetLink()">Get updated password link</button>
    ${demoCard('', `<button class="demo-btn solid" onclick="document.getElementById('fp-email').value='operator@goldzip.io'">${ic('sparkles', 13)}Fill demo email</button>`)}`),
});
function sendResetLink() {
  const v = val('fp-email');
  Auth.resetEmail = v;
  Auth.errors.reset = !v ? 'UserID is required' : !isEmail(v) ? 'Must be a valid email' : null;
  if (Auth.errors.reset) { render(); return; }
  go('/forgot-password/sent');
}
route('/forgot-password/sent', {
  auth: false, title: 'Check your email',
  render: () => authLayout(`
    <div class="ok-ic">${ic('mail-check', 28)}</div>
    <div><h1>We sent an update link</h1><div class="sub">Please check your email and follow the link to update your password.</div></div>
    <div class="input ro"><span class="mono" style="padding:10px 0">${esc(Auth.resetEmail || 'operator@goldzip.io')}</span></div>
    <a class="btn sec full" href="#/login">Back to sign in</a>
    ${demoCard('There is no real email in the demo. Open the link the email would contain:', `<button class="demo-btn solid" onclick="go('/reset-password')">${ic('external-link', 13)}Open the update-password link</button>`)}`),
});

const PWD_RULES = [
  ['At least 8 characters', (p) => p.length >= 8],
  ['One lowercase letter', (p) => /[a-z]/.test(p)],
  ['One uppercase letter', (p) => /[A-Z]/.test(p)],
  ['One number', (p) => /\d/.test(p)],
  ['One special character (!@#$%^&*)', (p) => /[!@#$%^&*]/.test(p)],
];
const pwdOk = (p) => PWD_RULES.every(([, t]) => t(p));
function genPassword() {
  const sets = ['abcdefghijkmnpqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789', '!@#$%^&*'];
  let out = sets.map((s) => s[Math.floor(Math.random() * s.length)]);
  const all = sets.join('');
  while (out.length < 12) out.push(all[Math.floor(Math.random() * all.length)]);
  return out.sort(() => Math.random() - 0.5).join('');
}
const policyHtml = (p) => `<div class="policy" id="policy">${PWD_RULES.map(([t, fn]) => `<span class="${fn(p) ? 'met' : ''}">${ic(fn(p) ? 'circle-check' : 'circle', 13)}${t}</span>`).join('')}</div>`;
function livePolicy(inputId) { const el = $('#policy'); if (el) el.outerHTML = policyHtml(val(inputId)); }

route('/reset-password', {
  auth: false, title: 'Update Password',
  render: () => {
    const f = Auth.form, e = Auth.errors;
    return authLayout(`
      <div><h1>Update Password</h1><div class="sub">Please create new password for sign in.</div></div>
      <div class="field ${e.np ? 'err' : ''}"><label for="rp-new"><span>Password</span><button class="link" style="font-size:12px" onclick="const g=genPassword();document.getElementById('rp-new').value=g;document.getElementById('rp-new').type='text';livePolicy('rp-new')">Generate password</button></label>
        <div class="input"><input id="rp-new" type="password" value="${esc(f.np || '')}" placeholder="New password" oninput="livePolicy('rp-new')">
        <button type="button" class="eye" onclick="togglePwd('rp-new')">${ic('eye', 16)}</button></div>${errLine(e.np)}</div>
      ${policyHtml(f.np || '')}
      <div class="field ${e.cp ? 'err' : ''}"><label for="rp-confirm">Confirm Password</label>
        <div class="input"><input id="rp-confirm" type="password" value="${esc(f.cp || '')}" placeholder="Confirm password">
        <button type="button" class="eye" onclick="togglePwd('rp-confirm')">${ic('eye', 16)}</button></div>${errLine(e.cp)}</div>
      <button class="btn pri full" onclick="doResetPassword()">Update Password</button>
      ${demoCard('', `<button class="demo-btn solid" onclick="fillReset()">${ic('sparkles', 13)}Fill a strong password</button>`)}`);
  },
});
function fillReset() { const g = 'Gz#7kLm2q!vR'; Auth.form = { np: g, cp: g }; Auth.errors = {}; render(); $('#rp-new').type = 'text'; }
function doResetPassword() {
  const np = val('rp-new'), cp = val('rp-confirm');
  Auth.form = { np, cp };
  const e = {};
  if (!np) e.np = 'Password is required'; else if (!pwdOk(np)) e.np = 'Password does not meet the policy';
  if (!cp) e.cp = 'Confirm Password is required'; else if (cp !== np) e.cp = "Doesn't match with password.";
  Auth.errors = e;
  if (Object.keys(e).length) { render(); return; }
  Auth.form = {};
  go('/password-updated');
}
route('/password-updated', {
  auth: false, title: 'Password updated',
  render: () => authLayout(`
    <div class="ok-ic">${ic('circle-check', 28)}</div>
    <div><h1>Password updated</h1><div class="sub">Your password is updated now. Please sign in with new password.</div></div>
    <a class="btn pri full" href="#/login">Go to Sign in</a>
    <span class="hint">Demo note: the demo accounts keep the password ${DEMO_PASSWORD}.</span>`),
});
