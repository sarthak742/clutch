import type { ClutchTask, FollowThrough } from './types'
import { parseDeadlineISO } from './date'

function isoOffset(now: number, days: number): string {
  const d = new Date(now + days * 24 * 60 * 60 * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function createDemoState(now: number = Date.now()): { tasks: ClutchTask[]; followThrough: FollowThrough } {
  const h = (n: number) => now - n * 60 * 60 * 1000
  const d = (n: number) => now - n * 24 * 60 * 60 * 1000

  return {
    // 67% follow-through — good enough to look credible, not suspiciously perfect
    followThrough: { committed: 9, completed: 6 },

    tasks: [
      // ── #1 highest risk: deep task due TODAY, already partially attempted ──
      {
        id: 'demo-deploy',
        title: 'Deploy CLUTCH to Google Cloud Run',
        deadline: parseDeadlineISO(isoOffset(now, 0)),
        effort: 'deep',
        category: 'work',
        alertLeadHours: 36,
        status: 'in_progress',
        createdAt: d(3),
        lastTouched: h(5),
        deferralCount: 2,
        openedThenBailed: 2,
        progressNotes: [
          'Docker build works locally.',
          'Got stuck on Cloud Run env vars — FOCUS_AGENT_GEMINI_KEY not loading.',
        ],
        blocker: 'dont_know_how',
        artifact:
          '1. Run `gcloud builds submit --tag gcr.io/PROJECT_ID/clutch`\n2. Deploy: `gcloud run deploy clutch --image gcr.io/PROJECT_ID/clutch --platform managed --region us-central1 --allow-unauthenticated --set-env-vars FOCUS_AGENT_GEMINI_KEY=YOUR_KEY`\n3. Copy the service URL → paste into submission doc.',
        agentTrace: [
          { label: 'Observing', detail: 'Task is in_progress, opened and bailed 2×, progress notes mention a specific error. Deadline is end of today.' },
          { label: 'Hypothesis', detail: 'User knows how to deploy in principle but is stuck on secret injection — classic "almost there" paralysis.' },
          { label: 'Strategy', detail: 'Skip re-scoping. Surface the exact gcloud commands with the env var flag filled in. Reduce it to copy-paste.' },
          { label: 'Routing', detail: 'resume → artifact already exists, presenting updated step-by-step with the missing flag.' },
          { label: 'groundWithGoogleSearch', detail: 'Fetched 3 grounded reference source(s) for this task.' },
        ],
        groundedSources: [
          { title: 'Deploying container images to Cloud Run — Google Cloud', uri: 'https://cloud.google.com/run/docs/deploying' },
          { title: 'Configure environment variables for services — Cloud Run', uri: 'https://cloud.google.com/run/docs/configuring/services/environment-variables' },
          { title: 'Gemini API quickstart — Google AI for Developers', uri: 'https://ai.google.dev/gemini-api/docs/quickstart' },
        ],
        commitments: [
          {
            id: 'demo-deploy-commit-1',
            action: 'Run docker build locally and confirm it passes',
            durationMin: 20,
            committedAt: d(1),
            outcome: {
              status: 'done',
              proof: 'Successfully built image locally: clutch:latest — no errors.',
              reviewVerdict: 'accepted',
              reviewSolid: true,
              reviewReaction: 'Build confirmed. The local image is valid — the blocker is purely in the Cloud Run deploy step.',
              at: d(1) + 22 * 60 * 1000,
            },
          },
          {
            id: 'demo-deploy-commit-2',
            action: 'Push image to GCR and deploy to Cloud Run',
            durationMin: 30,
            committedAt: h(5),
            outcome: {
              status: 'partial',
              proof: 'Pushed image but deploy failed — env vars not passing through correctly.',
              reviewVerdict: 'partial',
              reviewSolid: false,
              reviewReaction: 'Good progress — the image is in GCR. The issue is the --set-env-vars flag syntax. Use the exact command in the updated artifact.',
              at: h(5) + 35 * 60 * 1000,
            },
          },
        ],
      },

      // ── #2: no deadline but heavily avoided — avoidance score pushes it up ──
      {
        id: 'demo-submission-doc',
        title: 'Write Vibe2Ship Google Doc project description',
        deadline: parseDeadlineISO(isoOffset(now, 0)),
        effort: 'medium',
        category: 'work',
        alertLeadHours: 12,
        status: 'todo',
        createdAt: d(2),
        lastTouched: h(8),
        deferralCount: 3,
        openedThenBailed: 2,
        progressNotes: ['Opened a blank Google Doc but closed it immediately.'],
        blocker: 'vague',
        artifact:
          'Sections to complete:\n1. Problem Statement — "People miss deadlines not because they forget, but because tasks are vague and no one is watching."\n2. Solution Overview — proactive AI accountability companion: parse → triage → diagnose → artifact → commit → proof loop.\n3. Key Features — Brain Dump Parser, Risk Triage, Intervention Router, Focus Timer, Multimodal Proof Gate.\n4. Google Technologies — Gemini 2.5 Flash, multimodal input, functionDeclarations, Google Search Grounding, Cloud Run.\n5. Credits — @google/genai SDK, Next.js, Tailwind, Motion for React, Phosphor Icons, 21st.dev Silk animation.',
        agentTrace: [
          { label: 'Observing', detail: 'Task deferred 3× and opened-then-bailed 2×. Progress note shows user opened a doc but immediately closed it.' },
          { label: 'Hypothesis', detail: 'The blocker is vagueness — staring at a blank doc with no structure triggers avoidance.' },
          { label: 'Strategy', detail: 'scope_first → ask what sections are required, then pre-fill the entire outline so the doc is never blank.' },
          { label: 'Routing', detail: 'resume → artifact with pre-filled outline generated. User only needs to expand each section.' },
        ],
        groundedSources: [],
        commitments: [],
      },

      // ── #3: intimidating deep task due in 2 days ──
      {
        id: 'demo-portfolio',
        title: 'Add CLUTCH case study to portfolio site',
        deadline: parseDeadlineISO(isoOffset(now, 2)),
        effort: 'deep',
        category: 'work',
        alertLeadHours: 48,
        status: 'todo',
        createdAt: d(4),
        lastTouched: d(2),
        deferralCount: 1,
        openedThenBailed: 1,
        progressNotes: [],
        blocker: 'intimidating',
        artifact: undefined,
        agentTrace: [],
        groundedSources: [],
        commitments: [],
      },

      // ── #4: quick task, no deadline, sitting stale for 3 days ──
      {
        id: 'demo-reply-email',
        title: 'Reply to hackathon organiser email about team size',
        deadline: null,
        effort: 'quick',
        category: 'work',
        status: 'todo',
        createdAt: d(3),
        lastTouched: d(3),
        deferralCount: 0,
        openedThenBailed: 0,
        progressNotes: [],
        blocker: 'boring',
        artifact: undefined,
        agentTrace: [],
        groundedSources: [],
        commitments: [],
      },

      // ── #5: personal task, low urgency, clean baseline ──
      {
        id: 'demo-gym',
        title: 'Book physio appointment for knee',
        deadline: parseDeadlineISO(isoOffset(now, 5)),
        effort: 'quick',
        category: 'personal',
        alertLeadHours: 3,
        status: 'todo',
        createdAt: d(1),
        lastTouched: d(1),
        deferralCount: 0,
        openedThenBailed: 0,
        progressNotes: [],
        blocker: undefined,
        artifact: undefined,
        agentTrace: [],
        groundedSources: [],
        commitments: [],
      },

      // ── #6: already done — shows follow-through in action ──
      {
        id: 'demo-readme',
        title: 'Finish README with architecture diagram',
        deadline: null,
        effort: 'medium',
        category: 'work',
        status: 'done',
        createdAt: d(5),
        lastTouched: h(12),
        deferralCount: 0,
        openedThenBailed: 0,
        progressNotes: ['Added Mermaid diagram and all feature sections.'],
        blocker: undefined,
        artifact: 'README.md updated with: solution overview, architecture diagram, tech stack, Google tech usage, credits.',
        agentTrace: [],
        groundedSources: [],
        commitments: [
          {
            id: 'demo-readme-commit-1',
            action: 'Write all README sections and push to GitHub',
            durationMin: 45,
            committedAt: h(13),
            outcome: {
              status: 'done',
              proof: 'https://github.com/username/focus-agent — README updated, commit pushed.',
              reviewVerdict: 'accepted',
              reviewSolid: true,
              reviewReaction: 'Solid. The README covers everything a judge needs: problem, solution, agentic depth, Google tech, and credits.',
              at: h(12),
            },
          },
        ],
      },
    ],
  }
}
