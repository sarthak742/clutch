'use client'

import { useState } from 'react'
import { ArrowRight, ArrowUUpLeft, BellRinging, CalendarPlus, CalendarX, ChartLineUp, EnvelopeSimple, HourglassMedium, LinkSimple, MoonStars, Plus, ShieldCheck, WarningOctagon } from '@phosphor-icons/react'
import type { ClutchTask, FollowThrough } from '@/lib/types'
import { rankTasks } from '@/lib/triage'
import { deadlineLabel, EFFORT_LABEL } from '@/lib/task'
import type { DayPlan, MorningBriefing } from '@/lib/gemini'
import { followUpMemory, latestFocusBlock, latestGroundedSources, overviewStats } from '@/lib/overview'

interface Props {
  tasks: ClutchTask[]
  followThrough: FollowThrough
  onEngage: (id: string) => void
  onDefer: (id: string) => void
  onAddMore: () => void
}

type Screen = 'dashboard' | 'morning' | 'tasks' | 'brain' | 'day' | 'focus' | 'proof' | 'memory' | 'grounded'

function dotColor(score: number) {
  if (score >= 90) return { c: '#ff6b6b', g: 'rgba(255,107,107,.5)' }
  if (score >= 55) return { c: 'var(--warn)', g: 'rgba(224,177,90,.45)' }
  return { c: 'var(--accent)', g: 'rgba(90,99,230,.5)' }
}

const screenCopy: Record<Screen, { title: string; subtitle: string }> = {
  dashboard: { title: 'Good evening, Alex', subtitle: 'Here is your real accountability snapshot.' },
  morning: { title: 'Morning Briefing', subtitle: 'What CLUTCH would send as a proactive push notification or email digest.' },
  tasks: { title: 'My Tasks', subtitle: 'Every commitment ranked by deadline, avoidance, effort, and history.' },
  brain: { title: 'Brain Dump', subtitle: 'Add the messy list. Clutch turns it into ranked commitments.' },
  day: { title: 'Day Plan', subtitle: 'A real Gemini function-calling round trip for planning the day.' },
  focus: { title: 'Focus Block', subtitle: 'Calendar handoff and timer context created when you commit.' },
  proof: { title: 'Proof & Verdicts', subtitle: 'Completion only counts when the proof matches the task.' },
  memory: { title: 'Memory', subtitle: 'Behavioral signals Clutch uses to pick up where you left off.' },
  grounded: { title: 'Grounded', subtitle: 'References saved from Gemini Search grounding when a task needs sources.' },
}

