# LG Machine Sync via GitHub Actions (free, no Blaze)

This runs the LG login + status sync in GitHub Actions every 5 minutes and writes
the results into your existing Firestore — no Firebase Blaze plan or credit card
needed. Firestore stays on the free Spark plan.

## What it does

`.github/workflows/lg-sync.yml` runs `lg-sync/index.js` on a schedule. The script
reads the LG email/password you saved in the POS (Settings → Machine Sync), logs
into LG, and writes each store's live washer/dryer availability to
`settings/lgStatus`, which the app displays.

## One-time setup

### 1. Create a Firebase service-account key (free)

1. Go to: **https://console.firebase.google.com/project/laundry-project-pos/settings/serviceaccounts/adminsdk**
2. Click **Generate new private key** → **Generate key**. A `.json` file downloads.
3. Open that file and copy its **entire contents**.

> This key lets the sync job write to your Firestore. Keep it private — never
> commit it to the repo. We store it as an encrypted GitHub secret instead.

### 2. Add it as a GitHub secret

1. Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**.
   (https://github.com/creativeclyde28-ux/LaundryProjectPOS/settings/secrets/actions)
2. **Name:** `FIREBASE_SERVICE_ACCOUNT`
3. **Value:** paste the full JSON you copied. Click **Add secret**.

### 3. Make sure Actions are enabled

Repo → **Settings → Actions → General** → allow actions to run. Scheduled
workflows run from the **default branch** (`main`), which is where this file lives.

## Use it

1. In the POS: **Settings → Machine Sync (LG)** → enter the LG **email + password**
   → **Sign in**. (This saves the credentials to Firestore for the job to read.)
2. Within ~5 minutes the first sync runs and live status appears in the app.
3. To sync immediately without waiting: repo → **Actions → LG Machine Sync →
   Run workflow**.

## Notes & limits

- **Schedule lag:** GitHub may delay scheduled runs by a few minutes under load —
  fine for laundry availability.
- **Inactivity:** GitHub pauses scheduled workflows if the repo has had no commits
  for 60 days. A single commit re-activates it.
- **Cost:** GitHub Actions is free for this (each run takes seconds). Firestore
  stays on the free plan.
- **Credentials:** the LG password lives in Firestore (`settings/lgConnection`);
  lock that down in `firestore.rules` so only admins/managers can read it.
- **Change LG account anytime:** just re-enter new credentials in the app — the
  job always reads the latest.
