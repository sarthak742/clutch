import { GoogleGenAI } from '@google/genai'
import type { ReflectionData, Step, ParsedTask, ClutchTask } from './types'

const MODEL = 'gemini-2.5-flash'

// Lazily construct the client so a missing key produces a clear, actionable
// error at call time rather than a cryptic auth failure deep in the SDK.
function getClient() {
  // Use a project-specific name to avoid collisions with a global GOOGLE_API_KEY
  // that may already exist in the OS/shell environment — Next.js will NOT let
  // .env.local override an environment variable that is already set, so a stale
  // system GOOGLE_API_KEY would otherwise shadow the value in .env.local.
  // Fall back to GOOGLE_API_KEY only if the dedicated name is absent.
  const apiKey = process.env.FOCUS_AGENT_GEMINI_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error(
      'No Gemini API key found. Set FOCUS_AGENT_GEMINI_KEY in .env.local and restart the dev server — Next.js only reads env files at startup.',
    )
  }
  return new GoogleGenAI({ apiKey })
}

const TRACE_SCHEMA = {
  type: 'object',
  properties: {
    observing: { type: 'string', description: 'What you observe about the user\'s situation and what they are looking at' },
    hypothesis: { type: 'string', description: 'Your hypothesis about the specific thing blocking them' },
    strategy: { type: 'string', description: 'The approach you\'ll take to help them move forward' },
    hint: { type: 'string', description: 'A concrete nudge that points toward the answer without giving it away. Make them think.' },
    fullAnswer: { type: 'string', description: 'The complete, detailed answer — only revealed when the user asks' },
  },
  required: ['observing', 'hypothesis', 'strategy', 'hint', 'fullAnswer'],
  propertyOrdering: ['observing', 'hypothesis', 'strategy', 'hint', 'fullAnswer'],
}

/**
 * Parse a free-form brain dump into structured tasks. `todayISO` (YYYY-MM-DD)
 * anchors relative dates like "Friday" or "next week".
 */
export async function parseBrainDump(dump: string, todayISO: string): Promise<ParsedTask[]> {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: `Today is ${todayISO}. The user dumped everything on their mind below. Extract each distinct task or commitment. For each: a short imperative title, a deadline as an ISO date (YYYY-MM-DD) resolved relative to today (null if none is mentioned or implied), an effort tier ("quick" < 15 min, "medium" ~1 hour, "deep" multi-hour), and a category. Infer sensible deadlines when strongly implied (e.g. "birthday next week"). Do not invent tasks that aren't there.\n\nBrain dump:\n"""${dump}"""`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                deadlineISO: { type: 'string', nullable: true },
                effort: { type: 'string', enum: ['quick', 'medium', 'deep'] },
                category: {
                  type: 'string',
                  enum: ['work', 'study', 'admin', 'personal', 'errand', 'other'],
                },
              },
              required: ['title', 'deadlineISO', 'effort', 'category'],
              propertyOrdering: ['title', 'deadlineISO', 'effort', 'category'],
            },
          },
        },
        required: ['tasks'],
      },
    },
  })
  const parsed = JSON.parse(response.text ?? '{"tasks":[]}') as { tasks: ParsedTask[] }
  return parsed.tasks
}

export interface ActionPlan {
  diagnosis: string
  suggestedAction: string
  suggestedMinutes: number
  artifact: string
}

export interface QAPair {
  question: string
  answer: string
}

export interface ProofReview {
  reaction: string
  nextNudge: string
  /** Whether the shown proof genuinely satisfies what they committed to. */
  solid: boolean
}

type TaskCtx = Pick<ClutchTask, 'title' | 'deadline' | 'effort' | 'category' | 'deferralCount'>

function taskSignals(task: TaskCtx): string {
  const parsedDeadline = task.deadline ? new Date(task.deadline) : null
  const deadlineStr = parsedDeadline && !Number.isNaN(parsedDeadline.getTime())
    ? parsedDeadline.toISOString().slice(0, 10)
    : 'no hard deadline'
  return `deferred ${task.deferralCount} time(s), effort ~${task.effort}, category ${task.category}, deadline ${deadlineStr}`
}