export function Briefing({ tasks, followThrough, onEngage, onDefer, onAddMore }: Props) {
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null)
  const [planning, setPlanning] = useState(false)
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [screen, setScreen] = useState<Screen>('dashboard')
  const now = Date.now()
  const ranked = rankTasks(tasks, now)
  const top = ranked[0]
  const rest = ranked.slice(1)
  const analytics = overviewStats(tasks, followThrough)
  const followUp = followUpMemory(tasks, now)
  const focusBlock = latestFocusBlock(tasks)
  const grounded = latestGroundedSources(tasks)
  const screenInfo = screenCopy[screen]

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

  const generateBriefing = async () => {
    if (briefingLoading) return
    setBriefingLoading(true)
    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, followThrough }),
      })
      const payload = (await res.json()) as MorningBriefing | { error: string }
      if (res.ok && !('error' in payload)) setBriefing(payload)
    } finally {
      setBriefingLoading(false)
    }
  }

  const navItems: { screen: Screen; label: string }[] = [
    { screen: 'dashboard', label: 'Dashboard' },
    { screen: 'morning', label: 'Morning Briefing' },
    { screen: 'tasks', label: 'My Tasks' },
    { screen: 'brain', label: 'Brain Dump' },
    { screen: 'day', label: 'Day Plan' },
    { screen: 'focus', label: 'Focus Block' },
    { screen: 'proof', label: 'Proof & Verdicts' },
    { screen: 'memory', label: 'Memory' },
    { screen: 'grounded', label: 'Grounded' },
  ]

  return (
    <div style={{ maxWidth: 1500, margin: '0 auto', padding: '0 clamp(18px,3vw,42px)' }}>
      <div style={{ animation: 'riseIn .7s cubic-bezier(.22,.61,.36,1) both', display: 'flex', flexDirection: 'column', minHeight: '100dvh', padding: '24px 0 36px' }}>
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
          <div className="glass clutch-app-shell" style={{ flex: 1, display: 'grid', gridTemplateColumns: '210px minmax(0,1fr)', borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(4,9,18,.9), rgba(2,5,12,.78))', border: '1px solid rgba(150,170,210,.24)', boxShadow: '0 46px 130px -54px rgba(0,0,0,1), 0 0 96px -60px rgba(0,136,255,.75), inset 0 1px 0 rgba(255,255,255,.07)' }}>
            <aside className="clutch-app-sidebar" style={{ borderRight: '1px solid rgba(255,255,255,.08)', padding: 20, display: 'flex', flexDirection: 'column', gap: 11, background: 'rgba(0,0,0,.22)' }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid rgba(77,200,255,.7)', display: 'grid', placeItems: 'center', boxShadow: '0 0 18px rgba(0,136,255,.22)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                </div>
                <span className="mono" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.14em' }}>CLUTCH</span>
              </div>
              {navItems.map((item) => {
                const active = screen === item.screen
                return (
                  <button
                    key={item.screen}
                    onClick={() => setScreen(item.screen)}
                    style={{ border: 'none', textAlign: 'left', borderRadius: 9, padding: '10px 11px', background: active ? 'rgba(0,88,255,.42)' : 'transparent', color: active ? '#fff' : 'rgba(243,245,244,.62)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {item.label}
                  </button>
                )
              })}
              <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', alignItems: 'center', gap: 9, color: 'rgba(243,245,244,.58)', fontSize: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.08)' }}>AS</div>
                <span>Accountability session</span>
              </div>
            </aside>

            <section style={{ padding: '24px clamp(18px,2.2vw,32px) 28px', minWidth: 0 }}>
              <div className="flex items-start justify-between gap-4" style={{ marginBottom: 18 }}>
                <div>
                  <h2 style={{ fontSize: 26, lineHeight: 1.05, fontWeight: 850, marginBottom: 6 }}>{screenInfo.title}</h2>
                  <p style={{ color: 'var(--dim)', fontSize: 14 }}>{screenInfo.subtitle}</p>
                </div>
                <span className="mono" style={{ color: dotColor(top.score).c, fontSize: 13 }}>{Math.min(99, Math.max(15, Math.round(top.score)))}% risk</span>
              </div>

              {screen === 'dashboard' && (
                <DashboardScreen
                  analytics={analytics}
                  followUp={followUp}
                  focusBlock={focusBlock}
                  grounded={grounded}
                  top={top}
                  rest={rest}
                  now={now}
                  onEngage={onEngage}
                  onDefer={onDefer}
                  onScreen={setScreen}
                />
              )}

              {screen === 'morning' && (
                <MorningScreen briefing={briefing} loading={briefingLoading} onGenerate={generateBriefing} analytics={analytics} top={top} onEngage={onEngage} />
              )}

              {screen === 'tasks' && (
                <TasksScreen ranked={ranked} now={now} onEngage={onEngage} />
              )}

              {screen === 'brain' && (
                <BrainDumpScreen onAddMore={onAddMore} taskCount={tasks.length} />
              )}

              {screen === 'day' && (
                <DayPlanScreen dayPlan={dayPlan} planning={planning} onPlanDay={planDay} taskCount={tasks.length} />
              )}

              {screen === 'focus' && (
                <FocusScreen focusBlock={focusBlock} top={top} onEngage={onEngage} />
              )}

              {screen === 'proof' && (
                <ProofScreen tasks={tasks} analytics={analytics} />
              )}

              {screen === 'memory' && (
                <MemoryScreen tasks={tasks} followUp={followUp} onEngage={onEngage} />
              )}

              {screen === 'grounded' && (
                <GroundedScreen grounded={grounded} tasks={tasks} />
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function DashboardScreen({ analytics, followUp, focusBlock, grounded, top, rest, now, onEngage, onDefer, onScreen }: {
  analytics: ReturnType<typeof overviewStats>
  followUp: ReturnType<typeof followUpMemory>
  focusBlock: ReturnType<typeof latestFocusBlock>
  grounded: ReturnType<typeof latestGroundedSources>
  top: ReturnType<typeof rankTasks>[number]
  rest: ReturnType<typeof rankTasks>
  now: number
  onEngage: (id: string) => void
  onDefer: (id: string) => void
  onScreen: (screen: Screen) => void
}) {
  return (
    <>
      <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
        <ChartLineUp size={16} weight="fill" style={{ color: 'var(--accent)' }} />
        <span className="mono" style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(243,245,244,.66)' }}>Accountability dashboard</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12, marginBottom: 16 }}>
        <Metric label="follow-through" value={analytics.followThrough} tone={analytics.followThroughRaw >= 60 ? 'var(--good)' : 'var(--warn)'} />
        <Metric label="accepted proof" value={String(analytics.accepted)} tone="var(--good)" />
        <Metric label="off-task time" value={`${analytics.offTaskMinutes}m`} tone={analytics.offTaskMinutes > 0 ? 'var(--warn)' : 'var(--faint)'} />
        <Metric label="rescued" value={String(analytics.rescued)} tone="var(--accent)" />
      </div>

      <div className="clutch-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.08fr) minmax(320px,.92fr)', gap: 16, alignItems: 'start' }}>
        <div>
          {followUp && (
            <button onClick={() => onEngage(followUp.task.id)} className="glass flex items-start gap-3 text-left" style={{ width: '100%', borderRadius: 16, padding: 15, marginBottom: 14, color: 'inherit', cursor: 'pointer', background: 'rgba(255,255,255,.045)' }}>
              <BellRinging size={20} weight="fill" style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--warn)', marginBottom: 5 }}>Pick up where you left off</div>
                <div style={{ fontSize: 14.5, lineHeight: 1.45, color: 'rgba(243,245,244,.86)' }}>{followUp.message}</div>
              </div>
              <ArrowRight size={16} weight="bold" style={{ color: 'var(--faint)', flexShrink: 0, marginTop: 2 }} />
            </button>
          )}
          <TopRiskCard top={top} onEngage={onEngage} onDefer={onDefer} />
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <button onClick={() => onScreen('proof')} style={{ border: 'none', background: 'transparent', color: 'inherit', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
            <MiniPanel icon={<ShieldCheck size={18} weight="fill" />} label="Proof verdicts" title={`${analytics.accepted} accepted / ${analytics.partial} partial / ${analytics.rejected} rejected`} detail="Open the dedicated verdict screen." tone="var(--good)" />
          </button>
          <button onClick={() => onScreen('grounded')} style={{ border: 'none', background: 'transparent', color: 'inherit', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
            <MiniPanel icon={<LinkSimple size={18} weight="bold" />} label="Grounded refs" title={grounded ? `${grounded.sources.length} sources saved` : 'No sources yet'} detail={grounded ? grounded.task.title : 'Reference-heavy plans show citations after grounding.'} tone="var(--accent)" />
          </button>
          <button onClick={() => onScreen('focus')} style={{ border: 'none', background: 'transparent', color: 'inherit', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
            <MiniPanel icon={<CalendarPlus size={18} weight="bold" />} label="Focus block" title={focusBlock ? `${focusBlock.commitment.durationMin} min calendar handoff` : 'Ready on commit'} detail={focusBlock ? focusBlock.task.title : 'Starting a timer creates a Google Calendar handoff link.'} tone="var(--accent)" />
          </button>
          {rest.length > 0 && <TaskTeaser tasks={rest} now={now} onScreen={() => onScreen('tasks')} />}
        </div>
      </div>
    </>
  )
}

function TopRiskCard({ top, onEngage, onDefer }: { top: ReturnType<typeof rankTasks>[number]; onEngage: (id: string) => void; onDefer: (id: string) => void }) {
  return (
    <div style={{ animation: 'heroReveal 1.05s cubic-bezier(.18,.7,.24,1) both', position: 'relative', borderRadius: 24, overflow: 'hidden', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(224,177,90,.34)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)', boxShadow: '0 30px 70px -32px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.06)', padding: 22 }}>
      <div style={{ position: 'absolute', top: '-40%', right: '-20%', width: '60%', height: '120%', background: 'radial-gradient(circle, rgba(90,99,230,.22) 0%, transparent 70%)', pointerEvents: 'none', animation: 'haloPulse 6s ease-in-out infinite' }} />
      <div style={{ position: 'relative' }}>
        <div className="inline-flex items-center gap-1.5" style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(90,99,230,.14)', border: '1px solid rgba(90,99,230,.32)' }}>
          <WarningOctagon size={14} weight="fill" style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--accent)' }}>Most likely to blow up</span>
        </div>
        <h3 className="serif" style={{ fontSize: 34, lineHeight: 1.08, fontWeight: 400, margin: '16px 0 10px', letterSpacing: '-.01em' }}>{top.task.title}</h3>
        <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--dim)', marginBottom: 18 }}>
          {top.task.deferralCount > 0
            ? `You've walked past this ${top.task.deferralCount} time${top.task.deferralCount > 1 ? 's' : ''} already - it's the most likely thing here to slip.`
            : 'Of everything on your plate, this is the most likely to slip through the cracks.'}
        </p>
        <div className="flex flex-wrap gap-2" style={{ marginBottom: 20 }}>
          <Chip icon={<CalendarX size={14} />} label={top.reason} />
          <Chip icon={<HourglassMedium size={14} />} label={EFFORT_LABEL[top.task.effort]} />
          {top.task.deferralCount > 0 && <Chip icon={<ArrowUUpLeft size={14} />} label={`Dodged ${top.task.deferralCount}x`} />}
        </div>
        <div className="flex items-center gap-2.5" style={{ marginBottom: 22 }}>
          <div style={{ flex: 1, height: 5, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #5A63E6, #9aa0f5)', width: `${Math.min(99, Math.max(15, Math.round(top.score)))}%` }} />
          </div>
          <span className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{Math.min(99, Math.max(15, Math.round(top.score)))}% risk</span>
        </div>
        <button onClick={() => onEngage(top.task.id)} className="btn-primary flex items-center justify-center gap-2.5" style={{ width: '100%', padding: 18, borderRadius: 16, fontSize: 16 }}>
          <span>Start - I&apos;ll ask you a few questions</span>
          <ArrowRight size={18} weight="bold" />
        </button>
        <button onClick={() => onDefer(top.task.id)} style={{ width: '100%', marginTop: 10, padding: 11, borderRadius: 12, border: 'none', background: 'transparent', color: 'var(--faint)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Not right now</button>
      </div>
    </div>
  )
}

function TasksScreen({ ranked, now, onEngage }: { ranked: ReturnType<typeof rankTasks>; now: number; onEngage: (id: string) => void }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {ranked.map((r) => (
        <TaskRow key={r.task.id} ranked={r} now={now} onEngage={onEngage} />
      ))}
    </div>
  )
}

function BrainDumpScreen({ onAddMore, taskCount }: { onAddMore: () => void; taskCount: number }) {
  return (
    <div className="glass" style={{ borderRadius: 22, padding: 26, maxWidth: 720 }}>
      <div className="mono" style={{ color: 'var(--accent)', fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: 10 }}>Capture inbox</div>
      <h3 style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 850, marginBottom: 12 }}>Add the next messy batch.</h3>
      <p style={{ color: 'var(--dim)', lineHeight: 1.6, marginBottom: 20 }}>You currently have {taskCount} task{taskCount === 1 ? '' : 's'} in CLUTCH. Brain Dump opens the parser screen so Gemini can structure more raw commitments.</p>
      <button onClick={onAddMore} className="btn-primary inline-flex items-center gap-2" style={{ padding: '15px 20px', borderRadius: 14 }}>
        <Plus size={17} weight="bold" /> Open brain dump
      </button>
    </div>
  )
}

function DayPlanScreen({ dayPlan, planning, onPlanDay, taskCount }: { dayPlan: DayPlan | null; planning: boolean; onPlanDay: () => void; taskCount: number }) {
  return (
    <div className="glass" style={{ borderRadius: 22, padding: 22, maxWidth: 780 }}>
      <div className="mono" style={{ color: 'var(--accent)', fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: 10 }}>Gemini day plan</div>
      <h3 style={{ fontSize: 26, lineHeight: 1.12, fontWeight: 850, marginBottom: 10 }}>Plan today from {taskCount} real task{taskCount === 1 ? '' : 's'}.</h3>
      <p style={{ color: 'var(--dim)', lineHeight: 1.6, marginBottom: 18 }}>This is the isolated real Gemini function-calling feature. The core loop stays deterministic; this screen proves the Google tool call honestly.</p>
      <button onClick={onPlanDay} className="btn-primary" style={{ width: '100%', padding: 15, borderRadius: 14, marginBottom: 14 }}>
        {planning ? 'Planning with Gemini function calling...' : 'Run Gemini day-plan function call'}
      </button>
      {dayPlan ? (
        <div style={{ padding: 16, borderRadius: 16, background: 'rgba(0,0,0,.24)', border: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: dayPlan.functionCalled ? 'var(--good)' : 'var(--warn)', marginBottom: 8 }}>
            {dayPlan.functionCalled ? 'Function call verified' : 'Deterministic fallback used'}
          </div>
          <p style={{ color: 'var(--dim)', lineHeight: 1.5, marginBottom: 10 }}>{dayPlan.summary}</p>
          <div style={{ color: 'rgba(243,245,244,.9)', fontWeight: 700 }}>{dayPlan.nextAction}</div>
        </div>
      ) : (
        <EmptyPanel title="No plan generated yet" detail="Run the action above to create a day plan." />
      )}
    </div>
  )
}

function FocusScreen({ focusBlock, top, onEngage }: { focusBlock: ReturnType<typeof latestFocusBlock>; top: ReturnType<typeof rankTasks>[number]; onEngage: (id: string) => void }) {
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 780 }}>
      {focusBlock ? (
        <a href={focusBlock.commitment.focusBlockUrl} target="_blank" rel="noreferrer" className="glass" style={{ display: 'block', borderRadius: 22, padding: 22, color: 'inherit', textDecoration: 'none' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 10, color: 'var(--accent)' }}>
            <CalendarPlus size={18} weight="bold" />
            <span className="mono" style={{ fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase' }}>Focus block ready</span>
          </div>
          <h3 style={{ fontSize: 24, fontWeight: 850, marginBottom: 8 }}>{focusBlock.commitment.durationMin} min calendar handoff</h3>
          <p style={{ color: 'var(--dim)', lineHeight: 1.55 }}>{focusBlock.commitment.action}</p>
        </a>
      ) : (
        <EmptyPanel title="No focus block yet" detail="Start a task and commit to a timer. CLUTCH will create the Google Calendar handoff there." />
      )}
      <button onClick={() => onEngage(top.task.id)} className="btn-primary inline-flex items-center justify-center gap-2" style={{ padding: 15, borderRadius: 14 }}>
        Commit to top task <ArrowRight size={17} weight="bold" />
      </button>
    </div>
  )
}

function ProofScreen({ tasks, analytics }: { tasks: ClutchTask[]; analytics: ReturnType<typeof overviewStats> }) {
  const outcomes = tasks.flatMap((task) =>
    task.commitments
      .filter((commitment) => commitment.outcome)
      .map((commitment) => ({ task, commitment, outcome: commitment.outcome! })),
  )

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12 }}>
        <Metric label="accepted" value={String(analytics.accepted)} tone="var(--good)" />
        <Metric label="partial" value={String(analytics.partial)} tone="var(--warn)" />
        <Metric label="rejected" value={String(analytics.rejected)} tone="var(--error)" />
      </div>
      {outcomes.length > 0 ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {outcomes.map(({ task, commitment, outcome }) => (
            <div key={commitment.id} className="glass" style={{ borderRadius: 16, padding: 15 }}>
              <div className="flex items-center justify-between gap-3" style={{ marginBottom: 6 }}>
                <strong>{task.title}</strong>
                <span className="mono" style={{ color: outcome.reviewVerdict === 'accepted' || outcome.reviewSolid ? 'var(--good)' : outcome.reviewVerdict === 'rejected' ? 'var(--error)' : 'var(--warn)', fontSize: 12 }}>{outcome.reviewVerdict ?? outcome.status}</span>
              </div>
              <p style={{ color: 'var(--dim)', fontSize: 13.5, lineHeight: 1.45 }}>{outcome.reviewReaction ?? commitment.action}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPanel title="No proof reviewed yet" detail="Finish a commitment and submit proof to populate this screen." />
      )}
    </div>
  )
}

function MemoryScreen({ tasks, followUp, onEngage }: { tasks: ClutchTask[]; followUp: ReturnType<typeof followUpMemory>; onEngage: (id: string) => void }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {followUp ? (
        <button onClick={() => onEngage(followUp.task.id)} className="glass text-left" style={{ borderRadius: 18, padding: 18, color: 'inherit', cursor: 'pointer' }}>
          <div className="mono" style={{ color: 'var(--warn)', fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: 8 }}>Follow-up memory</div>
          <p style={{ color: 'rgba(243,245,244,.88)', lineHeight: 1.5 }}>{followUp.message}</p>
        </button>
      ) : (
        <EmptyPanel title="No stale commitment yet" detail="When you commit and leave something unfinished, CLUTCH will surface it here." />
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {tasks.map((task) => (
          <div key={task.id} className="glass" style={{ borderRadius: 16, padding: 15 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>{task.title}</div>
            <div className="flex flex-wrap gap-2">
              <Chip icon={<ArrowUUpLeft size={14} />} label={`${task.deferralCount} deferrals`} />
              <Chip icon={<WarningOctagon size={14} />} label={`${task.openedThenBailed} bailouts`} />
              <Chip icon={<ShieldCheck size={14} />} label={`${task.commitments.length} commitments`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GroundedScreen({ grounded, tasks }: { grounded: ReturnType<typeof latestGroundedSources>; tasks: ClutchTask[] }) {
  const groundedTasks = tasks.filter((task) => (task.groundedSources ?? []).length > 0)
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {groundedTasks.length > 0 ? groundedTasks.map((task) => (
        <div key={task.id} className="glass" style={{ borderRadius: 18, padding: 18 }}>
          <div style={{ fontWeight: 850, marginBottom: 10 }}>{task.title}</div>
          <div style={{ display: 'grid', gap: 7 }}>
            {(task.groundedSources ?? []).map((source, i) => (
              <a key={`${source.uri}-${i}`} href={source.uri} target="_blank" rel="noreferrer" style={{ color: 'var(--dim)', textDecoration: 'none', overflowWrap: 'anywhere' }}>
                [{i + 1}] {source.title}
              </a>
            ))}
          </div>
        </div>
      )) : (
        <EmptyPanel title="No grounded references yet" detail={grounded ? grounded.task.title : 'Generate an action plan for an essay, study, how-to, or research task to save cited sources here.'} />
      )}
    </div>
  )
}

function TaskTeaser({ tasks, now, onScreen }: { tasks: ReturnType<typeof rankTasks>; now: number; onScreen: () => void }) {
  return (
    <button onClick={onScreen} className="glass text-left" style={{ borderRadius: 18, padding: 15, color: 'inherit', cursor: 'pointer' }}>
      <div className="mono" style={{ color: 'var(--accent)', fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: 8 }}>More tasks</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {tasks.slice(0, 3).map((ranked) => (
          <div key={ranked.task.id} className="flex items-center justify-between gap-3">
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ranked.task.title}</span>
            <span style={{ color: 'var(--faint)', fontSize: 12, flexShrink: 0 }}>{deadlineLabel(ranked.task.deadline, now)}</span>
          </div>
        ))}
      </div>
    </button>
  )
}

function TaskRow({ ranked, now, onEngage }: { ranked: ReturnType<typeof rankTasks>[number]; now: number; onEngage: (id: string) => void }) {
  const dc = dotColor(ranked.score)
  return (
    <button
      onClick={() => onEngage(ranked.task.id)}
      className="flex items-center gap-3.5 text-left"
      style={{ padding: '16px 18px', borderRadius: 18, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', cursor: 'pointer', color: 'inherit', transition: 'background .2s, border-color .2s, transform .15s' }}
    >
      <div style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: dc.c, boxShadow: `0 0 10px 1px ${dc.g}` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ranked.task.title}</div>
        <div style={{ fontSize: 13, color: 'var(--faint)', marginTop: 3 }}>
          {deadlineLabel(ranked.task.deadline, now)} / {EFFORT_LABEL[ranked.task.effort]}{ranked.task.deferralCount > 0 ? ` / dodged ${ranked.task.deferralCount}x` : ''}
        </div>
      </div>
      <div className="flex items-center gap-1.5" style={{ flexShrink: 0, color: 'rgba(90,99,230,.9)', fontSize: 13, fontWeight: 700 }}>
        <span>Start</span><ArrowRight size={15} weight="bold" />
      </div>
    </button>
  )
}

function EmptyPanel({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="glass" style={{ borderRadius: 18, padding: 18 }}>
      <div style={{ fontWeight: 850, marginBottom: 6 }}>{title}</div>
      <div style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.5 }}>{detail}</div>
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

function MiniPanel({ icon, label, title, detail, tone }: { icon: React.ReactNode; label: string; title: string; detail: string; tone: string }) {
  return (
    <div className="glass" style={{ borderRadius: 18, padding: 14 }}>
      <div className="flex items-center gap-2" style={{ marginBottom: 8, color: tone }}>
        {icon}
        <span className="mono" style={{ fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, marginBottom: 7 }}>{title}</div>
      <div style={{ color: 'var(--dim)', fontSize: 12.5, lineHeight: 1.45 }}>{detail}</div>
    </div>
  )
}

function MorningScreen({ briefing, loading, onGenerate, analytics, top, onEngage }: {
  briefing: MorningBriefing | null
  loading: boolean
  onGenerate: () => void
  analytics: ReturnType<typeof overviewStats>
  top: ReturnType<typeof rankTasks>[number]
  onEngage: (id: string) => void
}) {
  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 780 }}>
      <div style={{ borderRadius: 22, padding: '22px 24px', background: 'rgba(90,99,230,.06)', border: '1px solid rgba(90,99,230,.24)' }}>
        <div className="flex items-center gap-2.5" style={{ marginBottom: 14 }}>
          <EnvelopeSimple size={20} weight="fill" style={{ color: 'var(--accent)' }} />
          <span className="mono" style={{ fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--accent)' }}>Proactive digest preview</span>
        </div>
        <p style={{ color: 'var(--dim)', lineHeight: 1.6, fontSize: 14.5, marginBottom: 16 }}>
          This is what CLUTCH would send you as a morning push notification or email digest — a proactive nudge generated from your task risk, behavioral memory, and proof history, before you even open the app.
        </p>
        <button onClick={onGenerate} className="btn-primary" style={{ width: '100%', padding: 15, borderRadius: 14 }}>
          {loading ? 'Generating briefing with Gemini...' : briefing ? 'Regenerate briefing' : 'Generate morning briefing'}
        </button>
      </div>

      {briefing ? (
        <>
          <div className="glass" style={{ borderRadius: 22, padding: 22 }}>
            <div style={{ fontSize: 22, fontWeight: 850, lineHeight: 1.2, marginBottom: 14 }}>{briefing.greeting}</div>
            <div style={{ borderRadius: 16, background: 'rgba(224,177,90,.07)', border: '1px solid rgba(224,177,90,.3)', padding: 16, marginBottom: 14 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--warn)', marginBottom: 8 }}>Top risk</div>
              <div style={{ fontSize: 15.5, lineHeight: 1.55, color: 'rgba(243,245,244,.9)' }}>{briefing.topRisk}</div>
            </div>
            <div style={{ borderRadius: 16, background: 'rgba(90,99,230,.07)', border: '1px solid rgba(90,99,230,.24)', padding: 16 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>Start here</div>
              <div style={{ fontSize: 15.5, lineHeight: 1.55, fontWeight: 700 }}>{briefing.nudge}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
            <Metric label="follow-through" value={analytics.followThrough} tone={analytics.followThroughRaw >= 60 ? 'var(--good)' : 'var(--warn)'} />
            <Metric label="accepted" value={String(analytics.accepted)} tone="var(--good)" />
            <Metric label="rejected" value={String(analytics.rejected)} tone="var(--error)" />
          </div>

          {briefing.audit.length > 0 && (
            <div className="glass" style={{ borderRadius: 18, padding: 16 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>Agent audit trail</div>
              <div className="flex flex-col" style={{ gap: 8 }}>
                {briefing.audit.map((item, i) => (
                  <div key={`${item.label}-${i}`} className="flex gap-3" style={{ alignItems: 'flex-start' }}>
                    <span className="mono" style={{ width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(90,99,230,.14)', color: 'var(--accent)', fontSize: 10, flexShrink: 0 }}>{i + 1}</span>
                    <div>
                      <div className="mono" style={{ fontSize: 11.5, color: 'rgba(243,245,244,.86)', marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--dim)' }}>{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => onEngage(top.task.id)} className="btn-primary inline-flex items-center justify-center gap-2" style={{ padding: 15, borderRadius: 14 }}>
            Act on top risk <ArrowRight size={17} weight="bold" />
          </button>
        </>
      ) : !loading ? (
        <EmptyPanel title="No briefing generated yet" detail="Click the button above to generate your proactive morning digest with Gemini." />
      ) : null}
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
