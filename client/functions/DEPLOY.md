# LG Machine-Sync Backend — Deploy Guide

This Cloud Function logs into the LG "Laundry Crew Manager" account (using the
email/password saved in the POS under **Settings → Machine Sync**), reads each
store's live washer/dryer availability every 5 minutes, and writes it to
Firestore (`settings/lgStatus`) for the app to display.

## One-time setup

1. **Enable the Blaze plan** (pay-as-you-go) on the Firebase project
   `laundry-project-pos`. Scheduled Cloud Functions require it. At this volume
   (one login + one small request every 5 min) it stays within the free tier.
   → Firebase console → ⚙️ → Usage and billing → Modify plan → Blaze.

2. **Install the Firebase CLI** (if not already):
   ```
   npm install -g firebase-tools
   firebase login
   ```

3. **Install function dependencies:**
   ```
   cd client/functions
   npm install
   ```

## Deploy

From the `client/` folder (where `firebase.json` lives):

```
firebase deploy --only functions
```

This deploys two functions:
- `syncLg` — runs automatically every 5 minutes.
- `syncLgNow` — called by the app's **Sign in** / **Sync now** buttons for an
  immediate refresh.

## Use

1. In the POS, go to **Settings → Machine Sync (LG)**.
2. Enter the LG account **email + password**, choose region **PH**, press
   **Sign in**. This validates the credentials and pulls live status right away.
3. Live per-store availability then shows there and on the **Machine Monitoring**
   page, refreshing every 5 minutes.

## Security notes

- The LG password is stored in Firestore (`settings/lgConnection`) so the
  function can log in. Lock this down in `firestore.rules` so only
  Administrators/Managers can read `settings/lgConnection` and `settings/lgToken`.
- The token (`settings/lgToken`) is managed by the function and refreshed
  automatically (LG tokens last 1 hour).

## How it works (for maintenance)

- `lgClient.js` implements the LG login: `SHA512(password)` → EMP session →
  OAuth code → access/refresh token, then calls
  `GET kic-laundry.lgthinq.com/status?today=…`.
- If LG changes their login flow or endpoints, that's the file to update. The
  request signing for the token step uses an HMAC-SHA1 secret recovered from the
  site (`CLIENT_SECRET` in `lgClient.js`); the login-step signature is fetched
  from LG's own `/oauthSignature` endpoint.
