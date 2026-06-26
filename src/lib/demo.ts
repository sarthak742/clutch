import type { ClutchTask, FollowThrough } from './types'
import { parseDeadlineISO } from './date'

export function createDemoState(now: number = Date.now()): { tasks: ClutchTask[]; followThrough: FollowThrough } {
  const yesterday = now - 24 * 60 * 60 * 1000
  const today = new Date(now)
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return {
    followThrough: { committed: 3, completed: 1 },
    tasks: [
      {
        id: 'demo-vibe2ship-submit',
        title: 'Finish Vibe2Ship submission',
        deadline: parseDeadlineISO(todayISO),
        effort: 'deep',
        category: 'work',
        status: 'todo',
        createdAt: yesterday,
        lastTouched: yesterday,
        deferralCount: 3,
        openedThenBailed: 2,
        progressNotes: [
          'Started polishing UI instead of deploying.',
          'Drafted some README notes but no Google Doc link yet.',
        ],
        artifact: 'Google Doc sections drafted: Problem Statement, Solution Overview, Key Features, Technologies, Google Technologies.',
        agentTrace: [],
        commitments: [
          {
            id: 'demo-commit-1',
            action: 'Write the project description outline',
            durationMin: 20,
            committedAt: yesterday,
            outcome: {
              status: 'partial',
              proof: 'Made headings but did not finish the Cloud Run link.',
              reviewSolid: false,
              reviewReaction: 'The outline exists, but the submission is not verifiable without the deployed link.',
              at: yesterday + 30 * 60 * 1000,
            },
          },
        ],
      },
      {
        id: 'demo-cloud-run-link',
        title: 'Send teammate the Cloud Run link',
        deadline: null,
        effort: 'quick',
        category: 'work',
        status: 'todo',
        createdAt: now - 2 * 60 * 60 * 1000,
        lastTouched: now - 2 * 60 * 60 * 1000,
        deferralCount: 1,
        openedThenBailed: 0,
        progressNotes: [],
        agentTrace: [],
        commitments: [],
      },
      {
        id: 'demo-dentist',
        title: 'Call dentist back',
        deadline: null,
        effort: 'quick',
        category: 'personal',
        status: 'todo',
        createdAt: now - 60 * 60 * 1000,
        lastTouched: now - 60 * 60 * 1000,
        deferralCount: 0,
        openedThenBailed: 0,
        progressNotes: [],
        agentTrace: [],
        commitments: [],
      },
    ],
  }
}
