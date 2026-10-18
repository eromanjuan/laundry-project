# Multi-Tenant Platform Guide

The Laundry POS is now a **multi-tenant platform**: many independent laundry
shops share one Firebase project, each with an isolated workspace, its own staff
accounts and permissions, and per-shop settings. A platform **master** account
reviews and approves every shop.

This document covers the data model, security model, routing, roles, the
one-time migration, and the exact deployment order.

> Scope note: this project runs on the Firebase **Spark (free) plan**. Tenant
> isolation is therefore enforced entirely in **Firestore security rules** — shop
> membership is read from each user's `users/{uid}` profile document (not from
> custom claims, which Spark cannot mint dynamically). The LG machine sync and
> push notifications run as GitHub Actions, not Cloud Functions.

---

## 1. Concepts

| Concept | Meaning |
| --- | --- |
| **Platform master** | The single platform administrator. Allow-listed by **uid** in `firestore.rules`. No shop. |
| **Shop (tenant)** | One laundry business. Identified by a generated `shopId` and a unique URL **slug**. |
| **Owner / Administrator** | The person who registered the shop. Full control of that shop (staff, settings, data). |
| **Manager** | Staff role. Can manage pricing/settings/customers/machines and see finances. |
| **Staff/Cashier** | Staff role. Day-to-day operations (job orders, claims, payments). |
| **Shop status** | `pending` → `active` (approved) → `suspended` / `rejected`. Only the master changes it. |

**Master account**

- Email: `eugenioiromanjuan@gmail.com`
- UID (allow-listed in rules): `3NkY5cfPGhNYXfW4EukNDaOrEjz2`
- The password is **never** hardcoded. It is supplied at migration/run time (env
  var) and can be reset from the login screen ("Forgot password?").

---

## 2. Data model

### Top-level (global)

| Collection | Purpose |
| --- | --- |
| `shops/{shopId}` | Tenant root: name, slug, owner, contact, `status`. |
| `shopSlugs/{slug}` | **Public** slug → shop lookup. Safe fields only (name, logo, status). Powers unauthenticated login branding and `/{slug}` resolution. |
| `users/{uid}` | Every member profile (id mirror of the Auth uid) **and** the master. Carries `shopId`, `role`, `isActive`, `status`. |
| `usernames/{name}` | **Public** username → email/uid lookup, so users can sign in with a username. |
| `settings/{key}` | Legacy global settings. Master-only; only used as a migration source. |
| `_meta/*` | Platform internals (master-only). |

### Shop-scoped (every record carries `shopId`)

`customers`, `orders`, `claims`, `payments`, `expenses`, `cashPayments`,
`collections`, `machines`, `activity`, `paymentProofs`.

Every one of these has a `shopId` field. The client always filters queries with
`where('shopId', '==', activeShopId)` and stamps `shopId` on writes, and the
rules reject anything else.

### Per-shop settings — `shops/{shopId}/settings/{key}`

`pricing`, `business`, `branding`, `payment`, `lgConnection`, `lgToken`,
`lgStatus`. (Pricing and LG credentials are manager-only; the rest are readable
by any active member.)

### Public, customer-facing

| Collection | Read | Write |
| --- | --- | --- |
| `tracking/{shopId}_{jobKey}` | Anyone (no PII) | That shop's active staff |
| `paymentProofs/{id}` | That shop's members | Anyone — validated + size-capped (GCash proof) |
| `pushSubs/{id}` | **Nobody** | Anyone — validated shape (read by the push GitHub Action via service account) |

Order tracking is namespaced by shop, so two shops can reuse the same job number
without colliding. Receipt QR codes point at `/track/{shopId}/{jobKey}`.

---

## 3. Routing