/**
 * Ask the few most useful, task-SPECIFIC questions Clutch needs before it can
 * give genuinely tailored help. This is what stops "exam tomorrow" → generic plan.
 */
export async function scopeQuestions(task: TaskCtx): Promise<string[]> {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: `You are Clutch, a sharp accountability partner about to help with a task — but the task as stated is too vague to help well. Ask the 2-4 MOST useful, specific questions you genuinely need answered to give tailored (not generic) help. Each question must be short and answerable in a phrase. Make them concrete to THIS task. Include one that surfaces what's making them put it off, only if useful. Do not ask more than 4.

Task: "${task.title}"
Signals: ${taskSignals(task)}

Example — for "study for exam tomorrow" good questions are: "Which subject/exam?", "What topics will it cover?", "What have you covered already, and where are you weakest?", "How many hours do you have today?". Bad: "Are you ready?" (vague), "Do you want help?" (useless).`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: { questions: { type: 'array', items: { type: 'string' } } },
        required: ['questions'],
      },
    },
  })
  const parsed = JSON.parse(response.text ?? '{"questions":[]}') as { questions: string[] }
  return parsed.questions.slice(0, 4)
}

/**
 * Produce an honest diagnosis + a started-for-them artifact, GROUNDED in the
 * answers to the scope questions so the plan is specific, not generic.
 */
export async function generateAction(task: TaskCtx, qa: QAPair[], note?: string): Promise<ActionPlan> {
  const context = qa.filter((p) => p.answer.trim()).map((p) => `- ${p.question} → ${p.answer}`).join('\n')

  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: `You are Clutch, a sharp, warm accountability partner who gets people into action — not a cheerleader, not a lecturer.

Task: "${task.title}"
Signals: ${taskSignals(task)}
What the user told you:
${context || '(they did not add specifics)'}${note ? `\nExtra note: "${note}"` : ''}

Use their specifics. Do NOT give generic advice — tailor everything to what they actually said (their subject, their weak areas, their time budget, etc.). Return:
- diagnosis: 1-2 honest, specific sentences naming what's really going on, referencing their answers. No flattery.
- suggestedAction: ONE concrete thing to do RIGHT NOW, an imperative they can commit to, sized to the time they have.
- suggestedMinutes: a realistic time box (5-45).
- artifact: the actual started-for-them deliverable, specific to their answers — e.g. a prioritized study plan for THEIR weak topics across THEIR available hours, a real draft, a worked example, or a concrete first step. Genuinely usable, plain text / markdown. Not a description of what to do — the thing itself.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          diagnosis: { type: 'string' },
          suggestedAction: { type: 'string' },
          suggestedMinutes: { type: 'number' },
          artifact: { type: 'string' },
        },
        required: ['diagnosis', 'suggestedAction', 'suggestedMinutes', 'artifact'],
        propertyOrdering: ['diagnosis', 'suggestedAction', 'suggestedMinutes', 'artifact'],
      },
    },
  })
  return JSON.parse(response.text ?? '{}') as ActionPlan
}

/**
 * React honestly to the proof the user showed against what they committed to —
 * acknowledge real progress specifically, or push back if it's thin. The thing
 * that stops Clutch from rubber-stamping "solved a few questions".
 */
export async function reviewProof(
  task: TaskCtx,
  action: string,
  status: 'done' | 'partial' | 'skipped',
  proofText: string,
  proofImage?: string,
): Promise<ProofReview> {
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = []
  if (proofImage) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: proofImage } })
  }
  parts.push({
    text: `You are Clutch, a sharp accountability partner — honest, not mean, not a pushover. Your job is to VERIFY the work actually got done, not to take their word for it.

Task: "${task.title}" (${taskSignals(task)})
They committed to: "${action}"
They reported: ${status}
${proofImage ? 'They attached an IMAGE of their work (shown above). Examine it as evidence.' : ''}
What they wrote as proof: "${proofText || '(nothing shown)'}"

Inspect the actual evidence — the attached image and/or the pasted text. Judge whether it genuinely shows the committed work was done, and assess its QUALITY where you can (e.g. is the solved problem actually correct? does the draft address the prompt? is the work substantial enough given the deadline?). If they pasted real content, critique it specifically. If the evidence is missing, vague ("did some", "a few"), generic, or doesn't match the commitment, say so plainly and ask the pointed follow-up. Do not accept claims without substance.

Return:
- reaction: 1-2 sentences reacting to the actual evidence — acknowledge specifically if it's real and good, or call out exactly what's missing/wrong.
- nextNudge: one concrete next step.
- solid: true ONLY if the shown evidence genuinely demonstrates the committed work was done to a reasonable standard; false if it's missing, vague, thin, or unverified.`,
  })

  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          reaction: { type: 'string' },
          nextNudge: { type: 'string' },
          solid: { type: 'boolean' },
        },
        required: ['reaction', 'nextNudge', 'solid'],
        propertyOrdering: ['reaction', 'nextNudge', 'solid'],
      },
    },
  })
  return JSON.parse(response.text ?? '{}') as ProofReview
}

