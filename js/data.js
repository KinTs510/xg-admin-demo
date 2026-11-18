/* GoldZip Admin Portal — static demo
   data.js: demo accounts and the seed data every page reads. All names, wallets, amounts and dates are mock data. */
'use strict';

const SEED_VERSION = 5;

/* Demo sign-in accounts. Every account uses the same demo password. */
const DEMO_PASSWORD = 'Demo@2026!';
const DEMO_TOTP = '123456';
const ACCOUNTS = {
  'operator@goldzip.io': {
    name: 'Kelvin Wong', initials: 'KW', title: 'Operations', roles: ['Operations', 'Finance Approver'],
    second: 'totp', business: 'Corporate · GoldZip Operations Ltd.', device: 'YK-5C-2094-7731', wallet: '0x8F3a…41c2', twoFA: true,
    note: 'Operator · authenticator app (TOTP) · needs the security key for every write',
  },
  'superadmin@goldzip.io': {
    name: 'Ada Lam', initials: 'AL', title: 'SuperAdmin', roles: ['SuperAdmin'],
    second: 'method', business: null, device: 'YK-5C-1180-0042', wallet: '0x51A2…c09E', twoFA: false,
    note: 'Super-admin · Wallet Connect or Security Device · skips the security-key prompt',
  },
  'validator@goldzip.io': {
    name: 'Eric Lau', initials: 'EL', title: 'Validator', roles: ['Operations', 'Validator'],
    second: 'method', business: null, device: null, wallet: '0x2F9c…7a30', twoFA: false,
    note: 'Validator · no security device bound (shows the “bind device first” error)',
  },
  'blocked@goldzip.io': {
    name: 'Blocked User', initials: 'BU', title: 'Operations', roles: ['Operations'], second: 'totp', blocked: true,
    note: 'Blocked account · shows the Account blocked screen',
  },
};

/* Companies / clients reused across modules */
const CO = {
  acme: { business: 'Acme Bullion Ltd', contact: 'Alex Chan', email: 'alex.chan@acmebullion.hk', phone: '+852 9123 4567', ref: 'B71E3C05', address: '18/F, One Exchange Square, Central', website: 'acmebullion.hk', reg: '71234567', cgse: 'HKGX-0381', wallet: '0x4234520b…9e7c00a159', walletShort: '0x4234…a159', kyt: 'pass' },
  wingfung: { business: 'Wing Fung Precious Metals', contact: 'Ho Ka Yan', email: 'kayan.ho@wingfung.hk', phone: '+852 9234 5678', ref: 'A0D41E77', address: '22/F, Wing On House, 71 Des Voeux Road Central', website: 'wingfung.hk', reg: '65120987', cgse: 'HKGX-0244', wallet: '0x9b3E41d0…a27d21C0', walletShort: '0x9b3E…d21C0', kyt: 'flag' },
  golden: { business: 'Golden Harbour Ltd', contact: 'Peter Ng', email: 'peter.ng@goldenharbour.hk', phone: '+852 9345 6789', ref: 'D2F7A913', address: '9/F, Harbour Centre, 25 Harbour Road, Wan Chai', website: 'goldenharbour.hk', reg: '68830214', cgse: 'HKGX-0217', wallet: '0x7c19e2a4…5f0db3E4a2', walletShort: '0x7c19…E4a2', kyt: 'pass' },
  pacific: { business: 'Pacific Bullion HK', contact: 'Lau Kin', email: 'ops@pacificbullion.hk', phone: '+852 9456 7890', ref: '7D33F1C8', address: '15/F, Pacific Place, 88 Queensway, Admiralty', website: 'pacificbullion.hk', reg: '70045521', cgse: 'HKGX-0158', wallet: '0x2d8A90c1…77b141F9c3', walletShort: '0x2d8A…F9c3', kyt: 'pass' },
  kowloon: { business: 'Kowloon Gems Co.', contact: 'Tse Wing', email: 'tse.wing@kowloongems.hk', phone: '+852 9567 8901', ref: 'E61A0C55', address: '3/F, 18 Nathan Road, Tsim Sha Tsui', website: 'kowloongems.hk', reg: '71900342', cgse: 'HKGX-0999 (declared)', wallet: '0xd9cc12f0…3b97eac9eb', walletShort: '0xd9cc…7eac9eb', kyt: 'pass' },
  harbour: { business: 'Harbour Jewellery Ltd', contact: 'Mary Lee', email: 'mary.lee@harbourjewellery.hk', phone: '+852 9678 9012', ref: 'F943BAFD', address: "G/F, 30 Queen's Road Central", website: 'harbourjewellery.hk', reg: '69981230', cgse: '—', wallet: '0x5Ae2b7c3…e18dC0d417', walletShort: '0x5Ae2…d417', kyt: 'pass' },
  lucky: { business: 'Lucky Gold Trading Co.', contact: 'Leung Chi Wai', email: 'info@luckygold.hk', phone: '+852 9789 0123', ref: 'C3B8F0A1', address: '6/F, 168 Johnston Road, Wan Chai', website: 'luckygold.hk', reg: '72210875', cgse: 'HKGX-0412 (declared)', wallet: '0x61bF0a2e…c4d19a03E7', walletShort: '0x61bF…03E7', kyt: 'pass' },
  chan: { business: '—', contact: 'Chan Tai Man', email: 'chan.taiman@gmail.com', phone: '+852 6123 4567', ref: '7C2A90DE', address: 'Flat 12B, 88 Robinson Road, Mid-Levels', website: '—', reg: '—', cgse: '—', wallet: '0x3e7d55b1…902a6c1d8F', walletShort: '0x3e7d…1d8F', kyt: 'pass', individual: true },
  siu: { business: '—', contact: 'Siu Wai Ling', email: 'swl.siu@outlook.com', phone: '+852 6234 5678', ref: '5E19C2B8', address: 'Flat 8A, 3 Tai Hang Road, Tai Hang', website: '—', reg: '—', cgse: '—', wallet: '0xa04c9e33…118bd27f60', walletShort: '0xa04c…7f60', kyt: 'pass', individual: true },
};

