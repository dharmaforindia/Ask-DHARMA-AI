<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1IaZMmyITpJdTs0QmTKtVIN6XkqXq5RIu

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Advocate suite (Claude skills)

This repository also holds five Claude skills for Indian advocates (Supreme Court of India and
Karnataka High Court practice: research, drafting, strategy, hearings, practice areas and chamber
management). Install them in Claude Code on any computer with:

`/plugin install indian-advocate-suite --marketplace dharmaforindia/Ask-DHARMA-AI`

See [ADVOCATE-SUITE.md](ADVOCATE-SUITE.md) for the Claude app and other install options.
