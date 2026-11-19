<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1IaZMmyITpJdTs0QmTKtVIN6XkqXq5RIu

## Run Locally

**Prerequisites:**  Node.js 20 or later


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
   (`API_KEY` also works)
3. Run the app:
   `npm run dev`

`npm run dev` also runs the server function in `api/gemini.ts` locally, so chat, document scan
and voice work without the Vercel CLI. `npm run preview` serves only the built page, without it.

## How the Gemini API key is kept secret

The browser never receives the Gemini API key. It sends its requests to `/api/gemini`, a Vercel
server function (`api/gemini.ts`), which adds the key and calls Gemini. Voice mode gets a
short-lived, single-use token from the same function instead of the key.

To deploy on Vercel:

1. In the Vercel project, open **Settings → Environment Variables**.
2. Add `GEMINI_API_KEY` with your Gemini API key, for the **Production** and **Preview**
   environments. (`API_KEY` also works.)
3. Redeploy. If the key is missing, the app shows its usual error message and the function log
   says "GEMINI_API_KEY is missing".

Anyone who uses the site can still send requests through `/api/gemini`, so set a usage quota or
a budget alert on the key in the Google Cloud console. If the key was ever built into an earlier
version of the site, create a new key and delete the old one: copies of the old JavaScript may
still contain it.
