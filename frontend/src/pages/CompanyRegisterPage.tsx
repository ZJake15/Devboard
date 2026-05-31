import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { registerCompany, verifyCompanyOTP } from '../lib/api'
import { useAuth } from '../lib/auth'

function OTPModal({ username, onSuccess, onClose }: {
  username: string
  onSuccess: (access: string, refresh: string) => void
  onClose: () => void
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const otp = digits.join('')

  function handleDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[index] = value
    setDigits(next)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setDigits(pasted.split(''))
      inputRefs.current[5]?.focus()
    }
  }

  async function handleVerify() {
    if (otp.length !== 6) return
    setLoading(true)
    setError('')
    try {
      const { access, refresh } = await verifyCompanyOTP(username, otp)
      onSuccess(access, refresh)
    } catch (err: any) {
      const msg = err?.response?.data?.otp_code?.[0]
        || err?.response?.data?.non_field_errors?.[0]
        || err?.response?.data?.detail
        || 'Invalid OTP. Please try again.'
      setError(msg)
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative w-full max-w-sm glass rounded-2xl p-7 border border-violet-500/30"
      >
        <div className="text-3xl text-center mb-4">📨</div>
        <h2 className="text-lg font-bold text-white text-center mb-1">Enter your OTP</h2>
        <p className="text-white/50 text-xs text-center mb-6">
          An OTP has been sent to your email by the admin.<br />
          <span className="text-violet-400 font-mono">For demo: use 123456</span>
        </p>

        {/* 6-digit input */}
        <div className="flex justify-center gap-3 mb-5" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              autoFocus={i === 0}
              className={`w-11 h-13 text-center text-xl font-bold rounded-xl border bg-white/5 text-white transition-colors focus:outline-none ${
                d ? 'border-violet-500 bg-violet-500/10' : 'border-white/15 focus:border-violet-400'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-xs text-center mb-4">{error}</p>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleVerify}
          disabled={otp.length !== 6 || loading}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
        >
          {loading ? 'Verifying…' : 'Verify & Continue →'}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

export function CompanyRegisterPage() {
  const { loginWithTokens } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    company_name: '', company_website: '', company_description: '',
    username: '', email: '', password: '', password_confirm: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [pendingUsername, setPendingUsername] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      const { username } = await registerCompany(form)
      setPendingUsername(username)
    } catch (err: any) {
      const data = err?.response?.data ?? {}
      const flat: Record<string, string> = {}
      for (const [k, v] of Object.entries(data)) {
        flat[k] = Array.isArray(v) ? (v as string[]).join(' ') : String(v)
      }
      setErrors(flat)
    } finally {
      setLoading(false)
    }
  }

  async function handleOTPSuccess(access: string, refresh: string) {
    await loginWithTokens(access, refresh)
    navigate('/company/dashboard')
  }

  function field(name: keyof typeof form, label: string, type = 'text', placeholder = '') {
    return (
      <div>
        <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">{label}</label>
        <input
          type={type}
          value={form[name]}
          placeholder={placeholder}
          onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500 transition-colors"
        />
        {errors[name] && <p className="text-red-400 text-xs mt-1">{errors[name]}</p>}
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏢</div>
          <h1 className="text-2xl font-bold text-white mb-1">Register your company</h1>
          <p className="text-white/50 text-sm">Create a company account to post jobs on DevBoard.</p>
        </div>

        <div className="glass rounded-2xl p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-white/40 uppercase tracking-wider font-semibold pb-1 border-b border-white/10">Company details</p>
            {field('company_name', 'Company name', 'text', 'e.g. Acme Corp')}
            {field('company_website', 'Website', 'url', 'https://example.com')}

            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">Description</label>
              <textarea
                value={form.company_description}
                onChange={e => setForm(f => ({ ...f, company_description: e.target.value }))}
                rows={3}
                placeholder="What does your company do?"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500 transition-colors resize-none"
              />
            </div>

            <p className="text-xs text-white/40 uppercase tracking-wider font-semibold pb-1 border-b border-white/10 pt-2">Admin account</p>
            {field('username', 'Username')}
            {field('email', 'Email', 'email')}
            <div className="grid grid-cols-2 gap-3">
              {field('password', 'Password', 'password')}
              {field('password_confirm', 'Confirm password', 'password')}
            </div>

            {(errors.non_field_errors || errors.detail) && (
              <p className="text-red-400 text-sm">{errors.non_field_errors || errors.detail}</p>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 text-white font-semibold text-sm transition-colors mt-2"
            >
              {loading ? 'Registering…' : 'Register company →'}
            </motion.button>
          </form>

          <p className="text-center text-sm text-white/40 mt-5">
            Looking for a job?{' '}
            <Link to="/register" className="text-violet-400 hover:text-violet-300 transition-colors">Developer sign up</Link>
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {pendingUsername && (
          <OTPModal
            username={pendingUsername}
            onSuccess={handleOTPSuccess}
            onClose={() => setPendingUsername(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
