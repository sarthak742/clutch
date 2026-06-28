'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { ArrowLeft, ArrowRight, MagicWand, Timer, Play, Pause, Paperclip, Image as ImageIcon, CheckCircle, Eye, Warning, CalendarPlus } from '@phosphor-icons/react'
import type { ClutchTask, FollowThrough, Commitment, CommitmentOutcome } from '@/lib/types'
import type { ActionPlan, InterventionDecision, QAPair, ProofReview } from '@/lib/gemini'

interface Props {
  task: ClutchTask
  followThrough: FollowThrough
  onUpdateTask: (id: string, patch: Partial<ClutchTask>) => void
  onFollowThrough: (next: FollowThrough) => void
  onBack: () => void
}

type Step = 'scope' | 'acting' | 'plan' | 'work' | 'proof' | 'reviewing' | 'done'
const FALLBACK_Q = ['What specifically does this involve?', 'How much time do you have right now?']
const MAIN: Step[] = ['scope', 'plan', 'work', 'proof']
const stepIndex = (s: Step) => (s === 'acting' ? 0 : s === 'reviewing' || s === 'done' ? 3 : MAIN.indexOf(s))

function withRouterTrace(plan: ActionPlan, decision: InterventionDecision | null): ActionPlan {
  if (!decision) return plan
  return {
    ...plan,
    suggestedMinutes: decision.strategy === 'quick_start' ? 5 : plan.suggestedMinutes,
    agentTrace: [
      {
        label: `chooseIntervention:${decision.strategy}`,
        detail: decision.reasoning,
      },
      ...(plan.agentTrace ?? []),
    ],
    toolCalls: ['chooseIntervention', ...(plan.toolCalls ?? [])],
  }
}

function resumeActionPlan(task: ClutchTask, decision: InterventionDecision): ActionPlan {
  const latestCommitment = [...task.commitments].reverse().find((commitment) => commitment.outcome) ?? [...task.commitments].reverse()[0]
  const reaction = latestCommitment?.outcome?.reviewReaction
  const priorAction = latestCommitment?.action ?? `Make visible progress on "${task.title}"`
  return {
    diagnosis: reaction
      ? `You already tried this once, and the last proof was not fully accepted: ${reaction}`
      : `You already have context for this task, so restarting with scope questions would add friction.`,
    suggestedAction: priorAction,
    suggestedMinutes: Math.max(5, Math.min(25, latestCommitment?.durationMin ?? 10)),
    artifact: task.artifact
      ? `Resume from the existing artifact:\n${task.artifact}\n\nNext proof must show the missing task-matched evidence.`
      : `Resume the prior commitment: ${priorAction}\n\nBring back concrete proof for this exact action.`,
    agentTrace: [
      { label: `chooseIntervention:${decision.strategy}`, detail: decision.reasoning },
      { label: 'inspectBehaviorMemory', detail: `Found ${task.commitments.length} prior commitment(s), ${task.deferralCount} deferral(s), and ${task.openedThenBailed} bailout(s).` },
      { label: 'resumePriorAttempt', detail: reaction ? `Using the last proof reaction: ${reaction}` : 'Using the latest commitment as the next action.' },
    ],
    toolCalls: ['chooseIntervention', 'inspectBehaviorMemory', 'resumePriorAttempt', 'setCommitment'],
  }
}

