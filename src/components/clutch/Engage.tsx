'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { ArrowLeft, ArrowRight, MagicWand, Timer, Play, Pause, Paperclip, Image as ImageIcon, CheckCircle, Eye, Warning } from '@phosphor-icons/react'
import type { ClutchTask, FollowThrough, Commitment, CommitmentOutcome } from '@/lib/types'
import type { ActionPlan, QAPair, ProofReview } from '@/lib/gemini'

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
  const commitmentId = useRef<string | null>(null)
  const pendingStatus = useRef<CommitmentOutcome['status']>('done')
  const countedRef = useRef(false)
  const scopedRef = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const act = async () => {
    setStep('acting')
    const qa: QAPair[] = (questions ?? []).map((q, i) => ({ question: q, answer: answers[i] ?? '' }))
    try {
      const res = await fetch('/api/act', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: ctx, qa }) })
      const payload = (await res.json()) as ActionPlan | { error: string }
      if (!res.ok || 'error' in payload) throw new Error('error' in payload ? payload.error : `Request failed (${res.status})`)
      setPlan(payload)
      setMinutes(Math.max(5, Math.min(45, Math.round(payload.suggestedMinutes || 15))))
      onUpdateTask(task.id, { artifact: payload.artifact, agentTrace: payload.agentTrace ?? [], lastTouched: Date.now() })
      setStep('plan')
    } catch (e) {
      alert(`Clutch couldn't work that out.\n\n${e instanceof Error ? e.message : String(e)}`)
      setStep('scope')
    }
  }

  const commit = () => {
    if (!plan) return
    const c: Commitment = { id: crypto.randomUUID(), action: plan.suggestedAction, durationMin: minutes, committedAt: Date.now() }
    commitmentId.current = c.id
    onUpdateTask(task.id, { commitments: [...task.commitments, c] })
    onFollowThrough({ ...followThrough, committed: followThrough.committed + 1 })
    setSecondsLeft(minutes * 60)
    setTotalSeconds(minutes * 60)
    setRunning(true)
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
    const status = pendingStatus.current
    setStep('reviewing')
    let result: ProofReview | null = null
    try {
      const res = await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: ctx, action: plan?.suggestedAction ?? '', status, proofText, proofImage: proofImage ?? undefined }) })
      const payload = (await res.json()) as ProofReview | { error: string }
      if (res.ok && !('error' in payload)) result = payload
    } catch { /* neutral logging */ }
    setReview(result)

    const outcome: CommitmentOutcome = { status, proof: proofText.trim() || undefined, proofImage: proofImage ?? undefined, reviewSolid: result?.solid, reviewReaction: result?.reaction, at: Date.now() }
    const solid = result ? result.solid : true
    const counted = status === 'done' && solid && !countedRef.current
    onUpdateTask(task.id, {
      commitments: task.commitments.map((c) => (c.id === commitmentId.current ? { ...c, outcome } : c)),
      status: status === 'done' && solid ? 'done' : 'in_progress',
      progressNotes: [...task.progressNotes, proofText.trim() || `(${status})`],
      lastTouched: Date.now(),
    })
    if (counted) { countedRef.current = true; onFollowThrough({ ...followThrough, completed: followThrough.completed + 1 }) }
    setStep('done')
  }

  const backToWork = () => { setSecondsLeft(10 * 60); setTotalSeconds(10 * 60); setRunning(true); setStep('work') }
  const leaveEngage = () => {
    if (!commitmentId.current && step !== 'done') {
      onUpdateTask(task.id, { openedThenBailed: task.openedThenBailed + 1, lastTouched: Date.now() })
    }
    onBack()
  }

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`
  const timerDeg = `${Math.min(360, ((totalSeconds - secondsLeft) / Math.max(1, totalSeconds)) * 360)}deg`
  const updateAnswer = (i: number, v: string) => setAnswers((a) => a.map((x, j) => (j === i ? v : x)))
  const artifactLines = (plan?.artifact ?? '').split('\n').map((l) => l.replace(/^[\s>*\-•\d.]+/, '').trim()).filter(Boolean)
  const cur = stepIndex(step)
  const solid = review ? review.solid : true

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 clamp(20px,5vw,40px)' }}>
      <div style={{ animation: 'riseIn .7s cubic-bezier(.22,.61,.36,1) both', display: 'flex', flexDirection: 'column', minHeight: '100dvh', padding: '24px 0 44px' }}>
        {/* Header: back + step dots + counter */}
        <div className="flex items-center gap-3.5" style={{ paddingTop: 8, marginBottom: 6 }}>
          <button onClick={leaveEngage} aria-label="Back" className="btn-ghost flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0 }}>
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
            <p style={{ fontSize: 15, color: 'var(--dim)', marginBottom: 24, maxWidth: '32ch' }}>I need the specifics to actually help — not generic advice. Answer these and I&apos;ll build you a real starting point.</p>
            {!questions ? (
              <div className="flex items-center gap-3" style={{ minHeight: 120 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 14px 3px rgba(90,99,230,.6)', animation: 'breathe 1.6s ease-in-out infinite' }} />
                <span style={{ color: 'var(--dim)' }}>Working out what I need to know…</span>
              </div>
            ) : (
              <>
                <div className="flex flex-col" style={{ gap: 14, flex: 1 }}>
                  {questions.map((q, i) => (
                    <div key={i} className="glass" style={{ borderRadius: 20, padding: 18 }}>
                      <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 14, lineHeight: 1.3 }}>{q}</div>
                      <input
                        value={answers[i] ?? ''}
                        onChange={(e) => updateAnswer(i, e.target.value)}
                        placeholder="Type your answer…"
                        style={{ width: '100%', background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '13px 15px', color: 'var(--text)', fontSize: 15, outline: 'none', transition: 'border-color .2s' }}
                        onFocus={(e) => (e.target.style.borderColor = 'rgba(90,99,230,.5)')}
                        onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,.1)')}
                      />
                    </div>
                  ))}
                </div>
                <button onClick={act} className="btn-primary flex items-center justify-center gap-2.5" style={{ marginTop: 20, padding: 18, borderRadius: 16, fontSize: 16 }}>
                  <span>Build my move</span><ArrowRight size={18} weight="bold" />
                </button>
                <button onClick={act} className="mono" style={{ marginTop: 12, padding: 0, background: 'none', border: 'none', color: 'var(--faint)', fontSize: 12, cursor: 'pointer', textAlign: 'center' }}>skip — just give me something</button>
              </>
            )}
          </div>
        )}

        {/* ACTING */}
        {step === 'acting' && (
          <div className="flex items-center justify-center gap-3" style={{ flex: 1, minHeight: 200 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 18px 4px rgba(90,99,230,.7)', animation: 'breathe 1.6s ease-in-out infinite' }} />
            <span style={{ color: 'var(--dim)' }}>Clutch is building your move…</span>
          </div>
        )}

        {/* PLAN */}
        {step === 'plan' && plan && (
          <div style={{ animation: 'stepIn .62s cubic-bezier(.2,.65,.25,1) both', flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 14 }}>
            <span className="eyebrow" style={{ marginBottom: 12 }}>The honest read</span>
            <h2 className="serif" style={{ fontSize: 30, fontWeight: 400, lineHeight: 1.18, marginBottom: 24, letterSpacing: '-.005em' }}>{plan.diagnosis}</h2>

            {plan.agentTrace && plan.agentTrace.length > 0 && (
              <div className="glass" style={{ borderRadius: 18, padding: 16, marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>Agent audit trail</div>
                <div className="flex flex-col" style={{ gap: 10 }}>
                  {plan.agentTrace.map((item, i) => (
                    <div key={`${item.label}-${i}`} className="flex gap-3" style={{ alignItems: 'flex-start' }}>
                      <span className="mono" style={{ width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(90,99,230,.14)', color: 'var(--accent)', fontSize: 11, flexShrink: 0 }}>{i + 1}</span>
                      <div>
                        <div className="mono" style={{ fontSize: 12, color: 'rgba(243,245,244,.86)', marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--dim)' }}>{item.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {plan.toolCalls && plan.toolCalls.length > 0 && (
                  <div style={{ marginTop: 13, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.08)', fontSize: 12, color: 'var(--faint)' }}>
                    pipeline: {plan.toolCalls.join(' -> ')}
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
                <p style={{ marginTop: 16, fontSize: 13, color: 'var(--faint)', fontStyle: 'italic' }}>You react to this — you don&apos;t start from a blank page.</p>
              </div>
            </div>

            <div style={{ borderRadius: 20, background: 'rgba(90,99,230,.09)', border: '1px solid rgba(90,99,230,.28)', padding: 20, marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(90,99,230,.85)', marginBottom: 10 }}>Commit to one thing</div>
              <div className="flex items-start justify-between gap-3.5">
                <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.35 }}>{plan.suggestedAction}</div>
                <div className="inline-flex items-center gap-1.5" style={{ flexShrink: 0, padding: '7px 13px', borderRadius: 999, background: 'rgba(0,0,0,.25)', border: '1px solid rgba(90,99,230,.35)' }}>
                  <Timer size={15} style={{ color: 'var(--accent)' }} />
                  <input type="number" min={5} max={120} value={minutes} onChange={(e) => setMinutes(Math.max(5, Math.min(120, Number(e.target.value))))} className="mono" style={{ width: 34, background: 'transparent', border: 'none', outline: 'none', color: 'var(--accent)', fontSize: 13, textAlign: 'right' }} />
                  <span className="mono" style={{ fontSize: 13, color: 'var(--accent)' }}>min</span>
                </div>
              </div>
            </div>

            <button onClick={commit} className="btn-primary flex items-center justify-center gap-2.5" style={{ width: '100%', padding: 18, borderRadius: 16, fontSize: 16 }}>
              <Play size={17} weight="fill" /><span>Start the clock — {minutes} min</span>
            </button>
          </div>
        )}

        {/* WORK */}
        {step === 'work' && plan && (
          <div className="flex flex-col items-center justify-center text-center" style={{ animation: 'stepIn .62s cubic-bezier(.2,.65,.25,1) both', flex: 1, padding: '20px 0', gap: 8 }}>
            <div className="flex items-center gap-2.5" style={{ marginBottom: 14 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 14px 3px rgba(90,99,230,.7)', animation: 'breathe 2.4s ease-in-out infinite' }} />
              <span style={{ fontSize: 14, color: 'var(--dim)' }}>I&apos;m watching the clock.</span>
            </div>

            <div style={{ position: 'relative', width: 268, height: 268, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(#5A63E6 ${timerDeg}, rgba(255,255,255,.07) 0)`, transition: 'background .9s linear' }} />
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
            <button onClick={() => finish('skipped')} style={{ marginTop: 14, background: 'none', border: 'none', color: 'var(--faint)', fontSize: 13, cursor: 'pointer' }}>I didn&apos;t get to it</button>
          </div>
        )}

        {/* PROOF */}
        {step === 'proof' && (
          <div style={{ animation: 'stepIn .62s cubic-bezier(.2,.65,.25,1) both', flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 14 }}>
            <span className="eyebrow" style={{ marginBottom: 10 }}>Show me</span>
            <h2 className="serif" style={{ fontSize: 32, fontWeight: 400, lineHeight: 1.1, marginBottom: 8 }}>Show me what you got.</h2>
            <p style={{ fontSize: 15, color: 'var(--dim)', marginBottom: 22, maxWidth: '32ch' }}>Paste the actual work or attach a shot. I read the real thing — no credit for vibes.</p>

            <div className="glass" style={{ borderRadius: 22, marginBottom: 14 }}>
              <textarea value={proofText} onChange={(e) => setProofText(e.target.value)} autoFocus placeholder="Paste your paragraph, your notes, the link — whatever you actually made…" style={{ width: '100%', minHeight: 170, resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 16, lineHeight: 1.6, padding: 20 }} />
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
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleProofImage} aria-hidden="true" />

            <button onClick={submitProof} className="btn-primary flex items-center justify-center gap-2.5" style={{ padding: 18, borderRadius: 16, fontSize: 16 }}>
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
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Reading what you sent…</div>
              <div style={{ fontSize: 14, color: 'var(--faint)' }}>I&apos;m actually looking at it, not just nodding.</div>
            </div>
          </div>
        )}

        {/* DONE — reaction */}
        {step === 'done' && (
          <div className="flex flex-col justify-center" style={{ animation: 'stepIn .55s cubic-bezier(.2,.65,.25,1) both', flex: 1 }}>
            <div className="glass" style={{ borderRadius: 24, padding: 26, border: `1px solid ${solid ? 'rgba(127,174,122,.4)' : 'rgba(224,177,90,.4)'}` }}>
              <div className="inline-flex items-center gap-2" style={{ padding: '6px 12px', borderRadius: 999, background: solid ? 'rgba(127,174,122,.14)' : 'rgba(224,177,90,.14)', marginBottom: 18 }}>
                {solid ? <CheckCircle size={15} weight="fill" style={{ color: 'var(--good)' }} /> : <Warning size={15} weight="fill" style={{ color: 'var(--warn)' }} />}
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: solid ? 'var(--good)' : 'var(--warn)' }}>{solid ? 'Logged' : 'Not so fast'}</span>
              </div>
              <h2 className="serif" style={{ fontSize: 28, fontWeight: 400, lineHeight: 1.18, marginBottom: 14 }}>{review?.reaction ?? 'Logged. That&apos;s on the record.'}</h2>
              {review?.nextNudge && <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--dim)' }}>Next: {review.nextNudge}</p>}
            </div>

            <button onClick={onBack} className="btn-primary flex items-center justify-center gap-2.5" style={{ marginTop: 18, width: '100%', padding: 18, borderRadius: 16, fontSize: 16 }}>
              <CheckCircle size={18} weight="fill" /><span>Back to my plate</span>
            </button>
            {!solid && (
              <button onClick={backToWork} className="btn-ghost" style={{ marginTop: 10, width: '100%', padding: 13, borderRadius: 14, fontSize: 15, fontWeight: 600 }}>Give it another 10 minutes</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
