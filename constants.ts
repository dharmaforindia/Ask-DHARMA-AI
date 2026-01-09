import { LegalCategory, Language } from './types';

export const APP_NAME = "Ask DHARMA";

// Favicon use only - actual app UI uses the React Component in components/DharmaLogo.tsx
export const DHARMA_LOGO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0id2hpdGUiLz48ZyBmaWxsPSJibGFjayI+PGNpcmNsZSBjeD0iNTAiIGN5PSI2IiByPSI2Ii8+PGNpcmNsZSBjeD0iNTAiIGN5PSI2IiByPSI2IiB0cmFuc2Zvcm09InJvdGF0ZSg0NSA1MCA1MCkiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjYiIHI9IjYiIHRyYW5zZm9ybT0icm90YXRlKDkwIDUwIDUwKSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNiIgcj0iNiIgdHJhbnNmb3JtPSJyb3RhdGUoMTM1IDUwIDUwKSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNiIgcj0iNiIgdHJhbnNmb3JtPSJyb3RhdGUoMTgwIDUwIDUwKSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNiIgcj0iNiIgdHJhbnNmb3JtPSJyb3RhdGUoMjI1IDUwIDUwKSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNiIgcj0iNiIgdHJhbnNmb3JtPSJyb3RhdGUoMjcwIDUwIDUwKSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNiIgcj0iNiIgdHJhbnNmb3JtPSJyb3RhdGUoMzE1IDUwIDUwKSIvPjxwYXRoIGQ9Ik01MCAxMCBBNDAgNDAgMCAxIDAgNTAgOTAgQTQwIDQwIDAgMSAwIDUwIDEwIFogTTUwIDE4IEEzMiAzMiAwIDEgMSA1MCA4MiBBMzIgMzIgMCAxIDEgNTAgMTggWiIgZmlsbC1ydWxlPSJldmVub2RkIi8+PHBhdGggZD0iTTUwIDM0IEExNiAxNiAwIDEgMCA1MCA2NiBBMTYgMTYgMCAxIDAgNTAgMzQgWiBNNTAgNDQgQTYgNiAwIDEgMSA1MCA1NiBBNiA2IDAgMSAxIDUwIDQ0IFoiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPjxwYXRoIGQ9Ik00NiAxOCBMNTQgMTggTDUzIDM0IEw0NyAzNCBaIi8+PHBhdGggZD0iTTQ2IDE4IEw1NCAxOCBMNTMgMzQgTDQ3IDM0IFoiIHRyYW5zZm9ybT0icm90YXRlKDQ1IDUwIDUwKSIvPjxwYXRoIGQ9Ik00NiAxOCBMNTQgMTggTDUzIDM0IEw0NyAzNCBaIiB0cmFuc2Zvcm09InJvdGF0ZSg5MCA1MCA1MCkiLz48cGF0aCBkPSJNNDYgMTggTDU0IDE4IEw1MyAzNCBMNDcgMzQgWiIgdHJhbnNmb3JtPSJyb3RhdGUoMTM1IDUwIDUwKSIvPjxwYXRoIGQ9Ik00NiAxOCBMNTQgMTggTDUzIDM0IEw0NyAzNCBaIiB0cmFuc2Zvcm09InJvdGF0ZSgxODAgNTAgNTApIi8+PHBhdGggZD0iTTQ2IDE4IEw1NCAxOCBMNTMgMzQgTDQ3IDM0IFoiIHRyYW5zZm9ybT0icm90YXRlKDIyNSA1MCA1MCkiLz48cGF0aCBkPSJNNDYgMTggTDU0IDE4IEw1MyAzNCBMNDcgMzQgWiIgdHJhbnNmb3JtPSJyb3RhdGUoMjcwIDUwIDUwKSIvPjxwYXRoIGQ9Ik00NiAxOCBMNTQgMTggTDUzIDM0IEw0NyAzNCBaIiB0cmFuc2Zvcm09InJvdGF0ZSgzMTUgNTAgNTApIi8+PC9nPjwvc3ZnPg==";

export const LANGUAGES: Language[] = [
  'English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi'
];

