import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Clock, Terminal, Zap } from 'lucide-react'

export default function TestResults({ results, output, error, loading, passedTests, totalTests }) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 p-4 text-slate-400">
        <Zap size={16} className="animate-pulse text-brand-400" />
        <span className="text-sm">Running your code...</span>
      </div>
    )
  }

  if (!results && !output && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
        <Terminal size={24} className="text-slate-600 mb-3" />
        <p className="text-slate-500 text-sm">
          Run your code to see output here.
        </p>
        <p className="text-slate-600 text-xs mt-1">
          Use "Run Code" to test, "Run Tests" to check all cases.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Summary bar */}
      {totalTests > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center justify-between p-3 rounded-xl border ${
            passedTests === totalTests
              ? 'bg-emerald-500/10 border-emerald-500/25'
              : 'bg-amber-500/10 border-amber-500/25'
          }`}
        >
          <div className="flex items-center gap-2">
            {passedTests === totalTests ? (
              <CheckCircle2 size={16} className="text-emerald-400" />
            ) : (
              <XCircle size={16} className="text-amber-400" />
            )}
            <span className={`text-sm font-semibold ${
              passedTests === totalTests ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {passedTests}/{totalTests} tests passed
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-32 h-1.5 bg-surface-600 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(passedTests / totalTests) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                passedTests === totalTests ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
          </div>
        </motion.div>
      )}

      {/* Individual test results */}
      {results && (
        <div className="space-y-2">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Test Cases</div>
          {results.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                r.passed
                  ? 'bg-emerald-500/5 border-emerald-500/15'
                  : 'bg-red-500/5 border-red-500/15'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {r.passed ? (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                ) : (
                  <XCircle size={14} className="text-red-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-slate-300 font-medium">Test {r.test}</div>
                {!r.passed && (
                  <div className="mt-1 space-y-0.5 font-mono text-xs">
                    {r.error ? (
                      <div className="text-red-400">Error: {r.error}</div>
                    ) : (
                      <>
                        <div className="text-slate-400">Got: <span className="text-red-300">{r.result}</span></div>
                        <div className="text-slate-400">Expected: <span className="text-emerald-300">{r.expected}</span></div>
                      </>
                    )}
                  </div>
                )}
                {r.passed && (
                  <div className="text-xs text-emerald-600 font-mono mt-0.5">→ {r.result}</div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Raw output */}
      {output && !results && (
        <div>
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Output</div>
          <pre className="bg-surface-800 border border-surface-600 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
            {output}
          </pre>
        </div>
      )}

      {/* Error output */}
      {error && (
        <div>
          <div className="text-xs text-red-500 font-medium uppercase tracking-wider mb-2">Error</div>
          <pre className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-xs font-mono text-red-300 overflow-x-auto whitespace-pre-wrap">
            {error}
          </pre>
        </div>
      )}
    </div>
  )
}
