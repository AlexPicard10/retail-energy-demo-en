# Genie Code · Retail Energy Pitch App

Local-only React pitch app to introduce Databricks **Genie Code** alongside the Retail Energy B2C demo (originally delivered at Engie, April 2026).

Built to be shown in front of an audience: full-page sections, animated transitions, interactive scenario walkthrough, and an Engie-inspired color palette.

> **Note**: Engie-inspired styling, no official Engie logo or brand asset — safe to share internally.

---

## Quickstart

```bash
cd RetailEnergy_DemoPackage_EN/web-app
npm install
npm run dev
```

Then open <http://localhost:5174/>.

```bash
npm run build      # type-check + production bundle into dist/
npm run preview    # serve the production bundle locally
```

---

## What's inside

```
web-app/
├── src/
│   ├── App.tsx                  ← Layout + section composition
│   ├── main.tsx
│   ├── index.css                ← Tailwind + design system tokens
│   ├── components/
│   │   ├── AnimatedBackground.tsx   ← Drifting gradient blobs + grid
│   │   ├── Logo.tsx                 ← Genie / Engie / Databricks marks (no official logos)
│   │   ├── Nav.tsx                  ← Sticky nav with anchor links
│   │   ├── NumberCounter.tsx        ← Animated counter (in-view triggered)
│   │   ├── ScrollProgress.tsx       ← Top progress bar
│   │   └── SectionHeader.tsx
│   ├── sections/
│   │   ├── Hero.tsx                 ← Title + live Genie Code prompt preview + brand row
│   │   ├── WhatIsGenieCode.tsx      ← Genie vs Genie Code + DI Platform foundation
│   │   ├── AIDevKit.tsx             ← Skills/Tools/MCP/Builder + copyable install command
│   │   ├── DataAndOutcome.tsx       ← The brief: 5 source files in → at-risk call list out
│   │   ├── DemoScenario.tsx         ← Architecture: animated medallion + ML flow
│   │   ├── DemoSteps.tsx            ← Interactive 10-step walkthrough (canvas + prompts, copy buttons)
│   │   ├── Pillars.tsx              ← DE / DS / Analytics tabs + sample prompts
│   │   ├── CustomerProfiles.tsx     ← 3 K-Means clusters + live cluster reveal
│   │   ├── Roadmap.tsx              ← 4 upcoming Genie Code features
│   │   ├── CTA.tsx                  ← Closing 3-step run-the-demo card
│   │   └── Footer.tsx
│   └── diagrams/
│       └── MedallionFlow.tsx        ← Animated Bronze→Silver→Gold + ML SVG
├── tailwind.config.js               ← Engie-inspired palette
├── vite.config.ts                   ← Port 5174, host: true
└── package.json
```

---

## Stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS 3** with a custom Engie-inspired theme
  (`engie.blue #00AAFF`, `engie.deep #0033A0`, `engie.navy #001E62`, `engie.magenta #E5005B`, `engie.green #00C389`)
- **Framer Motion** — section reveals, drifting blobs, animated SVG paths
- **Recharts** — customer-profile distribution bar chart
- **lucide-react** — system icons
- Fonts via Google Fonts: **Plus Jakarta Sans** (display), **Inter** (body), **JetBrains Mono** (code)

No backend, no state library — content is co-located with each section.

---

## Sections (top to bottom)

1. **Hero** — value statement + a live Genie Code prompt preview (k=3 train → register → pipeline)
2. **What is Genie Code** — split between Genie (business) and Genie Code (technical) over the Data Intelligence Platform foundation
3. **AI Dev Kit** — Skills · Tools · MCP Server · Builder App, plus the one-line install command (`databricks-solutions/ai-dev-kit`) ready to copy
4. **The brief** — the 5 source files in a UC Volume → the Peak Heavy at-risk call list out (~80 customers · €680k at risk)
5. **Architecture** — animated Bronze → Silver → Gold + ML medallion flow
6. **The 10 steps** — interactive walkthrough (2 canvas steps + 8 copy-paste prompts) for Visual Data Prep and Genie Code, ending with the governed-agent + chat-app bonus
7. **4 Pillars** — tab switcher (Data Engineering / Data Science / Analytics / Agents & Apps), each with a real prompt block and outcomes
8. **Customer Profiles** — the 3 K-Means clusters (Peak Heavy, Seasonal Spiker, Green Saver) with share, kWh, monthly bill — and the closing Genie retention question
9. **Roadmap** — 4 upcoming features (Scheduled Agents, Canvas with Artifacts, Drive/SharePoint search, Knowledge Extraction)
10. **CTA** — 3-step "run the demo" card linking back to the rest of the package

---

## Pitch flow tips

- Open with the **Hero** for 30s, then jump into **The brief** and **Architecture** to frame the goal and the flow.
- For technical audiences, dwell on **The 10 steps** and **4 Pillars** (DE / DS / Analytics / Agents & Apps) — each shows the actual prompt and the outcome.
- Close with the **Customer Profiles** punchline ("Which Peak Heavy customers on a flat tariff are complaining about their bills?") — that turns ML into a commercial action.
- **Roadmap** is optional; only show if the audience asks "what's next?".

---

## Customizing

- Colors: edit `tailwind.config.js` → `theme.extend.colors.engie.*`
- Stats in Hero: edit `src/sections/Hero.tsx`
- Prompts shown in the 10-step walkthrough / Pillars: edit `src/sections/DemoSteps.tsx` and `src/sections/Pillars.tsx`
- Cluster numbers in CustomerProfiles: edit `src/sections/CustomerProfiles.tsx`
- Roadmap items: edit `src/sections/Roadmap.tsx`

---

## License & branding note

The Engie name, colors, and brand are property of Engie. This app uses an **Engie-inspired** color palette and a stylized arc as a visual nod, but does **not** include the official Engie logo or wordmark. The Databricks logo is a placeholder hexagon — replace with the official Databricks asset before any external sharing.
