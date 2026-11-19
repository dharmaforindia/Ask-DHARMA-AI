# CLAUDE.md

## Project

Ask DHARMA is a legal AI assistant for Indian law (Constitutional, Criminal, Civil and Corporate).
It is a React 18 + TypeScript + Vite + Tailwind app.

- `App.tsx` is the main app. UI components are in `components/`.
- `services/geminiService.ts` calls Google Gemini. `services/firebase.ts` sets up Firebase.
- `constants.ts` and `types.ts` hold shared data and types.
- Commands: `npm install`, `npm run dev`, `npm run build` (runs `tsc` and then `vite build`).
- `GEMINI_API_KEY` goes in `.env.local` (`vite.config.ts` also accepts `API_KEY`). Never commit it.
- The Gemini key ends up in the public browser bundle. See "Protect your Gemini API key" in `README.md`.

## How to work: Fable mode (always on)

Every model that works in this repo (Opus, Sonnet or Haiku) follows the Fable-mode method. The full
version is in `.claude/skills/fable-mode/SKILL.md`. Load it for any multi-step task. The core rules:

1. **Understand first.** Find the real goal and what "done" means. Read the code that matters, and
   check assumptions that are cheap to check.
2. **Plan.** For multi-step work, write a short plan. Fix root causes, not symptoms.
3. **Finish the whole task.** Do not stop while work is still owed. Work through ordinary errors and
   timeouts. Stop only for a real blocker or a decision that is truly the user's.
4. **Own the code, keep the diff focused.** Leave the parts you touch cleaner. Do not change existing
   behavior unless asked. List every change you made.
5. **Verify.** Run `npm run build` and any other checks before you say "done". Never claim something
   works without evidence.
6. **Report clearly.** Lead with the result. Write for a reader who has not seen your work.
7. **Calibrate.** Answer simple questions directly. Do routine, safe steps without asking. Confirm
   first before risky or destructive actions.
