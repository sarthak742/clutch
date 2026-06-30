'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowRight, ArrowUUpLeft, BellRinging, Bell, CalendarPlus, CalendarX, ChartLineUp, ClockCounterClockwise, EnvelopeSimple, HourglassMedium, LinkSimple, MoonStars, Plus, ShieldCheck, Sun, WarningOctagon, List, DotsThreeOutline, X, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react'
import type { ClutchTask, FollowThrough } from '@/lib/types'
import { rankTasks } from '@/lib/triage'
import { deadlineLabel, EFFORT_LABEL, calendarFocusBlockUrl, alertWindowStart, effortLeadHours } from '@/lib/task'
import type { DayPlan, MorningBriefing } from '@/lib/gemini'
import { computeStreak, followUpMemory, latestFocusBlock, latestGroundedSources, overviewStats } from '@/lib/overview'
import { timeMemory } from '@/lib/timeMemory'

interface Props {
  tasks: ClutchTask[]
  followThrough: FollowThrough
  onEngage: (id: string) => void
  onDefer: (id: string) => void
  onUpdateTask: (id: string, patch: Partial<ClutchTask>) => void
  onAddMore: () => void
  onLoadDemo?: () => void
}

type Screen = 'dashboard' | 'morning' | 'tasks' | 'brain' | 'day' | 'focus' | 'proof' | 'memory' | 'grounded'

function dotColor(score: number) {
  if (score >= 90) return { c: '#ff6b6b', g: 'rgba(255,107,107,.5)' }
  if (score >= 55) return { c: 'var(--warn)', g: 'rgba(224,177,90,.45)' }
  return { c: 'var(--accent)', g: 'rgba(90,99,230,.5)' }
}

function getDashboardGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning.'
  if (hour < 17) return 'Good afternoon.'
  return 'Good evening.'
}

const screenCopy: Record<Exclude<Screen, 'dashboard'>, { title: string; subtitle: string }> = {
  morning: { title: 'Morning Briefing', subtitle: 'What CLUTCH would send as a proactive push notification or email digest.' },
  tasks: { title: 'My Tasks', subtitle: 'Every commitment ranked by deadline, avoidance, effort, and history.' },
  brain: { title: 'Brain Dump', subtitle: 'Add the messy list. Clutch turns it into ranked commitments.' },
  day: { title: 'Day Plan', subtitle: 'A visible planning tool call that ranks today by risk, time, and avoidance.' },
  focus: { title: 'Focus Block', subtitle: 'Calendar handoff and timer context created when you commit.' },
  proof: { title: 'Show Your Work', subtitle: 'Completion only counts when the evidence matches the task.' },
  memory: { title: 'Memory', subtitle: 'Behavioral signals Clutch uses to pick up where you left off.' },
  grounded: { title: 'Sources', subtitle: 'References saved when a task needs current or factual support.' },
}

