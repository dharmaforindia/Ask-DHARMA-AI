# CLAUDE.md

## Project

Ask DHARMA is a legal AI assistant for Indian law (Constitutional, Criminal, Civil and Corporate).
It is a React 18 + TypeScript + Vite + Tailwind app.

- `App.tsx` is the main app. UI components are in `components/`.
- `api/gemini.ts` is a Vercel server function (`POST /api/gemini`). It is the only code that sees
  the Gemini API key, and it holds the models and the system instruction. Keep it self-contained
  (npm imports only) so Vercel can deploy it.
- `services/geminiService.ts` is the browser side: it calls `/api/gemini`, never Gemini with a key.
  Voice mode connects to Gemini Live with a short-lived token from the server.
- `services/fileUpload.ts` shrinks photos so requests stay under Vercel's 4.5 MB body limit.
- `services/firebase.ts` sets up Firebase. `constants.ts` and `types.ts` hold shared data and types.
- Commands: `npm install`, `npm run dev` (also runs `api/gemini.ts` locally), `npm run build`
  (runs `tsc` and then `vite build`).
- `GEMINI_API_KEY` goes in `.env.local` for local work and in Vercel's environment variables for
  deploys (`API_KEY` also works). Never commit it, and never send it to the browser.

## Legal work: the advocate suite

Five skills in `.claude/skills/` cover an Indian advocate's work. `senior-advocate` is the hub and
routes to the others:

- `senior-advocate`: case strategy, Supreme Court and Karnataka High Court practice, hearings,
  rehearsal, settlement.
- `legal-research-india`: research, citations, interpretation, analysis, opinions.
- `legal-drafting-india`: all pleadings, applications, notices and deeds.
- `practice-areas-india`: area playbooks (criminal special statutes, family, land, commercial and
  others).
- `law-chamber-india`: clients, fees, diaries, ethics, safe use of AI with client data.

The core rule across all five: never invent a citation. Verify every authority with the Legal Data
Hunter tools, or mark it [VERIFY]. The suite is also published as a Claude Code plugin from this
repo (`.claude-plugin/marketplace.json`). See `ADVOCATE-SUITE.md` for install steps.

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
