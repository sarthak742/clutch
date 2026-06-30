# CLUTCH — Project Description

## Problem Statement Selected
Problem Statement 1: The Last-Minute Life Saver

## Solution Overview
CLUTCH is an AI accountability companion for people who miss deadlines not because they forget, but because tasks become vague, intimidating, or easy to avoid. Instead of acting like a passive reminder app, CLUTCH turns a messy brain dump into structured tasks, ranks the highest-risk commitments, helps the user start with the lowest-friction next move, and only marks work complete after proof is submitted and reviewed.

CLUTCH is genuinely proactive, not tab-dependent. When a task is added, Gemini decides how far ahead of its deadline the user should be warned — based on the task's complexity — and a server-side Cloud Scheduler job emails that warning before the deadline, even when the app is closed.

The app combines a deterministic product spine with Gemini-powered agents. The deterministic layer handles task state, risk scoring, time memory, focus timing, tab-switch tracking, and fallback behavior so the demo stays reliable. Gemini agents handle the reasoning-heavy moments: parsing tasks, deciding reminder timing, detecting duplicate tasks, choosing the intervention path, generating grounded action plans, reviewing multimodal proof, re-evaluating after partial or rejected proof, and reading the morning briefing aloud.

## Key Features

1. Messy Brain-Dump Parser — extracts distinct tasks, inferred deadlines, effort levels, and categories from an unstructured list using structured JSON output. For each task it also assigns a complexity-based reminder lead time (editable by the user), and flags tasks that are semantically close to an existing one using Gemini embeddings.

2. Smart Risk Triage Dashboard — ranks tasks by deadline proximity, effort remaining, and avoidance signals such as deferrals and opened-then-bailed sessions. Highlights the task most likely to slip and shows follow-through, accepted proof, off-task time, and rescued tasks.

3. Deterministic Time Memory — tracks real elapsed time for each task (when added, last touched, time before/after deadline, stale commitments) and surfaces it across the app and in AI context, so CLUTCH speaks in real time without inventing facts.

4. Autonomous Intervention Router — chooses the best way into a task: ask scope questions for vague tasks, resume from prior work when context exists, or start with a tiny 5-minute action when avoidance is high.

5. Grounded Action Plans — generates a concrete starting artifact (outline, plan, draft, or template). For research, study, or technical tasks it uses Google Search Grounding plus the URL-context tool to find and read relevant sources.

6. Focus Timer and Calendar Handoff — after committing to a plan, the user starts a timer; CLUTCH tracks off-task time through tab visibility, records bailouts, and generates a pre-filled Google Calendar focus-block link.

7. Multimodal Proof Gate — users cannot simply check a task as done; they must paste proof, attach a link, or upload a screenshot, and Gemini reviews whether the evidence matches the commitment, returning accepted, partial, or rejected.

8. Post-Proof Recovery Loop — if proof is partial or rejected, CLUTCH re-evaluates the updated state and routes the user to the next recovery move instead of letting the task die.

9. Spoken Morning Briefing — the proactive morning digest can be read aloud using Gemini's native text-to-speech, with a graceful fallback to the browser's speech engine.

10. Server-Side Proactive Alerts — when alerts are enabled, the user's task snapshot syncs to Cloud Firestore. An hourly Cloud Scheduler job calls a secret-protected endpoint on Cloud Run, which reads every subscriber's tasks server-side and emails a proactive, de-duplicated warning before each deadline — using Gemini's per-task lead time — whether or not the app is open.

11. Voice Dictation — hands-free brain dumps and scoping answers via the Web Speech API.

12. Adaptive Landing, Demo Flow, and PWA — first-time users get a guided demo flow; returning users land on their live risk snapshot and pick up where they left off; the app is installable as a Progressive Web App.

## Technologies Used

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS v4 and a custom CSS design system
- Motion for React
- Phosphor Icons
- Docker multi-stage build
- Resend (transactional email)

## Google Technologies Utilized

- Gemini 2.5 Flash through the @google/genai SDK (core text reasoning)
- Gemini structured JSON output (responseMimeType + responseSchema) for parsing and intervention routing
- Gemini multimodal input for text and screenshot proof review
- Gemini function calling for the Day Plan prioritization flow
- Gemini 2.5 Flash text-to-speech (responseModalities: ['AUDIO']) for the spoken briefing
- Gemini text embeddings (gemini-embedding-001) for semantic duplicate detection
- Google Search Grounding and the URL-context tool for source-backed action plans
- Google Calendar deep link integration for the focus-block handoff
- Google Cloud Run for public deployment and hosting
- Cloud Scheduler as the hourly trigger for the server-side proactive alert cron
- Cloud Firestore as the subscriber store, written over its REST API using the Cloud Run service-account token (no keys, no SDK)

## Reliability

CLUTCH rotates and fails over across multiple Gemini API keys, so a rate-limited or invalid key automatically fails over to the next instead of taking Gemini down. A NVIDIA-hosted OpenAI-compatible chat-completions endpoint is a secondary AI fallback, and deterministic local logic is the final safety layer so core flows never hard-fail during demo evaluation.

## Submission Links

- Deployed Application: https://clutch-529610052804.us-central1.run.app/
- GitHub Repository: https://github.com/sarthak742/clutch
