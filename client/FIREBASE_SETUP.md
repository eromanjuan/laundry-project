# Firebase Setup — LaundryProjectPOS

The app is fully wired to **Cloud Firestore**. Until you add your project config it
runs on local sample data (you'll see a `[Firebase] No configuration found` note in
the browser console). Follow the steps below to switch it to your live database.

The only steps that need your Google account are 1–4 (creating the project). Everything
else — the SDK, data layer, seeding, and every screen — is already done in code.

---

## 1. Create the Firebase project

1. Go to <https://console.firebase.google.com/> and sign in.
2. Click **Add project** → name it **`laundryprojectpos`** → Continue.
3. Google Analytics is optional; you can disable it. Click **Create project**.

## 2. Register a Web App

1. In the project, click the **Web** icon `</>` (Add app).
2. Nickname it `laundry-pos-web` → **Register app**.
3. Firebase shows a `firebaseConfig` object. Keep this tab open — you need these values.

## 3. Enable Cloud Firestore

1. Left sidebar → **Build → Firestore Database → Create database**.
2. Choose a location (pick the one nearest you) → **Next**.
3. Start in **Test mode** for now (open read/write) → **Enable**.
   > Test mode is fine for development. See "Security rules" below before going live.

## 4. Paste your config into `.env`

In the `client/` folder, copy `.env.example` to `.env` and fill in the values from the
`firebaseConfig` object in step 2:

```
VITE_FIREBASE_API_KEY=AIza...your key...
VITE_FIREBASE_AUTH_DOMAIN=laundryprojectpos.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=laundryprojectpos
VITE_FIREBASE_STORAGE_BUCKET=laundryprojectpos.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef...
```

`.env` is git-ignored, so your keys stay on your machine.

## 5. Restart the dev server

```
cd client
npm run dev
```

On first load the console prints `[Firebase] Connected to project: laundryprojectpos`
and the app **auto-seeds** your database with sample records (customers, orders,
expenses, payments, users, etc.). Refresh the Firestore console — you'll see the
collections appear. From then on every add/edit/delete in the UI is saved to the cloud
and syncs live across browser tabs.

---

## What's stored in the database

| Collection      | Screen(s) that use it                          |
| --------------- | ---------------------------------------------- |
| `users`         | Login, User Management (roles & access)        |
| `customers`     | Customers                                       |
| `orders`        | Job Orders (create), Production Board, Dashboard|
| `claims`        | Claim Laundry                                   |
| `payments`      | Payments                                        |
| `expenses`      | Expenses                                        |
| `cashPayments`  | Cash Drawer (sales recognition)                 |
| `collections`   | Cash Drawer (cash collections)                  |

Login accounts (seeded): `admin/admin123`, `manager/manager123`, `staff/staff123`.

---

## Security rules (before production)

Test mode lets anyone read/write. Before deploying, lock it down in
**Firestore → Rules**. A simple starting point that requires the app's own auth flow is
beyond Firestore's default (this app uses a custom users collection, not Firebase Auth),
so for a real deployment consider migrating login to **Firebase Authentication** and then:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Ask and I can migrate authentication to Firebase Auth (email/password) so these rules
apply cleanly.
