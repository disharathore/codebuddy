import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Code2, BarChart3, BookOpen, Zap } from 'lucide-react'

export default function Layout() {
  const location = useLocation()

  const navLinks = [
    { to: '/problems', label: 'Problems', icon: BookOpen },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-surface-900">
      {/* Navbar */}
      <nav className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center group-hover:bg-brand-500 transition-colors">
              <Code2 size={16} className="text-white" />
            </div>
            <span className="font-display font-700 text-lg text-white tracking-tight">
              Code<span className="gradient-text">Buddy</span>
            </span>
          </NavLink>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-600/20 text-brand-400 border border-brand-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-surface-600'
                  }`
                }
              >
                <Icon size={14} />
                {label}
              </NavLink>
            ))}
          </div>

          {/* Right side badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-600/10 border border-brand-500/20 rounded-full">
              <Zap size={11} className="text-brand-400" />
              <span className="text-xs text-brand-400 font-medium">AI-Powered</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
