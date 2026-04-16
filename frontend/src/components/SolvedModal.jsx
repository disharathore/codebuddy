import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Trophy, ArrowRight, RotateCcw, BarChart3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'

function Confetti() {
  const colors = ['#818cf8', '#c084fc', '#34d399', '#fbbf24', '#60a5fa', '#f472b6']
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    size: 6 + Math.random() * 8,
    duration: 2 + Math.random() * 1.5,
  }))

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.left}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', rotate: 720, opacity: 0 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{
            position: 'fixed',
            top: 0,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  )
}

export default function SolvedModal({ open, problem, sessionData, onClose }) {
  const navigate = useNavigate()

  const noHints = sessionData?.max_hint_level === 0
  const usedLevel = sessionData?.max_hint_level

  const getMessage = () => {
    if (noHints) return { title: '🏆 Flawless!', sub: 'You solved it without any hints. Excellent independent thinking!' }
    if (usedLevel === 1) return { title: '⭐ Well done!', sub: 'One conceptual nudge was all you needed.' }
    if (usedLevel === 2) return { title: '👍 Nice work!', sub: 'The pseudocode helped you see the path.' }
    return { title: '✅ Solved!', sub: 'You worked through all the hints and got there. That counts.' }
  }

  const { title, sub } = getMessage()

  return (
    <AnimatePresence>
      {open && (
        <>
          <Confetti />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="glass rounded-3xl p-8 max-w-md w-full border border-brand-500/25 shadow-2xl shadow-brand-900/40"
            >
              {/* Icon */}
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/25 rounded-2xl flex items-center justify-center">
                  <CheckCircle size={32} className="text-emerald-400" />
                </div>
              </div>

              <div className="text-center mb-6">
                <h2 className="font-display text-2xl font-700 text-white mb-2">{title}</h2>
                <p className="text-slate-400 text-sm leading-relaxed">{sub}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'Problem', value: problem?.title || '—' },
                  { label: 'Hints Used', value: sessionData?.hints_used ?? '—' },
                  { label: 'Max Level', value: usedLevel ? `L${usedLevel}` : 'None' },
                ].map(s => (
                  <div key={s.label} className="bg-surface-700 rounded-xl p-3 text-center">
                    <div className="font-semibold text-white text-lg leading-tight">{s.value}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/problems')}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-medium py-2.5 rounded-xl transition-all"
                >
                  Next Problem <ArrowRight size={15} />
                </button>
                <button
                  onClick={() => navigate('/analytics')}
                  className="flex items-center justify-center gap-2 glass-light text-slate-300 hover:text-white px-4 py-2.5 rounded-xl transition-all"
                >
                  <BarChart3 size={15} />
                </button>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 glass-light text-slate-300 hover:text-white px-4 py-2.5 rounded-xl transition-all"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
