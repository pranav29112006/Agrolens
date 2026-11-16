# AgroLens

AI-powered crop disease diagnosis and treatment advisory app (CSE-311, Group 5).
It has two stages: a CNN classifies leaf photos, then a RAG advisory layer gives treatment advice in the farmer's language.

## Repository layout

| Folder | What it is | Stack |
|---|---|---|
| `mobile/` | The AgroLens app (Android, iOS, web) | Expo (React Native) + TypeScript, Expo Router |
| `backend/` | API for diagnosis and weather ([backend/README.md](backend/README.md)) | Python 3.12, FastAPI, onnxruntime |
| `ml/` | Training the CNN and exporting it to ONNX ([ml/README.md](ml/README.md)) | Python, PyTorch |
| `supabase/` | Database schema | PostgreSQL (Supabase) |

## Database

Accounts, crops, diagnoses and the knowledge base live in Supabase.

1. In the Supabase dashboard, open **SQL Editor**, paste [supabase/schema.sql](supabase/schema.sql) and run it. It creates the tables, access rules and the photo storage bucket. For a project created before a change, run the matching file in [supabase/migrations](supabase/migrations) instead.
2. Copy `mobile/.env.example` to `mobile/.env` and fill in your project URL and anon key (Project Settings → API). Restart the dev server afterwards.

Only ever put the **anon / publishable** key in the app. The `service_role` key bypasses all access rules and belongs on the backend only.

## Running the app

Requires Node.js 20+.

```bash
cd mobile
npm install
npm start
```

- **On your phone:** install **Expo Go** from the Play Store, connect the phone to the same Wi-Fi as the laptop, and scan the QR code shown in the terminal.
  - On college Wi-Fi the phone often can't reach the laptop directly. Run `npm run start:tunnel` instead; it works on any network, including mobile data.
- **In a browser:** press `w` in the terminal, or open http://localhost:8081.

Run `npm run typecheck` to type-check the code.

### Connecting the app to the backend

Leaf diagnosis and the weather cards need the backend running (see [backend/README.md](backend/README.md)). The app calls `EXPO_PUBLIC_API_URL` from `mobile/.env`, which defaults to `http://localhost:8000`.

- **In a browser on the laptop:** the default works; just start the backend.
- **On a phone:** `localhost` is the phone itself, so set `EXPO_PUBLIC_API_URL` to an address the phone can reach and restart the dev server. On a shared Wi-Fi that allows it, start the backend with `--host 0.0.0.0` and use the laptop's Wi-Fi address (`http://192.168.x.x:8000`). On networks that block device-to-device traffic, such as college Wi-Fi, expose port 8000 through a public tunnel and use that URL.

## App structure (`mobile/src`)

First launch goes: language picker, then intro slides, then location permission, then crop selection, then "how do you grow" (pots, home garden or fields), then sign in / sign up, then home.

- `app/`: screens. Each file is a route (Expo Router).
  - `index.tsx`: sends the user to the next step they haven't finished.
  - `language.tsx`: language picker (19 languages).
  - `onboarding.tsx`: four swipeable intro slides (detection, treatment plans, language support, crop management).
  - `location.tsx`: optional location permission. It saves approximate coordinates (rounded to about 1 km) on the device for weather-based advice later. Skipping or denying still continues into the app.
  - `crops.tsx`: pick the crops you grow from 68 options, with search. Also reached from home to edit the list later.
  - `grower-type.tsx`: pots, home garden or fields (skippable). Saved as `profiles.grower_type` so advice can be scaled per pot, bed or acre.
  - `sign-in.tsx` / `sign-up.tsx`: email and password accounts through Supabase.
  - `(tabs)/`: the main app after sign-in, with four tabs:
    - `home.tsx` ("Your crops"): crop row, live weather and spraying cards (backend `/weather`), the take-a-picture card, Tools and Library shortcuts.
    - `diagnoses.tsx`: history of leaf scans, read from the account's `diagnoses` rows and photos.
    - `library.tsx`: crops, pests and diseases, cultivation tips and disease alerts.
    - `you.tsx`: account, feedback and sharing.
  - `settings.tsx`: language, crops, how you grow, location, temperature unit, account and version. Also has developer tools to replay onboarding.
  - `scan.tsx`: pick the crop, take or choose a leaf photo, send it to the backend's `/diagnose` and show the result. Crops the model doesn't cover are marked "Not available yet".
  - `diagnosis.tsx`: a past scan opened from the Diagnoses tab, with its photo and advice.
  - `library-list.tsx` and `disease.tsx`: the Library. Crops, their diseases, cultivation tips and weather-based disease alerts, all read from the backend's knowledge base; a disease page shows the same guidance as a diagnosis.
  - `assistant.tsx`: chat with the Assistant, which answers typed questions from the knowledge base.
  - `calculator.tsx`: the three home-screen tools. Pesticide: product for an area, dose per sprayer refill and number of refills. Fertilizer: urea, DAP and MOP for an N-P-K recommendation. Farming: estimated profit, maximum input budget, required yield and no-loss price. They only do arithmetic on what the farmer enters, and keep the last five results on the device.
  - `coming-soon.tsx`: placeholder, now used only by "Give feedback".
- `components/`: shared UI such as the brand mark, the headers, the onboarding and home illustrations, and the 68 crop icons (`crops/CropIcon.tsx`).
- `constants/`: colours, the supported languages, grower types, and the crop catalog (`crops.ts`). Crop ids such as `bitter_gourd` are the stable keys the database uses.
- `context/PreferencesContext.tsx`: language, onboarding progress, location, crops, grower type and temperature unit, cached on the device.
- `context/AuthContext.tsx`: the signed-in session, restored on launch.
- `lib/`: the Supabase client, `account.ts` (reads and writes the account's setup), `api.ts` (calls to the backend), `diagnoses.ts` (scan history), and small helpers for navigation, location permission, weather and sharing.
- `i18n/`: UI translations and crop names. `locales/en.ts` defines every string. Each other language file must provide the same keys, and the type check fails if one is missing. Read strings in a screen with `useStrings()`.

### Who owns the setup

The account owns the language, location, crops and grower type; the device only caches them. After signing in:

- the account already has crops → the device adopts them, so the same account behaves the same on any phone;
- the account is new and this phone just finished onboarding → those choices are uploaded to the account;
- the account has no crops and the phone's choices belong to someone else → crop selection runs for this account.

Signing out clears the account's crops from the device but keeps the chosen language.