export function Engage({ task, followThrough, onUpdateTask, onFollowThrough, onBack }: Props) {
  const [step, setStep] = useState<Step>('scope')
  const [questions, setQuestions] = useState<string[] | null>(null)
  const [answers, setAnswers] = useState<string[]>([])
  const [plan, setPlan] = useState<ActionPlan | null>(null)
  const [minutes, setMinutes] = useState(15)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(900)
  const [running, setRunning] = useState(true)
  const [proofText, setProofText] = useState('')
  const [proofImage, setProofImage] = useState<string | null>(null)
  const [review, setReview] = useState<ProofReview | null>(null)
  const [intervention, setIntervention] = useState<InterventionDecision | null>(null)
  const [reEvaluation, setReEvaluation] = useState<InterventionDecision | null>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [leftNotice, setLeftNotice] = useState(false)
  const [offTaskSeconds, setOffTaskSeconds] = useState(0)
  const [leftTabCount, setLeftTabCount] = useState(0)
  const [focusBlockUrl, setFocusBlockUrl] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const commitmentId = useRef<string | null>(null)
  const pendingStatus = useRef<CommitmentOutcome['status']>('done')
  const countedRef = useRef(false)
  const scopedRef = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const hiddenStartedAt = useRef<number | null>(null)
  const secondsLeftRef = useRef(0)
  const offTaskSecondsRef = useRef(0)
  const leftTabCountRef = useRef(0)

  const ctx = {
    title: task.title,
    deadline: task.deadline,
    effort: task.effort,
    category: task.category,
    deferralCount: task.deferralCount,
    openedThenBailed: task.openedThenBailed,
    progressNotes: task.progressNotes,
    commitments: task.commitments,
    artifact: task.artifact,
  }

  useEffect(() => {
    if (scopedRef.current) return
    scopedRef.current = true
    ;(async () => {
      try {
        const interventionRes = await fetch('/api/intervene', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: ctx }) })
        const interventionPayload = (await interventionRes.json()) as InterventionDecision | { error: string }
        const decision: InterventionDecision = !interventionRes.ok || 'error' in interventionPayload
          ? { strategy: 'scope_first', reasoning: 'Intervention routing was unavailable, so Clutch fell back to the standard scope-first flow.' }
          : interventionPayload
        setIntervention(decision)

        if (decision.strategy === 'resume') {
          const resumePlan = resumeActionPlan(task, decision)
          setPlan(resumePlan)
          setMinutes(Math.max(5, Math.min(45, Math.round(resumePlan.suggestedMinutes || 10))))
          onUpdateTask(task.id, { agentTrace: resumePlan.agentTrace ?? [], lastTouched: Date.now() })
          setStep('plan')
          return
        }

        if (decision.strategy === 'quick_start') {
          await requestAction([], `${decision.reasoning} Generate a tiny 5-minute first action with no extra scoping questions.`, decision)
          return
        }

        const res = await fetch('/api/scope', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: ctx }) })
        const payload = (await res.json()) as { questions: string[] } | { error: string }
        const qs = !res.ok || 'error' in payload || !payload.questions?.length ? FALLBACK_Q : payload.questions
        setQuestions(qs)
        setAnswers(new Array(qs.length).fill(''))
      } catch {
        setQuestions(FALLBACK_Q)
        setAnswers(new Array(FALLBACK_Q.length).fill(''))
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step !== 'work' || !running) return
    if (secondsLeft <= 0) { setStep('proof'); return }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [step, running, secondsLeft])

  useEffect(() => {
    secondsLeftRef.current = secondsLeft
  }, [secondsLeft])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setPrefersReducedMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (step !== 'work') return
    const originalTitle = document.title

    const recordReturn = () => {
      const started = hiddenStartedAt.current
      if (!started) return
      const added = Math.max(1, Math.round((Date.now() - started) / 1000))
      hiddenStartedAt.current = null
      offTaskSecondsRef.current += added
      setOffTaskSeconds(offTaskSecondsRef.current)
      setLeftNotice(true)
      document.title = originalTitle
    }

    const handleVisibility = () => {
      if (document.hidden) {
        if (!hiddenStartedAt.current) {
          hiddenStartedAt.current = Date.now()
          leftTabCountRef.current += 1
          setLeftTabCount(leftTabCountRef.current)
          setLeftNotice(false)
        }
        document.title = `${Math.max(1, Math.ceil(secondsLeftRef.current / 60))} min left - come back | CLUTCH`
        return
      }
      recordReturn()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      document.title = originalTitle
      recordReturn()
    }
  }, [step])

  const requestAction = async (qa: QAPair[], note?: string, decision = intervention) => {
    setStep('acting')
    setActionError(null)
    try {
      const res = await fetch('/api/act', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: ctx, qa, note }) })
      const payload = (await res.json()) as ActionPlan | { error: string }
      if (!res.ok || 'error' in payload) throw new Error('error' in payload ? payload.error : `Request failed (${res.status})`)
      const planWithRouter = withRouterTrace(payload, decision)
      setPlan(planWithRouter)
      setMinutes(decision?.strategy === 'quick_start' ? 5 : Math.max(5, Math.min(45, Math.round(planWithRouter.suggestedMinutes || 15))))
      onUpdateTask(task.id, { artifact: planWithRouter.artifact, groundedSources: planWithRouter.sources ?? task.groundedSources ?? [], agentTrace: planWithRouter.agentTrace ?? [], lastTouched: Date.now() })
      setStep('plan')
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e))
      setStep('scope')
    }
  }

  const act = async () => {
    const qa: QAPair[] = (questions ?? []).map((q, i) => ({ question: q, answer: answers[i] ?? '' }))
    await requestAction(qa)
  }

  // Restore timer from localStorage on mount (survives page refresh)
  useEffect(() => {
    const savedStart = localStorage.getItem('clutch_timer_start')
    const savedMinutes = localStorage.getItem('clutch_timer_minutes')
    const savedTaskId = localStorage.getItem('clutch_timer_task')
    if (savedStart && savedMinutes && savedTaskId === task.id) {
      const elapsed = Math.floor((Date.now() - Number(savedStart)) / 1000)
      const total = Number(savedMinutes) * 60
      const remaining = total - elapsed
      if (remaining > 0) {
        setTotalSeconds(total)
        setSecondsLeft(remaining)
        setMinutes(Number(savedMinutes))
        setStep('work')
      } else {
        localStorage.removeItem('clutch_timer_start')
        localStorage.removeItem('clutch_timer_minutes')
        localStorage.removeItem('clutch_timer_task')
      }
    }
  }, [task.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const commit = () => {
    if (!plan) return
    const committedAt = Date.now()
    const nextFocusBlockUrl = calendarFocusBlockUrl(task.title, plan.suggestedAction, committedAt, minutes)
    const c: Commitment = { id: crypto.randomUUID(), action: plan.suggestedAction, durationMin: minutes, committedAt, focusBlockUrl: nextFocusBlockUrl, offTaskSeconds: 0, leftTabCount: 0 }
    commitmentId.current = c.id
    setFocusBlockUrl(nextFocusBlockUrl)
    hiddenStartedAt.current = null
    offTaskSecondsRef.current = 0
    leftTabCountRef.current = 0
    setOffTaskSeconds(0)
    setLeftTabCount(0)
    setLeftNotice(false)
    onUpdateTask(task.id, { commitments: [...task.commitments, c] })
    onFollowThrough({ ...followThrough, committed: followThrough.committed + 1 })
    setSecondsLeft(minutes * 60)
    setTotalSeconds(minutes * 60)
    setRunning(true)
    localStorage.setItem('clutch_timer_start', String(Date.now()))
    localStorage.setItem('clutch_timer_minutes', String(minutes))
    localStorage.setItem('clutch_timer_task', task.id)
    setStep('work')
  }

  const finish = (status: CommitmentOutcome['status']) => { pendingStatus.current = status; setStep('proof') }

  const handleProofImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1280
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      setProofImage(canvas.toDataURL('image/jpeg', 0.8).split(',')[1])
      URL.revokeObjectURL(url)
    }
    img.src = url
    e.target.value = ''
  }

  const submitProof = async () => {
    localStorage.removeItem('clutch_timer_start')
    localStorage.removeItem('clutch_timer_minutes')
    localStorage.removeItem('clutch_timer_task')
    const status = pendingStatus.current
    setStep('reviewing')
    let result: ProofReview | null = null
    try {
      const res = await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: ctx, action: plan?.suggestedAction ?? '', status, proofText, proofImage: proofImage ?? undefined }) })
      const payload = (await res.json()) as ProofReview | { error: string }
      if (res.ok && !('error' in payload)) result = payload
    } catch { /* neutral logging */ }
    if (!result) {
      result = {
        reaction: 'I could not verify this proof, so I am not marking the commitment complete. Show the actual task-matched artifact and review again.',
        nextNudge: 'Paste or attach concrete evidence for this exact commitment.',
        verdict: 'rejected',
        solid: false,
      }
    }
    setReview(result)

    const hiddenDelta = hiddenStartedAt.current ? Math.max(1, Math.round((Date.now() - hiddenStartedAt.current) / 1000)) : 0
    const finalOffTaskSeconds = offTaskSecondsRef.current + hiddenDelta
    hiddenStartedAt.current = null
    const verdict = result.verdict === 'accepted' && result.solid ? 'accepted' : result.verdict === 'partial' ? 'partial' : 'rejected'
    const outcome: CommitmentOutcome = { status, proof: proofText.trim() || undefined, proofImage: proofImage ?? undefined, offTaskSeconds: finalOffTaskSeconds, leftTabCount: leftTabCountRef.current, reviewVerdict: verdict, reviewSolid: verdict === 'accepted', reviewReaction: result.reaction, at: Date.now() }
    const solid = verdict === 'accepted'
    const counted = status === 'done' && solid && !countedRef.current
    onUpdateTask(task.id, {
      commitments: task.commitments.map((c) => (c.id === commitmentId.current ? { ...c, offTaskSeconds: finalOffTaskSeconds, leftTabCount: leftTabCountRef.current, outcome } : c)),
      status: status === 'done' && solid ? 'done' : 'in_progress',
      progressNotes: [...task.progressNotes, proofText.trim() || `(${status})`],
      lastTouched: Date.now(),
    })
    if (counted) { countedRef.current = true; onFollowThrough({ ...followThrough, completed: followThrough.completed + 1 }) }
    setStep('done')

    // Re-evaluation checkpoint: after partial/rejected proof, call the intervention router again
    if (verdict !== 'accepted') {
      try {
        const reCtx = { ...ctx, progressNotes: [...task.progressNotes, proofText.trim() || `(${status})`], commitments: task.commitments.map((c) => (c.id === commitmentId.current ? { ...c, outcome } : c)) }
        const reRes = await fetch('/api/intervene', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: reCtx }) })
        const rePayload = (await reRes.json()) as InterventionDecision | { error: string }
        if (reRes.ok && !('error' in rePayload)) setReEvaluation(rePayload)
      } catch { /* silent â€” re-evaluation is additive */ }
    }
  }

  const backToWork = (durationMin = 10) => { setReEvaluation(null); setSecondsLeft(durationMin * 60); setTotalSeconds(durationMin * 60); setRunning(true); setStep('work') }
  const retryFromReEval = () => {
    if (!reEvaluation) return backToWork()
    if (reEvaluation.strategy === 'quick_start') return backToWork(5)
    if (reEvaluation.strategy === 'resume') return backToWork(10)
    // scope_first: reset to scope step
    setReEvaluation(null)
    scopedRef.current = false
    setStep('scope')
    // Re-trigger scope flow
    ;(async () => {
      try {
        const res = await fetch('/api/scope', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: ctx }) })
        const payload = (await res.json()) as { questions: string[] } | { error: string }
        const qs = !res.ok || 'error' in payload || !payload.questions?.length ? FALLBACK_Q : payload.questions
        setQuestions(qs)
        setAnswers(new Array(qs.length).fill(''))
      } catch {
        setQuestions(FALLBACK_Q)
        setAnswers(new Array(FALLBACK_Q.length).fill(''))
      }
    })()
  }
  const leaveEngage = () => {
    if (!commitmentId.current && step !== 'done') {
      onUpdateTask(task.id, { openedThenBailed: task.openedThenBailed + 1, lastTouched: Date.now() })
    }
    onBack()
  }

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`
  const timerDeg = `${Math.min(360, ((totalSeconds - secondsLeft) / Math.max(1, totalSeconds)) * 360)}deg`
  const updateAnswer = (i: number, v: string) => setAnswers((a) => a.map((x, j) => (j === i ? v : x)))
  const artifactLines = (plan?.artifact ?? '').split('\n').map((l) => l.replace(/^[\s>*\-â€¢\d.]+/, '').trim()).filter(Boolean)
  const cur = stepIndex(step)
  const reviewVerdict = review?.verdict === 'accepted' && review.solid ? 'accepted' : review?.verdict === 'partial' ? 'partial' : 'rejected'
  const solid = reviewVerdict === 'accepted'
  const verdictLabel = reviewVerdict === 'accepted' ? 'Accepted' : reviewVerdict === 'partial' ? 'Partial' : 'Rejected'
  const verdictTone = reviewVerdict === 'accepted' ? 'var(--good)' : reviewVerdict === 'partial' ? 'var(--warn)' : 'var(--bad, #ff7a7a)'

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 clamp(20px,5vw,40px)' }}>
      <div style={{ animation: 'riseIn .7s cubic-bezier(.22,.61,.36,1) both', display: 'flex', flexDirection: 'column', minHeight: '100dvh', padding: '24px 0 44px' }}>
        {/* Header: back + step dots + counter */}
        <div className="flex items-center gap-3.5" style={{ paddingTop: 8, marginBottom: 6 }}>
          <button onClick={leaveEngage} aria-label="Back to task list" title="Back to task list" className="btn-ghost flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0 }}>
            <ArrowLeft size={17} weight="bold" />
          </button>
          <div className="flex gap-1.5" style={{ flex: 1 }}>
            {MAIN.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= cur ? 'var(--accent)' : 'rgba(255,255,255,.1)', transition: 'background .5s' }} />
            ))}
          </div>
          <span className="mono" style={{ fontSize: 12, color: 'var(--faint)', flexShrink: 0 }}>{cur + 1} / 4</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--faint)', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>

        {/* SCOPE */}
        {step === 'scope' && (
          <div style={{ animation: 'stepIn .62s cubic-bezier(.2,.65,.25,1) both', flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 14 }}>
            <span className="eyebrow" style={{ marginBottom: 10 }}>Scope it</span>
            <h2 className="serif" style={{ fontSize: 32, fontWeight: 400, lineHeight: 1.1, marginBottom: 8 }}>First, a few questions.</h2>
            <p style={{ fontSize: 15, color: 'var(--dim)', marginBottom: 24, maxWidth: '32ch' }}>I need the specifics to actually help â€” not generic advice. Answer these and I&apos;ll build you a real starting point.</p>
            {!questions ? (
              <div className="flex items-center gap-3" style={{ minHeight: 120 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 14px 3px rgba(90,99,230,.6)', animation: 'breathe 1.6s ease-in-out infinite' }} />
                <span style={{ color: 'var(--dim)' }}>Working out what I need to knowâ€¦</span>
              </div>
            ) : (
              <>
                <div className="flex flex-col" style={{ gap: 14, flex: 1 }}>
                  {questions.map((q, i) => (
                    <div key={i} className="glass" style={{ borderRadius: 20, padding: 18 }}>
                      <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 14, lineHeight: 1.3 }}>{q}</div>
                      <input
                        aria-label={`Answer question ${i + 1}: ${q}`}
                        value={answers[i] ?? ''}
                        onChange={(e) => updateAnswer(i, e.target.value)}
                        placeholder="Type your answerâ€¦"
                        style={{ width: '100%', background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '13px 15px', color: 'var(--text)', fontSize: 15, outline: 'none', transition: 'border-color .2s' }}
                        onFocus={(e) => (e.target.style.borderColor = 'rgba(90,99,230,.5)')}
                        onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,.1)')}
                      />
                    </div>
                  ))}
                </div>
                {actionError && (
                  <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 14, background: 'rgba(255,90,90,.08)', border: '1px solid rgba(255,90,90,.35)', color: '#ff9a9a', fontSize: 14, lineHeight: 1.5 }}>
                    <strong style={{ display: 'block', marginBottom: 4 }}>Couldn\'t build your move</strong>
                    {actionError}
                  </div>
                )}
                <button onClick={act} className="btn-primary flex items-center justify-center gap-2.5" style={{ marginTop: 20, padding: 18, borderRadius: 16, fontSize: 16 }}>
                  <span>Build my move</span><ArrowRight size={18} weight="bold" />
                </button>
                <button onClick={act} className="mono" style={{ marginTop: 12, padding: 0, background: 'none', border: 'none', color: 'var(--faint)', fontSize: 12, cursor: 'pointer', textAlign: 'center' }}>skip â€” just give me something</button>
              </>
            )}
          </div>
        )}

        {/* ACTING */}
        {step === 'acting' && (
          <div className="flex items-center justify-center gap-3" style={{ flex: 1, minHeight: 200 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 18px 4px rgba(90,99,230,.7)', animation: 'breathe 1.6s ease-in-out infinite' }} />
            <span style={{ color: 'var(--dim)' }}>Clutch is building your moveâ€¦</span>
          </div>
        )}

        {/* PLAN */}
        {step === 'plan' && plan && (
          <div style={{ animation: 'stepIn .62s cubic-bezier(.2,.65,.25,1) both', flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 14 }}>
            <span className="eyebrow" style={{ marginBottom: 12 }}>The honest read</span>
            <h2 className="serif" style={{ fontSize: 30, fontWeight: 400, lineHeight: 1.18, marginBottom: 24, letterSpacing: '-.005em' }}>{plan.diagnosis}</h2>

            {plan.agentTrace && plan.agentTrace.length > 0 && (
              <div className="glass" style={{ borderRadius: 18, padding: 16, marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>Why Clutch chose this</div>
                <div className="flex flex-col" style={{ gap: 10 }}>
                  {plan.agentTrace.map((item, i) => (
                    <div key={`${item.label}-${i}`} className="flex gap-3" style={{ alignItems: 'flex-start' }}>
                      <span className="mono" style={{ width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(90,99,230,.14)', color: 'var(--accent)', fontSize: 11, flexShrink: 0 }}>{i + 1}</span>
                      <div>
                        <div className="mono" style={{ fontSize: 12, color: 'rgba(243,245,244,.86)', marginBottom: 3 }}>{
                          item.label
                            .replace('chooseIntervention:scope_first', 'Chose: ask a few questions')
                            .replace('chooseIntervention:resume', 'Chose: resume prior attempt')
                            .replace('chooseIntervention:quick_start', 'Chose: quick 5-min start')
                            .replace('chooseIntervention', 'Chose the next move')
                            .replace('inspectBehaviorMemory', 'Checked your recent pattern')
                            .replace('diagnoseAvoidance', 'Named the blocker')
                            .replace('generateArtifact', 'Built a starting point')
                            .replace('resumePriorAttempt', 'Loaded the last attempt')
                            .replace('groundWithGoogleSearch', 'Found sources')
                            .replace('selectIntervention', 'Picked the lowest-friction path')
                            .replace('setCommitment', 'Locked the focus block')
                        }</div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--dim)' }}>{item.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {plan.toolCalls && plan.toolCalls.length > 0 && (
                  <div style={{ marginTop: 13, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.08)', fontSize: 12, color: 'var(--faint)' }}>
                    steps: {plan.toolCalls.join(' -> ')}
                  </div>
                )}
              </div>
            )}

            <div className="glass" style={{ borderRadius: 22, overflow: 'hidden', marginBottom: 18 }}>
              <div className="flex items-center gap-2.5" style={{ padding: '15px 18px', borderBottom: '1px solid rgba(255,255,255,.08)', background: 'rgba(90,99,230,.06)' }}>
                <MagicWand size={16} weight="fill" style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)' }}>Started for you</span>
              </div>
              <div style={{ padding: 18 }}>
                <div className="flex flex-col" style={{ gap: 11 }}>
                  {(artifactLines.length ? artifactLines : [plan.artifact]).map((line, i) => (
                    <div key={i} className="flex gap-3" style={{ alignItems: 'flex-start' }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', marginTop: 8, flexShrink: 0 }} />
                      <span style={{ fontSize: 14.5, lineHeight: 1.5, color: 'rgba(243,245,244,.85)', whiteSpace: 'pre-wrap' }}>{line}</span>
                    </div>
                  ))}
                </div>
                <p style={{ marginTop: 16, fontSize: 13, color: 'var(--faint)', fontStyle: 'italic' }}>You react to this â€” you don&apos;t start from a blank page.</p>
              </div>
            </div>

            {plan.sources && plan.sources.length > 0 && (
              <div className="glass" style={{ borderRadius: 18, padding: 16, marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>Sources</div>
                <div className="flex flex-col" style={{ gap: 9 }}>
                  {plan.sources.map((source, i) => (
                    <a
                      key={`${source.uri}-${i}`}
                      href={source.uri}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: 'rgba(243,245,244,.86)', textDecoration: 'none', fontSize: 13.5, lineHeight: 1.4 }}
                    >
                      <span className="mono" style={{ color: 'var(--accent)', flexShrink: 0 }}>[{i + 1}]</span>
                      <span style={{ overflowWrap: 'anywhere' }}>{source.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div style={{ borderRadius: 20, background: 'rgba(90,99,230,.09)', border: '1px solid rgba(90,99,230,.28)', padding: 20, marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(90,99,230,.85)', marginBottom: 10 }}>Commit to one thing</div>
              <div className="flex items-start justify-between gap-3.5">
                <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.35 }}>{plan.suggestedAction}</div>
                <div className="inline-flex items-center gap-1.5" style={{ flexShrink: 0, padding: '7px 13px', borderRadius: 999, background: 'rgba(0,0,0,.25)', border: '1px solid rgba(90,99,230,.35)' }}>
                  <Timer size={15} style={{ color: 'var(--accent)' }} />
                  <input type="number" aria-label="Focus minutes" min={5} max={120} value={minutes} onChange={(e) => setMinutes(Math.max(5, Math.min(120, Number(e.target.value))))} className="mono" style={{ width: 34, background: 'transparent', border: 'none', outline: 'none', color: 'var(--accent)', fontSize: 13, textAlign: 'right' }} />
                  <span className="mono" style={{ fontSize: 13, color: 'var(--accent)' }}>min</span>
                </div>
              </div>
            </div>

            <button onClick={commit} className="btn-primary flex items-center justify-center gap-2.5" style={{ width: '100%', padding: 18, borderRadius: 16, fontSize: 16 }}>
              <Play size={17} weight="fill" /><span>Start the clock â€” {minutes} min</span>
            </button>
          </div>
        )}

        {/* WORK */}
        {step === 'work' && plan && (
          <div className="flex flex-col items-center justify-center text-center" style={{ animation: prefersReducedMotion ? 'none' : 'stepIn .62s cubic-bezier(.2,.65,.25,1) both', flex: 1, padding: '20px 0', gap: 8 }}>
            <div className="flex items-center gap-2.5" style={{ marginBottom: 14 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 14px 3px rgba(90,99,230,.7)', animation: prefersReducedMotion ? 'none' : 'breathe 2.4s ease-in-out infinite' }} />
              <span style={{ fontSize: 14, color: 'var(--dim)' }}>I&apos;m watching the clock.</span>
            </div>

            {leftTabCount > 0 && (
              <div style={{ width: '100%', maxWidth: 360, borderRadius: 16, padding: '12px 14px', background: leftNotice ? 'rgba(224,177,90,.14)' : 'rgba(255,255,255,.06)', border: `1px solid ${leftNotice ? 'rgba(224,177,90,.34)' : 'rgba(255,255,255,.1)'}`, color: leftNotice ? 'var(--warn)' : 'var(--faint)', fontSize: 13.5, lineHeight: 1.4, marginBottom: 10 }}>
                {leftNotice
                  ? `You left - ${Math.max(1, Math.ceil(secondsLeft / 60))} min left. Come back.`
                  : `${leftTabCount} tab switch${leftTabCount === 1 ? '' : 'es'} recorded.`}
                {offTaskSeconds > 0 && <span className="mono" style={{ marginLeft: 8, color: 'var(--faint)' }}>{Math.ceil(offTaskSeconds / 60)}m off-task</span>}
              </div>
            )}

            <div style={{ position: 'relative', width: 268, height: 268, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(#5A63E6 ${timerDeg}, rgba(255,255,255,.07) 0)`, transition: prefersReducedMotion ? 'none' : 'background .9s linear' }} />
              <div style={{ position: 'absolute', inset: 14, borderRadius: '50%', background: 'radial-gradient(circle at 50% 35%, #1a1830, #0c0b1a)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05), 0 30px 60px -30px rgba(0,0,0,.8)' }} />
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div className="mono" style={{ fontSize: 54, fontWeight: 500, letterSpacing: '-.02em', lineHeight: 1 }}>{mmss}</div>
                <div style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--faint)' }}>remaining</div>
              </div>
            </div>

            <div style={{ marginTop: 24, maxWidth: '30ch' }}>
              <div style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 8 }}>You committed to</div>
              <div className="serif" style={{ fontSize: 23, lineHeight: 1.25, fontWeight: 400 }}>{plan.suggestedAction}</div>
            </div>

            <div className="flex gap-3" style={{ marginTop: 30, width: '100%', maxWidth: 340 }}>
              <button onClick={() => setRunning((r) => !r)} className="btn-ghost flex items-center justify-center gap-2" style={{ flex: 1, padding: 15, borderRadius: 14, fontSize: 15, fontWeight: 600 }}>
                {running ? <Pause size={17} /> : <Play size={17} weight="fill" />}<span>{running ? 'Pause' : 'Resume'}</span>
              </button>
              <button onClick={() => finish('done')} className="btn-primary flex items-center justify-center gap-2" style={{ flex: 1, padding: 15, borderRadius: 14, fontSize: 15 }}>
                <span>I&apos;m done</span><ArrowRight size={16} weight="bold" />
              </button>
            </div>
            {focusBlockUrl && (
              <a href={focusBlockUrl} target="_blank" rel="noreferrer" className="btn-ghost flex items-center justify-center gap-2" style={{ marginTop: 12, width: '100%', maxWidth: 340, padding: 13, borderRadius: 14, fontSize: 14.5, fontWeight: 700, textDecoration: 'none' }}>
                <CalendarPlus size={17} weight="bold" />
                <span>Add focus block to Calendar</span>
              </a>
            )}
            <button onClick={() => finish('skipped')} style={{ marginTop: 14, background: 'none', border: 'none', color: 'var(--faint)', fontSize: 13, cursor: 'pointer' }}>I didn&apos;t get to it</button>
          </div>
        )}

        {/* PROOF */}
        {step === 'proof' && (
          <div style={{ animation: 'stepIn .62s cubic-bezier(.2,.65,.25,1) both', flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 14 }}>
            <span className="eyebrow" style={{ marginBottom: 10 }}>Show your work</span>
            <h2 className="serif" style={{ fontSize: 32, fontWeight: 400, lineHeight: 1.1, marginBottom: 8 }}>Show the work itself.</h2>
            <p style={{ fontSize: 15, color: 'var(--dim)', marginBottom: 22, maxWidth: '32ch' }}>Paste the actual work or attach a screenshot. Clutch checks the evidence, not just the claim.</p>

            <div className="glass" style={{ borderRadius: 22, marginBottom: 14 }}>
              <textarea value={proofText} onChange={(e) => setProofText(e.target.value)} autoFocus aria-label="Proof text" placeholder="Paste what you wrote, a link, code, or drag a screenshot - show the actual work, not a summary..." style={{ width: '100%', minHeight: 170, resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 16, lineHeight: 1.6, padding: 20 }} />
            </div>

            {proofImage && (
              <div className="flex items-center gap-2.5" style={{ padding: '12px 15px', borderRadius: 14, background: 'rgba(90,99,230,.1)', border: '1px solid rgba(90,99,230,.28)', marginBottom: 14 }}>
                <ImageIcon size={18} weight="fill" style={{ color: 'var(--accent)' }} />
                <span style={{ flex: 1, fontSize: 14, color: 'rgba(243,245,244,.85)' }}>Screenshot attached</span>
                <button onClick={() => setProofImage(null)} className="mono" style={{ background: 'none', border: 'none', color: 'var(--faint)', fontSize: 12, cursor: 'pointer' }}>remove</button>
              </div>
            )}

            <button onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-2.5" style={{ padding: 14, borderRadius: 14, border: '1px dashed rgba(255,255,255,.18)', background: 'transparent', color: 'var(--dim)', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', marginBottom: 18, transition: 'all .2s' }}>
              <Paperclip size={16} /><span>Attach a photo or screenshot</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleProofImage} aria-label="Attach proof screenshot" />

            <button onClick={submitProof} disabled={!proofText.trim() && !proofImage} className="btn-primary flex items-center justify-center gap-2.5" style={{ padding: 18, borderRadius: 16, fontSize: 16, opacity: (proofText.trim() || proofImage) ? 1 : 0.45, cursor: (proofText.trim() || proofImage) ? 'pointer' : 'not-allowed' }}>
              <Eye size={17} weight="fill" /><span>Have Clutch review it</span>
            </button>
          </div>
        )}

        {/* REVIEWING */}
        {step === 'reviewing' && (
          <div className="flex flex-col items-center justify-center text-center" style={{ flex: 1, gap: 22 }}>
            <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(90,99,230,.15)' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
              <Eye size={24} weight="fill" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Reading what you sentâ€¦</div>
              <div style={{ fontSize: 14, color: 'var(--faint)' }}>I&apos;m actually looking at it, not just nodding.</div>
            </div>
          </div>
        )}

        {/* DONE â€” reaction */}
        {step === 'done' && (
          <div className="flex flex-col justify-center" style={{ animation: 'stepIn .55s cubic-bezier(.2,.65,.25,1) both', flex: 1 }}>
            <div className="glass" style={{ borderRadius: 24, padding: 26, border: `1px solid ${solid ? 'rgba(127,174,122,.4)' : reviewVerdict === 'partial' ? 'rgba(224,177,90,.4)' : 'rgba(255,122,122,.38)'}` }}>
              <div className="inline-flex items-center gap-2" style={{ padding: '6px 12px', borderRadius: 999, background: solid ? 'rgba(127,174,122,.14)' : reviewVerdict === 'partial' ? 'rgba(224,177,90,.14)' : 'rgba(255,122,122,.12)', marginBottom: 18 }}>
                {solid ? <CheckCircle size={15} weight="fill" style={{ color: 'var(--good)' }} /> : <Warning size={15} weight="fill" style={{ color: verdictTone }} />}
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: verdictTone }}>{verdictLabel}</span>
              </div>
              <h2 className="serif" style={{ fontSize: 28, fontWeight: 400, lineHeight: 1.18, marginBottom: 14 }}>{review?.reaction ?? 'Not verified. Show concrete proof for this exact task.'}</h2>
              {review?.nextNudge && <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--dim)' }}>Next: {review.nextNudge}</p>}
            </div>

            {reEvaluation && !solid && (
              <div style={{ marginTop: 14, borderRadius: 16, padding: '14px 16px', background: 'rgba(90,99,230,.07)', border: '1px solid rgba(90,99,230,.22)' }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>Agent re-evaluated after proof review</div>
                <div style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(243,245,244,.86)', marginBottom: 4 }}>
                  Strategy: <strong>{reEvaluation.strategy === 'quick_start' ? 'Quick 5-min retry' : reEvaluation.strategy === 'resume' ? 'Resume from artifact' : 'Re-scope with new questions'}</strong>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--dim)' }}>{reEvaluation.reasoning}</div>
              </div>
            )}

            <button onClick={onBack} className="btn-primary flex items-center justify-center gap-2.5" style={{ marginTop: 18, width: '100%', padding: 18, borderRadius: 16, fontSize: 16 }}>
              <CheckCircle size={18} weight="fill" /><span>Back to my plate</span>
            </button>
            {!solid && (
              <button onClick={retryFromReEval} className="btn-ghost" style={{ marginTop: 10, width: '100%', padding: 13, borderRadius: 14, fontSize: 15, fontWeight: 600 }}>
                {reEvaluation ? (reEvaluation.strategy === 'quick_start' ? 'Quick 5-min retry' : reEvaluation.strategy === 'resume' ? 'Resume â€” another 10 minutes' : 'Re-scope this task') : 'Give it another 10 minutes'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function calendarFocusBlockUrl(taskTitle: string, action: string, startMs: number, durationMin: number): string {
  const start = new Date(startMs)
  const end = new Date(startMs + durationMin * 60_000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Focus block: ${taskTitle}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `CLUTCH commitment: ${action}\n\nBring back proof before marking this done.`,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
