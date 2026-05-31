import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { register } from '../lib/api'
import { useAuth } from '../lib/auth'

export function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const renderTime = useRef(Date.now() / 1000)
  const [form, setForm] = useState({
    username: '', email: '', password: '', password_confirm: '',
    first_name: '', last_name: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    renderTime.current = Date.now() / 1000
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      await register({
        ...form,
        website: '',   // honeypot — always empty
        nickname: '',  // honeypot — always empty
        form_rendered_at: renderTime.current,
      })
      await login(form.username, form.password)
      navigate('/onboarding')
    } catch (err: any) {
      const data = err?.response?.data
      if (typeof data === 'object') {
        const flat: Record<string, string> = {}
        for (const [k, v] of Object.entries(data)) {
          flat[k] = Array.isArray(v) ? (v as string[]).join(' ') : String(v)
        }
        setErrors(flat)
      } else {
        setErrors({ non_field_errors: 'Registration failed. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  function field(name: keyof typeof form, label: string, type = 'text') {
    return (
      <div>
        <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">{label}</label>
        <input
          type={type}
          value={form[name]}
          onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
        />
        {errors[name] && <p className="text-red-400 text-xs mt-1">{errors[name]}</p>}
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-white/50 text-sm mb-6">Start finding your next role today</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {field('first_name', 'First name')}
              {field('last_name', 'Last name')}
            </div>
            {field('username', 'Username')}
            {field('email', 'Email', 'email')}
            {field('password', 'Password', 'password')}
            {field('password_confirm', 'Confirm password', 'password')}

            {/* Honeypot fields — hidden from real users */}
            <div style={{ display: 'none' }} aria-hidden="true">
              <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              <input type="text" name="nickname" tabIndex={-1} autoComplete="off" />
            </div>

            {(errors.non_field_errors || errors.detail) && (
              <p className="text-red-400 text-sm">{errors.non_field_errors || errors.detail}</p>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-medium text-sm transition-colors"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </motion.button>
          </form>

          <p className="text-center text-sm text-white/40 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 transition-colors">Sign in</Link>
          </p>
          <p className="text-center text-sm text-white/40 mt-2">
            Hiring?{' '}
            <Link to="/register/company" className="text-blue-400 hover:text-blue-300 transition-colors">Register as a company →</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