const SUPPLY_BARS = [
  { brand: 'Heraeus', country: 'Switzerland', serial: 'HE-2026-104382', qty: 1000, coa: 'COA-HE-88213' },
  { brand: 'Heraeus', country: 'Switzerland', serial: 'HE-2026-104383', qty: 1000, coa: 'COA-HE-88214' },
  { brand: 'PAMP', country: 'Switzerland', serial: 'PA-77120931', qty: 1000, coa: 'COA-PA-55102' },
];

function buildSeed() {
  const futureMs = (d, h = 0, m = 0) => Date.now() + ((d * 24 + h) * 60 + m) * 60 * 1000;

  /* ---------------- Client onboarding (KYC / KYB cases) ---------------- */
  const caseOf = (co, type, stage, extra = {}) => ({
    ref: CO[co].ref, co, type, stage, appDate: extra.appDate || '2026/10/16 09:42', pending: null,
    report: null, reportStatus: 'none', result: null, expiry: null, verifDate: null, dob: extra.dob || '14-03-1984', ...extra,
  });
  const cases = [
    caseOf('acme', 'HKGX KYB', 'incoming', { appDate: '2026/10/16 09:42', dob: '14-03-1984' }),
    caseOf('chan', 'KYC', 'incoming', { appDate: '2026/10/16 09:15', dob: '02-08-1979' }),
    caseOf('harbour', 'Non HKGX KYB', 'incoming', { appDate: '2026/10/15 17:58', dob: '21-11-1988' }),
    caseOf('lucky', 'Non HKGX KYB', 'incoming', { appDate: '2026/10/14 18:44', dob: '05-06-1975' }),
    caseOf('wingfung', 'HKGX KYB', 'verification', { appDate: '2026/10/15 16:20', dob: '30-01-1982' }),
    caseOf('siu', 'KYC', 'verification', { appDate: '2026/10/15 11:03', dob: '19-09-1991', report: 'Compliance-Report-5E19C2B8.pdf', reportStatus: 'pend', pending: 'AP-00001' }),
    { ref: '9F02D6E4', co: null, person: { contact: 'Wong Mei Kuen', email: 'meikuen.w@gmail.com', phone: '+852 6345 6789', address: 'Flat 3C, 12 Fuk Wing Street, Sham Shui Po' }, type: 'KYC', stage: 'verification', appDate: '2026/10/14 10:12', dob: '11-12-1969', pending: null, report: null, reportStatus: 'none' },
    caseOf('golden', 'HKGX KYB', 'decision', { appDate: '2026/10/13 14:20', dob: '08-04-1980', report: 'Compliance-Report-D2F7A913.pdf', reportStatus: 'done' }),
    caseOf('pacific', 'HKGX KYB', 'decision', { appDate: '2026/10/12 10:02', dob: '17-07-1977', report: 'Compliance-Report-7D33F1C8.pdf', reportStatus: 'done' }),
    caseOf('kowloon', 'Non HKGX KYB', 'decision', { appDate: '2026/10/12 08:31', dob: '23-02-1986', report: 'Compliance-Report-E61A0C55.pdf', reportStatus: 'pend', pending: 'AP-00002' }),
  ];
  const histCase = (ref, contact, business, type, app, ver, result, exp, email) => ({
    ref, co: null, person: { contact, email, phone: '+852 9' + ref.slice(0, 3).replace(/\D/g, '1') + ' 0000', address: 'Hong Kong', business }, type, stage: 'history',
    appDate: app, verifDate: ver, result, expiry: exp, report: `Compliance-Report-${ref}.pdf`, reportStatus: 'done', pending: null, dob: '01-01-1980',
  });
  cases.push(
    histCase('D1F7A903', 'Peter Ng', 'Golden Harbour Ltd', 'HKGX KYB', '2026/10/10 14:20', '2026/10/14 11:05', 'Pass', '14-10-2027', 'peter.ng@goldenharbour.hk'),
    histCase('0B8C44E1', 'Lam Siu Fung', '—', 'KYC', '2026/10/09 10:02', '2026/10/13 16:40', 'Pass', '13-10-2027', 'lam.sf@gmail.com'),
    histCase('E61A0C11', 'Tse Wing', 'Kowloon Gems Co.', 'Non HKGX KYB', '2026/10/08 18:31', '2026/10/12 09:12', 'Fail', null, 'tse.wing@kowloongems.hk'),
    histCase('4A9E7B02', 'Ho Yee Man', '—', 'KYC', '2026/10/07 09:47', '2026/10/11 15:28', 'Pass', '11-10-2027', 'hoyeeman@gmail.com'),
    histCase('7D33F1A0', 'Cheung Lok', 'Pacific Bullion HK', 'HKGX KYB', '2026/10/06 13:15', '2026/10/10 10:44', 'Pass', '10-10-2027', 'cheung.lok@pacificbullion.hk'),
    histCase('91C2E6AA', 'Yip Ka Lok', 'Star Jewellery Ltd', 'Non HKGX KYB', '2026/10/05 11:20', '2026/10/09 17:03', 'Fail', null, 'kalok@starjewellery.hk'),
    histCase('C08D51F4', 'Fung Wai', '—', 'KYC', '2026/10/03 16:08', '2026/10/08 12:30', 'Pass', '08-10-2027', 'fungwai@yahoo.com.hk'),
  );

  /* ---------------- Registered users ---------------- */
  const user = (created, email, first, last, business, status, extra = {}) => ({
    id: email, created, email, first, last, business, status, alias: '', occupation: extra.occupation || 'Director', phone: extra.phone || '+852 9123 4567',
    dob: extra.dob || '14-03-1984', street: extra.street || '1 Kennedy Road', room: extra.room || '21A', floor: extra.floor || '21/F', building: extra.building || 'Kennedy Heights',
    district: extra.district || 'Mid-Levels', town: 'Hong Kong', country: 'Hong Kong SAR', postal: '', idNo: extra.idNo || 'A123***(7)', wallet: extra.wallet || '0x4234520b…9e7c00a159',
    proofAddress: 'Bank-statement.pdf', proofId: `HKID-${first}-${last}.pdf`, co: extra.co || null, pending: null, updated: created,
  });
  const users = [
    user('2026/10/16 09:40', 'alex.chan@acmebullion.hk', 'Alex', 'Chan', 'Acme Bullion Ltd', 'Active', { co: 'acme' }),
    user('2026/10/16 09:12', 'chan.taiman@gmail.com', 'Tai Man', 'Chan', '—', 'Inactive', { occupation: 'Engineer', phone: '+852 6123 4567', dob: '02-08-1979', street: '88 Robinson Road', room: '12B', floor: '12/F', building: 'Robinson Heights', idNo: 'Y456***(2)', wallet: '0x3e7d55b1…902a6c1d8F' }),
    user('2026/10/15 17:51', 'mary.lee@harbourjewellery.hk', 'Mary', 'Lee', 'Harbour Jewellery Ltd', 'Active', { co: 'harbour', phone: '+852 9678 9012', wallet: '0x5Ae2b7c3…e18dC0d417' }),
    user('2026/10/14 12:08', 'kayan.ho@wingfung.hk', 'Ka Yan', 'Ho', 'Wing Fung Precious Metals', 'Restricted', { co: 'wingfung', phone: '+852 9234 5678', wallet: '0x9b3E41d0…a27d21C0' }),
    user('2026/10/12 15:30', 'swl.siu@outlook.com', 'Wai Ling', 'Siu', '—', 'Active', { occupation: 'Accountant', phone: '+852 6234 5678', wallet: '0xa04c9e33…118bd27f60' }),
    user('2026/10/09 10:22', 'info@luckygold.hk', 'Chi Wai', 'Leung', 'Lucky Gold Trading Co.', 'Terminated', { co: 'lucky', phone: '+852 9789 0123', wallet: '0x61bF0a2e…c4d19a03E7' }),
    user('2026/10/06 08:59', 'meikuen.w@gmail.com', 'Mei Kuen', 'Wong', '—', 'Inactive', { occupation: 'Retired', phone: '+852 6345 6789', wallet: '0x88a1f0c2…6d3e0b11A9' }),
    user('2026/10/04 17:20', 'peter.ng@goldenharbour.hk', 'Peter', 'Ng', 'Golden Harbour Ltd', 'Active', { co: 'golden', phone: '+852 9345 6789', wallet: '0x7c19e2a4…5f0db3E4a2' }),
    user('2026/10/02 11:47', 'ops@pacificbullion.hk', 'Kin', 'Lau', 'Pacific Bullion HK', 'Active', { co: 'pacific', phone: '+852 9456 7890', wallet: '0x2d8A90c1…77b141F9c3' }),
    user('2026/09/28 09:03', 'tse.wing@kowloongems.hk', 'Wing', 'Tse', 'Kowloon Gems Co.', 'Restricted', { co: 'kowloon', phone: '+852 9567 8901', wallet: '0xd9cc12f0…3b97eac9eb' }),
    user('2026/09/25 14:36', 'lam.sf@gmail.com', 'Siu Fung', 'Lam', '—', 'Active', { occupation: 'Trader', phone: '+852 6456 7890', wallet: '0x19dE33a0…b72c58E011' }),
    user('2026/09/21 16:05', 'hoyeeman@gmail.com', 'Yee Man', 'Ho', '—', 'Active', { occupation: 'Designer', phone: '+852 6567 8901', wallet: '0xC0ff3e11…4a92d8B7c5' }),
  ];

  /* ---------------- Supply orders ---------------- */
  const fee = (o = {}) => ({ type: 'USDT Transfer', hash: '0x0856aacd9c8c70bda6ee4f2c1b07d3a95e61b2c0f4a8d7e3c9b1a6f5914390254e', source: 'Auto-filled from MetaMask', from: '0xd9cc…7eac9eb', paidAt: '2026-10-16 18:06:10', receipt: 'RCPT-SUP-20261016-K2MQA', appFee: 400, supplyFee: 4120, goldPrice: 137340, rate: 1, valid: true, ...o });
  const so = (id, cref, co, applied, stage, o = {}) => ({
    id, cref, co, applied, stage, pending: null, kyb: 'Verified', membership: 'HKGX member · verified', declaredAt: '2026/10/16 17:52', kybType: 'HKGX KYB',
    location: 'HKGX Vault · Tsing Yi', handover: 'Tue 2026/10/20', slot: '10:00–12:00', payMethod: 'Pay by Sender', bars: clone(SUPPLY_BARS), fee: fee(o.fee),
    agreement: `Asset-Exchange-Agreement-${id}.pdf`, signedAt: '2026/10/16 18:04', vaultFile: null, testing: null, assay: null, assayResult: null, mint: null, refund: null, ...o, fee: fee(o.fee),
  });
  const testingDone = { bars: [0, 2], test: 'Gold content determination by difference method', ret: 'Not Return', reps: [{ name: 'Kelvin Wong', id: 'K123***(5)' }], submittedAt: '2026/10/21 16:20' };
  const assayDone = { appNo: 'HKPMAC-26-1042', receipt: '22-10-2026', completed: '24-10-2026', remarks: 'Both sampled bars ≥ 999.9 fineness.', report: 'Inspection-Report-HKPMAC-26-1042.pdf' };
  const supply = [
    so('SO-2026-00184', 'ACME-SUP-031', 'acme', '2026/10/16', 'countersign'),
    so('SO-2026-00183', 'WF-SUP-012', 'wingfung', '2026/10/16', 'countersign', { kyb: 'KYB pending', membership: 'Self-declared HKGX member', handover: 'Wed 2026/10/21', slot: '12:00–14:00', fee: { source: 'Pasted manually', from: '0x9b3E…d21C0', receipt: 'RCPT-SUP-20261016-W8PLZ' } }),
    so('SO-2026-00169', 'LG-SUP-002', 'lucky', '2026/10/12', 'countersign', { kyb: 'KYB pending', membership: 'Self-declared HKGX member', handover: 'Fri 2026/10/23', slot: '12:00–14:00', fee: { hash: '0856aacd9c8c70bda6ee…254', source: 'Format invalid', valid: false, from: '0x61bF…03E7', receipt: 'RCPT-SUP-20261012-L2GQX' } }),
    so('SO-2026-00176', 'KG-SUP-004', 'kowloon', '2026/10/14', 'rejected', { kyb: 'Rejected', membership: 'Self-declared HKGX member', handover: 'Thu 2026/10/22', slot: '16:00–18:00', fee: { receipt: 'RCPT-SUP-20261014-KG4RT' } }),
    so('SO-2026-00181', 'GHL-SUP-009', 'golden', '2026/10/15', 'vault', { handover: 'Wed 2026/10/21', slot: '14:00–16:00' }),
    so('SO-2026-00179', 'PBH-SUP-020', 'pacific', '2026/10/15', 'testing', { handover: 'Thu 2026/10/22', slot: '10:00–12:00', vaultFile: 'Stock-in-Summary-SO-2026-00179.pdf', vaultAt: '2026/10/22 14:02' }),
    so('SO-2026-00172', 'HJL-SUP-015', 'harbour', '2026/10/13', 'inspection', { kybType: 'Non HKGX KYB', membership: 'Non-member', handover: 'Fri 2026/10/23', slot: '10:00–12:00', vaultFile: 'Stock-in-Summary-SO-2026-00172.pdf', vaultAt: '2026/10/23 13:40', testing: clone(testingDone), assay: { appNo: 'HKPMAC-26-1051', receipt: '24-10-2026' } }),
    so('SO-2026-00174', 'ACME-SUP-029', 'acme', '2026/10/13', 'result', { handover: 'Mon 2026/10/19', vaultFile: 'Stock-in-Summary-SO-2026-00174.pdf', vaultAt: '2026/10/19 15:12', testing: clone(testingDone), assay: clone(assayDone) }),
    so('SO-2026-00171', 'WF-SUP-010', 'wingfung', '2026/10/11', 'issue', { handover: 'Fri 2026/10/16', vaultFile: 'Stock-in-Summary-SO-2026-00171.pdf', vaultAt: '2026/10/16 12:30', testing: clone(testingDone), assay: { ...clone(assayDone), appNo: 'HKPMAC-26-1031' }, assayResult: 'Pass' }),
    so('SO-2026-00170', 'GHL-SUP-008', 'golden', '2026/10/11', 'issue', { handover: 'Thu 2026/10/15', vaultFile: 'Stock-in-Summary-SO-2026-00170.pdf', vaultAt: '2026/10/15 11:05', testing: clone(testingDone), assay: { ...clone(assayDone), appNo: 'HKPMAC-26-1029' }, assayResult: 'Pass' }),
    so('SO-2026-00166', 'PBH-SUP-018', 'pacific', '2026/10/09', 'issuing', { handover: 'Tue 2026/10/13', vaultFile: 'Stock-in-Summary-SO-2026-00166.pdf', vaultAt: '2026/10/13 10:40', testing: clone(testingDone), assay: { ...clone(assayDone), appNo: 'HKPMAC-26-1018' }, assayResult: 'Pass',
      mint: { method: 'request', tx: { hash: '0x7a1c4e0b9d2f8a6c3e5b7d9f1a2c4e6b8d0f2a4c6e8b0d2f4a6c8e02c8e93f04', time: '2026-10-25 11:20:42', block: '21,084,377', gas: '0.0021 ETH', status: 'Success' } } }),
  ];
  const hist = (id, cref, co, applied, grams, ok) => {
    const o = so(id, cref, co, applied, ok ? 'completed' : 'failed', { vaultFile: `Stock-in-Summary-${id}.pdf`, testing: clone(testingDone), assay: clone(assayDone), assayResult: ok ? 'Pass' : 'Fail' });
    const n = grams / 1000;
    o.bars = Array.from({ length: n }, (_, i) => ({ brand: i % 2 ? 'PAMP' : 'Heraeus', country: 'Switzerland', serial: `${i % 2 ? 'PA' : 'HE'}-2026-${100200 + i}`, qty: 1000, coa: `COA-${i % 2 ? 'PA' : 'HE'}-${70100 + i}` }));
    o.testing.bars = n > 1 ? [0, n - 1] : [0];
    if (ok) o.mint = { method: 'request', tx: { hash: '0x' + randHex(64), time: applied.replace(/\//g, '-') + ' 15:42:10', block: fmtInt(21000000 + Math.floor(Math.random() * 90000)), gas: '0.0019 ETH', status: 'Success' }, completedAt: applied };
    return o;
  };
  supply.push(
    hist('SO-2026-00165', 'GHL-SUP-007', 'golden', '2026/10/10', 2000, true),
    hist('SO-2026-00161', 'WF-SUP-009', 'wingfung', '2026/10/08', 1000, false),
    hist('SO-2026-00158', 'ACME-SUP-027', 'acme', '2026/10/05', 3000, true),
    hist('SO-2026-00152', 'PBH-SUP-016', 'pacific', '2026/10/02', 10000, true),
    hist('SO-2026-00147', 'HJL-SUP-012', 'harbour', '2026/09/29', 1000, true),
    hist('SO-2026-00141', 'GHL-SUP-005', 'golden', '2026/09/26', 4000, true),
  );

  /* ---------------- Redemption orders ---------------- */
  const ro = (id, cref, co, applied, stage, o = {}) => {
    const bars = o.bars || 2;
    return {
      id, cref, co, applied, stage, pending: null, requestBy: o.requestBy || CO[co].contact,
      items: [{ type: '1 kg bar (999.9)', qty: bars, weight: bars * 1000 }], grams: bars * 1000, fee: o.fee || (bars === 1 ? 160 : bars * 157.5),
      location: 'HKGX Vault · Tsing Yi', collection: o.collection || 'Fri 2026/10/23', slot: o.slot || '10:00–12:00', method: 'Self Pick-Up',
      person: o.person || { name: 'Wong Ka Ho', id: 'B765***(4)', phone: '+852 9876 5432', rel: 'Operations Manager' },
      escrow: '0xE5c0…d3A7', deposit: o.deposit === false ? null : { tx: o.depTx || '0x31ac…9f02', at: o.depAt || '2026-10-16 11:05:42' },
      receiptNo: 'RCPT-RDM-20261015-LWGEX', agreement: `Digital-Asset-Agreement-${id}.pdf`, signedAt: applied + ' 09:40',
      retrieved: o.retrieved || [], stockOut: o.stockOut || null, phase: o.phase || null, timerTo: o.timerTo || null,
      receipt: o.receipt || null, releaseTx: o.releaseTx || null, cancelTx: o.cancelTx || null, status: o.status || null, burn: o.burn || null, endedNote: o.endedNote || null,
    };
  };
  const pampBars = (n) => Array.from({ length: n }, (_, i) => ({ brand: 'PAMP', serial: `HK-00391${pad2(i + 2)}`, weight: '999.999', coa: `COA-PA-6122${i}` }));
  const receiptSample = { no: 'RCPT-COL-20261023-0092', at: '2026-10-23 10:42', uploadedAt: '2026-10-23 10:48', files: [
    { name: 'Collection-Receipt.pdf', meta: 'PDF · 0.4 MB' }, { name: 'ID-check-photo.jpg', meta: 'JPG · 1.2 MB' }, { name: 'Handover-photo-HKGX-Vault.jpg', meta: 'JPG · 2.8 MB' }], remarks: 'Bars handed over, serials checked.' };
  const redemption = [
    ro('RO-2026-00094', 'KG-RED-003', 'kowloon', '2026/10/15', 'deposit', { bars: 1, deposit: false, collection: 'Tue 2026/10/27', person: { name: 'Tse Wing', id: 'C321***(9)', phone: '+852 9567 8901', rel: 'Director' } }),
    ro('RO-2026-00092', 'ACME-RED-014', 'acme', '2026/10/14', 'vault', { requestBy: 'Wong Ka Ho' }),
    ro('RO-2026-00091', 'GHL-RED-007', 'golden', '2026/10/14', 'approval', { collection: 'Mon 2026/10/26', slot: '14:00–16:00', retrieved: pampBars(2), stockOut: 'Stock-Out-Summary-RO-2026-00091.pdf', person: { name: 'Peter Ng', id: 'D882***(1)', phone: '+852 9345 6789', rel: 'Director' } }),
    ro('RO-2026-00089', 'CTM-0031', 'chan', '2026/10/13', 'escrow', { bars: 1, phase: 'grace', timerTo: futureMs(4, 14, 22), collection: 'Thu 2026/10/29', retrieved: pampBars(1), stockOut: 'Stock-Out-Summary-RO-2026-00089.pdf', person: { name: 'Chan Tai Man', id: 'Y456***(2)', phone: '+852 6123 4567', rel: 'Self' } }),
    ro('RO-2026-00088', 'HJL-RED-102', 'harbour', '2026/10/13', 'escrow', { bars: 5, phase: 'cancelreq', timerTo: futureMs(3, 8, 5), collection: 'Wed 2026/10/28', retrieved: pampBars(5), stockOut: 'Stock-Out-Summary-RO-2026-00088.pdf', person: { name: 'Mary Lee', id: 'E901***(3)', phone: '+852 9678 9012', rel: 'Director' } }),
    ro('RO-2026-00085', 'PBH-RED-044', 'pacific', '2026/10/12', 'escrow', { bars: 1, phase: 'lock', timerTo: futureMs(0, 22, 10), collection: 'Fri 2026/10/23', requestBy: 'Lau Kin', retrieved: pampBars(1), stockOut: 'Stock-Out-Summary-RO-2026-00085.pdf' }),
    ro('RO-2026-00083', 'WF-RED-019', 'wingfung', '2026/10/12', 'escrow', { bars: 2, phase: 'collect', collection: 'Thu 2026/10/22', retrieved: pampBars(2), stockOut: 'Stock-Out-Summary-RO-2026-00083.pdf', person: { name: 'Ho Ka Yan', id: 'F112***(6)', phone: '+852 9234 5678', rel: 'Director' } }),
    ro('RO-2026-00080', 'SWL-0007', 'siu', '2026/10/09', 'escrow', { bars: 2, phase: 'confirm', collection: 'Wed 2026/10/21', retrieved: pampBars(2), stockOut: 'Stock-Out-Summary-RO-2026-00080.pdf', receipt: clone(receiptSample), person: { name: 'Siu Wai Ling', id: 'G778***(0)', phone: '+852 6234 5678', rel: 'Self' } }),
    ro('RO-2026-00078', 'ACME-RED-012', 'acme', '2026/10/08', 'history', { status: 'Success', burn: 'NotStarted', retrieved: pampBars(2), receipt: clone(receiptSample), releaseTx: '0x91af…0c55e1' }),
    ro('RO-2026-00076', 'GHL-RED-006', 'golden', '2026/10/07', 'history', { status: 'Success', burn: 'WaitingApproval', retrieved: pampBars(2), receipt: clone(receiptSample), releaseTx: '0x4be0…a1f772' }),
    ro('RO-2026-00075', 'CTM-0029', 'chan', '2026/10/06', 'history', { bars: 1, status: 'Rejected', burn: 'Void', cancelTx: '0x0c3d…77e2a1', endedNote: 'Stock rejected · escrowed XGZ returned' }),
    ro('RO-2026-00073', 'HJL-RED-099', 'harbour', '2026/10/05', 'history', { bars: 5, status: 'Success', burn: 'ApprovalSuccess', retrieved: pampBars(5), receipt: clone(receiptSample), releaseTx: '0x66d1…b0e9c3' }),
    ro('RO-2026-00071', 'PBH-RED-041', 'pacific', '2026/10/04', 'history', { bars: 1, status: 'Success', burn: 'Completed', retrieved: pampBars(1), receipt: clone(receiptSample), releaseTx: '0x2a7f…e4c019' }),
    ro('RO-2026-00069', 'WF-RED-017', 'wingfung', '2026/10/03', 'history', { bars: 1, fee: 80, status: 'Cancelled', burn: 'Void', cancelTx: '0x8e21…5d03bf', endedNote: 'Client cancellation accepted · escrowed XGZ returned' }),
    ro('RO-2026-00066', 'SWL-0005', 'siu', '2026/10/01', 'history', { bars: 2, status: 'Success', burn: 'Completed', retrieved: pampBars(2), receipt: clone(receiptSample), releaseTx: '0xb913…77a0d2' }),
  ];
  redemption.find((r) => r.id === 'RO-2026-00069').items[0] = { type: '500 g bar', qty: 1, weight: 500 };
  redemption.find((r) => r.id === 'RO-2026-00069').grams = 500;

  /* ---------------- Settings ---------------- */
  const settings = {
    wallets: [
      { name: 'GoldZip Collections', addr: '0xGZ7f…Pay001', tag: 'Multisig' },
      { name: 'GoldZip Treasury', addr: '0x51A2…c09E', tag: 'Multisig' },
      { name: 'Ops Hot Wallet', addr: '0x8E07…11bD', tag: 'Connected' },
    ],
    paymentWallet: '0xGZ7f…Pay001',
    fees: { supply: { appFee: 400, goldPrice: 137340, rate: 1.0 }, redemption: { appFee: 400, goldPrice: 137340, rate: 1.2 } },
    banks: [['004', 'The Hongkong and Shanghai Banking Corporation'], ['024', 'Hang Seng Bank'], ['012', 'Bank of China (Hong Kong)'], ['003', 'Standard Chartered Bank (HK)'], ['016', 'DBS Bank (Hong Kong)']],
    bank: { code: '004', holder: 'GoldZip Limited', branch: '848', account: '482-1830-001' },
    brands: [
      { id: 1, name: 'Heraeus', country: 'Switzerland', address: 'Heraeus Precious Metals, Hanau-Wolfgang, Germany' },
      { id: 2, name: 'PAMP', country: 'Switzerland', address: 'Via Cantonale, 6874 Castel San Pietro, Switzerland' },
      { id: 3, name: 'Valcambi', country: 'Switzerland', address: 'Via Passeggiata 6, 6828 Balerna, Switzerland' },
      { id: 4, name: 'Argor-Heraeus', country: 'Switzerland', address: 'Via Moree 14, 6850 Mendrisio, Switzerland' },
      { id: 5, name: 'Perth Mint', country: 'Australia', address: '310 Hay Street, East Perth WA 6004, Australia' },
      { id: 6, name: 'Metalor', country: 'Switzerland', address: 'Avenue du Vignoble 3, 2000 Neuchâtel, Switzerland' },
    ],
    methods: [{ id: 1, name: 'Pay by Sender' }, { id: 2, name: 'Armoured Transport' }],
    depositLocations: [
      { id: 1, name: 'HKGX Vault · Tsing Yi', street: '12 Tsing Yi Road', city: 'Tsing Yi', country: 'Hong Kong SAR', postal: '', methods: ['Pay by Sender'], holidays: [{ name: 'Chung Yeung Festival', date: '29-10-2026' }, { name: 'Christmas Day', date: '25-12-2026' }, { name: 'Lunar New Year', date: '17-02-2027' }] },
      { id: 2, name: 'Brink’s Vault · Kwai Chung', street: '88 Container Port Road', city: 'Kwai Chung', country: 'Hong Kong SAR', postal: '', methods: ['Pay by Sender', 'Armoured Transport'], holidays: [{ name: 'Christmas Day', date: '25-12-2026' }, { name: 'New Year’s Day', date: '01-01-2027' }] },
      { id: 3, name: 'Malca-Amit Vault · Sheung Wan', street: 'Shun Tak Centre, 200 Connaught Road', city: 'Sheung Wan', country: 'Hong Kong SAR', postal: '', methods: ['Pay by Sender'], holidays: [] },
    ],
    escrow: { counterParty: '0xE5c7…Taker1', broadcaster: '0x9D44…Gas002' },
    escrowWallets: [
      { name: 'Escrow Taker', addr: '0xE5c7…Taker1' }, { name: 'GoldZip Treasury', addr: '0x51A2…c09E' }, { name: 'Ops Hot Wallet', addr: '0x8E07…11bD' }, { name: 'Gas Wallet', addr: '0x9D44…Gas002' },
    ],
    redemptionLocations: [
      { id: 1, name: 'HKGX Vault · Tsing Yi', street: '12 Tsing Yi Road', city: 'Tsing Yi', country: 'Hong Kong SAR', postal: '', lead: 2, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], tz: '(UTC+08:00) Hong Kong',
        slots: [['10:00', '12:00'], ['12:00', '14:00'], ['14:00', '16:00'], ['16:00', '18:00']], holidays: [{ name: 'Chung Yeung Festival', date: '29-10-2026' }, { name: 'Christmas Day', date: '25-12-2026' }],
        picked: ['Fri 2026/10/23 · 10:00–12:00', 'Mon 2026/10/26 · 14:00–16:00', 'Wed 2026/10/28 · 10:00–12:00'] },
      { id: 2, name: 'GoldZip Counter · Central', street: '18/F, One Exchange Square', city: 'Central', country: 'Hong Kong SAR', postal: '', lead: 2, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], tz: '(UTC+08:00) Hong Kong',
        slots: [['10:00', '12:00'], ['14:00', '16:00']], holidays: [], picked: ['Thu 2026/10/22 · 14:00–16:00'] },
    ],
    productTypes: [
      { id: 1, type: 'Bar', name: '1 kg bar', weight: '1000' }, { id: 2, type: 'Bar', name: '500 g bar', weight: '500' }, { id: 3, type: 'Bar', name: '100 g bar', weight: '100' },
      { id: 4, type: 'Coin', name: '1 oz coin', weight: '31.1035' }, { id: 5, type: 'Bar', name: '1 tael bar', weight: '37.429' },
    ],
    pending: {},   // card key -> approval id (old values stay live until approved)
  };

  /* ---------------- Approvals + Transaction Requests ---------------- */
  const approvals = [
    { id: 'AP-00002', created: '2026/10/16 15:12', by: 'Rita Chan', module: 'Client Onboarding', title: 'Upload compliance report', ref: 'E61A0C55', action: { type: 'kyc.report', params: { ref: 'E61A0C55', file: 'Compliance-Report-E61A0C55.pdf' } }, status: 'pending' },
    { id: 'AP-00001', created: '2026/10/16 11:40', by: 'Rita Chan', module: 'Client Onboarding', title: 'Upload compliance report', ref: '5E19C2B8', action: { type: 'kyc.report', params: { ref: '5E19C2B8', file: 'Compliance-Report-5E19C2B8.pdf' } }, status: 'pending' },
    { id: 'AP-00000', created: '2026/10/15 10:02', by: 'Kelvin Wong', module: 'Redemption', title: 'Burn token request', ref: 'RO-2026-00076', action: { type: 'burn.approve', params: { id: 'RO-2026-00076' } }, status: 'approved', decidedBy: 'Ada Lam', decidedAt: '2026/10/15 14:30' },
  ];
  const txRequests = [
    { id: 'TX-00031', created: '2026/10/15 14:30', type: 'Burn', ref: 'RO-2026-00076', wallet: '0xGZ1s…Issuer', token: 'XGZ', amount: 2000, to: '—',
      signers: [{ role: 'Owner', name: 'GoldZip Treasury', addr: '0x51A2…c09E', signed: true }, { role: 'Trustee', name: 'Trustee — HK Trust Co.', addr: '0x2F9c…7a30', signed: false }], status: 'pending' },
    { id: 'TX-00029', created: '2026/10/12 10:15', type: 'Mint', ref: 'SO-2026-00166', wallet: '0xGZ1s…Issuer', token: 'XGZ', amount: 3000, to: CO.pacific.wallet,
      signers: [{ role: 'Operator', name: 'Kelvin Wong', addr: '0x51A2…c09E', signed: true }, { role: 'Validator', name: 'Eric Lau', addr: '0x2F9c…7a30', signed: true }, { role: 'Validator', name: 'Joyce Ho', addr: '0xC41d…e5F2', signed: true }], status: 'executed', hash: '0x7a1c…e93f04', executedAt: '2026/10/25 11:20' },
  ];

  /* ---------------- Dashboard ---------------- */
  const addrs = ['0x4234…a159', '0x2d8A…F9c3', '0x7c19…E4a2', '0x5Ae2…d417', '0x9b3E…d21C0', '0xa04c…7f60', '0x3e7d…1d8F', '0xE5c0…d3A7', '0xGZ1s…Issuer', '0x0000…0000'];
  const ts = (d, h, m) => `2026-10-${pad2(d)} ${pad2(h)}:${pad2(m)}:${pad2((d * 7 + m) % 60)}`;
  const tokenTx = [
    ['Mint', 3000, addrs[9], addrs[0], ts(25, 11, 20)], ['Transfer', 2000, addrs[0], addrs[7], ts(24, 16, 2)], ['Burn', 1000, addrs[8], addrs[9], ts(24, 9, 41)],
    ['Mint', 10000, addrs[9], addrs[1], ts(22, 14, 12)], ['Transfer', 500, addrs[1], addrs[5], ts(21, 18, 30)], ['Transfer', 2000, addrs[2], addrs[7], ts(20, 10, 5)],
    ['Burn', 2000, addrs[8], addrs[9], ts(19, 15, 48)], ['Mint', 2000, addrs[9], addrs[2], ts(18, 11, 0)], ['Transfer', 1200, addrs[3], addrs[6], ts(17, 13, 26)],
    ['Mint', 1000, addrs[9], addrs[3], ts(16, 9, 55)], ['Transfer', 300, addrs[6], addrs[5], ts(15, 20, 14)], ['Burn', 5000, addrs[8], addrs[9], ts(14, 12, 33)],
  ].map(([method, value, from, to, time]) => ({ hash: '0x' + randHex(64), method, value, from, to, time }));
  const walletTx = [
    ['Transfer', '4,520.00 USDT', addrs[0], '0xGZ7f…Pay001', ts(25, 9, 12)], ['Execute', '0 ETH', '0x51A2…c09E', addrs[8], ts(25, 11, 20)], ['Transfer', '315.00 USDT', addrs[2], '0xGZ7f…Pay001', ts(24, 10, 4)],
    ['Approve', '0 ETH', addrs[0], addrs[7], ts(24, 15, 59)], ['Transfer', '4,520.00 USDT', addrs[1], '0xGZ7f…Pay001', ts(22, 13, 41)], ['Execute', '0 ETH', '0x2F9c…7a30', addrs[8], ts(19, 15, 48)],
    ['Transfer', '1,780.00 USDT', addrs[3], '0xGZ7f…Pay001', ts(18, 8, 27)], ['Transfer', '160.00 USDT', addrs[6], '0xGZ7f…Pay001', ts(16, 17, 2)],
  ].map(([method, value, from, to, time]) => ({ hash: '0x' + randHex(64), method, value, from, to, time }));
  const holders = [
    ['0x2d8A90c1…77b141F9c3', 128400], ['0x7c19e2a4…5f0db3E4a2', 96250], ['0x4234520b…9e7c00a159', 71300], ['0x5Ae2b7c3…e18dC0d417', 44120],
    ['0x9b3E41d0…a27d21C0', 30010], ['0xE5c0b19a…7c11d3A7', 18000], ['0xa04c9e33…118bd27f60', 12600], ['0x3e7d55b1…902a6c1d8F', 7900], ['0x61bF0a2e…c4d19a03E7', 4000],
  ];
  const circ = holders.reduce((a, [, q]) => a + q, 0);
  const tokenHolders = holders.map(([address, qty], i) => ({ rank: i + 1, address, qty, pct: (qty / circ) * 100, usd: qty * 137.34 }));
  const walletTokens = [
    { token: 'XGZ · GoldZip Token', contract: '0xGZ1s…Issuer', balance: '2,000.000', usd: 274680 },
    { token: 'USDT · Tether USD', contract: '0xdAC1…1ec7', balance: '186,420.55', usd: 186420.55 },
    { token: 'ETH · Ether', contract: 'Native', balance: '3.4180', usd: 11962.99 },
  ];

  return {
    __v: SEED_VERSION,
    seq: { ap: 3, tx: 32 },
    demo: { approvalMode: false, redemptionFlow: 'v1', network: 'Ethereum Sepolia', wallet: null, show2FA: true },
    cases, users, supply, redemption, settings, approvals, txRequests,
    dashboard: { tokenTx, walletTx, tokenHolders, walletTokens, circ },
    profile2FA: {},
  };
}

/* lookups */
const coOf = (key) => CO[key] || null;
const caseByRef = (ref) => S().cases.find((c) => c.ref === ref);
const soById = (id) => S().supply.find((o) => o.id === id);
const roById = (id) => S().redemption.find((o) => o.id === id);
function caseInfo(c) {
  if (c.co) { const co = CO[c.co]; return { business: co.business, contact: co.contact, email: co.email, phone: co.phone, address: co.address, website: co.website, reg: co.reg, cgse: co.cgse, individual: !!co.individual }; }
  const p = c.person || {};
  return { business: p.business || '—', contact: p.contact, email: p.email, phone: p.phone, address: p.address, website: '—', reg: '—', cgse: '—', individual: c.type === 'KYC' };
}
