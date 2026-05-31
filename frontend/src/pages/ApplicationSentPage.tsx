import { useParams, Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { fetchJob } from '../lib/api'
import { useAuth } from '../lib/auth'

export function ApplicationSentPage() {
  const { id } = useParams<{ id: string }>()
  const { isAuthenticated } = useAuth()

  const { data: job } = useQuery({
    queryKey: ['job', id],
    queryFn: () => fetchJob(Number(id)),
  })

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 180 }}
        className="w-full max-w-md text-center"
      >
        {/* Animated checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.15 }}
          className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-4xl mx-auto mb-6"
        >
          ✓
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h1 className="text-2xl font-bold text-white mb-2">Application sent!</h1>

          {job && (
            <p className="text-white/50 text-sm mb-1">
              You applied for <span className="text-white font-medium">{job.title}</span>
            </p>
          )}
          {job && (
            <p className="text-white/40 text-sm mb-6">at {job.company.name}</p>
          )}

          {/* What happens next */}
          <div className="glass rounded-xl p-5 text-left mb-6 space-y-4">
            <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">What happens next</p>
            {[
              { icon: '📬', text: 'The company will review your application.' },
              { icon: '⏳', text: 'This usually takes a few days to a couple of weeks.' },
              { icon: '📩', text: 'If selected, they will reach out to schedule an interview.' },
              { icon: '📋', text: 'Track your status in your Pipeline anytime.' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <span className="text-lg leading-none mt-0.5">{icon}</span>
                <p className="text-sm text-white/60">{text}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/pipeline"
              className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors text-center"
            >
              View my Pipeline
            </Link>
            <Link
              to="/"
              className="flex-1 py-3 rounded-xl glass glass-hover text-white/70 text-sm transition-colors text-center"
            >
              Browse more jobs
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
