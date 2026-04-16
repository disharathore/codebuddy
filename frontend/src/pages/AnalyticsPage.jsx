import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Users, Lightbulb, CheckCircle2, Zap, Trophy, FileCode, Wrench, Loader2 } from 'lucide-react'
import { getDashboard } from '../utils/api.js'

const DIFF_COLORS = {
  beginner: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  intermediate: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  advanced: 'text-red-400 bg-red-400/10 border-red-400/20',
}

const HINT_ICONS = { 1: Lightbulb, 2: FileCode, 3: Wrench }
const HINT_COLORS = { 1: 'text-amber-400 bg-amber-400/10', 2: 'text-blue-400 bg-blue-400/10', 3: 'text-emerald-400 bg-emerald-400/10' }
const HINT_NAMES = { 1: 'Conceptual', 2: 'Pseudocode', 3: 'Near-Code' }

function StatCard({ icon: Icon, label, value, sub, color = 'text-brand-400' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-5"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-surface-600 rounded-lg flex items-center justify-center">
          <Icon size={15} className={color} />
        </div>
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className={`font-display text-3xl font-700 ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </motion.div>
  )
}

function BarChart({ data, labelKey, valueKey, color = '#6366f1', maxLabel = '' }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="text-xs text-slate-400 w-24 shrink-0 truncate">{d[labelKey]}</div>
          <div className="flex-1 bg-surface-700 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(d[valueKey] / max) * 100}%` }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
          <div className="text-xs text-slate-400 w-8 text-right shrink-0">{d[valueKey]}</div>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getDashboard()
      .then(d => setData(d))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          Loading analytics...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-red-400">
        {error}
      </div>
    )
  }

  const { overview, hint_distribution, problem_stats, hint_efficiency, recent_activity } = data

  // Hint efficiency: % solved at each max level
  const efficiencyByLevel = [1, 2, 3].map(lvl => {
    const row = hint_efficiency?.find(e => e.max_hint_level === lvl)
    return {
      level: lvl,
      count: row?.count || 0,
      solved: row?.solved || 0,
      solveRate: row?.count ? Math.round((row.solved / row.count) * 100) : 0,
    }
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-700 text-white mb-2">Analytics Dashboard</h1>
        <p className="text-slate-400">Platform-wide learning metrics and hint effectiveness data.</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={Users} label="Total Sessions" value={overview.total_sessions} color="text-brand-400" />
        <StatCard icon={CheckCircle2} label="Solved" value={overview.solved_sessions}
          sub={`${overview.solve_rate}% rate`} color="text-emerald-400" />
        <StatCard icon={Lightbulb} label="Hints Used" value={overview.total_hints} color="text-amber-400" />
        <StatCard icon={Zap} label="Code Runs" value={overview.total_runs} color="text-blue-400" />
        <StatCard icon={Trophy} label="No-Hint Solves" value={`${overview.no_hint_solve_rate}%`}
          sub="solved without hints" color="text-purple-400" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Hint level distribution */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-400" />
            Hint Level Usage
          </h3>
          <p className="text-xs text-slate-500 mb-5">How often each level is requested</p>
          <div className="space-y-4">
            {[1, 2, 3].map(lvl => {
              const row = hint_distribution?.find(h => h.hint_level === lvl)
              const count = row?.count || 0
              const maxCount = Math.max(...(hint_distribution?.map(h => h.count) || [1]), 1)
              const HintIcon = HINT_ICONS[lvl]
              return (
                <div key={lvl} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${HINT_COLORS[lvl]}`}>
                    <HintIcon size={13} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-slate-300">L{lvl} {HINT_NAMES[lvl]}</span>
                      <span className="text-xs text-slate-500">{count}</span>
                    </div>
                    <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / maxCount) * 100}%` }}
                        transition={{ delay: lvl * 0.1, duration: 0.5 }}
                        className={`h-full rounded-full ${
                          lvl === 1 ? 'bg-amber-400' : lvl === 2 ? 'bg-blue-400' : 'bg-emerald-400'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Hint efficiency - solve rates per level */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-400" />
            Hint → Solve Rate
          </h3>
          <p className="text-xs text-slate-500 mb-5">Solve % per max hint level used</p>
          <div className="space-y-4">
            {efficiencyByLevel.map(e => (
              <div key={e.level} className="flex items-center gap-3">
                <div className="text-xs text-slate-400 w-20 shrink-0">
                  {e.level === 0 ? 'No hints' : `Max L${e.level}`}
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${e.solveRate}%` }}
                      transition={{ delay: e.level * 0.1, duration: 0.5 }}
                      className="h-full rounded-full bg-brand-500"
                    />
                  </div>
                </div>
                <div className="text-xs font-mono text-slate-300 w-10 text-right">
                  {e.solveRate}%
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-white/5">
            <p className="text-xs text-slate-500 leading-relaxed">
              Most students who reach Level 3 still successfully solve the problem — hints work as scaffolding, not shortcuts.
            </p>
          </div>
        </motion.div>

        {/* Recent activity */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-400" />
            Recent Activity
          </h3>
          <p className="text-xs text-slate-500 mb-5">Sessions started (last 7 days)</p>
          {!recent_activity || recent_activity.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-slate-600 text-sm">
              No activity yet — solve some problems!
            </div>
          ) : (
            <BarChart
              data={recent_activity}
              labelKey="date"
              valueKey="sessions"
              color="#6366f1"
            />
          )}
        </motion.div>
      </div>

      {/* Problem stats table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
          <BarChart3 size={16} className="text-brand-400" />
          <h3 className="font-semibold text-white">Problem Performance</h3>
          <span className="text-xs text-slate-500 ml-auto">{problem_stats?.length || 0} problems</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Problem', 'Difficulty', 'Attempts', 'Solve Rate', 'Avg Hints', 'Avg Time'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {problem_stats?.map((p, i) => (
                <tr key={p.slug} className="border-b border-white/5 hover:bg-surface-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{p.title}</div>
                    <div className="text-xs text-slate-500 font-mono">{p.category}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize border ${DIFF_COLORS[p.difficulty]}`}>
                      {p.difficulty}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{p.attempts || 0}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${p.solve_rate}%` }}
                        />
                      </div>
                      <span className="text-slate-300 text-xs">{p.solve_rate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{p.avg_hints ?? '—'}</td>
                  <td className="px-6 py-4 text-slate-300">
                    {p.avg_time ? `${Math.round(p.avg_time / 60)}m` : '—'}
                  </td>
                </tr>
              ))}
              {(!problem_stats || problem_stats.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-600">
                    No data yet. Start solving problems to see analytics here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Resume-ready callout */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 glass rounded-xl p-5 border border-brand-500/15"
      >
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-brand-600/15 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <Trophy size={16} className="text-brand-400" />
          </div>
          <div>
            <div className="font-semibold text-white mb-1">Key Metric for Resume</div>
            <p className="text-slate-400 text-sm leading-relaxed">
              <span className="text-white font-medium">{overview.no_hint_solve_rate}%</span> of sessions solved problems without reaching Level 3 hints —
              demonstrating that progressive hint scaffolding preserves learning without giving answers away.
              This metric directly validates the core product hypothesis.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
