import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import AnimatedBackground from './components/AnimatedBackground'
import Nav from './components/Nav'
import SlideNavigator, { type SlideMeta } from './components/SlideNavigator'
import Hero from './sections/Hero'
import WhatIsGenieCode from './sections/WhatIsGenieCode'
import DataAndOutcome from './sections/DataAndOutcome'
import AIDevKit from './sections/AIDevKit'
import DemoScenario from './sections/DemoScenario'
import DemoSteps from './sections/DemoSteps'
import CustomerProfiles from './sections/CustomerProfiles'
import Roadmap from './sections/Roadmap'
import CTA from './sections/CTA'

type Slide = SlideMeta & { Component: () => JSX.Element }

const SLIDES: Slide[] = [
  { id: 'top', label: 'Intro', Component: Hero },
  { id: 'genie', label: 'Genie Code', Component: WhatIsGenieCode },
  { id: 'devkit', label: 'AI Dev Kit', Component: AIDevKit },
  { id: 'brief', label: 'The brief', Component: DataAndOutcome },
  { id: 'scenario', label: 'Architecture', Component: DemoScenario },
  { id: 'prompts', label: '10 Prompts', Component: DemoSteps },
  { id: 'profiles', label: 'Profiles', Component: CustomerProfiles },
  { id: 'roadmap', label: 'Roadmap', Component: Roadmap },
  { id: 'cta', label: 'Get started', Component: CTA },
]

const slideMetas: SlideMeta[] = SLIDES.map(({ id, label }) => ({ id, label }))

function indexFromHash(): number {
  const hash = window.location.hash.slice(1)
  const idx = SLIDES.findIndex((s) => s.id === hash)
  return idx >= 0 ? idx : 0
}

export default function App() {
  const [{ active, direction }, setState] = useState(() => ({
    active: indexFromHash(),
    direction: 1,
  }))

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, idx))
    setState((prev) => {
      if (clamped === prev.active) return prev
      const newHash = `#${SLIDES[clamped].id}`
      if (window.location.hash !== newHash) {
        history.replaceState(null, '', newHash)
      }
      return { active: clamped, direction: clamped > prev.active ? 1 : -1 }
    })
  }

  // Keyboard navigation: arrow keys, PageUp/Down, Home/End. We ignore the
  // event when an editable element has focus so typing in the catalog
  // input or any future input still works as expected.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t) {
        const tag = t.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable) return
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        setState((prev) => {
          const next = Math.min(SLIDES.length - 1, prev.active + 1)
          if (next === prev.active) return prev
          history.replaceState(null, '', `#${SLIDES[next].id}`)
          return { active: next, direction: 1 }
        })
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        setState((prev) => {
          const next = Math.max(0, prev.active - 1)
          if (next === prev.active) return prev
          history.replaceState(null, '', `#${SLIDES[next].id}`)
          return { active: next, direction: -1 }
        })
      } else if (e.key === 'Home') {
        e.preventDefault()
        setState({ active: 0, direction: -1 })
        history.replaceState(null, '', `#${SLIDES[0].id}`)
      } else if (e.key === 'End') {
        e.preventDefault()
        const last = SLIDES.length - 1
        setState({ active: last, direction: 1 })
        history.replaceState(null, '', `#${SLIDES[last].id}`)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Listen for hash changes (Nav links use href="#id"). When the hash
  // changes, jump to the matching slide.
  useEffect(() => {
    const onHash = () => {
      const idx = indexFromHash()
      setState((prev) => {
        if (idx === prev.active) return prev
        return { active: idx, direction: idx > prev.active ? 1 : -1 }
      })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const ActiveSlide = SLIDES[active].Component

  return (
    <>
      <AnimatedBackground />
      <Nav />
      <main className="relative h-screen overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={active}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 overflow-y-auto pt-0"
          >
            <ActiveSlide />
          </motion.div>
        </AnimatePresence>
      </main>
      <SlideNavigator slides={slideMetas} active={active} onGoto={goTo} />
    </>
  )
}

const slideVariants = {
  enter: (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60 }),
}