| Path | Who | Purpose |
| --- | --- | --- |
| `/` | anyone | Redirects to the master console, the user's shop, or `/login`. |
| `/login` | anyone | Sign in (accepts email or username). `?shop={slug}` shows that shop's branding. |
| `/register` | anyone | Register a new shop + owner (creates a `pending` shop). |
| `/admin` | master | Platform console: approve / reject / suspend / reactivate shops (with a shop search bar). |
| `/admin/settings` | master | Manage platform administrators: add, promote, revoke. |
| `/{slug}/dashboard` … `/{slug}/settings` | that shop's active members (master may inspect) | The shop workspace. |
| `/{slug}/user-management` | Administrator | Add/edit/remove staff. |
| `/{slug}/settings` | Administrator, Manager | Shop configuration. |
| `/track/{shopId}/{jobKey}` | anyone | Public order-tracking page (also `/track/{jobKey}` for legacy receipts). |

Changing a URL is **never** authorization: `ShopGuard` resolves the slug and
bounces you to your own workspace, and the security rules independently deny any
read/write that does not belong to your shop.

---

## 4. Security model (`client/firestore.rules`)

- `isMaster()` — allow-listed by uid (`masterUid()`), **not** by email or role; also true when the caller's uid has a `platformAdmins/{uid}` document (§4a).
- `isMember(sid)` — signed-in user whose `users/{uid}.shopId == sid` and
  `isActive == true`.
- `isActiveMember(sid)` — member whose shop `status == 'active'`.
- `isShopManager(sid)` / `isShopAdmin(sid)` — member with role `Manager` /
  `Administrator`.
- Tenant collections: read requires `isMaster()` or `isActiveMember(shopId)`;
  writes must keep `shopId` unchanged and equal to the caller's shop.
- Self-service protections: a user may edit only safe fields of their own
  profile — they **cannot** change their `role`, `shopId`, `status`, `isActive`,
  `uid` or `email`. A shop admin can manage staff (role among
  Manager/Cashier, `isActive`) only inside their own shop, and can never create
  or promote an `Administrator` or `Master`.
- Registration: a new owner may create exactly one `pending` shop they own, its
  public slug, and their own `Administrator` profile.
- A deny-all catch-all rejects anything not explicitly matched.

Because the rules use `get()`, keep the number of `get()`/`exists()` calls low
per evaluation (they are already reused via helper functions).

### 4a. Platform administrators (`platformAdmins/{uid}`)

A platform administrator is any uid with a document in the
`platformAdmins` collection (the primary master is hard-coded in the
rules and needs no document). Two kinds exist:

- **Dedicated console account** — a real Auth user with `role: 'Master'`
  created from **Master Console → Settings** (`/admin/settings`). It has
  no shop; it exists only to run the platform.
- **Promoted shop account** — an existing shop member (owner,
  administrator, manager, cashier) whose uid was added to
  `platformAdmins` with `promoted: true`. **Their shop role, profile and
  username are left untouched** — they simply *also* hold platform-wide
  master rights. Revoking only deletes the allow-list document, so the
  shop login keeps working.

To promote: enter the person's email in `/admin/settings`. If an account
with that email already exists it is promoted in place (no password
needed); otherwise a new dedicated console account is created and must
set its own password on first sign-in (enforced by `MasterRoute` via
`mustChangePassword`).

Any signed-in user may read their *own* `platformAdmins/{uid}` document
(the app uses this to detect promotion); the whole list is
master-readable/writable only. Revoking requires re-entering the acting
master's password (`PasswordPromptModal`).

**One-click promotion:** on the Master Console → **Shops** list, every
shop row whose owner is *not* yet a platform administrator shows a
**Promote to master** button (rows already promoted show a
*Platform admin* badge instead). Confirming promotes that shop's owner
in place — the same allow-list write, with their shop role and profile
untouched. The email form in **Settings** remains for creating brand-new
dedicated console accounts.

---

## 5. Permission matrix (client UX, mirroring the rules)

