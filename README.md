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

## Protect your Gemini API key

This app calls Gemini directly from the browser, so the build puts your Gemini API key into the
public JavaScript. Anyone who opens the deployed site can copy the key and use your quota.

Before you deploy, restrict the key in the Google Cloud console
(APIs & Services → Credentials → your key):

1. Under **Application restrictions**, choose **Websites** and add only your site's domains.
2. Under **API restrictions**, allow only the **Generative Language API**.
3. Set a usage quota or a budget alert so misuse cannot run up a large bill.

After you add the website restriction, test chat, document scan and voice mode on the deployed site.

These steps reduce the risk but do not remove it. The full fix is to make the Gemini calls from a
small server (for example a Firebase Cloud Function) that keeps the key secret.
