'use client'

import { useState, useRef } from 'react'
import { ArrowRight, Brain, CalendarPlus, CheckCircle, ClockCountdown, Crosshair, LinkSimple, MagnifyingGlass, ShieldCheck, WarningOctagon } from '@phosphor-icons/react'
import type { ClutchTask, FollowThrough } from '@/lib/types'
import { rankTasks } from '@/lib/triage'
import { followUpMemory, latestFocusBlock, latestGroundedSources, overviewStats } from '@/lib/overview'
import { HeroMesh } from './HeroMesh'

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

  const handleDemoClick = () => {
    if (tasks.length > 0) {
      const ok = window.confirm('This will replace your current tasks with the demo. Continue?')
      if (!ok) return
    }
    onLoadDemo?.()
  }

  return (
    <main style={{ maxWidth: 1600, margin: '0 auto', padding: '0 clamp(20px,3.2vw,48px)' }}>
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '24px 0 28px', animation: 'riseIn .7s cubic-bezier(.22,.61,.36,1) both' }}>
        <header className="flex items-center justify-between gap-4" style={{ paddingTop: 4, paddingBottom: 18, position: 'relative', zIndex: 10 }}>
          <div className="flex items-center gap-3">
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px solid rgba(90,99,230,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 14px 2px rgba(90,99,230,.6)' }} />
            </div>
            <span className="mono" style={{ fontWeight: 700, letterSpacing: '.14em', fontSize: 13, textTransform: 'uppercase', color: 'rgba(243,245,244,.86)' }}>Clutch</span>
          </div>
          {onLoadDemo && (
            <button onClick={handleDemoClick} className="mono" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.045)', color: 'var(--dim)', borderRadius: 999, padding: '9px 13px', fontSize: 12, cursor: 'pointer', position: 'relative', zIndex: 20 }}>
              load demo
            </button>
          )}
        </header>

        <section className="hero-section-grid" style={{ flex: 1, position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(500px,.82fr) minmax(650px,1.08fr)', gap: 'clamp(74px,6vw,112px)', alignItems: 'center', padding: '10px 0 14px' }}>
          <HeroMesh />
          <div style={{ position: 'relative', zIndex: 2, paddingTop: 10, transform: 'translateY(-36px)' }}>
            <span className="eyebrow" style={{ display: 'inline-block', marginBottom: 16 }}>AI accountability companion</span>
            <h1 className="clutch-hero-title" style={{ fontSize: 'clamp(54px,7.5vw,134px)', marginBottom: 18 }}>
              CLUTCH
            </h1>
            <p style={{ fontSize: 'clamp(28px,2.25vw,42px)', lineHeight: 1.16, color: 'rgba(243,245,244,.9)', maxWidth: '20ch', marginBottom: 20, fontWeight: 500, letterSpacing: 0 }}>
              The app that steps in before your <span style={{ color: '#4f83ff', textShadow: '0 0 24px rgba(0,136,255,.38)' }}>deadline slips.</span>
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: 'rgba(243,245,244,.62)', maxWidth: '46ch', marginBottom: 34 }}>
              Plan with clarity, then prove you did it. <strong style={{ color: 'rgba(243,245,244,.94)', fontWeight: 700 }}>You can&apos;t lie to CLUTCH</strong> — it won&apos;t let you check a box without evidence. Show the work, or it doesn&apos;t count.
            </p>

            <div className="flex flex-wrap gap-3" style={{ marginBottom: 30 }}>
              {tasks.length > 0 ? (
                <>
                  <button onClick={onStart} className="btn-primary flex items-center justify-center gap-2.5" style={{ padding: '20px 26px', borderRadius: 14, fontSize: 17, minWidth: 232 }}>
                    <span>Open my dashboard</span>
                    <ArrowRight size={18} weight="bold" />
                  </button>
                  {onLoadDemo && (
                    <button onClick={handleDemoClick} className="btn-ghost flex items-center justify-center gap-2.5" style={{ padding: '20px 23px', borderRadius: 14, fontSize: 17, fontWeight: 700 }}>
                      <span>Reset &amp; see demo</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  {onLoadDemo && (
                    <button onClick={handleDemoClick} className="btn-primary flex items-center justify-center gap-2.5" style={{ padding: '20px 26px', borderRadius: 14, fontSize: 17, minWidth: 232 }}>
                      <span>See the live demo</span>
                      <ArrowRight size={18} weight="bold" />
                    </button>
                  )}
                  <button onClick={onStart} className="btn-ghost flex items-center justify-center gap-2.5" style={{ padding: '20px 23px', borderRadius: 14, fontSize: 17, fontWeight: 700 }}>
                    <span>Start with my tasks</span>
                  </button>
                </>
              )}
            </div>

            <div className="hero-feature-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 0, maxWidth: 620 }}>
              {[
                ['Follow-up memory', 'Picks up where you left off', CheckCircle],
                ['Risk detection', "Flags what's most likely to slip", Crosshair],
                ['Gemini planning', 'Function-calling for day plans', Brain],
                ['Grounded answers', 'Backed by real sources', MagnifyingGlass],
                ['Proof that counts', 'Accepted, partial, or rejected', ShieldCheck],
              ].map(([label, detail, Icon]) => (
                <div key={label as string} className="hero-feature">
                  <Icon size={28} color="#7f93ff" weight="regular" />
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(243,245,244,.82)', marginTop: 8 }}>{label as string}</div>
                  <div style={{ fontSize: 12, lineHeight: 1.35, color: 'rgba(243,245,244,.48)', marginTop: 4 }}>{detail as string}</div>
                </div>
              ))}
            </div>

            <div className="mono" style={{ marginTop: 24, fontSize: 11, lineHeight: 1.65, color: 'rgba(243,245,244,.42)', maxWidth: '54ch', letterSpacing: '.02em' }}>
              6 named Gemini agents on a deterministic spine · every model call has retries, a 22s timeout, multi-key failover, and a local fallback — so the core loop never hard-fails.
            </div>
          </div>

          <LivePreview tasks={tasks} topTitle={top?.task.title} risk={top ? Math.min(99, Math.max(15, Math.round(top.score))) : null} stats={stats} followUp={followUp?.message} focusBlock={focusBlock?.commitment.durationMin} groundedCount={grounded?.sources.length ?? 0} />
        </section>
      </div>
    </main>
  )
}