| Capability | Administrator | Manager | Staff/Cashier |
| --- | :-: | :-: | :-: |
| Dashboard / Job orders / Claims / Payments / Cash drawer | ✓ | ✓ | ✓ |
| Add / manage customers | ✓ | ✓ | — (walk-in only) |
| Pricing & shop settings | ✓ | ✓ | — |
| Machine management | ✓ | ✓ | view + edit state |
| Sales summary / expenses / history | ✓ | ✓ | limited |
| User management (staff) | ✓ | — | — |
| Approve/suspend shops, create shops | — | — | — (master only) |

The platform **master** is not a shop member but holds full operator rights in
every shop: it can read and write any shop's data and, from that shop's **User
Management** page, manage every account role — create/update/remove
Administrators as well as Manager / Staff-Cashier (the rules grant `isMaster()`
on `users`/`usernames` writes). Shop owners may only manage Manager /
Staff-Cashier accounts; they cannot create, edit or delete an Administrator.
These are convenience gates; the rules are the source of truth.

Inside any shop workspace the master is also a full UI operator: the sidebar
shows **User Management**, and the shared capability hook
(`usePermissions`/`permissionsFor('Master')`) grants every capability
(customer/pricing/machine management, job orders). This keeps the master's
on-screen controls consistent with the backend rights.

---

## 6. One-time migration

Existing production data is flat (no `shopId`). The migration creates a default
shop, backfills `shopId`, and copies global settings into it.

**Order matters:** back up → run the migration → deploy the rules → deploy the
app. The migration is purely **additive**, so it runs fine under the *old*
permissive rules while the old single-tenant app is still live. Deploy the new
rules **after** the backfill: the moment they go live, the old app's unfiltered
queries become unprovable and it stops working, so keep that window as short as
possible (rules deploy immediately followed by the hosting deploy). Old docs are
invisible to shop members (and readable by the master) until the backfill runs.

> ⚠️ **Back up first.** Take a full JSON backup with the script below (or export
> from Firebase console → Firestore → Import/Export) before changing anything.
> Rules can be rolled back; a botched data write cannot.

### Steps

```powershell
cd client

# 0. Back up all production data to client/backups/*.json (no writes).
node --env-file=.env scripts/backup-firestore.mjs

# 1. Dry-run the migration (no writes) — review the plan:
node --env-file=.env scripts/migrate-multitenant.mjs --dry

# 2. Run it for real (additive + idempotent; only fills missing fields).
#    Pass the real business name/slug:
node --env-file=.env scripts/migrate-multitenant.mjs `
  --slug=laundry-project --name="Laundry Project"

# 3. Deploy the new security rules (short outage window starts here):
firebase deploy --only firestore:rules

