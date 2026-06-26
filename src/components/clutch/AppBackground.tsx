'use client'

import { SilkCanvas } from '@/components/ui/silk-background-animation'

/** Fixed atmospheric backdrop: animated silk canvas dimmed under two scrims. */
export function AppBackground() {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.4 }}>
        <SilkCanvas />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 0%, rgba(8,12,13,.18) 0%, rgba(8,12,13,.52) 55%, rgba(6,9,10,.8) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,10,11,.55) 0%, rgba(7,10,11,0) 22%, rgba(7,10,11,0) 78%, rgba(7,10,11,.72) 100%)' }} />
    </div>
  )
}
