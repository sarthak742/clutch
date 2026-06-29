'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Landing } from '@/components/clutch/Landing'
import { Capture } from '@/components/clutch/Capture'
import { Briefing } from '@/components/clutch/Briefing'
import { Engage } from '@/components/clutch/Engage'
import { AppBackground } from '@/components/clutch/AppBackground'
import { loadClutchState, saveClutchState } from '@/lib/store'
import { fromParsed } from '@/lib/task'
import { createDemoState } from '@/lib/demo'
import type { ClutchTask, ParsedTask, FollowThrough } from '@/lib/types'

type View = 'landing' | 'capture' | 'briefing' | 'engage'

export default function Home() {
  const [view, setView] = useState<View>('landing')
  const [tasks, setTasks] = useState<ClutchTask[]>([])
  const [followThrough, setFollowThrough] = useState<FollowThrough>({ committed: 0, completed: 0 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const state = loadClutchState()
    setTasks(state.tasks)
    setFollowThrough(state.followThrough)
    setView('landing')
    setReady(true)
  }, [])

  const persist = (next: ClutchTask[], nextFollowThrough = followThrough) => {
    setTasks(next)
    // Never persist demo data to localStorage
    if (next.some((t) => t.id.startsWith('demo-'))) return
    saveClutchState(next, nextFollowThrough)
  }

  const persistFollowThrough = (next: FollowThrough) => {
    setFollowThrough(next)
    saveClutchState(tasks, next)
  }

  const handleParsed = (parsed: ParsedTask[]) => {
    // If demo tasks are active, replace them with the real parsed tasks instead of mixing
    const nonDemoTasks = tasks.filter((t) => !t.id.startsWith('demo-'))
    const next = [...nonDemoTasks, ...parsed.map(fromParsed)]
    persist(next)
    if (isDemoLoaded) {
      // Also reset follow-through so demo stats don't bleed into real session
      setFollowThrough({ committed: 0, completed: 0 })
    }
    setView('briefing')
  }


  const isDemoLoaded = tasks.some((t) => t.id.startsWith('demo-'))

  const handleLoadDemo = (force = false) => {
    if (!force && (tasks.length > 0 || isDemoLoaded)) return
    const demo = createDemoState()
    // Demo is in-memory only — never saved to localStorage
    setFollowThrough(demo.followThrough)
    setTasks(demo.tasks)
    setView('briefing')
  }

  const handleDefer = (id: string) => {
    persist(
      tasks.map((t) =>
        t.id === id ? { ...t, deferralCount: t.deferralCount + 1, lastTouched: Date.now() } : t,
      ),
    )
  }

  const handleEngage = (id: string) => {
    persist(tasks.map((t) => (t.id === id ? { ...t, lastTouched: Date.now() } : t)))
    setSelectedId(id)
    setView('engage')
  }

  const updateTask = (id: string, patch: Partial<ClutchTask>) => {
    persist(tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  const selected = tasks.find((t) => t.id === selectedId) ?? null

  if (!ready) return null

  return (
    <>
      <AppBackground />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div key="landing" exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              <Landing
                tasks={tasks}
                followThrough={followThrough}
                onStart={() => setView(tasks.length > 0 ? 'briefing' : 'capture')}
                onAddMore={tasks.length > 0 ? () => setView('capture') : undefined}
                onLoadDemo={() => handleLoadDemo(true)}
              />
            </motion.div>
          )}

          {view === 'capture' && (
            <motion.div key="capture" exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              <Capture
                hasExisting={tasks.length > 0}
                onParsed={handleParsed}
                existingTitles={tasks.filter((t) => !t.id.startsWith('demo-')).map((t) => t.title)}
                onLoadDemo={() => handleLoadDemo(true)}
                onCancel={tasks.length > 0 ? () => setView('briefing') : () => setView('landing')}
              />
            </motion.div>
          )}

          {view === 'briefing' && (
            <motion.div key="briefing" exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              <Briefing
                tasks={tasks}
                followThrough={followThrough}
                onEngage={handleEngage}
                onDefer={handleDefer}
                onAddMore={() => setView('capture')}
                onLoadDemo={() => handleLoadDemo(true)}
              />
            </motion.div>
          )}

          {view === 'engage' && selected && (
            <motion.div key="engage" exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              <Engage
                task={selected}
                followThrough={followThrough}
                onUpdateTask={updateTask}
                onFollowThrough={persistFollowThrough}
                onBack={() => setView('briefing')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