function LivePreview({ tasks, topTitle, risk, stats, followUp, focusBlock, groundedCount }: { tasks: ClutchTask[]; topTitle?: string; risk: number | null; stats: ReturnType<typeof overviewStats>; followUp?: string; focusBlock?: number; groundedCount: number }) {
  const hasData = tasks.length > 0
  const [isHovered, setIsHovered] = useState(false)
  const [showNotice, setShowNotice] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setCoords({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      onClick={() => setShowNotice(true)}
      className="hero-dashboard-wrap"
      style={{ position: 'relative', zIndex: 1, perspective: 1500, transform: 'translateY(-46px)', cursor: 'default' }}
    >
      <div className="glass hero-dashboard" style={{ borderRadius: 18, minHeight: 650, transform: 'rotateY(-8.5deg) rotateZ(1.05deg)', transformOrigin: 'center', background: 'linear-gradient(135deg, rgba(4,9,18,.86), rgba(2,5,12,.72))', border: '1px solid rgba(150,170,210,.3)', boxShadow: '0 48px 140px -46px rgba(0,0,0,1), 0 0 90px -50px rgba(0,136,255,.7), inset 0 1px 0 rgba(255,255,255,.08)', overflow: 'hidden', display: 'grid', gridTemplateColumns: '148px minmax(0,1fr)' }}>
        <aside style={{ borderRight: '1px solid rgba(255,255,255,.08)', padding: '22px 16px', display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(0,0,0,.26)' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid rgba(77,200,255,.7)', display: 'grid', placeItems: 'center' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
            </div>
            <span className="mono" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em' }}>CLUTCH</span>
          </div>
          {['Dashboard', 'My Tasks', 'Brain Dump', 'Day Plan', 'Focus Timer', 'Show Your Work', 'Memory', 'Sources'].map((item, index) => (
            <div key={item} style={{ borderRadius: 8, padding: '8px 10px', background: index === 0 ? 'rgba(0,88,255,.38)' : 'transparent', color: index === 0 ? '#fff' : 'rgba(243,245,244,.62)', fontSize: 12, fontWeight: 700 }}>
              {item}
            </div>
          ))}
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(243,245,244,.58)', fontSize: 11 }}>
            <div style={{ width: 25, height: 25, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.08)' }}>AS</div>
            <span>Alex Smith</span>
          </div>
        </aside>
        <div style={{ padding: 24 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>{hasData ? 'Good evening, Alex' : 'Your rescue dashboard'}</div>
              <div style={{ color: 'var(--dim)', fontSize: 12 }}>Here&apos;s your accountability snapshot.</div>
            </div>
            <div className="mono" style={{ color: risk ? 'var(--warn)' : 'var(--faint)', fontSize: 13 }}>{risk ? `${risk}% risk` : 'waiting'}</div>
          </div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(243,245,244,.66)', marginBottom: 8 }}>Accountability Dashboard</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginBottom: 13 }}>
          <PreviewMetric label="follow" value={stats.followThrough} />
          <PreviewMetric label="proof" value={String(stats.accepted)} />
          <PreviewMetric label="off-task" value={`${stats.offTaskMinutes}m`} />
          <PreviewMetric label="rescued" value={String(stats.rescued)} />
        </div>

        <div style={{ borderRadius: 13, border: '1px solid rgba(224,177,90,.45)', background: 'rgba(224,177,90,.055)', padding: 15, marginBottom: 12 }}>
          <div className="flex items-center gap-2" style={{ color: 'var(--accent)', marginBottom: 8 }}>
            <WarningOctagon size={16} weight="fill" />
            <span className="mono" style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase' }}>Most likely to blow up</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.25, marginBottom: 7 }}>{topTitle ?? 'Brain-dump to generate your risk map'}</div>
          <div style={{ color: 'var(--dim)', fontSize: 13.5, lineHeight: 1.45 }}>{hasData ? 'Ranked from deadlines, deferrals, bailouts, and commitment history.' : 'CLUTCH will rank real tasks once you add them.'}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <PreviewPanel icon={<Brain size={16} weight="fill" />} label="Gemini plan" title="Function call ready" />
          <PreviewPanel icon={<LinkSimple size={16} weight="bold" />} label="Sources" title={groundedCount ? `${groundedCount} saved sources` : 'Shown after source lookup'} />
          <PreviewPanel icon={<ClockCountdown size={16} weight="fill" />} label="Focus timer" title={focusBlock ? `${focusBlock} min calendar handoff` : 'Add block on commit'} />
          <PreviewPanel icon={<ShieldCheck size={16} weight="fill" />} label="Show work" title={`${stats.accepted}/${stats.partial}/${stats.rejected} verdicts`} />
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 12 }}>
          <div className="flex items-center gap-2.5" style={{ color: followUp ? 'var(--warn)' : 'var(--good)', fontSize: 13.5, fontWeight: 700 }}>
            {followUp ? <CalendarPlus size={17} weight="bold" /> : <CheckCircle size={18} weight="fill" />}
            <span>{followUp ?? 'No proof, no fake completion.'}</span>
          </div>
        </div>
        </div>
      </div>

      {(isHovered || showNotice) && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate3d(${coords.x}px, ${coords.y - 12}px, 0) translate(-50%, -100%)`,
            pointerEvents: 'none',
            background: 'rgba(8, 7, 15, 0.94)',
            border: '1.5px solid rgba(90, 99, 230, 0.6)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 0 15px rgba(90, 99, 230, 0.25)',
            backdropFilter: 'blur(8px)',
            padding: '10px 14px',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '11.5px',
            fontFamily: 'var(--font-code)',
            whiteSpace: 'nowrap',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'stepIn .18s cubic-bezier(.22,.61,.36,1) both'
          }}
        >
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px rgba(90, 99, 230, 0.8)', animation: 'pulse-ring 1.5s infinite' }} />
          <span>Preview only &bull; Open the real app: <strong>See the live demo</strong> or <strong>Start with my tasks</strong></span>

        </div>
      )}
      <div style={{ position: 'absolute', top: 10, right: 18, zIndex: 60, pointerEvents: 'none', background: 'rgba(8,7,15,.82)', border: '1px solid rgba(150,170,210,.4)', borderRadius: 999, padding: '4px 11px', fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(243,245,244,.72)', fontFamily: 'var(--font-code)' }}>Preview</div>
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
