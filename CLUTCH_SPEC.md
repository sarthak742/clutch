# Clutch — Spec

*Vibe2Ship hackathon · Problem Statement 1: "The Last-Minute Life Saver" · last updated 2026-06-25*

## One line

An AI accountability companion that triages everything you owe, figures out *why* you're avoiding the scary tasks, hands you the work already started, and **follows up so you actually finish.**

## Problem (from the brief)

People miss deadlines, assignments, bills, and commitments. Existing tools rely on **passive reminders that are easy to ignore** and do nothing to help you actually complete the task. The brief asks for a companion that *proactively* helps plan, prioritize, and **complete** tasks — moving beyond reminders to **meaningful action**.

## The core insight

People will start things but won't put in effort when nobody is looking. The missing piece isn't another reminder or another planner — it's a **middle man that holds you accountable**: expects results, checks back, and notices when you quietly let something die.

## Why this isn't a chatbot or an automation tool

- **vs. a chatbot (Claude/ChatGPT):** reactive and amnesiac. You go to it, re-explain your life every time, and it never comes to you. Clutch holds a persistent model of your commitments, watches the clock, and initiates with judgment.
- **vs. automation (Zapier):** rigid and judgment-free. It runs rules. Clutch reasons — it decides what matters most today and *why* you're stuck.

Clutch lives in the gap: **more proactive than a chatbot, more intelligent than automation.** The drafting/decomposition is table stakes; the product is the judgment delivered proactively + the accountability loop.

## How accountability works without real surveillance

The AI can't watch you work, so accountability is built from four real mechanics:

1. **Commit out loud** — you commit to a specific action and time ("25 min on the essay, now").
2. **Check back** — when the time's up, it returns and expects a result.
3. **Show proof** — to mark something done you show the artifact (paste text, a sent-confirmation, a screenshot), not just tick a box. The AI looks at it and reacts.
4. **Honest tracking** — it records your follow-through rate and calls out patterns ("you've said 'later' to this 4 times").

Social pressure by proxy — the same reason gym buddies and coaches work.

## The loop (screen flow)

1. **Brain-dump (capture).** Dump everything on your mind in plain language. Gemini parses it into structured tasks with inferred deadline, effort, and type. Persisted.
2. **Briefing (proactive home).** Opens with judgment, not a blank box: "This is most likely to blow up today — here's why." Risk-ranked list, top item highlighted, follow-through record visible, avoidance flags shown.
3. **Engage → diagnose → act.** Tap the risky task. Clutch uses avoidance signals to hypothesize why you're stalling, asks one question to confirm, reasons out loud, then produces the right artifact: plan (vague), tiny first step (intimidating), or draft/example (don't-know-how).
4. **Commit + work.** It makes you commit to a specific action and time. Timer runs. "I'm Stuck" assist available.
5. **Follow-up + proof (accountability core).** Block ends → "Show me what you got." You show the result; it reacts honestly, updates state, closes the loop, and remembers next time ("yesterday you started the email — send it now?").

## Risk model

Triage ranks tasks by **deadline proximity × effort remaining × avoidance signal**, not just due date — so a big un-started task due in two days beats a 30-minute task due tomorrow. The reasoning is shown out loud.

## Data model (high level)

- **Task:** id, title, deadline, effortEstimate, category, status, artifact(s).
- **Behavioral signals (real, logged):** createdAt, lastTouched, deferralCount, progressNotes, openedThenBailedCount.
- **Commitment:** taskId, action, durationMin, committedAt, outcome (done / partial / skipped), proof.
- **Follow-through record:** rolling honesty/completion stats.

## Feature → scoring map

| Criterion | Weight | Where it's earned |
|---|---|---|
| Problem Solving & Impact | 20% | Risk triage, "most likely to blow up", real completion not reminders |
| Agentic Depth | 20% | Diagnose-why-stuck from logged signals, reason out loud, act, follow up, close loop |
| Innovation & Creativity | 20% | Accountability-by-proof loop; behavioral avoidance detection; diagnosis decides the artifact |
| Google Technologies | 15% | Gemini (parsing, triage, diagnosis, generation) via Google AI Studio; stretch: email digest / Calendar |
| Product Experience & Design | 10% | Clean briefing + work + proof screens |
| Technical Implementation | 10% | Next.js + Gemini streaming |
| Completeness & Usability | 5% | Full loop works end to end |

## Build plan (June 25 → submit June 29, 2pm)

- **Phase 1 — core loop (days 1–2):** task store + persistence, brain-dump parse, triage briefing, engage→diagnose→act, commit→check-back→proof. Demonstrates the full differentiation.
- **Phase 2 — depth (day 3):** behavioral-signal logging driving diagnosis, honest follow-through tracking, the "expecting you" persona, reasoning shown out loud cleanly.
- **Phase 3 — stretch (day 4, only if ahead):** morning email digest for real closed-app nudges (+ Google-tech points); then Calendar. Otherwise day 4 = polish, deploy on Google Cloud Run, write submission doc.

## Reuse vs. build

- **Reuse:** decomposition (→ "plan" artifact), stuck-assist + reasoning trace, timer, reflection screen (→ follow-through record).
- **Build new:** brain-dump parser, risk-triage briefing, commit→check-back→proof flow, behavioral-signal logging, multi-task store.
- **Cut/demote:** standalone vanity "focus score"; rigid 5-step timed checklist as the centerpiece.

## Tech

Next.js (App Router) · TypeScript · Tailwind · Framer Motion · Google Gemini (`gemini-2.5-flash`) via `@google/genai`, deployed on Google Cloud Run. Google AI Studio is useful for build/deploy flow, but the mentor session clarified that the mandatory requirement is a deployed Google Cloud link.
