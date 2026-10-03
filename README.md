# footballbet-link

The landing page behind FootballBet's shared links (https://dk1100.github.io/footballbet-link/):

- `/?r=<recap-id>&go=<expo-go-url>` — a shared matchday recap: "open in the app" (`footballbet://`) or "open in Expo Go".
- `/reset.html?go=<expo-go-url>` — the password-reset email lands here (Supabase appends the session as `#access_token=…`); the buttons hand it to the app.

`go` is the sharing app's own Expo Go address and is accepted only for this project (`link.js`). Tests: `node --test`.
The app side lives in the private FootballBet repo (`app/lib/linkPage.ts`).