export const LEGAL_CATEGORIES: LegalCategory[] = [
  { id: 'ai_prot', name: 'AI & Software Protection', description: 'Copyright, Patents, & Trade Secrets for Code/Models', icon: '🤖' },
  { id: 'const', name: 'Constitutional Law', description: 'Constitution of India, Fundamental Rights, Writs', icon: '⚖️' },
  { id: 'crim', name: 'Criminal Law', description: 'BNS, BNSS, BSA, NDPS, POCSO, PMLA', icon: '🚓' },
  { id: 'civil', name: 'Civil Law', description: 'Contracts, Torts, CPC, Specific Relief', icon: '📝' },
  { id: 'family', name: 'Family Law', description: 'Marriage, Divorce, Custody, Succession, Inheritance', icon: '👨‍👩‍👧‍👦' },
  { id: 'prop', name: 'Property & Land', description: 'Transfer of Property, Land Revenue, Tenancy', icon: '🏠' },
  { id: 'rera', name: 'Real Estate (RERA)', description: 'RERA Act, Builder Disputes, Homebuyers', icon: '🏢' },
  { id: 'consumer', name: 'Consumer Protection', description: 'COPRA 2019, Consumer Disputes, Product Liability', icon: '🛒' },
  { id: 'comm', name: 'Corporate & Commercial', description: 'Company Law, IBC, Mergers, Competition Act', icon: '💼' },
  { id: 'arb', name: 'Arbitration & ADR', description: 'Arbitration, Conciliation, Mediation, Lok Adalats', icon: '🤝' },
  { id: 'mv', name: 'Motor Vehicles', description: 'MV Act, Traffic Rules, Accident Claims (MACT)', icon: '🚗' },
  { id: 'labour', name: 'Labour & Industrial', description: 'Wages, Factories Act, Industrial Disputes', icon: '👷' },
  { id: 'service', name: 'Service Law', description: 'Govt Employment, Suspension, CCS Rules, CAT', icon: '🧑‍💼' },
  { id: 'tax', name: 'Taxation Law', description: 'Income Tax, GST, Customs, Excise', icon: '💰' },
  { id: 'bank', name: 'Banking & Insurance', description: 'RBI, SARFAESI, DRT, Insurance Laws', icon: '🏦' },
  { id: 'ip', name: 'IP Laws', description: 'Patents, Copyrights, Trademarks, Designs', icon: '💡' },
  { id: 'it', name: 'IT & Cyber Law', description: 'IT Act, Data Privacy, Cyber Crimes, Crypto', icon: '💻' },
  { id: 'rti', name: 'RTI & Information', description: 'Right to Information Act, Public Records', icon: 'ℹ️' },
  { id: 'admin', name: 'Administrative Law', description: 'Tribunals, Regulatory Bodies, Judicial Review', icon: '🏛️' },
  { id: 'env', name: 'Environmental', description: 'EPA, NGT, Forests, Wildlife, Pollution Control', icon: '🌳' },
  { id: 'human', name: 'Human Rights', description: 'Women, Children, SC/ST Atrocities, Prisoners', icon: '🕊️' },
  { id: 'media', name: 'Media & Cinema', description: 'Press, Cinematograph Act, Defamation, Broadcasting', icon: '🎥' },
  { id: 'edu', name: 'Education & Health', description: 'RTE, UGC, AICTE, Medical Negligence, Drugs Act', icon: '🏥' },
  { id: 'trust', name: 'Trusts & NGOs', description: 'Public Trusts, Societies, FCRA, Charity', icon: '🤲' },
  { id: 'elect', name: 'Election Law', description: 'RPA, Election Commission, Anti-Defection', icon: '🗳️' },
  { id: 'def', name: 'Defence & Armed Forces', description: 'Army/Navy/Air Force Acts, Courts Martial', icon: '🛡️' },
  { id: 'maritime', name: 'Maritime & Admiralty', description: 'Shipping, Merchant Shipping Act, Ports', icon: '🚢' },
  { id: 'aviation', name: 'Aviation Law', description: 'DGCA, Carriage by Air, Airports Authority', icon: '✈️' },
  { id: 'energy', name: 'Energy & Mining', description: 'Electricity Act, Mines & Minerals, Oil & Gas', icon: '⚡' },
  { id: 'sports', name: 'Sports Law', description: 'NADA, BCCI, Sports Associations, Betting', icon: '🏏' },
  { id: 'intl', name: 'International Law', description: 'Treaties, Extradition, UN Charters, Trade', icon: '🌍' },
];

export const SYSTEM_INSTRUCTION = `
You are DHARMA, a world-class expert Indian Legal Advisor. 
Your purpose is to assist users with legal questions based on the Jurisdiction of India.

CRITICAL UPDATE: You must PRIMARILY use the new Criminal Laws of India implemented in 2024:
1. **Bharatiya Nyaya Sanhita (BNS)** (Replaces IPC)
2. **Bharatiya Nagarik Suraksha Sanhita (BNSS)** (Replaces CrPC)
3. **Bharatiya Sakshya Adhiniyam (BSA)** (Replaces Indian Evidence Act)

Always reference the relevant BNS/BNSS sections first, but provide the corresponding old IPC/CrPC sections in parentheses for context if necessary.

GUIDELINES:
- Use clear, professional, yet accessible language.
- Structure answers logically (Issue -> Rule -> Analysis -> Conclusion).
- Be objective and neutral. Disclaimer: "This is for informational purposes only and does not constitute professional legal counsel."

STRICT FORMATTING RULE:
- FORMAT ALL RESPONSES WITH CLEAR MARKDOWN STRUCTURE.
- Use **"### "** for Section Headings (e.g., ### Legal Analysis).
- Use **"**"** for Bold Key Terms (e.g., **Section 302 BNS**).
- Use **"- "** for Bullet Points.
- Use **"1. "** for Numbered Steps.
- Ensure the response is scannable and digestible.
- Do NOT use plain text blocks without structure.

SPECIFIC KNOWLEDGE BASE - IP PROTECTION FOR AI & SOFTWARE IN INDIA:
| Asset | Protection Method | Difficulty in India |
|---|---|---|
| Source Code | Copyright | Easy |
| Model Weights | Trade Secret / Contract Law | Moderate |
| Unique Algorithm | Patent (if "Technical Effect" shown) | High |
| Training Dataset | Database Right / Copyright | Moderate |
`;