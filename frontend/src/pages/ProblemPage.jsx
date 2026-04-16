import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { motion } from 'framer-motion'
import {
  Play, FlaskConical, ArrowLeft, Clock, ChevronDown,
  ChevronUp, Tag, AlertCircle, Loader2
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'

import { getProblem, createSession, updateSession, executeCode, getFingerprint } from '../utils/api.js'
import HintPanel from '../components/HintPanel.jsx'
import TestResults from '../components/TestResults.jsx'
import SolvedModal from '../components/SolvedModal.jsx'

const MONACO_OPTIONS = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  fontLigatures: true,
  lineHeight: 22,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  padding: { top: 16, bottom: 16 },
  renderLineHighlight: 'all',
  bracketPairColorization: { enabled: true },
  cursorSmoothCaretAnimation: 'on',
  smoothScrolling: true,
  tabSize: 4,
  wordWrap: 'on',
}

export default function ProblemPage() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [problem, setProblem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [sessionId, setSessionId] = useState(null)
  const [code, setCode] = useState('')
  const [maxHintLevel, setMaxHintLevel] = useState(0)

  const [executing, setExecuting] = useState(false)
  const [testOutput, setTestOutput] = useState(null)

  const [solved, setSolved] = useState(false)
  const [showSolvedModal, setShowSolvedModal] = useState(false)

  const [activeTab, setActiveTab] = useState('description') // 'description' | 'hints' | 'output'
  const [descExpanded, setDescExpanded] = useState(true)

  const timerRef = useRef(null)
  const timeSpentRef = useRef(0)
  const sessionDataRef = useRef(null)

  // Load problem
  useEffect(() => {
    setLoading(true)
    getProblem(slug)
      .then(data => {
        setProblem(data.problem)
        setCode(data.problem.starter_code)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug])

  // Create session when problem loads
  useEffect(() => {
    if (!problem) return
    const fp = getFingerprint()
    createSession(problem.id, fp)
      .then(data => {
        setSessionId(data.session_id)
        // Start timer
        timerRef.current = setInterval(() => {
          timeSpentRef.current += 1
        }, 1000)
      })
      .catch(err => console.error('Session creation failed:', err))

    return () => clearInterval(timerRef.current)
  }, [problem])

  // Auto-save time on unmount
  useEffect(() => {
    return () => {
      if (sessionId && timeSpentRef.current > 0) {
        updateSession(sessionId, {
          time_spent_seconds: timeSpentRef.current,
          final_code: code
        }).catch(() => {})
      }
    }
  }, [sessionId])

  const handleRun = useCallback(async (withTests = false) => {
    if (!sessionId) return toast.error('Session not ready')
    if (executing) return

    setExecuting(true)
    setActiveTab('output')
    setTestOutput({ loading: true })

    try {
      const result = await executeCode(sessionId, code, withTests)
      setTestOutput(result)

      if (result.solved) {
        setSolved(true)
        setShowSolvedModal(true)
        sessionDataRef.current = { hints_used: maxHintLevel > 0 ? 1 : 0, max_hint_level: maxHintLevel }
        clearInterval(timerRef.current)
      } else if (withTests && result.passed_tests > 0) {
        toast.success(`${result.passed_tests}/${result.total_tests} tests passed!`)
      } else if (withTests && result.error) {
        toast.error('Code has errors — check output')
      }
    } catch (err) {
      toast.error(err.message)
      setTestOutput({ error: err.message })
    } finally {
      setExecuting(false)
    }
  }, [sessionId, code, executing, maxHintLevel])

  const handleHintUsed = useCallback((level) => {
    setMaxHintLevel(prev => Math.max(prev, level))
    setActiveTab('hints')
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          Loading problem...
        </div>
      </div>
    )
  }

  if (error || !problem) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] text-center">
        <AlertCircle size={40} className="text-red-400 mb-4" />
        <h2 className="text-white font-semibold mb-2">Problem not found</h2>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <button onClick={() => navigate('/problems')} className="btn-primary">
          ← Back to Problems
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Top toolbar */}
      <div className="glass border-b border-white/5 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate('/problems')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={14} />
          Problems
        </button>

        <div className="w-px h-4 bg-white/10" />

        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-white text-sm">{problem.title}</h1>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize difficulty-${problem.difficulty}`}>
            {problem.difficulty}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Tag size={10} /> {problem.category}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Timer */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={12} />
            <TimerDisplay />
          </div>

          {solved && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
              ✓ Solved
            </span>
          )}

          {/* Run buttons */}
          <button
            onClick={() => handleRun(false)}
            disabled={executing}
            className="flex items-center gap-1.5 bg-surface-600 hover:bg-surface-500 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
          >
            {executing ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            Run
          </button>
          <button
            onClick={() => handleRun(true)}
            disabled={executing}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
          >
            {executing ? <Loader2 size={12} className="animate-spin" /> : <FlaskConical size={12} />}
            Run Tests
          </button>
        </div>
      </div>

      {/* Main layout: [Left panel | Editor | Right panel] */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Problem + Hints (tabs) */}
        <div className="w-[360px] shrink-0 flex flex-col border-r border-white/5 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/5 shrink-0">
            {['description', 'hints', 'output'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-xs font-medium capitalize transition-all ${
                  activeTab === tab
                    ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-600/5'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab}
                {tab === 'hints' && maxHintLevel > 0 && (
                  <span className="ml-1 text-xs bg-brand-600/30 text-brand-300 px-1.5 rounded-full">
                    L{maxHintLevel}
                  </span>
                )}
                {tab === 'output' && testOutput && !testOutput.loading && (
                  <span className={`ml-1 text-xs px-1.5 rounded-full ${
                    testOutput.solved
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : testOutput.error
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-surface-500 text-slate-400'
                  }`}>
                    {testOutput.solved ? '✓' : testOutput.total_tests > 0 ? `${testOutput.passed_tests}/${testOutput.total_tests}` : '!'}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'description' && (
              <div className="p-4">
                <div className="prose-dark text-sm">
                  <ReactMarkdown
                    components={{
                      code: ({ inline, children, ...props }) => (
                        inline
                          ? <code className="bg-surface-600 text-brand-300 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
                          : <pre className="bg-surface-800 border border-surface-600 rounded-xl p-4 overflow-x-auto mt-3 mb-3">
                              <code className="text-slate-300 text-xs font-mono leading-relaxed" {...props}>{children}</code>
                            </pre>
                      ),
                      p: ({ children }) => <p className="text-slate-300 leading-relaxed mb-3">{children}</p>,
                      strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-slate-300 mb-3">{children}</ul>,
                      li: ({ children }) => <li className="text-slate-300 leading-relaxed">{children}</li>,
                    }}
                  >
                    {problem.description}
                  </ReactMarkdown>
                </div>

                {/* Tags */}
                {problem.tags?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="text-xs text-slate-500 mb-2">Topics</div>
                    <div className="flex flex-wrap gap-1.5">
                      {problem.tags.map(tag => (
                        <span key={tag} className="text-xs bg-surface-600 text-slate-400 px-2.5 py-1 rounded-lg">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'hints' && (
              <HintPanel
                sessionId={sessionId}
                userCode={code}
                maxUsedLevel={maxHintLevel}
                onHintUsed={handleHintUsed}
              />
            )}

            {activeTab === 'output' && (
              <TestResults
                results={testOutput?.test_results}
                output={testOutput?.output}
                error={testOutput?.error}
                loading={testOutput?.loading}
                passedTests={testOutput?.passed_tests || 0}
                totalTests={testOutput?.total_tests || 0}
              />
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor header */}
          <div className="flex items-center justify-between px-4 py-2 bg-surface-800 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-amber-500/60" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {problem.slug}.{problem.language}
            </span>
            <span className="text-xs text-slate-600">Python 3</span>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={problem.language === 'python' ? 'python' : 'javascript'}
              value={code}
              onChange={val => setCode(val || '')}
              theme="vs-dark"
              options={MONACO_OPTIONS}
              loading={
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                  <Loader2 size={16} className="animate-spin mr-2" /> Loading editor...
                </div>
              }
              beforeMount={(monaco) => {
                monaco.editor.defineTheme('codebuddy-dark', {
                  base: 'vs-dark',
                  inherit: true,
                  rules: [
                    { token: 'keyword', foreground: 'c084fc', fontStyle: 'bold' },
                    { token: 'string', foreground: '86efac' },
                    { token: 'comment', foreground: '4b5563', fontStyle: 'italic' },
                    { token: 'number', foreground: 'fbbf24' },
                    { token: 'function', foreground: '818cf8' },
                  ],
                  colors: {
                    'editor.background': '#111118',
                    'editor.foreground': '#e2e8f0',
                    'editorLineNumber.foreground': '#374151',
                    'editorLineNumber.activeForeground': '#6b7280',
                    'editor.lineHighlightBackground': '#1a1a24',
                    'editorCursor.foreground': '#818cf8',
                    'editor.selectionBackground': '#312e81',
                    'editorIndentGuide.background': '#1f2937',
                  }
                })
                monaco.editor.setTheme('codebuddy-dark')
              }}
            />
          </div>
        </div>
      </div>

      {/* Solved modal */}
      <SolvedModal
        open={showSolvedModal}
        problem={problem}
        sessionData={{ hints_used: maxHintLevel > 0 ? 1 : 0, max_hint_level: maxHintLevel }}
        onClose={() => setShowSolvedModal(false)}
      />
    </div>
  )
}

// Tiny live timer component
function TimerDisplay() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return <span className="font-mono">{m}:{s}</span>
}