# 4. Build and deploy the app:
npm run build
firebase deploy --only hosting
```

Both scripts read the master credentials from `client/.env`
(`MASTER_EMAIL` / `MASTER_PASSWORD`) — never commit that file.

The script signs in **as the master via the client SDK**, so every write is
checked by the very rules that gate the app — if the rules are wrong, it fails
loudly instead of writing bad data. It verifies the signed-in uid equals the
allow-listed master uid before doing anything.

It is safe to re-run: it only writes fields that are missing.

**Legacy receipts** keep working without migration: `/track/{jobKey}` still
reads the old top-level tracking docs (tracking read is public). The migration
also copies each legacy tracking doc into its namespaced id
(`tracking/{shopId}_{jobKey}`) so newly printed `/track/{shopId}/{jobKey}` links
resolve immediately, and re-points existing `pushSubs` documents at the
namespaced ids.

---

## 7. Master setup & shop lifecycle

1. **First master login** — sign in at `/login` with the master email. On first
   sign-in the app creates the master's `users/{uid}` profile with role `Master`
   (the rules allow this only for the allow-listed uid).
2. **New shop** — an owner self-registers at `/register`. This creates a
   `pending` `shops` doc, its `shopSlugs` doc, and the owner's `Administrator`
   profile.
3. **Approval** — the master opens `/admin`, reviews the shop, and clicks
   **Approve** (or **Reject** with a reason, or **Suspend**/**Reactivate**).
4. **Pending owners** see a clear status screen and cannot use the workspace
   until the shop is `active`.
5. **Master staff management** — the master can open any shop's workspace
   (`/{slug}/user-management`) and add, edit, disable or remove that shop's
   accounts, including **Administrators**, even though the master profile itself
   has no `shopId`. Shop owners are limited to Manager / Staff-Cashier accounts.
   New accounts are always created with the real Auth uid, so they sign in
   normally.

---

## 8. Spark-plan limitations (documented honestly)

- **No custom claims.** Roles are read from `users/{uid}` via rules `get()`.
- **No Cloud Functions.** LG sync (`lg-sync/`) and push (`push-sync/`) run as
  GitHub Actions using a service-account secret. `client/functions/index.js` is
  kept updated for a future Blaze move but is **not deployed**.
- **No Auth Admin SDK.** When a shop admin removes a staff member, the Firestore
  profile and username doc are deleted — which immediately blocks all access —
  but the underlying Firebase **Auth account cannot be deleted on Spark**. Such
  an account is inert (no profile ⇒ rules deny everything) and its email is
  still "in use". A rehire with the same email would need the Auth user removed
  from the console, or a different email.
- **Staff creation is client-side** via a throwaway secondary Firebase app so the
  owner stays signed in; the rules gate the profile creation.

---

## 9. Operating the sync jobs

- **LG sync** (`lg-sync/index.js`) iterates every shop with
  `shops/{shopId}/settings/lgConnection.enabled == true`, refreshes each shop's
  token, and writes `shops/{shopId}/settings/lgStatus`. Set `LG_SHOP_ID` to run
  one shop manually.
- **Push** (`push-sync/index.js`) reads `pushSubs`, compares each subscription's
  `lastStatus` against the namespaced `tracking/{shopId}_{jobKey}` doc, and
  deep-links the notification to `/track/{shopId}/{jobKey}`.

Both require the `FIREBASE_SERVICE_ACCOUNT` repository secret (plus the VAPID
keys for push).

---

## 10. Production deployment record

Applied to the live project `laundry-project-pos`:

- **Master uid** `3NkY5cfPGhNYXfW4EukNDaOrEjz2` (allow-listed in the deployed rules).
- **Backup:** `client/backups/firestore-backup-2026-10-09T03-36-18-257Z.json` (461 docs).
- **Default shop:** `Laundry Project` at `/laundry-project` → `shops/hVBkW1tZrkelgPgLTgzz`
  (owner = the master uid, contact/address pulled from the legacy `settings/business`).
- Backfilled `shopId` on 5 users, 5 usernames, 5 customers, 41 orders, 5
  collections, 6 machines, 358 activity and 4 paymentProofs; copied 7 settings
  docs; namespaced 23 tracking docs; re-pointed 1 push subscription.
- Security rules and hosting are live. Verified anonymously (public
  `shopSlugs`/`tracking` reads allowed; private `shops`/`users`/`orders` reads
  denied) and as master (41 orders, 358 activity, shop settings readable), plus
  an end-to-end browser pass: login → `/admin` (shop listed) → `/{slug}/dashboard`
  → `/track/{shopId}/{jobKey}` and legacy `/track/{jobKey}`.

✅ `npm run build` (TypeScript + Vite) passes.

**Legacy user accounts.** The old `users` collection was keyed by random
document **ids**, not Auth uids, and several records were demo/seed data (`u1`,
`u2`, `u3`). Under the uid-based rules, an account can only sign in if a
`users/{uid}` profile exists for its real Auth uid. The master account is a real
Auth identity and works; a legacy profile whose random doc id happens to equal
that account's real Auth uid also works. Any other legacy profile is an inert
record — it keeps its data but cannot authenticate. Staff created through a
shop's User Management always get their real Auth uid and are unaffected.
