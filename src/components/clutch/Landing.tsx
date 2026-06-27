'use client'

import { ArrowRight, Brain, CalendarPlus, CheckCircle, ClockCountdown, LinkSimple, ShieldCheck, WarningOctagon } from '@phosphor-icons/react'
import type { ClutchTask, FollowThrough } from '@/lib/types'
import { rankTasks } from '@/lib/triage'
import { followUpMemory, latestFocusBlock, latestGroundedSources, overviewStats } from '@/lib/overview'

interface Props {
  tasks: ClutchTask[]
  followThrough: FollowThrough
  onStart: () => void
  onAddMore?: () => void
  onLoadDemo?: () => void
}

export function Landing({ tasks, followThrough, onStart, onAddMore, onLoadDemo }: Props) {
  const top = rankTasks(tasks, Date.now())[0]
  const stats = overviewStats(tasks, followThrough)
  const followUp = followUpMemory(tasks)
  const focusBlock = latestFocusBlock(tasks)
  const grounded = latestGroundedSources(tasks)

  return (
    <main style={{ maxWidth: 1520, margin: '0 auto', padding: '0 clamp(24px,4.8vw,72px)' }}>
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '28px 0 34px', animation: 'riseIn .7s cubic-bezier(.22,.61,.36,1) both' }}>
        <header className="flex items-center justify-between gap-4" style={{ paddingTop: 4, paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div className="flex items-center gap-3">
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px solid rgba(90,99,230,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 14px 2px rgba(90,99,230,.6)' }} />
            </div>
            <span className="mono" style={{ fontWeight: 700, letterSpacing: '.14em', fontSize: 13, textTransform: 'uppercase', color: 'rgba(243,245,244,.86)' }}>Clutch</span>
          </div>
          {onLoadDemo && (
            <button onClick={onLoadDemo} className="mono" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.045)', color: 'var(--dim)', borderRadius: 999, padding: '9px 13px', fontSize: 12, cursor: 'pointer' }}>
              load demo
            </button>
          )}
        </header>

        <section style={{ flex: 1, position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(420px,.9fr) minmax(560px,1.1fr)', gap: 'clamp(42px,6vw,110px)', alignItems: 'center', padding: '42px 0 22px' }}>
          <LightTrails />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span className="eyebrow" style={{ display: 'inline-block', marginBottom: 16 }}>AI accountability companion</span>
            <h1 className="clutch-hero-title" style={{ fontSize: 'clamp(92px,11vw,190px)', marginBottom: 30 }}>
              <span className="hero-title-white">CLU</span><span className="hero-title-blue">TCH</span>
            </h1>
            <p style={{ fontSize: 'clamp(28px,2.8vw,46px)', lineHeight: 1.12, color: 'rgba(243,245,244,.94)', maxWidth: '18ch', marginBottom: 22, fontWeight: 800 }}>
              The app that steps in before your <span style={{ color: '#5268d8', textShadow: '0 0 26px rgba(82,104,216,.32)' }}>deadline slips.</span>
            </p>
            <p style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--dim)', maxWidth: '43ch', marginBottom: 34 }}>
              Dump the mess. Clutch finds the riskiest commitment, asks what matters, starts the smallest useful move, and verifies proof before it gives you credit.
            </p>

            <div className="flex flex-wrap gap-3" style={{ marginBottom: 30 }}>
              <button onClick={onStart} className="btn-primary flex items-center justify-center gap-2.5" style={{ padding: '20px 26px', borderRadius: 14, fontSize: 17, minWidth: 232 }}>
                <span>{tasks.length > 0 ? 'Open my dashboard' : 'Start with my tasks'}</span>
                <ArrowRight size={18} weight="bold" />
              </button>
              {(onLoadDemo || onAddMore) && (
                <button onClick={onLoadDemo ?? onAddMore} className="btn-ghost flex items-center justify-center gap-2.5" style={{ padding: '20px 23px', borderRadius: 14, fontSize: 17, fontWeight: 700 }}>
                  <span>{tasks.length > 0 ? 'Add more tasks' : 'See the demo flow'}</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap" style={{ gap: 10 }}>
              {[
                ['Gemini plans', Brain],
                ['Focus timer', ClockCountdown],
                ['Proof gate', ShieldCheck],
              ].map(([label, Icon]) => (
                <div key={label as string} className="inline-flex items-center gap-2" style={{ padding: '8px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,.09)', background: 'rgba(255,255,255,.04)', color: 'var(--dim)', fontSize: 13 }}>
                  <Icon size={15} color="var(--accent)" weight="fill" />
                  <span>{label as string}</span>
                </div>
              ))}
            </div>
          </div>

          <LivePreview tasks={tasks} topTitle={top?.task.title} risk={top ? Math.min(99, Math.max(15, Math.round(top.score))) : null} stats={stats} followUp={followUp?.message} focusBlock={focusBlock?.commitment.durationMin} groundedCount={grounded?.sources.length ?? 0} />
        </section>
      </div>
    </main>
  )
}

function LightTrails() {
  const paths = [
    'M 140 330 C 260 250, 360 210, 510 245 S 790 330, 1040 260',
    'M 120 380 C 300 320, 430 285, 590 320 S 830 410, 1080 340',
    'M 155 430 C 320 390, 470 360, 625 390 S 850 485, 1095 430',
    'M 120 490 C 315 465, 455 445, 625 470 S 860 555, 1110 520',
    'M 165 550 C 350 540, 515 520, 670 540 S 890 620, 1110 610',
    'M 235 285 C 405 245, 515 235, 660 265 S 845 300, 1050 215',
    'M 230 610 C 400 615, 530 600, 685 615 S 900 690, 1090 710',
    'M 175 350 C 360 350, 485 385, 635 420 S 860 435, 1110 370',
    'M 210 470 C 385 430, 500 405, 650 425 S 900 505, 1115 475',
  ]
  const nodes = [
    [470, 248, '#72b7ff', 3],
    [610, 319, '#78c8ff', 4],
    [735, 390, '#e0b15a', 5],
    [865, 490, '#7bbcff', 3],
    [520, 544, '#6d7cff', 3],
    [980, 338, '#81d7ff', 3],
    [1035, 608, '#e0b15a', 4],
  ] as const
  return (
    <div className="hero-mesh" aria-hidden="true">
      <svg viewBox="0 0 1200 760" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <radialGradient id="meshCore" cx="55%" cy="48%" r="52%">
            <stop offset="0%" stopColor="rgba(82,142,255,.32)" />
            <stop offset="48%" stopColor="rgba(90,99,230,.18)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <linearGradient id="meshBlue" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="rgba(54,101,255,0)" />
            <stop offset="24%" stopColor="rgba(62,112,255,.2)" />
            <stop offset="52%" stopColor="rgba(80,190,255,.92)" />
            <stop offset="78%" stopColor="rgba(107,91,255,.64)" />
            <stop offset="100%" stopColor="rgba(54,101,255,0)" />
          </linearGradient>
          <linearGradient id="meshViolet" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="rgba(89,78,255,0)" />
            <stop offset="38%" stopColor="rgba(105,91,255,.58)" />
            <stop offset="66%" stopColor="rgba(195,105,255,.72)" />
            <stop offset="100%" stopColor="rgba(89,78,255,0)" />
          </linearGradient>
          <linearGradient id="meshAmber" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="rgba(224,177,90,0)" />
            <stop offset="48%" stopColor="rgba(224,177,90,.18)" />
            <stop offset="70%" stopColor="rgba(224,177,90,.78)" />
            <stop offset="100%" stopColor="rgba(224,177,90,0)" />
          </linearGradient>
          <filter id="meshGlow" x="-35%" y="-80%" width="170%" height="260%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.25 0 0 0 0 0.45 0 0 0 0 1 0 0 0 .9 0" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="nodeGlow" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="0" y="0" width="1200" height="760" fill="url(#meshCore)" opacity=".78" />
        <g filter="url(#meshGlow)">
          {paths.map((d, i) => (
            <path
              key={d}
              d={d}
              className="mesh-path"
              pathLength="100"
              stroke={i % 5 === 2 ? 'url(#meshAmber)' : i % 3 === 1 ? 'url(#meshViolet)' : 'url(#meshBlue)'}
              strokeWidth={i % 4 === 0 ? 2.4 : 1.45}
              strokeLinecap="round"
              fill="none"
              opacity={i % 5 === 2 ? .78 : .88}
              style={{ animationDelay: `${i * -0.7}s` }}
            />
          ))}
        </g>
        <g filter="url(#nodeGlow)">
          {nodes.map(([cx, cy, fill, r], i) => (
            <circle key={`${cx}-${cy}`} className="mesh-node" cx={cx} cy={cy} r={r} fill={fill} opacity=".95" style={{ animationDelay: `${i * -.5}s` }} />
          ))}
        </g>
      </svg>
    </div>
  )
}

function LivePreview({ tasks, topTitle, risk, stats, followUp, focusBlock, groundedCount }: { tasks: ClutchTask[]; topTitle?: string; risk: number | null; stats: ReturnType<typeof overviewStats>; followUp?: string; focusBlock?: number; groundedCount: number }) {
  const hasData = tasks.length > 0
  return (
    <div style={{ position: 'relative', zIndex: 1, perspective: 1400 }}>
      <div className="glass" style={{ borderRadius: 30, padding: 24, minHeight: 530, transform: 'rotateY(-11deg) rotateZ(1.5deg)', transformOrigin: 'center', background: 'linear-gradient(135deg, rgba(255,255,255,.07), rgba(255,255,255,.035))', border: '1px solid rgba(111,132,255,.28)', boxShadow: '0 42px 120px -42px rgba(0,0,0,.9), 0 0 95px -34px rgba(90,99,230,.95), inset 0 1px 0 rgba(255,255,255,.08)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <div>
            <div className="mono" style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 5 }}>Live overview</div>
            <div style={{ fontSize: 21, fontWeight: 800 }}>{hasData ? 'Your rescue dashboard' : 'No tasks yet'}</div>
          </div>
          <div className="mono" style={{ color: risk ? 'var(--warn)' : 'var(--faint)', fontSize: 13 }}>{risk ? `${risk}% risk` : 'waiting'}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, marginBottom: 13 }}>
          <PreviewMetric label="follow" value={stats.followThrough} />
          <PreviewMetric label="proof" value={String(stats.accepted)} />
          <PreviewMetric label="off-task" value={`${stats.offTaskMinutes}m`} />
          <PreviewMetric label="rescued" value={String(stats.rescued)} />
        </div>

        <div style={{ borderRadius: 18, border: '1px solid rgba(90,99,230,.22)', background: 'rgba(90,99,230,.075)', padding: 15, marginBottom: 12 }}>
          <div className="flex items-center gap-2" style={{ color: 'var(--accent)', marginBottom: 8 }}>
            <WarningOctagon size={16} weight="fill" />
            <span className="mono" style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase' }}>Most likely to blow up</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.25, marginBottom: 7 }}>{topTitle ?? 'Brain-dump to generate your risk map'}</div>
          <div style={{ color: 'var(--dim)', fontSize: 13.5, lineHeight: 1.45 }}>{hasData ? 'Ranked from deadlines, deferrals, bailouts, and commitment history.' : 'CLUTCH will rank real tasks once you add them.'}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <PreviewPanel icon={<Brain size={16} weight="fill" />} label="Gemini plan" title="Function call ready" />
          <PreviewPanel icon={<LinkSimple size={16} weight="bold" />} label="Grounded refs" title={groundedCount ? `${groundedCount} saved sources` : 'Shown after Search grounding'} />
          <PreviewPanel icon={<ClockCountdown size={16} weight="fill" />} label="Focus timer" title={focusBlock ? `${focusBlock} min calendar handoff` : 'Add block on commit'} />
          <PreviewPanel icon={<ShieldCheck size={16} weight="fill" />} label="Proof gate" title={`${stats.accepted}/${stats.partial}/${stats.rejected} verdicts`} />
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 12 }}>
          <div className="flex items-center gap-2.5" style={{ color: followUp ? 'var(--warn)' : 'var(--good)', fontSize: 13.5, fontWeight: 700 }}>
            {followUp ? <CalendarPlus size={17} weight="bold" /> : <CheckCircle size={18} weight="fill" />}
            <span>{followUp ?? 'No proof, no fake completion.'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderRadius: 12, background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.07)', padding: '9px 8px' }}>
      <div className="mono" style={{ fontSize: 9.5, color: 'var(--faint)', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: 'rgba(243,245,244,.92)' }}>{value}</div>
    </div>
  )
}

function PreviewPanel({ icon, label, title }: { icon: React.ReactNode; label: string; title: string }) {
  return (
    <div style={{ borderRadius: 14, background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.075)', padding: 11 }}>
      <div className="flex items-center gap-2" style={{ color: 'var(--accent)', marginBottom: 7 }}>
        {icon}
        <span className="mono" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.35, color: 'var(--dim)' }}>{title}</div>
    </div>
  )
}
