---
name: legal-research-india
description: Indian legal research and analysis to senior-counsel standard. Find and verify statutes and case law, apply the rules of precedent and statutory interpretation, analyse judgments, FIRs, charge-sheets, contracts and title documents, and write legal opinions, title opinions, research memos, case briefs and compilations of authorities. Use when the user asks to research a point of law, find judgments or the latest Supreme Court or Karnataka High Court position, check a citation, distinguish a case, interpret a section, analyse or summarise a judgment or charge-sheet, spot grounds of appeal, review a document, or give a legal opinion.
---

# Legal research and analysis (India)

> Research output is the foundation of every draft and argument, so it must be right. The first
> rule is the same as in the `senior-advocate` skill: **never invent a case, citation, paragraph
> or quotation.** Verify it, or mark it **[VERIFY]**. Say plainly when a search found nothing.
> No result does not prove that no authority exists.

## The research workflow

1. **Frame the question.** Write the legal question in one sentence, with the facts that matter.
   Split compound questions.
2. **Find the governing law on the relevant date.** Identify the statute, rules and notifications in
   force on the date of the cause of action or offence, and later amendments. For criminal matters,
   check which of IPC/CrPC/Evidence Act or BNS/BNSS/BSA applies (1 July 2024; s.531 BNSS).
3. **Read the provision itself.** Its words, provisos, explanations, definitions and the
   non-obstante clauses. Note the section heading and the chapter it sits in.
4. **Find the binding authority.** Supreme Court (largest and latest bench first), then the Karnataka
   High Court (Division or Full Bench before single judges), then other High Courts (persuasive),
   then foreign courts (persuasive only).
5. **Read the full judgment, not the headnote.** Identify the ratio. Note the paragraph numbers.
6. **Check later treatment.** Followed, explained, distinguished, doubted, referred to a larger bench
   or overruled? Was the statute amended after it?
7. **Find the authority against you.** You must disclose binding adverse authority, so find it before
   the other side does and prepare to distinguish it.
8. **Synthesise.** State the rule, its limits and how it applies to the facts. Record each
   authority's verification status.

## Using the Legal Data Hunter tools

| Need | Call |
|---|---|
| Supreme Court judgments | `search`, `country: ["IN"]`, `source: ["IN/SCJudgments"]` |
| High Court judgments | `search`, `source: ["IN/HighCourtAWS"]` |
| Central Acts, section by section | `search`, `namespace: "legislation"`, `source: ["IN/IndiaCode"]` |
| State Acts (partial), gazette notifications | `IN/IndiaCode-StateActs`, `IN/eGazette` |
| Tribunals and regulators | `IN/NCLT`, `IN/NCLAT`, `IN/DRAT`, `IN/CESTAT`, `IN/CAT`, `IN/SAT`, `IN/SEBI`, `IN/RBI`, `IN/CCI`, `IN/IBBI` and others (`discover_sources` with `"IN"`) |
| Law Commission reports, parliamentary debates (for legislative intent) | `IN/LawCommission`, `IN/LokSabhaDebates` (`namespace: "doctrine"`) |
| A citation you already have | `resolve_reference`, `hint_country: "IN"`, `hint_type: "case_law"` or `"legislation"` |
| Reading the paragraph | `get_document` with the source and source_id from a search hit |

Search tips:

- To find a case by party names, use a low `alpha` (0.2 to 0.3, more keyword weight). To find cases
  on a concept, use the default 0.7 and describe the legal issue in plain words.
- Narrow by `date_start` and `date_end` for the latest position, and by `court_tier: 1` for the
  Supreme Court.
- The SC source gives SCR citations and neutral citations (for example "[2023] 15 SCR 1081 : 2023
  INSC 1066"). Use those as they appear. Do not convert them to SCC citations from memory.
- If the tools are unavailable or have hit a usage limit, say so, mark authorities [VERIFY], and
  name where to check them: the Supreme Court and Karnataka High Court websites, India Code, SCC
  Online, Manupatra, Indian Kanoon, or the e-Gazette.

## What to produce

| Request | Output | Format |
|---|---|---|
| "What is the law on X?" | A research memo | `references/opinions-memos-and-analysis.md`, section 1 |
| "Give an opinion on ..." | A legal opinion | Section 2 |
| "Is the title clear?" | A title opinion | Section 3 |
| "Summarise / analyse this judgment" | A case brief, with how to use it or distinguish it | Section 4 |
| "Analyse this FIR / complaint / charge-sheet" | An ingredient analysis and a defence or prosecution gap list | Section 5 |
| "What are the grounds of appeal?" | A grounds-of-appeal analysis | Section 6 |
| "Review this contract / document / notice" | A review note with risks and changes | Section 7 |
| "Prepare a compilation" | An indexed compilation of authorities | Section 8 |
| "How should this section be read?" | Interpretation analysis | `references/precedent-and-interpretation.md` |

## Quality rules for research output

- **Lead with the answer.** Then the reasoning. Then the authorities.
- **Quote exactly** and give the paragraph. Paraphrase only when you say so.
- **Separate the ratio from obiter**, and binding from persuasive.
- **Give the date and bench strength** of every authority you rely on.
- **State the level of certainty**: settled, the better view, arguable, or unsettled (conflicting
  benches, a pending reference).
- **Flag recent changes:** amendments, new criminal laws, a pending reference to a larger bench.
- **End with a verification table**: authority, citation, paragraph, status (✓ verified via a named
  source, or [VERIFY]).
