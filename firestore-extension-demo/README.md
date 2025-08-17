# Firestore Sync Demo (Chrome MV3)

Streams a Firestore collection into `chrome.storage.local` via an offscreen document and displays it in a popup.

## Setup
1. Fill `src/firebaseConfig.json` with your Web App config.
2. Choose `collectionPath`:
   - `snippets` (top-level collection), or
   - `users/{uid}/snippets` (per-user subcollection), or
   - `demo/default/snippets` (3 segments)
3. Enable Authentication (Anonymous for the demo) in Firebase Console.
4. Optional: Firestore rules for quick testing
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read: if request.auth != null; }
  }
}
```

## Build
```
npm install
npm run build
```
Load `public/` as an unpacked extension in `chrome://extensions`.

## How it works
- `background.js` ensures an offscreen document exists
- `offscreen.js` listens to Firestore, posts data via `chrome.runtime.sendMessage({ type: 'firestore-data' })`
- `background.js` writes the payload into `chrome.storage.local` and broadcasts `snippets-updated`
- `popup.js` reads `chrome.storage.local` and updates UI

## Troubleshooting
- Invalid collection reference: use a path with an odd number of segments (collection path)
- `auth/configuration-not-found`: enable chosen auth provider or adjust rules
- `Cannot read properties of undefined (reading 'local')`:
  - Ensure you are loading `public/` (built JS). Do not open HTML files directly.
  - The offscreen page now posts to background which writes storage.
- Still failing? Open `service worker` and `offscreen` console from `chrome://extensions` → Details → Inspect views.