'use client'

import { ArrowRight, Brain, CheckCircle, ClockCountdown, ShieldCheck } from '@phosphor-icons/react'

interface Props {
  onStart: () => void
  onLoadDemo?: () => void
}

export function Landing({ onStart, onLoadDemo }: Props) {
  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '0 clamp(20px,4vw,56px)' }}>
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

        <section style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(320px,.95fr)', gap: 'clamp(34px,5vw,78px)', alignItems: 'center', padding: '34px 0 20px' }}>
          <div>
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
                <span>Start with my tasks</span>
                <ArrowRight size={18} weight="bold" />
              </button>
              {onLoadDemo && (
                <button onClick={onLoadDemo} className="btn-ghost flex items-center justify-center gap-2.5" style={{ padding: '17px 18px', borderRadius: 16, fontSize: 16, fontWeight: 700 }}>
                  <span>See the demo flow</span>
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

          <div className="glass" style={{ borderRadius: 24, padding: 22, alignSelf: 'center' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
              <div>
                <div className="mono" style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 5 }}>Live rescue preview</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Finish hackathon submission</div>
              </div>
              <div className="mono" style={{ color: 'var(--warn)', fontSize: 13 }}>99% risk</div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', borderBottom: '1px solid rgba(255,255,255,.08)', padding: '16px 0', marginBottom: 16 }}>
              {[
                ['Observe', '3 deferrals, 2 bailouts, deadline in hours.'],
                ['Generate', 'Draft the exact first artifact, with grounded references.'],
                ['Commit', 'Start a timer and watch for tab departures.'],
                ['Verify', 'Accept, partial, or reject proof for this task.'],
              ].map(([label, detail], i) => (
                <div key={label} className="flex gap-3" style={{ alignItems: 'flex-start', marginTop: i === 0 ? 0 : 13 }}>
                  <span className="mono" style={{ width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(90,99,230,.14)', color: 'var(--accent)', fontSize: 11, flexShrink: 0 }}>{i + 1}</span>
                  <div>
                    <div className="mono" style={{ fontSize: 12, color: 'rgba(243,245,244,.88)', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--dim)' }}>{detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2.5" style={{ color: 'var(--good)', fontSize: 14, fontWeight: 700 }}>
              <CheckCircle size={18} weight="fill" />
              <span>No proof, no fake completion.</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
