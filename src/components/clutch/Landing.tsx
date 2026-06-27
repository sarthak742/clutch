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
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '0 clamp(20px,4vw,56px)' }}>
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '30px 0 34px', animation: 'riseIn .7s cubic-bezier(.22,.61,.36,1) both' }}>
        <header className="flex items-center justify-between gap-4" style={{ paddingTop: 8 }}>
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

        <section style={{ flex: 1, position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0,.92fr) minmax(360px,1.08fr)', gap: 'clamp(34px,5vw,82px)', alignItems: 'center', padding: '34px 0 20px' }}>
          <LightTrails />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span className="eyebrow" style={{ display: 'inline-block', marginBottom: 16 }}>AI accountability companion</span>
            <h1 className="serif" style={{ fontWeight: 400, fontSize: 'clamp(58px,8vw,112px)', lineHeight: .92, letterSpacing: 0, marginBottom: 24 }}>
              CLUTCH
            </h1>
            <p style={{ fontSize: 'clamp(21px,2.2vw,30px)', lineHeight: 1.22, color: 'rgba(243,245,244,.9)', maxWidth: '18ch', marginBottom: 18 }}>
              The app that steps in before your deadline slips.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--dim)', maxWidth: '39ch', marginBottom: 28 }}>
              Dump the mess. Clutch finds the riskiest commitment, asks what matters, starts the smallest useful move, and verifies proof before it gives you credit.
            </p>

            <div className="flex flex-wrap gap-3" style={{ marginBottom: 24 }}>
              <button onClick={onStart} className="btn-primary flex items-center justify-center gap-2.5" style={{ padding: '17px 20px', borderRadius: 16, fontSize: 16 }}>
                <span>{tasks.length > 0 ? 'Open my dashboard' : 'Start with my tasks'}</span>
                <ArrowRight size={18} weight="bold" />
              </button>
              {(onLoadDemo || onAddMore) && (
                <button onClick={onLoadDemo ?? onAddMore} className="btn-ghost flex items-center justify-center gap-2.5" style={{ padding: '17px 18px', borderRadius: 16, fontSize: 16, fontWeight: 700 }}>
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
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: '-8% -4% -2% 18%', zIndex: 0, pointerEvents: 'none', opacity: .9 }}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${i * 5}%`,
            top: `${28 + i * 7}%`,
            width: '72%',
            height: 2,
            borderRadius: 999,
            background: `linear-gradient(90deg, transparent, rgba(${i % 2 ? '90,99,230' : '88,185,255'},.1), rgba(${i % 2 ? '90,99,230' : '88,185,255'},.72), rgba(224,177,90,.52), transparent)`,
            transform: `rotate(${i % 2 ? -9 : 7}deg) skewX(-18deg)`,
            filter: 'blur(.2px)',
            boxShadow: '0 0 20px rgba(90,99,230,.35)',
            animation: `trailDrift ${9 + i}s ease-in-out infinite`,
            animationDelay: `${i * -.9}s`,
          }}
        />
      ))}
    </div>
  )
}

function LivePreview({ tasks, topTitle, risk, stats, followUp, focusBlock, groundedCount }: { tasks: ClutchTask[]; topTitle?: string; risk: number | null; stats: ReturnType<typeof overviewStats>; followUp?: string; focusBlock?: number; groundedCount: number }) {
  const hasData = tasks.length > 0
  return (
    <div style={{ position: 'relative', zIndex: 1, perspective: 1200 }}>
      <div className="glass" style={{ borderRadius: 26, padding: 20, transform: 'rotateY(-8deg) rotateZ(1deg)', transformOrigin: 'center', boxShadow: '0 34px 90px -36px rgba(0,0,0,.85), 0 0 70px -34px rgba(90,99,230,.95)' }}>
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
