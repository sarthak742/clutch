'use client'

import { useState } from 'react'
import { Plus, WarningOctagon, ArrowRight, CalendarX, HourglassMedium, ArrowUUpLeft, MoonStars, ChartLineUp, BellRinging } from '@phosphor-icons/react'
import type { ClutchTask, FollowThrough } from '@/lib/types'
import { rankTasks } from '@/lib/triage'
import { deadlineLabel, EFFORT_LABEL } from '@/lib/task'
import type { DayPlan } from '@/lib/gemini'

interface Props {
  tasks: ClutchTask[]
  followThrough: FollowThrough
  onEngage: (id: string) => void
  onDefer: (id: string) => void
  onAddMore: () => void
}

function dotColor(score: number) {
  if (score >= 90) return { c: '#ff6b6b', g: 'rgba(255,107,107,.5)' }
  if (score >= 55) return { c: 'var(--warn)', g: 'rgba(224,177,90,.45)' }
  return { c: 'var(--accent)', g: 'rgba(90,99,230,.5)' }
}

export function Briefing({ tasks, followThrough, onEngage, onDefer, onAddMore }: Props) {
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null)
  const [planning, setPlanning] = useState(false)
  const now = Date.now()
  const ranked = rankTasks(tasks, now)
  const top = ranked[0]
  const rest = ranked.slice(1)
  const analytics = briefingAnalytics(tasks, followThrough)
  const followUp = followUpMemory(tasks)

  const rate =
    followThrough.committed > 0
      ? Math.round((followThrough.completed / followThrough.committed) * 100)
      : null

  const planDay = async () => {
    if (planning) return
    setPlanning(true)
    try {
      const res = await fetch('/api/plan-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      })
      const payload = (await res.json()) as DayPlan | { error: string }
      if (res.ok && !('error' in payload)) setDayPlan(payload)
    } finally {
      setPlanning(false)
    }
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '0 clamp(20px,5vw,40px)' }}>
      <div style={{ animation: 'riseIn .7s cubic-bezier(.22,.61,.36,1) both', display: 'flex', flexDirection: 'column', minHeight: '100dvh', padding: '30px 0 44px' }}>
        {/* Header */}
        <div className="flex items-center justify-between" style={{ paddingTop: 8, marginBottom: 8 }}>
          <div className="flex items-center gap-3">
            <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid rgba(90,99,230,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 14px 2px rgba(90,99,230,.6)' }} />
            </div>
            <span className="mono" style={{ fontWeight: 600, letterSpacing: '.14em', fontSize: 13, textTransform: 'uppercase', color: 'rgba(243,245,244,.82)' }}>Clutch</span>
          </div>
          {rate !== null && (
            <span className="mono" style={{ fontSize: 12, color: 'var(--faint)' }}>
              follow-through <span style={{ color: rate >= 60 ? 'var(--good)' : 'var(--warn)' }}>{rate}%</span>
            </span>
          )}
        </div>

        {!top ? (
          <div className="flex flex-col items-center justify-center text-center" style={{ flex: 1, gap: 16, padding: '3rem 0' }}>
            <MoonStars size={36} weight="duotone" style={{ color: 'var(--accent)' }} />
            <p className="serif" style={{ fontSize: 30, fontWeight: 400 }}>Nothing on the brink.</p>
            <p style={{ color: 'var(--dim)', fontSize: 15, maxWidth: '32ch' }}>
              You&apos;re clear. Dump whatever&apos;s on your mind and I&apos;ll tell you what to deal with first.
            </p>
            <button onClick={onAddMore} className="btn-primary flex items-center gap-2" style={{ marginTop: 6, padding: '13px 22px', borderRadius: 14, fontSize: 15 }}>
              <Plus size={16} weight="bold" /> Brain-dump my tasks
            </button>
          </div>
        ) : (
          <div className="flex flex-col justify-center" style={{ flex: 1, paddingTop: 24, paddingBottom: 12 }}>
            <div className="glass" style={{ borderRadius: 20, padding: 14, marginBottom: 14 }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
                <ChartLineUp size={16} weight="fill" style={{ color: 'var(--accent)' }} />
                <span className="mono" style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--faint)' }}>Accountability dashboard</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>
                <Metric label="follow-through" value={analytics.followThrough} tone={analytics.followThroughRaw >= 60 ? 'var(--good)' : 'var(--warn)'} />
                <Metric label="accepted" value={String(analytics.accepted)} tone="var(--good)" />
                <Metric label="off-task" value={`${analytics.offTaskMinutes}m`} tone={analytics.offTaskMinutes > 0 ? 'var(--warn)' : 'var(--faint)'} />
                <Metric label="rescued" value={String(analytics.rescued)} tone="var(--accent)" />
              </div>
            </div>

            {followUp && (
              <button
                onClick={() => onEngage(followUp.task.id)}
                className="glass flex items-start gap-3 text-left"
                style={{ borderRadius: 20, padding: 15, marginBottom: 14, color: 'inherit', cursor: 'pointer' }}
              >
                <BellRinging size={20} weight="fill" style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <div className="mono" style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--warn)', marginBottom: 5 }}>Pick up where you left off</div>
                  <div style={{ fontSize: 14.5, lineHeight: 1.45, color: 'rgba(243,245,244,.86)' }}>{followUp.message}</div>
                </div>
                <ArrowRight size={16} weight="bold" style={{ color: 'var(--faint)', flexShrink: 0, marginTop: 2 }} />
              </button>
            )}

            {/* Hero */}
            <div
              style={{
                animation: 'heroReveal 1.05s cubic-bezier(.18,.7,.24,1) both',
                position: 'relative', borderRadius: 28, overflow: 'hidden',
                background: 'rgba(255,255,255,.05)', border: '1px solid rgba(90,99,230,.28)',
                backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
                boxShadow: '0 30px 70px -32px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.06)',
                padding: 24,
              }}
            >
              <div style={{ position: 'absolute', top: '-40%', right: '-20%', width: '60%', height: '120%', background: 'radial-gradient(circle, rgba(90,99,230,.22) 0%, transparent 70%)', pointerEvents: 'none', animation: 'haloPulse 6s ease-in-out infinite' }} />
              <div style={{ position: 'relative' }}>
                <div className="inline-flex items-center gap-1.5" style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(90,99,230,.14)', border: '1px solid rgba(90,99,230,.32)' }}>
                  <WarningOctagon size={14} weight="fill" style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--accent)' }}>Most likely to blow up</span>
                </div>

                <h3 className="serif" style={{ fontSize: 34, lineHeight: 1.08, fontWeight: 400, margin: '16px 0 10px', letterSpacing: '-.01em' }}>{top.task.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--dim)', marginBottom: 18 }}>
                  {top.task.deferralCount > 0
                    ? `You've walked past this ${top.task.deferralCount} time${top.task.deferralCount > 1 ? 's' : ''} already — it's the most likely thing here to slip.`
                    : `Of everything on your plate, this is the most likely to slip through the cracks.`}
                </p>

                <div className="flex flex-wrap gap-2" style={{ marginBottom: 20 }}>
                  <Chip icon={<CalendarX size={14} />} label={top.reason} />
                  <Chip icon={<HourglassMedium size={14} />} label={EFFORT_LABEL[top.task.effort]} />
                  {top.task.deferralCount > 0 && <Chip icon={<ArrowUUpLeft size={14} />} label={`Dodged ${top.task.deferralCount}×`} />}
                </div>

                <div className="flex items-center gap-2.5" style={{ marginBottom: 22 }}>
                  <div style={{ flex: 1, height: 5, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #5A63E6, #9aa0f5)', width: `${Math.min(99, Math.max(15, Math.round(top.score)))}%` }} />
                  </div>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{Math.min(99, Math.max(15, Math.round(top.score)))}% risk</span>
                </div>

                <button onClick={planDay} className="btn-ghost" style={{ width: '100%', marginBottom: 10, padding: 13, borderRadius: 14, fontSize: 14, fontWeight: 600 }}>
                  {planning ? 'Planning with Gemini function calling...' : 'Plan my day with a real Gemini tool call'}
                </button>
                {dayPlan && (
                  <div style={{ marginBottom: 12, padding: 14, borderRadius: 16, background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.08)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: dayPlan.functionCalled ? 'var(--good)' : 'var(--warn)', marginBottom: 7 }}>
                      {dayPlan.functionCalled ? 'Gemini function call verified' : 'Deterministic fallback used'}
                    </div>
                    <p style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--dim)', marginBottom: 8 }}>{dayPlan.summary}</p>
                    <div style={{ fontSize: 13.5, color: 'rgba(243,245,244,.86)' }}>{dayPlan.nextAction}</div>
                  </div>
                )}

                <button onClick={() => onEngage(top.task.id)} className="btn-primary flex items-center justify-center gap-2.5" style={{ width: '100%', padding: 18, borderRadius: 16, fontSize: 16 }}>
                  <span>Start — I&apos;ll ask you a few questions</span>
                  <ArrowRight size={18} weight="bold" />
                </button>
                <button onClick={() => onDefer(top.task.id)} style={{ width: '100%', marginTop: 10, padding: 11, borderRadius: 12, border: 'none', background: 'transparent', color: 'var(--faint)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Not right now</button>
              </div>
            </div>

            {/* Rest */}
            {rest.length > 0 && (
              <>
                <div className="flex items-center gap-2.5" style={{ margin: '30px 0 12px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--faint)' }}>The rest of it</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
                </div>
                <div className="flex flex-col" style={{ gap: 10 }}>
                  {rest.map((r) => {
                    const dc = dotColor(r.score)
                    return (
                      <button
                        key={r.task.id}
                        onClick={() => onEngage(r.task.id)}
                        className="flex items-center gap-3.5 text-left"
                        style={{ padding: '16px 18px', borderRadius: 18, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', cursor: 'pointer', color: 'inherit', transition: 'background .2s, border-color .2s, transform .15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.075)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.16)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)' }}
                      >
                        <div style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: dc.c, boxShadow: `0 0 10px 1px ${dc.g}` }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.task.title}</div>
                          <div style={{ fontSize: 13, color: 'var(--faint)', marginTop: 3 }}>
                            {deadlineLabel(r.task.deadline, now)} · {EFFORT_LABEL[r.task.effort]}{r.task.deferralCount > 0 ? ` · dodged ${r.task.deferralCount}×` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5" style={{ flexShrink: 0, color: 'rgba(90,99,230,.9)', fontSize: 13, fontWeight: 600 }}>
                          <span>Start</span><ArrowRight size={15} weight="bold" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            <button onClick={onAddMore} className="flex items-center justify-center gap-2" style={{ marginTop: 22, padding: 15, borderRadius: 14, border: '1px dashed rgba(255,255,255,.16)', background: 'transparent', color: 'var(--dim)', fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.3)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--dim)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.16)' }}
            >
              <Plus size={17} /> <span>Add more to your mind</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={{ borderRadius: 14, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.07)', padding: '10px 9px', minWidth: 0 }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 18, lineHeight: 1, fontWeight: 800, color: tone }}>{value}</div>
    </div>
  )
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5" style={{ padding: '6px 11px', borderRadius: 999, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', fontSize: 12.5, color: 'rgba(243,245,244,.72)' }}>
      <span style={{ color: 'rgba(90,99,230,.85)', display: 'flex' }}>{icon}</span>
      <span>{label}</span>
    </div>
  )
}

function briefingAnalytics(tasks: ClutchTask[], followThrough: FollowThrough) {
  const outcomes = tasks.flatMap((task) => task.commitments.map((commitment) => ({ task, commitment, outcome: commitment.outcome })).filter((item) => item.outcome))
  const accepted = outcomes.filter((item) => item.outcome?.reviewVerdict === 'accepted' || item.outcome?.reviewSolid).length
  const offTaskMinutes = Math.ceil(outcomes.reduce((sum, item) => sum + (item.outcome?.offTaskSeconds ?? item.commitment.offTaskSeconds ?? 0), 0) / 60)
  const rescued = tasks.filter((task) => task.status === 'done' && task.deferralCount > 0).length
  const followThroughRaw = followThrough.committed > 0 ? Math.round((followThrough.completed / followThrough.committed) * 100) : 0
  return {
    followThroughRaw,
    followThrough: followThrough.committed > 0 ? `${followThroughRaw}%` : '--',
    accepted,
    offTaskMinutes,
    rescued,
  }
}

function followUpMemory(tasks: ClutchTask[]): { task: ClutchTask; message: string } | null {
  const now = Date.now()
  const unfinished = tasks
    .filter((task) => task.status !== 'done' && task.commitments.length > 0)
    .map((task) => {
      const latest = [...task.commitments].sort((a, b) => b.committedAt - a.committedAt)[0]
      return { task, latest }
    })
    .filter((item) => now - item.latest.committedAt > 30 * 60_000)
    .sort((a, b) => b.latest.committedAt - a.latest.committedAt)[0]

  if (!unfinished) return null
  const hours = Math.max(1, Math.round((now - unfinished.latest.committedAt) / 3_600_000))
  const review = unfinished.latest.outcome?.reviewVerdict
  const suffix = review === 'partial'
    ? 'It was marked partial. Want to close the gap now?'
    : review === 'rejected'
      ? 'The proof was rejected. Want to show stronger evidence now?'
      : 'Want to finish it before it slips again?'
  return {
    task: unfinished.task,
    message: `${hours}h ago you committed to "${unfinished.latest.action}" for "${unfinished.task.title}". ${suffix}`,
  }
}
