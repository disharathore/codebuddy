import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Filter, CheckCircle2, Clock, Users, ChevronRight, Tag } from 'lucide-react'
import { getProblems } from '../utils/api.js'

const DIFFICULTY_ORDER = { beginner: 0, intermediate: 1, advanced: 2 }

export default function ProblemsPage() {
  const navigate = useNavigate()
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showWarmupMessage, setShowWarmupMessage] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [filterDiff, setFilterDiff] = useState('all')
  const [filterCat, setFilterCat] = useState('all')

  useEffect(() => {
    setShowWarmupMessage(false)
    const warmupTimer = setTimeout(() => {
      setShowWarmupMessage(true)
    }, 5000)

    getProblems()
      .then(data => {
        setProblems(data.problems || [])
        setLoadError('')
      })
      .catch((err) => {
        console.error(err)
        setLoadError(err.message || 'Failed to load problems')
      })
      .finally(() => {
        setLoading(false)
        clearTimeout(warmupTimer)
      })

    return () => clearTimeout(warmupTimer)
  }, [])

  const categories = ['all', ...new Set(problems.map(p => p.category))]
  const difficulties = ['all', 'beginner', 'intermediate', 'advanced']

  const filtered = problems
    .filter(p => {
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
                          p.category.toLowerCase().includes(search.toLowerCase())
      const matchDiff = filterDiff === 'all' || p.difficulty === filterDiff
      const matchCat  = filterCat  === 'all' || p.category  === filterCat
      return matchSearch && matchDiff && matchCat
    })
    .sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty])

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-700 text-white mb-2">Problem Set</h1>
        <p className="text-slate-400">
          {problems.length} curated problems with AI-powered adaptive hints.
        </p>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 mb-6 flex flex-wrap gap-3">
        {/* Search */}
        <div className="flex-1 min-w-48 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search problems..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-700 border border-surface-500 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Difficulty filter */}
        <div className="flex items-center gap-1.5">
          {difficulties.map(d => (
            <button
              key={d}
              onClick={() => setFilterDiff(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                filterDiff === d
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-700 text-slate-400 hover:text-white'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                filterCat === c
                  ? 'bg-surface-500 text-white border border-white/10'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Problem list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass rounded-xl h-24 animate-pulse" />
          ))}
          {showWarmupMessage && (
            <div className="text-center text-xs text-slate-500 pt-2">
              Our free backend is waking up — first load takes ~30 seconds.
            </div>
          )}
        </div>
      ) : loadError ? (
        <div className="text-center py-20 text-rose-300">
          {loadError}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          No problems match your filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((problem, i) => (
            <motion.div
              key={problem.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/problems/${problem.slug}`)}
              className="glass rounded-xl p-5 cursor-pointer hover:border-brand-500/30 border border-transparent transition-all duration-200 group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {/* Difficulty badge */}
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize difficulty-${problem.difficulty}`}>
                      {problem.difficulty}
                    </span>
                    {/* Category */}
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Tag size={10} />
                      {problem.category}
                    </span>
                    {/* Solve rate if data exists */}
                    {problem.attempt_count > 0 && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <CheckCircle2 size={10} />
                        {problem.solve_rate}% solved
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-white group-hover:text-brand-300 transition-colors text-lg leading-tight mb-1">
                    {problem.title}
                  </h3>

                  {/* Tags */}
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {problem.tags?.slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs bg-surface-600 text-slate-400 px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {/* Stats */}
                  {problem.attempt_count > 0 && (
                    <div className="text-right hidden sm:block">
                      <div className="flex items-center gap-1 text-xs text-slate-500 justify-end">
                        <Users size={11} />
                        {problem.attempt_count} attempts
                      </div>
                      {problem.avg_time_seconds && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 justify-end mt-0.5">
                          <Clock size={11} />
                          ~{Math.round(problem.avg_time_seconds / 60)}m avg
                        </div>
                      )}
                    </div>
                  )}
                  <ChevronRight size={18} className="text-slate-600 group-hover:text-brand-400 transition-colors" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
