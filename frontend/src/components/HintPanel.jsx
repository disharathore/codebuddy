import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, FileCode, Wrench, ChevronRight, Loader2, Lock } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { streamHint } from '../utils/api.js'
import toast from 'react-hot-toast'

const LEVELS = [
  {
    level: 1,
    icon: Lightbulb,
    name: 'Conceptual',
    subtext: 'The core idea',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/25',
    activeBorder: 'border-amber-400/60',
    glow: 'shadow-amber-400/10',
    ringColor: 'ring-amber-400/30',
  },
  {
    level: 2,
    icon: FileCode,
    name: 'Pseudocode',
    subtext: 'Step-by-step logic',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/25',
    activeBorder: 'border-blue-400/60',
    glow: 'shadow-blue-400/10',
    ringColor: 'ring-blue-400/30',
  },
  {
    level: 3,
    icon: Wrench,
    name: 'Near-Code',
    subtext: 'Fill the blanks',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/25',
    activeBorder: 'border-emerald-400/60',
    glow: 'shadow-emerald-400/10',
    ringColor: 'ring-emerald-400/30',
  }
]

export default function HintPanel({ sessionId, userCode, maxUsedLevel = 0, onHintUsed }) {
  const [activeLevel, setActiveLevel] = useState(null)
  const [hintTexts, setHintTexts] = useState({ 1: null, 2: null, 3: null })
  const [hintMeta, setHintMeta] = useState({ 1: { fallback: false }, 2: { fallback: false }, 3: { fallback: false } })
  const [streaming, setStreaming] = useState(false)
  const [streamingLevel, setStreamingLevel] = useState(null)
  const [unlockedLevels, setUnlockedLevels] = useState(new Set(maxUsedLevel > 0 ? [maxUsedLevel] : []))
  const abortRef = useRef(null)

  function localFallbackText(level) {
    if (level === 1) {
      return 'Quick fallback hint: focus on what information you can remember while scanning once so each next step can immediately decide what to do. What relationship must be true for a current value to complete the goal?'
    }
    if (level === 2) {
      return [
        '1. Identify the exact result format.',
        '2. Loop through input one item at a time.',
        '3. Compute the required counterpart/condition for the current item.',
        '4. Check if previous state already satisfies it.',
        '5. Return immediately when found, otherwise update state and continue.',
        '6. Return default output if not found.',
        'Try coding each step one at a time.'
      ].join('\n')
    }
    return [
      '```python',
      'def solve(data):',
      '    state = {}  # ??? initialize what helps fast checks',
      '    for idx, item in enumerate(data):',
      '        need = ...  # ??? derive required match',
      '        if need in state:',
      '            return ...  # ??? return required format',
      '        state[item] = idx',
      '    return ...  # ??? default result',
      '```',
      '',
      "You're almost there! Fill in the # ??? sections."
    ].join('\n')
  }

  useEffect(() => {
    if (maxUsedLevel > 0) {
      const unlocked = new Set()
      for (let i = 1; i <= maxUsedLevel; i++) unlocked.add(i)
      setUnlockedLevels(unlocked)
    }
  }, [maxUsedLevel])

  async function requestHint(level) {
    if (streaming) return
    if (!sessionId) {
      toast.error('Session not started yet')
      return
    }
    if (!userCode || userCode.trim().length < 10) {
      toast.error('Write some code first before asking for a hint!')
      return
    }

    // Level must be sequential — can't skip to level 3 without using 1 and 2
    const prevLevel = level - 1
    if (prevLevel > 0 && !unlockedLevels.has(prevLevel)) {
      toast.error(`Try Level ${prevLevel} first — hints are meant to be progressive.`)
      return
    }

    setActiveLevel(level)
    setStreamingLevel(level)
    setStreaming(true)
    setHintTexts(prev => ({ ...prev, [level]: '' }))

    let fullText = ''

    await streamHint({
      session_id: sessionId,
      hint_level: level,
      user_code: userCode,
      onDelta: (text) => {
        fullText += text
        setHintTexts(prev => ({ ...prev, [level]: fullText }))
      },
      onDone: ({ level_name, fallback }) => {
        setStreaming(false)
        setStreamingLevel(null)
        setUnlockedLevels(prev => new Set([...prev, level]))
        setHintMeta(prev => ({ ...prev, [level]: { fallback: Boolean(fallback) } }))
        onHintUsed?.(level)
        if (fallback) {
          toast('Provider is busy. Showing fallback hint.', { icon: '⚠️' })
        } else {
          toast.success(`${level_name} hint ready!`, { icon: LEVELS[level - 1].icon ? '💡' : '✓' })
        }
      },
      onError: (err) => {
        setStreaming(false)
        setStreamingLevel(null)
        toast.error(err.message || 'Failed to get hint. Showing fallback guidance.')
        setHintTexts(prev => ({ ...prev, [level]: localFallbackText(level) }))
        setHintMeta(prev => ({ ...prev, [level]: { fallback: true } }))
        setUnlockedLevels(prev => new Set([...prev, level]))
        onHintUsed?.(level)
      }
    })
  }

  const currentLevelConfig = activeLevel ? LEVELS[activeLevel - 1] : null

  return (
    <div className="flex flex-col h-full">
      {/* Hint level selector */}
      <div className="p-4 border-b border-white/5">
        <div className="text-xs text-slate-500 font-medium mb-3 uppercase tracking-wider">
          Hint Ladder
        </div>
        <div className="space-y-2">
          {LEVELS.map((lvl) => {
            const isUnlocked = unlockedLevels.has(lvl.level)
            const isStreaming = streamingLevel === lvl.level
            const isActive = activeLevel === lvl.level
            const hasHint = hintTexts[lvl.level] !== null
            const canRequest = lvl.level === 1 || unlockedLevels.has(lvl.level - 1)
            const isLocked = lvl.level > 1 && !canRequest

            return (
              <button
                key={lvl.level}
                onClick={() => {
                  if (hasHint) { setActiveLevel(lvl.level); return }
                  if (!isLocked) requestHint(lvl.level)
                  else toast.error(`Use Level ${lvl.level - 1} first`)
                }}
                disabled={isStreaming}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left group ${
                  isActive
                    ? `${lvl.bg} ${lvl.activeBorder} shadow-sm ${lvl.glow}`
                    : isLocked
                    ? 'bg-surface-700/30 border-surface-600/30 opacity-50 cursor-not-allowed'
                    : `bg-surface-700/50 border-surface-500/30 hover:${lvl.bg} hover:${lvl.border}`
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive ? lvl.bg : 'bg-surface-600'
                }`}>
                  {isStreaming ? (
                    <Loader2 size={14} className={`${lvl.color} animate-spin`} />
                  ) : isLocked ? (
                    <Lock size={13} className="text-slate-600" />
                  ) : (
                    <lvl.icon size={14} className={isActive ? lvl.color : 'text-slate-500'} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${isActive ? lvl.color : isLocked ? 'text-slate-600' : 'text-slate-300'}`}>
                    Level {lvl.level} — {lvl.name}
                  </div>
                  <div className="text-xs text-slate-500">{lvl.subtext}</div>
                </div>

                <div className="shrink-0">
                  {isStreaming ? null : hasHint ? (
                    <span className="text-xs bg-surface-500 text-slate-300 px-2 py-0.5 rounded">view</span>
                  ) : isLocked ? null : (
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400" />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Progressive disclosure note */}
        <p className="text-xs text-slate-600 mt-3 leading-relaxed">
          Hints unlock sequentially. Most students solve it at Level 1 or 2.
        </p>
      </div>

      {/* Hint content area */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {activeLevel && hintTexts[activeLevel] !== null ? (
            <motion.div
              key={activeLevel}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* Level header */}
              <div className={`flex items-center gap-2 mb-4 pb-3 border-b ${currentLevelConfig?.border}`}>
                {currentLevelConfig && (
                  <>
                    <currentLevelConfig.icon size={15} className={currentLevelConfig.color} />
                    <span className={`text-sm font-semibold ${currentLevelConfig.color}`}>
                      Level {activeLevel} — {currentLevelConfig.name}
                    </span>
                    {hintMeta[activeLevel]?.fallback && (
                      <span className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-400/25 px-2 py-0.5 rounded-full">
                        fallback
                      </span>
                    )}
                    {streamingLevel === activeLevel && (
                      <span className="text-xs text-slate-500 animate-pulse ml-auto">thinking...</span>
                    )}
                  </>
                )}
              </div>

              {/* Hint text with markdown */}
              <div className={`prose-dark text-sm ${streamingLevel === activeLevel ? 'streaming-cursor' : ''}`}>
                <ReactMarkdown
                  components={{
                    code: ({ node, inline, children, ...props }) => (
                      inline
                        ? <code className="bg-surface-600 text-brand-300 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
                        : <pre className="bg-surface-800 border border-surface-500 rounded-xl p-4 overflow-x-auto mt-3">
                            <code className="text-slate-300 text-xs font-mono leading-relaxed" {...props}>{children}</code>
                          </pre>
                    ),
                    p: ({ children }) => <p className="text-slate-300 leading-relaxed mb-3">{children}</p>,
                    strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-2 text-slate-300 mb-3">{children}</ol>,
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-2 text-slate-300 mb-3">{children}</ul>,
                    li: ({ children }) => <li className="text-slate-300 leading-relaxed">{children}</li>,
                  }}
                >
                  {hintTexts[activeLevel]}
                </ReactMarkdown>
              </div>
            </motion.div>
          ) : !activeLevel ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center py-12"
            >
              <div className="w-12 h-12 bg-surface-700 rounded-2xl flex items-center justify-center mb-4">
                <Lightbulb size={20} className="text-slate-500" />
              </div>
              <p className="text-slate-500 text-sm">
                Stuck? Click a hint level to get help.
              </p>
              <p className="text-slate-600 text-xs mt-2">
                Start with Level 1 — it's just a nudge.
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
