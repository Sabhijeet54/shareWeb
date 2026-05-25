# TradeLite Dashboard

A simple mobile-first trading dashboard built with Next.js, React, Tailwind CSS, Firebase Auth, Firestore, and React Icons.

## Features

- Private login only, using Firebase Email/Password Authentication
- No public signup
- Persistent login session and logout
- Wallet balance stored in Firestore
- App-local demo market data for stable paper trading screens
- Mobile bottom navigation: Watchlist, Orders, Funds, Profile
- Swipeable watchlist categories for indices, futures, options, stocks, commodities, and crypto
- Paper buy/sell buttons that debit or credit the Firestore wallet
- Orders page with fake executed trade history
- Funds request flow with amount and UTR
- Admin-only payment panel based on configured admin email
- Approve or reject payments
- Approved payments increment user wallet balance instantly
- Vercel-ready configuration

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Firebase v9 modular SDK
- React Icons

## Folder Structure

```text
src/
  app/
    globals.css
    layout.tsx
    page.tsx
  components/
    AdminPanel.tsx
    AppGate.tsx
    BottomNav.tsx
    DashboardApp.tsx
    FundsPage.tsx
    LoginScreen.tsx
    MarketOverview.tsx
    ProfilePage.tsx
    WalletCard.tsx
  context/
    AuthContext.tsx
  lib/
    firebase.ts
  types/
    app.ts
public/
  upi-qr.svg
```

## Firebase Setup

1. Create a Firebase project.
2. Enable Authentication, then enable Email/Password sign-in.
3. Manually create users in Firebase Authentication.
4. Create Firestore Database.
5. Copy `.env.example` to `.env.local` and fill in your Firebase web app config.
6. Replace `NEXT_PUBLIC_ADMIN_EMAIL` with the admin login email.
7. Replace `NEXT_PUBLIC_ADMIN_UPI_ID` with your UPI ID.
8. Replace `public/upi-qr.svg` with your real UPI QR image if needed.

## Environment Variables

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com
NEXT_PUBLIC_ADMIN_UPI_ID=admin@upi
UPSTOX_API_KEY=your_upstox_api_key
UPSTOX_API_SECRET=your_upstox_api_secret
UPSTOX_ACCESS_TOKEN=optional_initial_access_token
UPSTOX_REFRESH_TOKEN=your_refresh_token
```

`UPSTOX_API_KEY`, `UPSTOX_API_SECRET`, and `UPSTOX_REFRESH_TOKEN` enable automatic access-token renewal at runtime (REST + live stream auth paths). No daily manual token replacement in env is required.

## Firestore Collections

### `users/{uid}`

```json
{
  "email": "user@example.com",
  "name": "Demo User",
  "walletBalance": 0,
  "bankName": "Not added",
  "accountNumber": "Not added",
  "ifsc": "Not added"
}
```

### `payments/{paymentId}`

```json
{
  "amount": 1000,
  "utr": "123456789012",
  "status": "pending",
  "userEmail": "user@example.com",
  "userId": "firebase-auth-uid",
  "createdAt": "server timestamp"
}
```

### `trades/{tradeId}`

```json
{
  "side": "BUY",
  "symbol": "NIFTY 22500 CE",
  "title": "NIFTY 22500 CE",
  "quantity": 1,
  "price": 142,
  "amount": 142,
  "status": "executed",
  "mode": "paper",
  "userEmail": "user@example.com",
  "userId": "firebase-auth-uid",
  "createdAt": "server timestamp"
}
```

## Example Users

Create these manually in Firebase Authentication for testing:

```text
Admin
Email: admin@example.com
Password: Admin@12345

User
Email: user@example.com
Password: User@12345
```

After first login, the app creates or merges the matching `users/{uid}` document automatically with `walletBalance: 0`.

## Firebase Rules

Update `admin@example.com` inside `firestore.rules` before publishing it to Firebase.

```bash
firebase deploy --only firestore:rules
```

The admin panel is hidden in the UI unless the logged-in email matches `NEXT_PUBLIC_ADMIN_EMAIL`. Real protection still depends on Firebase security rules.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Vercel Deployment

1. Push this project to GitHub.
2. Import the repo in Vercel.
3. Add all variables from `.env.example` in Vercel Project Settings.
4. Deploy.

## Notes

- This app does not execute real market trades. Buy and sell actions are paper trades that only update the app wallet.
- Market data is demo/static data for stable UI and paper trading.
- Payment approval is manual by design.
