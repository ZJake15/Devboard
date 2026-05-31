import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import { useState } from 'react'

const FREE_FEATURES = [
  'Browse all active jobs',
  'View job titles, company & location',
  'Tech stack visibility',
  'Salary band hints (blurred)',
  'Match score percentage',
  'Salary crowd benchmarks',
]

const PREMIUM_FEATURES = [
  'Everything in Free',
  'Exact salary ranges revealed',
  'Direct application links',
  'Full match score breakdown',
  'Application pipeline (Kanban)',
  'Saved search alerts',
  'Priority support',
]

export function PricingPage() {
  const { isAuthenticated, tier, upgrade } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleUpgrade() {
    if (!isAuthenticated) { navigate('/register'); return }
    setLoading(true)
    try {
      await upgrade()
      // Bust all cached job/application data so they re-fetch with the new premium token
      await qc.invalidateQueries()
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-3">
          Simple, <span className="text-gradient">transparent</span> pricing
        </h1>
        <p className="text-white/50">Unlock the full picture — exact salaries, direct links, and your career pipeline.</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Free */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-8"
        >
          <div className="text-sm text-white/50 mb-2">Free forever</div>
          <div className="text-3xl font-bold text-white mb-1">$0</div>
          <div className="text-white/40 text-sm mb-6">No credit card required</div>
          <ul className="space-y-3 mb-8">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                <span className="text-white/30">✓</span> {f}
              </li>
            ))}
          </ul>
          <Link
            to="/register"
            className="block text-center py-3 rounded-xl border border-white/20 text-white/70 hover:border-white/40 hover:text-white text-sm font-medium transition-colors"
          >
            Get started free
          </Link>
        </motion.div>

        {/* Premium */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="relative rounded-2xl p-8 bg-gradient-to-br from-violet-900/40 to-indigo-900/40 border border-violet-500/30"
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-violet-600 text-white text-xs font-medium">
            Most popular
          </div>
          <div className="text-sm text-violet-300 mb-2">Premium</div>
          <div className="text-3xl font-bold text-white mb-1">$9<span className="text-lg text-white/50">/mo</span></div>
          <div className="text-white/40 text-sm mb-6">Cancel anytime</div>
          <ul className="space-y-3 mb-8">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-white/80">
                <span className="text-violet-400">✓</span> {f}
              </li>
            ))}
          </ul>

          {done || tier === 'premium' ? (
            <div className="text-center py-3 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-sm font-medium">
              ★ You're on Premium
            </div>
          ) : (
            <motion.button
              onClick={handleUpgrade}
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-semibold text-sm transition-colors"
            >
              {loading ? 'Upgrading...' : isAuthenticated ? '✦ Upgrade now (demo)' : 'Start free trial'}
            </motion.button>
          )}
          <p className="text-center text-xs text-white/30 mt-3">
            {isAuthenticated ? 'This is a demo — upgrade is instant and free' : 'Sign up first to upgrade'}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
