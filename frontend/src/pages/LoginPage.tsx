import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { jwtDecode } from 'jwt-decode'
import { useAuth } from '../lib/auth'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(form.username, form.password)

      // Read account_type directly from the freshly-stored token so the
      // redirect is correct even before React state has re-rendered.
      const access = localStorage.getItem('access')
      if (access) {
        const payload = jwtDecode<{ account_type?: string }>(access)
        if (payload.account_type === 'company') {
          navigate('/company/dashboard')
          return
        }
      }
      navigate('/')
    } catch {
      setError('Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-white/50 text-sm mb-6">
            Sign in with your developer or company account
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                required
                autoComplete="username"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                autoComplete="current-password"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-medium text-sm transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </motion.button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col gap-2 text-center text-sm text-white/40">
            <p>
              No account?{' '}
              <Link to="/register" className="text-violet-400 hover:text-violet-300 transition-colors">
                Sign up as developer
              </Link>
            </p>
            <p>
              Hiring?{' '}
              <Link to="/register/company" className="text-blue-400 hover:text-blue-300 transition-colors">
                Register your company
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-white/20 mt-4">
          Demo: free_user / password123 · premium_user / password123
        </p>
      </motion.div>
    </div>
  )
}
