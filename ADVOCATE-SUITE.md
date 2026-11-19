# Advocate suite: Claude skills for Indian advocates

Five Claude skills that make Claude work like a leading senior counsel practising before the
Supreme Court of India and the High Court of Karnataka. They cover research, drafting, case
strategy, hearings, practice areas and running the chamber.

| Skill | What it does |
|---|---|
| `senior-advocate` | The hub. Case assessment and strategy, the case lifecycle from intake to execution, Supreme Court and Karnataka High Court practice, hearing kits, oral argument, rehearsal with Claude as the bench, cross-examination, settlement. Routes work to the other four |
| `legal-research-india` | Research and verification of statutes and case law, precedent and interpretation, analysis of judgments, FIRs, charge-sheets and contracts, legal and title opinions, research memos, compilations |
| `legal-drafting-india` | House style and templates for constitutional, civil, criminal, family and tribunal pleadings, applications, notices, deeds and agreements |
| `practice-areas-india` | Playbooks: criminal special statutes, family, property and Karnataka land law (with a glossary), commercial, banking and insolvency, service, tax, RTI, election, environment, consumer, RERA, motor accidents and labour |
| `law-chamber-india` | Client intake, fee letters within BCI rules, client updates, case diary, limitation calendar, delegation, court-day checklists, ethics, and safe use of AI with client data |

The skills live in `.claude/skills/`. Their core rule: **never invent a citation**. Every authority
is verified with the Legal Data Hunter tools when they are connected, or marked [VERIFY] for the
advocate to check. Drafts and advice are for an enrolled advocate to review, sign and file.

## Installing permanently

### 1. Claude app (claude.ai on web, desktop and mobile)

1. Get the five `.skill` files (sent with this change, or run
   `python3 scripts/package_advocate_skills.py` to create them in `dist/advocate-skills/`).
2. In Claude, open **Settings**, then the skills section (currently under **Capabilities**), and
   upload each `.skill` file. Turn each one on.
3. The skills are then saved to your account and used in every conversation where they fit.

Upload the files again after the skills are updated.

### 2. Claude Code on your own computer (every project)

The repository is also a Claude Code plugin marketplace. In Claude Code, run:

```
/plugin marketplace add dharmaforindia/Ask-DHARMA-AI
/plugin install indian-advocate-suite@ask-dharma
```

On Claude Code 2.1.275 or later, this one line does both:

```
/plugin install indian-advocate-suite --marketplace dharmaforindia/Ask-DHARMA-AI
```

To get later updates: `/plugin marketplace update ask-dharma`. The repository is private, so the
computer needs GitHub access to it. Until this branch is merged into `main`, add the marketplace from
the branch instead:

```
/plugin marketplace add https://github.com/dharmaforindia/Ask-DHARMA-AI.git#claude/legal-advisor-sc-hc-lm7uj2
```

### 3. Claude Code in this repository

Nothing to install. Any Claude Code session opened on this repository (on the web or your computer)
loads the five skills from `.claude/skills/` automatically.

## Using the skills

Ask in plain language. For example:

- "My client was arrested yesterday under s.318(4) BNS in Bengaluru. What do we do?"
- "Draft a writ petition in the Karnataka High Court against this cancellation order."
- "Find the latest Supreme Court law on quashing on compromise in matrimonial cases."
- "Be the bench. I'm arguing this SLP for admission tomorrow."
- "Analyse this charge-sheet for discharge grounds."
- "Give me a title opinion checklist for this Bengaluru site."
- "Write the client an update on today's hearing."

In Claude Code you can also call a skill directly, for example `/senior-advocate` or
`/legal-drafting-india`.

## Updating the skills

Edit the files in `.claude/skills/<skill>/`. Check them with the skill validator and
`claude plugin validate .`, bump the version in `.claude-plugin/marketplace.json`, then re-package
for the Claude app.
