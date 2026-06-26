'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Capture } from '@/components/clutch/Capture'
import { Briefing } from '@/components/clutch/Briefing'
import { Engage } from '@/components/clutch/Engage'
import { AppBackground } from '@/components/clutch/AppBackground'
import { loadClutchState, saveClutchState } from '@/lib/store'
import { fromParsed } from '@/lib/task'
import { createDemoState } from '@/lib/demo'
import type { ClutchTask, ParsedTask, FollowThrough } from '@/lib/types'

type View = 'capture' | 'briefing' | 'engage'

export default function Home() {
  const [view, setView] = useState<View>('briefing')
  const [tasks, setTasks] = useState<ClutchTask[]>([])
  const [followThrough, setFollowThrough] = useState<FollowThrough>({ committed: 0, completed: 0 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const state = loadClutchState()
    setTasks(state.tasks)
    setFollowThrough(state.followThrough)
    setView(state.tasks.length === 0 ? 'capture' : 'briefing')
    setReady(true)
  }, [])

  const persist = (next: ClutchTask[], nextFollowThrough = followThrough) => {
    setTasks(next)
    saveClutchState(next, nextFollowThrough)
  }

  const persistFollowThrough = (next: FollowThrough) => {
    setFollowThrough(next)
    saveClutchState(tasks, next)
  }

  const handleParsed = (parsed: ParsedTask[]) => {
    const next = [...tasks, ...parsed.map(fromParsed)]
    persist(next)
    setView('briefing')
  }

  const handleLoadDemo = () => {
    if (tasks.length > 0) return
    const demo = createDemoState()
    setFollowThrough(demo.followThrough)
    persist(demo.tasks, demo.followThrough)
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
          {view === 'capture' && (
            <motion.div key="capture" exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              <Capture
                hasExisting={tasks.length > 0}
                onParsed={handleParsed}
                onLoadDemo={tasks.length === 0 ? handleLoadDemo : undefined}
                onCancel={tasks.length > 0 ? () => setView('briefing') : undefined}
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
