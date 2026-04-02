# Firebase Functions Setup For Iris AI

This project now includes a Cloud Function backend at:
- `functions/index.js`
- Function name used by the app: `interviewReply`

## 1. Set your Firebase project id

Update these placeholders:
- `.firebaserc` -> `your-firebase-project-id`
- `src/config/ai.ts` -> `FIREBASE_PROJECT_ID`

## 2. Install CLIs and login

```bash
npm install -g firebase-tools
firebase login
```

## 3. Initialize project binding (first time)

From project root:

```bash
firebase use your-firebase-project-id
```

## 4. Install function dependencies

```bash
cd functions
npm install
```

## 5. Set function secrets

Set Gemini/Groq keys once with Firebase Secret Manager:

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set GROQ_API_KEY
```

When prompted, paste each key value.

Optional runtime vars (not secrets), set in your shell before deploy:

```powershell
$env:GROQ_MODEL="llama-3.3-70b-versatile"
```

Optional routing overrides:

```powershell
$env:MODEL_PRIMARY="gemini-2.5-flash"
$env:MODEL_FALLBACK="gemini-2.5-flash-lite"
$env:MODEL_ESCALATION="gemini-2.0-flash-lite"
$env:MODEL_MAX_RETRIES="1"
```

## 6. Deploy

From project root:

```bash
firebase deploy --only functions
```

Expected endpoints:
- `https://us-central1-your-firebase-project-id.cloudfunctions.net/health`
- `https://us-central1-your-firebase-project-id.cloudfunctions.net/interviewReply`

## 7. Build your APK again

After deployment and config update:

```bash
cd android
./gradlew assembleRelease
```

## Notes

- In debug (`__DEV__`), app still points to your local backend (`/ai/interview-reply`).
- In release, app points to Firebase Functions (`/interviewReply`).
- The function accepts Firebase Auth bearer tokens when provided by the app.
