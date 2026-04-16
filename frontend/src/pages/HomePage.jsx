import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Brain, Code2, BarChart3, Lightbulb, FileCode, Wrench, CheckCircle } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' } })
}

const HINT_LADDER = [
  {
    level: 1,
    icon: Lightbulb,
    name: 'Conceptual',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    glow: 'shadow-amber-400/10',
    desc: 'Understand the core idea. What concept unlocks this problem? No spoilers — just the right mental model.',
    example: '"Think about how you\'d look up a word in a dictionary by its spelling..."'
  },
  {
    level: 2,
    icon: FileCode,
    name: 'Pseudocode',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    glow: 'shadow-blue-400/10',
    desc: 'See the step-by-step logic in plain English. Algorithm named, structure clear — no syntax to copy.',
    example: '"1. Create empty hash map\\n2. For each number, check if complement exists\\n3. If yes, return both indices..."'
  },
  {
    level: 3,
    icon: Wrench,
    name: 'Near-Code',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    glow: 'shadow-emerald-400/10',
    desc: 'Almost-complete code with strategic blanks. Fill in the key logic — the scaffold is yours.',
    example: '"seen = {}\\nfor i, num in enumerate(nums):\\n    complement = # ???\\n    if # ???: return..."'
  }
]

const STATS = [
  { value: '6', label: 'Curated Problems' },
  { value: '3', label: 'Hint Levels' },
  { value: '0%', label: 'Spoiler Rate' },
  { value: '∞', label: 'Patience' },
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 px-4">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-600/10 rounded-full blur-3xl" />
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-purple-600/8 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-64 h-64 bg-indigo-600/8 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-600/15 border border-brand-500/25 rounded-full text-sm text-brand-300 font-medium mb-8"
          >
            <Brain size={14} />
            Adaptive AI hints that teach, not just tell
          </motion.div>

          <motion.h1
            custom={1} variants={fadeUp} initial="hidden" animate="show"
            className="font-display text-5xl sm:text-6xl lg:text-7xl font-700 text-white leading-tight mb-6"
          >
            Learn to code —
            <br />
            <span className="gradient-text">not just get answers</span>
          </motion.h1>

          <motion.p
            custom={2} variants={fadeUp} initial="hidden" animate="show"
            className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            CodeBuddy is an AI pair programmer for students. Stuck? Get a 3-level hint ladder —
            conceptual nudge → pseudocode → near-code. You fill the gaps. You learn.
          </motion.p>

          <motion.div
            custom={3} variants={fadeUp} initial="hidden" animate="show"
            className="flex items-center justify-center gap-4"
          >
            <button
              onClick={() => navigate('/problems')}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 active:scale-95 shadow-lg shadow-brand-900/30"
            >
              Start Coding
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className="flex items-center gap-2 glass-light text-slate-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-all duration-200"
            >
              <BarChart3 size={16} />
              View Analytics
            </button>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/5 bg-surface-800/50 py-6">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              custom={i} variants={fadeUp} initial="hidden" animate="show"
              className="text-center"
            >
              <div className="font-display text-3xl font-700 gradient-text">{s.value}</div>
              <div className="text-sm text-slate-500 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Hint Ladder Section */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl font-700 text-white mb-4">
              The 3-Level Hint Ladder
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Each level reveals just enough. Most students solve it before reaching Level 3.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {HINT_LADDER.map((hint, i) => (
              <motion.div
                key={hint.level}
                custom={i} variants={fadeUp} initial="hidden" whileInView="show"
                viewport={{ once: true }}
                className={`glass rounded-2xl p-6 border ${hint.border} shadow-xl ${hint.glow} relative overflow-hidden`}
              >
                {/* Level badge */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 ${hint.bg} ${hint.border} border rounded-xl flex items-center justify-center`}>
                    <hint.icon size={18} className={hint.color} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Level {hint.level}</div>
                    <div className={`font-semibold ${hint.color}`}>{hint.name}</div>
                  </div>
                </div>

                <p className="text-slate-300 text-sm leading-relaxed mb-4">{hint.desc}</p>

                <div className={`${hint.bg} border ${hint.border} rounded-lg p-3`}>
                  <div className="text-xs text-slate-500 mb-1">Example response:</div>
                  <div className={`text-xs font-mono ${hint.color} leading-relaxed whitespace-pre-line`}>
                    {hint.example}
                  </div>
                </div>

                {/* Connector arrow */}
                {i < 2 && (
                  <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight size={16} className="text-slate-600" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-surface-800/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-700 text-white text-center mb-12">
            Built for learning. Powered by Claude.
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Code2, title: 'Monaco Editor', desc: 'The same editor as VS Code — full syntax highlighting, autocomplete, and keyboard shortcuts.' },
              { icon: CheckCircle, title: 'Real Test Runner', desc: 'Your code runs against actual test cases. See which pass, which fail, and why.' },
              { icon: Brain, title: 'Claude AI Hints', desc: 'Hints are generated live by Claude — context-aware, patient, and perfectly calibrated to your code.' },
              { icon: BarChart3, title: 'Learning Analytics', desc: 'Track solve rates, hint usage, and improvement over time. The data tells the real story.' },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                custom={i} variants={fadeUp} initial="hidden" whileInView="show"
                viewport={{ once: true }}
                className="glass rounded-xl p-5 flex gap-4"
              >
                <div className="w-9 h-9 bg-brand-600/15 rounded-lg flex items-center justify-center shrink-0">
                  <f.icon size={16} className="text-brand-400" />
                </div>
                <div>
                  <div className="font-semibold text-white mb-1">{f.title}</div>
                  <div className="text-sm text-slate-400 leading-relaxed">{f.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto glass rounded-3xl p-12 border border-brand-500/15"
        >
          <div className="font-display text-3xl font-700 text-white mb-4">
            Ready to actually learn?
          </div>
          <p className="text-slate-400 mb-8">
            Pick a problem. Write some code. Get stuck. Get a hint. <strong className="text-white">Level up.</strong>
          </p>
          <button
            onClick={() => navigate('/problems')}
            className="flex items-center gap-2 mx-auto bg-brand-600 hover:bg-brand-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 active:scale-95"
          >
            Browse Problems <ArrowRight size={16} />
          </button>
        </motion.div>
      </section>
    </div>
  )
}