export async function decomposeTask(task: string, minutes: number) {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: `You are a productivity coach. Break this task into 5-7 concrete, timed micro-steps that can be completed in ${minutes} minutes total. Be specific and actionable. Each step should be a real action, not a vague intention.\n\nTask: "${task}"`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                minutes: { type: 'number' },
              },
              required: ['text', 'minutes'],
              propertyOrdering: ['text', 'minutes'],
            },
          },
        },
        required: ['steps'],
      },
    },
  })
  return JSON.parse(response.text ?? '{"steps":[]}') as { steps: { text: string; minutes: number }[] }
}

export async function* streamTrace(step: string, task: string, screenshot?: string) {
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = []
  if (screenshot) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: screenshot } })
  }
  parts.push({
    text: `You are a focus agent. Someone is stuck on a task step. Think carefully through why they might be stuck and how to help them. Do NOT give the full answer immediately — the hint should nudge thinking without solving it. Save the complete answer for fullAnswer only.\n\nOverall task: "${task}"\nStep they are stuck on: "${step}"`,
  })

  const stream = await getClient().models.generateContentStream({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: TRACE_SCHEMA,
    },
  })

  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text
  }
}

export async function redecomposeStep(step: string, task: string) {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: `This step feels too large to tackle: "${step}"\n\nOverall task: "${task}"\n\nBreak it into 3-4 smaller, more approachable sub-steps that are each doable in under 10 minutes.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                minutes: { type: 'number' },
              },
              required: ['text', 'minutes'],
              propertyOrdering: ['text', 'minutes'],
            },
          },
        },
        required: ['steps'],
      },
    },
  })
  return JSON.parse(response.text ?? '{"steps":[]}') as { steps: { text: string; minutes: number }[] }
}

export async function generateReflection(
  task: string,
  steps: Step[],
  totalMinutes: number,
  stuckCount: number,
  elapsedSeconds: number,
): Promise<ReflectionData> {
  const completed = steps.filter((s) => s.done).length
  const total = steps.length
  const elapsedMinutes = Math.round(elapsedSeconds / 60)
  const overBudget = Math.max(0, elapsedMinutes - totalMinutes)

  // Focus score derived from real session data — never invented
  const completionRatio = completed / Math.max(total, 1)
  const timeRatio = Math.min(1, totalMinutes / Math.max(elapsedMinutes, 1))
  const stuckPenalty = Math.min(0.3, stuckCount * 0.05)
  const focusScore = Math.round(Math.max(10, Math.min(100, (completionRatio * 0.6 + timeRatio * 0.4 - stuckPenalty) * 100)))

  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: `You are an honest focus coach. Review this work session and write a candid, specific reflection. Do not be sycophantic.\n\nTask: "${task}"\nSteps completed: ${completed} of ${total}\nTime budgeted: ${totalMinutes} min, Time used: ${elapsedMinutes} min${overBudget > 0 ? ` (${overBudget} min over budget)` : ' (within budget)'}\nTimes stuck: ${stuckCount}\nFocus score: ${focusScore}/100`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: '2-3 honest sentences about what happened in this session' },
          observation: { type: 'string', description: 'One specific, actionable thing to do differently next session' },
        },
        required: ['summary', 'observation'],
        propertyOrdering: ['summary', 'observation'],
      },
    },
  })

  const parsed = JSON.parse(response.text ?? '{}') as { summary: string; observation: string }
  return { ...parsed, focusScore }
}
