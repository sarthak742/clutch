# CLUTCH

CLUTCH is an AI accountability companion for the Vibe2Ship hackathon, Problem Statement 1: "The Last-Minute Life Saver."

It is not a passive to-do list. It takes a messy brain dump, identifies what is most likely to blow up, asks task-specific scope questions, generates a concrete first move with Gemini, starts a commitment timer, and then asks for proof before marking the work complete.

## Why It Exists

People do not usually miss important work because they forgot it exists. They miss it because it is vague, intimidating, boring, or easy to delay when nobody is checking. CLUTCH creates a lightweight accountability loop:

- dump everything on your mind
- let Gemini parse and triage the risk
- scope the highest-risk task
- get the work started with a task-specific artifact
- commit to a timed action
- show text or image proof
- get an honest Gemini review

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Motion for React
- Phosphor Icons
- Google Gemini via `@google/genai`
- Cloud Run-ready Dockerfile

## Google Technologies

- Gemini 2.5 Flash for brain-dump parsing, scope questions, action generation, and proof review
- Google Cloud Run target deployment

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `FOCUS_AGENT_GEMINI_KEY` in `.env.local`.

## Validation

```bash
npx tsc --noEmit
npx next build
```

## Credits

- Next.js and React for the application framework
- Tailwind CSS for styling
- Motion for React for interface motion
- Phosphor Icons for iconography
- `@google/genai` for Gemini integration
- 21st.dev Silk background inspiration for the atmospheric animated backdrop
