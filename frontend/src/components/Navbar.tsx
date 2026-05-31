import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { NotificationBell } from './NotificationBell'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
    >
      <span className="text-lg">{theme === 'dark' ? '☀️' : '🌙'}</span>
    </button>
  )
}

export function Navbar() {
  const { user, tier, isAuthenticated, isCompany, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <span className="text-gradient">DevBoard</span>
        </Link>

        {/* Centre nav links */}
        <div className="hidden md:flex items-center gap-6 text-sm text-white/70">
          {isCompany ? (
            <>
              <Link to="/company/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
              <Link to="/company/jobs/new" className="hover:text-white transition-colors">Post a Job</Link>
            </>
          ) : (
            <>
              <Link to="/" className="hover:text-white transition-colors">Jobs</Link>
              {isAuthenticated && (
                <>
                  <Link to="/saved-searches" className="hover:text-white transition-colors">Saved Searches</Link>
                  {tier === 'premium' && (
                    <Link to="/pipeline" className="hover:text-white transition-colors">Pipeline</Link>
                  )}
                  <Link to="/audit-log" className="hover:text-white transition-colors">Audit Log</Link>
                </>
              )}
              <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            </>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              {isCompany && (
                <span className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  🏢 Company
                </span>
              )}
              {!isCompany && tier === 'free' && (
                <Link
                  to="/pricing"
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30 transition-colors"
                >
                  ✦ Upgrade
                </Link>
              )}
              {!isCompany && tier === 'premium' && (
                <span className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ★ Premium
                </span>
              )}
              <NotificationBell />
              <Link
                to={isCompany ? '/company/dashboard' : '/profile'}
                className="w-8 h-8 rounded-full bg-violet-600 overflow-hidden flex items-center justify-center text-white text-sm font-bold hover:bg-violet-500 transition-colors"
              >
                {user?.profile?.avatar ? (
                  <img src={user.profile.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  user?.username?.[0]?.toUpperCase()
                )}
              </Link>
              <button
                onClick={() => { logout(); navigate('/') }}
                className="text-sm text-white/50 hover:text-white/80 transition-colors"
              >
                Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-white/70 hover:text-white transition-colors">Log in</Link>
              <div className="flex items-center gap-2">
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                >
                  Sign up
                </Link>
                <Link
                  to="/register/company"
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-white/15 text-white/70 hover:border-white/30 hover:text-white transition-colors"
                >
                  For companies
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