export function Briefing({ tasks, followThrough, onEngage, onDefer, onUpdateTask, onAddMore, onLoadDemo }: Props) {
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null)
  const [planning, setPlanning] = useState(false)
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [email, setEmail] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [pushEnabled, setPushEnabled] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEmail(localStorage.getItem('clutch_user_email') || '')
      const saved = localStorage.getItem('clutch_theme') as 'dark' | 'light' | null
      if (saved) setTheme(saved)
      setPushEnabled(Notification?.permission === 'granted')
    }
  }, [])

  const toggleTheme = () => {
    const next: 'dark' | 'light' = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('clutch_theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const requestPush = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      setPushEnabled(true)
      localStorage.setItem('clutch_push_enabled', '1')
    }
  }

  const handleEmailChange = (val: string) => {
    setEmail(val)
    localStorage.setItem('clutch_user_email', val)
  }

  // Overdue notification trigger
  useEffect(() => {
    if (!email || tasks.length === 0) return

    const notified = JSON.parse(localStorage.getItem('clutch_notified_overdue') || '{}')
    const now = Date.now()
    let updated = false

    tasks.forEach(async (task) => {
      // Proactive deadline warning: fire once we enter the lead window Gemini chose.
      const windowStart = alertWindowStart(task)
      if (task.status !== 'done' && windowStart !== null && now >= windowStart) {
        const key = `${task.id}-deadline`
        if (!notified[key]) {
          notified[key] = now
          updated = true
          const hoursLeft = task.deadline! > now ? Math.round((task.deadline! - now) / 3_600_000) : -1
          const upcoming = hoursLeft >= 0
          const reason = upcoming ? `due in ${hoursLeft < 1 ? 'under an hour' : `${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}`}` : 'the deadline has passed'
          try {
            await fetch('/api/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, taskTitle: task.title, reason, upcoming })
            })
          } catch (err) {
            console.error('[notify] Failed to send deadline alert:', err)
          }
        }
      }

      // Expired commitment check
      task.commitments.forEach(async (c) => {
        const expirationTime = c.committedAt + c.durationMin * 60_000
        if (!c.outcome && now > expirationTime) {
          const key = `${c.id}-commitment`
          if (!notified[key]) {
            notified[key] = now
            updated = true
            try {
              await fetch('/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, taskTitle: `${task.title} (commitment: ${c.action})`, reason: 'timer expired without proof' })
              })
            } catch (err) {
              console.error('[notify] Failed to send commitment alert:', err)
            }
          }
        }
      })
    })

    if (updated) {
      localStorage.setItem('clutch_notified_overdue', JSON.stringify(notified))
    }
  }, [tasks, email])

  // Push the latest snapshot server-side so the Cloud Scheduler cron can send
  // proactive alerts even when no tab is open. No-op until an email is set;
  // demo tasks are never uploaded. Fails soft (off-GCP the server ignores it).
  useEffect(() => {
    if (!email) return
    const real = tasks.filter((t) => !t.id.startsWith('demo-'))
    if (real.length === 0) return
    let clientId = localStorage.getItem('clutch-client-id')
    if (!clientId) {
      clientId = crypto.randomUUID()
      localStorage.setItem('clutch-client-id', clientId)
    }
    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, email, tasks: real }),
    }).catch(() => {})
  }, [tasks, email])

  const now = Date.now()
  const ranked = rankTasks(tasks, now)
  const top = ranked[0]
  const rest = ranked.slice(1)
  const analytics = overviewStats(tasks, followThrough)
  const streak = computeStreak(tasks)
  const followUp = followUpMemory(tasks, now)
  const focusBlock = latestFocusBlock(tasks)
  const grounded = latestGroundedSources(tasks)

  const screenTitle = screen === 'dashboard' ? getDashboardGreeting() : screenCopy[screen].title
  const screenSubtitle = screen === 'dashboard' ? 'Here is your real accountability snapshot.' : screenCopy[screen].subtitle

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
    { screen: 'proof', label: 'Show Your Work' },
    { screen: 'memory', label: 'Memory' },
    { screen: 'grounded', label: 'Sources' },
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
          <div className="flex items-center gap-3.5">
            {onLoadDemo && (
              <button onClick={() => { if (window.confirm('Replace all current tasks with the demo flow?')) onLoadDemo() }} className="mono" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.045)', color: 'var(--dim)', borderRadius: 999, padding: '5px 11px', fontSize: 11, cursor: 'pointer' }}>
                load demo
              </button>
            )}
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 8, transition: 'color .2s' }}>
              {theme === 'dark' ? <Sun size={16} weight="bold" /> : <MoonStars size={16} weight="duotone" />}
            </button>
            {rate !== null && (
              <span className="mono" style={{ fontSize: 12, color: 'var(--faint)' }}>
                follow-through <span style={{ color: rate >= 60 ? 'var(--good)' : 'var(--warn)' }}>{rate}%</span>
              </span>
            )}
          </div>
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
               <div className="flex flex-col gap-1.5" style={{ flex: 1 }}>
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
               </div>

               {/* Email Notification Panel */}
               <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.08)' }}>
                 <div className="mono" style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 8 }}>Email Alerts</div>
                 <input
                   type="email"
                   placeholder="your@email.com"
                   value={email}
                   onChange={(e) => handleEmailChange(e.target.value)}
                   style={{ width: '100%', background: 'rgba(0,0,0,.25)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '6px 9px', color: 'var(--text)', fontSize: 12, outline: 'none' }}
                 />
                 {email && <div style={{ fontSize: 9, color: 'var(--good)', marginTop: 4, opacity: 0.85 }}>Alerts enabled</div>}
                 <div style={{ marginTop: 12 }}>
                   <button
                     onClick={requestPush}
                     disabled={pushEnabled}
                     style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 9px', borderRadius: 8, border: `1px solid ${pushEnabled ? 'rgba(127,174,122,.35)' : 'rgba(255,255,255,.12)'}`, background: pushEnabled ? 'rgba(127,174,122,.08)' : 'rgba(0,0,0,.2)', color: pushEnabled ? 'var(--good)' : 'var(--dim)', fontSize: 11, cursor: pushEnabled ? 'default' : 'pointer', fontWeight: 600, transition: 'all .2s' }}
                   >
                     <Bell size={12} weight={pushEnabled ? 'fill' : 'regular'} />
                     {pushEnabled ? 'Push alerts on' : 'Enable push alerts'}
                   </button>
                 </div>
               </div>
             </aside>

            <section style={{ padding: '24px clamp(18px,2.2vw,32px) 28px', minWidth: 0 }}>
              <div className="flex items-start justify-between gap-4" style={{ marginBottom: 18 }}>
                <div>
                  <h2 style={{ fontSize: 26, lineHeight: 1.05, fontWeight: 850, marginBottom: 6 }}>{screenTitle}</h2>
                  <p style={{ color: 'var(--dim)', fontSize: 14 }}>{screenSubtitle}</p>
                </div>
                <span className="mono" style={{ color: dotColor(top.score).c, fontSize: 13 }}>{Math.min(99, Math.max(15, Math.round(top.score)))}% risk</span>
              </div>

              {screen === 'dashboard' && (
                <DashboardScreen
                  analytics={analytics}
                  streak={streak}
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
                <TasksScreen ranked={ranked} now={now} onEngage={onEngage} onUpdateTask={onUpdateTask} hasEmail={Boolean(email)} />
              )}

              {screen === 'brain' && (
                <BrainDumpScreen onAddMore={onAddMore} taskCount={tasks.length} />
              )}

              {screen === 'day' && (
                <DayPlanScreen dayPlan={dayPlan} planning={planning} onPlanDay={planDay} taskCount={tasks.filter(t => t.status !== 'done' && t.status !== 'dropped').length} />
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

        {/* Mobile Bottom Navigation Bar */}
        <nav className="clutch-mobile-nav" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(12, 11, 24, 0.96)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', zIndex: 100, padding: '10px 10px 14px', justifyContent: 'space-around', alignItems: 'center', boxShadow: '0 -10px 30px rgba(0,0,0,0.5)' }}>
          {[
            { screen: 'dashboard', label: 'Dashboard', icon: ChartLineUp },
            { screen: 'tasks', label: 'Tasks', icon: List },
            { screen: 'brain', label: 'Brain', icon: Plus },
            { screen: 'day', label: 'Day Plan', icon: CalendarPlus },
          ].map((item) => {
            const Icon = item.icon
            const active = screen === item.screen
            return (
              <button
                key={item.screen}
                onClick={() => { setScreen(item.screen as Screen); setShowMoreMenu(false) }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: 'none', background: 'transparent', color: active ? 'var(--accent)' : 'var(--faint)', cursor: 'pointer', outline: 'none' }}
              >
                <Icon size={20} weight={active ? 'fill' : 'bold'} />
                <span className="mono" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.05em' }}>{item.label}</span>
              </button>
            )
          })}
          <button
            onClick={() => setShowMoreMenu(true)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: 'none', background: 'transparent', color: ['morning', 'focus', 'proof', 'memory', 'grounded'].includes(screen) || showMoreMenu ? 'var(--accent)' : 'var(--faint)', cursor: 'pointer', outline: 'none' }}
          >
            <DotsThreeOutline size={20} weight="bold" />
            <span className="mono" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.05em' }}>More</span>
          </button>
        </nav>

        {/* Mobile More Overlay Menu */}
        {showMoreMenu && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} onClick={() => setShowMoreMenu(false)}>
            <div style={{ background: '#08070f', borderTop: '1px solid rgba(255,255,255,0.1)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 20px 34px', display: 'flex', flexDirection: 'column', gap: 10, animation: 'riseIn 0.28s cubic-bezier(0.23, 1, 0.32, 1) both' }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <span className="mono" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: 'var(--accent)' }}>MORE DEEP TOOLS</span>
                <button onClick={() => setShowMoreMenu(false)} className="flex items-center justify-center" style={{ border: 'none', background: 'rgba(255,255,255,0.06)', color: 'var(--text)', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer' }}>
                  <X size={16} weight="bold" />
                </button>
              </div>
              {[
                { screen: 'morning', label: 'Morning Briefing', desc: 'Proactive morning digest nudge' },
                { screen: 'focus', label: 'Focus Block', desc: 'Calendar handoff & timer context' },
                { screen: 'proof', label: 'Show Your Work', desc: 'Reviewed work and evidence' },
                { screen: 'memory', label: 'Memory', desc: 'Behavioral signals and history' },
                { screen: 'grounded', label: 'Sources', desc: 'Google Search grounded sources' },
              ].map((item) => {
                const active = screen === item.screen
                return (
                  <button
                    key={item.screen}
                    onClick={() => { setScreen(item.screen as Screen); setShowMoreMenu(false) }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderRadius: 14, padding: '12px 16px', background: active ? 'rgba(90,99,230,0.18)' : 'rgba(255,255,255,0.03)', border: active ? '1px solid rgba(90,99,230,0.35)' : '1px solid rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, marginBottom: 2, color: active ? 'var(--accent)' : '#fff' }}>{item.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--dim)' }}>{item.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DashboardScreen({ analytics, streak, followUp, focusBlock, grounded, top, rest, now, onEngage, onDefer, onScreen }: {
  analytics: ReturnType<typeof overviewStats>
  streak: number
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 12, marginBottom: 16 }}>
        <Metric label="follow-through" value={analytics.followThrough} tone={analytics.followThroughRaw >= 60 ? 'var(--good)' : 'var(--warn)'} />
        <Metric label="accepted proof" value={String(analytics.accepted)} tone="var(--good)" />
        <Metric label="off-task time" value={`${analytics.offTaskMinutes}m`} tone={analytics.offTaskMinutes > 0 ? 'var(--warn)' : 'var(--faint)'} />
        <Metric label="rescued" value={String(analytics.rescued)} tone="var(--accent)" />
        <Metric label={streak > 0 ? `🔥 streak` : 'streak'} value={streak > 0 ? `${streak}d` : '—'} tone={streak >= 3 ? 'var(--warn)' : streak > 0 ? 'var(--good)' : 'var(--faint)'} />
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
            <MiniPanel icon={<ShieldCheck size={18} weight="fill" />} label="Work reviews" title={`${analytics.accepted} accepted / ${analytics.partial} partial / ${analytics.rejected} rejected`} detail="Open reviewed work and evidence." tone="var(--good)" />
          </button>
          <button onClick={() => onScreen('grounded')} style={{ border: 'none', background: 'transparent', color: 'inherit', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
            <MiniPanel icon={<LinkSimple size={18} weight="bold" />} label="Sources" title={grounded ? `${grounded.sources.length} sources saved` : 'No sources yet'} detail={grounded ? grounded.task.title : 'Research-heavy plans show citations here.'} tone="var(--accent)" />
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
  const memory = timeMemory(top.task)
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
          <Chip icon={<ClockCounterClockwise size={14} />} label={memory.added} />
          <Chip icon={<HourglassMedium size={14} />} label={EFFORT_LABEL[top.task.effort]} />
          {top.task.deferralCount > 0 && <Chip icon={<ArrowUUpLeft size={14} />} label={`Dodged ${top.task.deferralCount}x`} />}
        </div>
        <div style={{ marginBottom: 18, padding: '11px 13px', borderRadius: 14, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.07)', color: 'var(--dim)', fontSize: 13.5, lineHeight: 1.45 }}>
          {memory.accountabilityLine}
        </div>
        <div className="flex items-center gap-2.5" style={{ marginBottom: 22 }}>
          <div style={{ flex: 1, height: 5, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #5A63E6, #9aa0f5)', width: `${Math.min(99, Math.max(15, Math.round(top.score)))}%` }} />
          </div>
          <span className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{Math.min(99, Math.max(15, Math.round(top.score)))}% risk</span>
        </div>
        <button onClick={() => onEngage(top.task.id)} className="btn-primary flex items-center justify-center gap-2.5" style={{ width: '100%', padding: 18, borderRadius: 16, fontSize: 16 }}>
          <span>Start — Clutch finds the fastest way in</span>
          <ArrowRight size={18} weight="bold" />
        </button>
        <button onClick={() => onDefer(top.task.id)} style={{ width: '100%', marginTop: 10, padding: 11, borderRadius: 12, border: 'none', background: 'transparent', color: 'var(--faint)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Not right now</button>
      </div>
    </div>
  )
}

function TasksScreen({ ranked, now, onEngage, onUpdateTask, hasEmail }: { ranked: ReturnType<typeof rankTasks>; now: number; onEngage: (id: string) => void; onUpdateTask: (id: string, patch: Partial<ClutchTask>) => void; hasEmail: boolean }) {
  const [nudgeDismissed, setNudgeDismissed] = useState(true)
  useEffect(() => {
    setNudgeDismissed(typeof window !== 'undefined' && localStorage.getItem('clutch_reminder_nudge_dismissed') === '1')
  }, [])
  const showNudge = !hasEmail && !nudgeDismissed && ranked.some((r) => r.task.deadline != null)
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {showNudge && (
        <div className="glass flex items-center" style={{ gap: 12, borderRadius: 16, padding: '13px 16px', border: '1px solid rgba(90,99,230,.3)' }}>
          <BellRinging size={18} weight="fill" style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.45, color: 'var(--dim)' }}>
            Want a heads-up before these slip? Add your email under <strong style={{ color: 'var(--text)' }}>Email alerts</strong> in the sidebar — CLUTCH emails you at the right time for each task.
          </div>
          <button
            onClick={() => { localStorage.setItem('clutch_reminder_nudge_dismissed', '1'); setNudgeDismissed(true) }}
            className="mono"
            style={{ flexShrink: 0, fontSize: 11, color: 'var(--faint)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            never ask again
          </button>
        </div>
      )}
      {ranked.map((r) => (
        <TaskRow key={r.task.id} ranked={r} now={now} onEngage={onEngage} onUpdateTask={onUpdateTask} hasEmail={hasEmail} />
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
      <div className="mono" style={{ color: 'var(--accent)', fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: 10 }}>Day planner</div>
      <h3 style={{ fontSize: 26, lineHeight: 1.12, fontWeight: 850, marginBottom: 10 }}>Plan today from {taskCount} active task{taskCount === 1 ? '' : 's'}.</h3>
      <p style={{ color: 'var(--dim)', lineHeight: 1.6, marginBottom: 18 }}>This runs the visible planning tool: rank the day, explain the choice, and summarize the next move.</p>
      <button onClick={onPlanDay} className="btn-primary" style={{ width: '100%', padding: 15, borderRadius: 14, marginBottom: 14 }}>
        {planning ? 'Planning today...' : 'Plan my day'}
      </button>
      {dayPlan ? (
        <div style={{ padding: 16, borderRadius: 16, background: 'rgba(0,0,0,.24)', border: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: dayPlan.functionCalled ? 'var(--good)' : 'var(--warn)', marginBottom: 8 }}>
            {dayPlan.functionCalled ? 'Planning tool verified' : 'Local plan used'}
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
        <a href={calendarFocusBlockUrl(focusBlock.task.title, focusBlock.commitment.action, Date.now(), focusBlock.commitment.durationMin)} target="_blank" rel="noreferrer" className="glass" style={{ display: 'block', borderRadius: 22, padding: 22, color: 'inherit', textDecoration: 'none' }}>
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
  const now = Date.now()
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
        {tasks.map((task) => {
          const memory = timeMemory(task, now)
          return (
            <div key={task.id} className="glass" style={{ borderRadius: 16, padding: 15 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>{task.title}</div>
              <div style={{ color: 'var(--dim)', fontSize: 13.5, lineHeight: 1.45, marginBottom: 10 }}>{memory.accountabilityLine}</div>
              <div className="flex flex-wrap gap-2">
                <Chip icon={<ClockCounterClockwise size={14} />} label={memory.lastTouched} />
                <Chip icon={<ArrowUUpLeft size={14} />} label={`${task.deferralCount} deferrals`} />
                <Chip icon={<WarningOctagon size={14} />} label={`${task.openedThenBailed} bailouts`} />
                <Chip icon={<ShieldCheck size={14} />} label={`${task.commitments.length} commitments`} />
              </div>
            </div>
          )
        })}
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
        <EmptyPanel title="No sources yet" detail={grounded ? grounded.task.title : 'Generate an action plan for an essay, study, how-to, or research task to save cited sources here.'} />
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

const LEAD_OPTIONS: { h: number; label: string }[] = [
  { h: 2, label: '2h before' },
  { h: 4, label: '4h before' },
  { h: 8, label: '8h before' },
  { h: 12, label: '12h before' },
  { h: 24, label: '1 day before' },
  { h: 48, label: '2 days before' },
  { h: 72, label: '3 days before' },
]

function TaskRow({ ranked, now, onEngage, onUpdateTask, hasEmail }: { ranked: ReturnType<typeof rankTasks>[number]; now: number; onEngage: (id: string) => void; onUpdateTask: (id: string, patch: Partial<ClutchTask>) => void; hasEmail: boolean }) {
  const dc = dotColor(ranked.score)
  const task = ranked.task
  const memory = timeMemory(task, now)
  const leadH = typeof task.alertLeadHours === 'number' && task.alertLeadHours > 0 ? task.alertLeadHours : effortLeadHours(task.effort)
  const windowStart = alertWindowStart(task)
  const reminderLabel = windowStart != null
    ? new Date(windowStart).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null
  return (
    <div
      onClick={() => onEngage(task.id)}
      className="text-left"
      style={{ padding: '16px 18px', borderRadius: 18, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', cursor: 'pointer', color: 'inherit', transition: 'background .2s, border-color .2s, transform .15s' }}
    >
      <div className="flex items-center gap-3.5">
        <div style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: dc.c, boxShadow: `0 0 10px 1px ${dc.g}` }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
          <div style={{ fontSize: 13, color: 'var(--faint)', marginTop: 3 }}>
            {deadlineLabel(task.deadline, now)} / {memory.lastTouched} / {EFFORT_LABEL[task.effort]}{task.deferralCount > 0 ? ` / dodged ${task.deferralCount}x` : ''}
          </div>
        </div>
        <div className="flex items-center gap-1.5" style={{ flexShrink: 0, color: 'rgba(90,99,230,.9)', fontSize: 13, fontWeight: 700 }}>
          <span>Start</span><ArrowRight size={15} weight="bold" />
        </div>
      </div>
      {reminderLabel && (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center" style={{ gap: 8, marginTop: 12, paddingTop: 11, borderTop: '1px solid rgba(255,255,255,.07)', flexWrap: 'wrap' }}>
          <BellRinging size={13} weight="fill" style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: 'var(--dim)', flex: 1, minWidth: 0 }}>
            {hasEmail ? 'Email reminder ' : 'Would remind you '}
            <strong style={{ color: 'var(--text)' }}>{reminderLabel}</strong>
            <span style={{ color: 'var(--faint)' }}> · Gemini estimates ~{leadH}h of runway</span>
          </span>
          <select
            aria-label="Reminder lead time"
            value={leadH}
            onChange={(e) => onUpdateTask(task.id, { alertLeadHours: Number(e.target.value) })}
            style={{ background: 'rgba(0,0,0,.25)', color: 'var(--text)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
          >
            {!LEAD_OPTIONS.some((o) => o.h === leadH) && <option value={leadH}>{leadH}h before</option>}
            {LEAD_OPTIONS.map((o) => <option key={o.h} value={o.h}>{o.label}</option>)}
          </select>
        </div>
      )}
    </div>
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
  const [speaking, setSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const stopSpeech = () => {
    audioRef.current?.pause()
    audioRef.current = null
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  // Browser SpeechSynthesis fallback — keeps the feature working even if the
  // Gemini TTS call is unavailable, so the demo never has a dead button.
  const browserSpeak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeaking(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const speakBriefing = async () => {
    if (!briefing) return
    if (speaking) {
      stopSpeech()
      return
    }
    const text = `${briefing.greeting} Top risk. ${briefing.topRisk} Start here. ${briefing.nudge}`
    setSpeaking(true)
    try {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const { audio } = (await res.json()) as { audio: string | null }
      if (audio) {
        const el = new Audio(`data:audio/wav;base64,${audio}`)
        audioRef.current = el
        el.onended = () => setSpeaking(false)
        el.onerror = () => browserSpeak(text)
        await el.play()
        return
      }
      browserSpeak(text)
    } catch {
      browserSpeak(text)
    }
  }

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px',
                borderRadius: 999, fontSize: 11, fontWeight: 600, letterSpacing: '.08em',
                background: 'rgba(90,99,230,.12)',
                border: '1px solid rgba(90,99,230,.3)',
                color: 'var(--accent)',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                Gemini 2.5
              </div>
              <div className="flex items-center" style={{ gap: 10 }}>
                <button
                  onClick={speakBriefing}
                  aria-label={speaking ? 'Stop' : 'Listen to briefing'}
                  className="inline-flex items-center"
                  style={{ gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', color: 'var(--accent)', background: 'rgba(90,99,230,.12)', border: '1px solid rgba(90,99,230,.3)' }}
                >
                  {speaking ? <SpeakerSlash size={14} weight="bold" /> : <SpeakerHigh size={14} weight="bold" />}
                  {speaking ? 'Stop' : 'Listen'}
                </button>
                <span style={{ fontSize: 11, color: 'var(--faint)' }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
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
              <div className="mono" style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>Why Clutch chose this</div>
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
