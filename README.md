# xg-admin-demo

A static, clickable demo of the **GoldZip Admin Portal** (back office), built from the design file
`GoldZip Admin Portal - UI` (v2.3.x) and the developer guide `GoldZip-Admin-Portal-Flows.md`.

It is plain HTML, CSS and JavaScript. There is no build step and no backend: data lives in your
browser's `localStorage`, so you can click through every flow, change data, and reset it.

## Run it

Pick one:

- **Open the file:** double-click `index.html`.
- **Local server:** from this folder, run `python -m http.server 8080` and open http://localhost:8080
- **GitHub Pages:** Settings → Pages → Deploy from branch → `main` / root. The site has no build step.

## Demo sign-in

Every account uses the password **`Demo@2026!`**. The sign-in page has a **Demo data** card that fills
these for you, plus a one-click **Demo login**. Each later credential step has its own fill button.

| Account | Second factor | What it shows |
|---|---|---|
| `operator@goldzip.io` | Authenticator app, code **`123456`** | Operations / Finance Approver. Every write asks for the security key. |
| `superadmin@goldzip.io` | Authentication method: Wallet Connect or Security Device | SuperAdmin. Skips the security-key prompt. |
| `validator@goldzip.io` | Authentication method | No security device bound: shows *“Please contact team to bind security device first”*. |
| `blocked@goldzip.io` | — | The *Account blocked* screen. |

Simulated steps (no real hardware, wallet or email needed):

- **Security key (WebAuthn):** a *Touch security key* button in the prompt.
- **Wallet Connect:** pick the bound wallet (success) or another wallet (*Authentication failed*).
- **Forgot password:** the *We sent an update link* page has a button that opens the reset link.
- **Uploads:** every drop zone accepts a real file or offers *Use demo file*.

## Demo controls

The gold **Demo controls** button (bottom right, after sign-in) lets you:

- turn **Approval mode** on or off (maker/checker: writes wait in **Approvals** or apply at once),
- switch between the operator and the super-admin without signing out,
- switch the **Redemption order flow** between design option v1 (two steps) and v2 (one step),
- show the **idle timeout** dialog,
- **reset** all demo data.

## What is covered

| Section | Screens |
|---|---|
| 01 Sign in | Form, validation, wrong credentials toast, account blocked |
| 02 Second factor | Authenticator (auto-submit on 6th digit, wrong code), authentication method, Wallet Connect, security key |
| 03 Password recovery | Forgot password, link sent, update password with live policy and *Generate password*, done |
| 04 Signed in | Account popover, My profile, change password, 2FA enable/disable dialogs, idle timeout, Dashboard (4 tabs, filter, CSV export) |
| 05 Client Onboarding | Incoming Request, KYC/KYB Verification (report upload), Verfication Decision (Pass + expiry / Fail), History, Registered Users (view, edit, validation) |
| 06 Supply Management | Order List (countersign, T&C, KYB pending, invalid hash on hold, reject, supply-fee refund), Vault Management, Assay Management (testing application, pass/fail), Assay Inspection (assay-centre upload), Minting (3-step issue wizard with KYT warning and multisig approvers, manual issuance, confirm), History |
| 07 Redemption | Order List (v1/v2), Vault Management (stock retrieval, totals check), Vault Approval, Escrow (grace timer, cancellation request, lock period, receipt upload, release funds), History and burn wizard |
| 08 Settings | General (payment wallet, fee variables, bank account, gold brands, blocked dates), Deposit (locations, methods), Redemption (escrow wallets, locations with lead days, preview calendar and time-slot validation, product types) |
| Approvals, Transaction Requests | Not drawn in the design file. Working stand-ins so the approval and multisig flow (mint, burn) can be tested end to end. |

The write pattern from the guide is implemented everywhere: security key (skipped for SuperAdmin) →
*Success*, or *Awaiting Approval* with a yellow *Waiting for approvals* banner when approval mode is on.
Settings keep the old values live until a change is approved. Blocked Dates always go to approval.
Mint and burn always go through Approvals, then Transaction Requests.

## Project layout

```
index.html          entry page
css/app.css         design tokens and components (Manrope + IBM Plex Mono, gold/ink palette)
js/core.js          store, hash router, toasts, modals, security key + approval write pattern, UI helpers
js/data.js          demo accounts and seed data
js/auth.js          01–03 sign in, second factor, password recovery
js/shell.js         app shell, account popover, demo controls, My profile, 2FA
js/misc.js          Dashboard, Approvals, Transaction Requests
js/onboarding.js    05 Client Onboarding
js/supply.js        06 Supply Management
js/redemption.js    07 Redemption
js/settings.js      08 Settings
js/app.js           boot
assets/             logo, mark, splash image, vendored Lucide icons
```

## Notes

- All names, wallet addresses, amounts and dates are mock data from the design.
- Routes other than `/login`, `/forgot-password`, `/reset-password` and `/dashboard` are this demo's own
  choice; the design does not define them (open point 5).
- The supply-fee formula shown in Settings is inferred from the design's sample numbers. Confirm it with the backend.
- Icons are from [Lucide](https://lucide.dev) (ISC licence), vendored in `assets/icons`. Fonts load from Google Fonts.
