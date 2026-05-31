import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { fetchJob, createApplication } from '../lib/api'
import { useAuth } from '../lib/auth'

function FrostedSalaryReveal({ job }: { job: import('../lib/api').Job }) {
  const [revealed, setRevealed] = useState(false)
  const sr = job.salary_range

  if (!sr.masked) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Salary Range</div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-2xl font-bold text-emerald-400"
        >
          {sr.currency} {sr.min?.toLocaleString()} – {sr.max?.toLocaleString()}
        </motion.div>
        {job.salary_verified && (
          <div className="text-xs text-emerald-500 mt-1">✓ Verified by employer</div>
        )}
      </div>
    )
  }

  return (
    <div className="glass rounded-xl p-6 relative overflow-hidden">
      <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Salary Range</div>
      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.div key="blurred" exit={{ opacity: 0, scale: 0.9 }} className="space-y-2">
            <div className="text-2xl font-bold salary-blur text-white/80 select-none">
              {sr.hint}
            </div>
            <p className="text-xs text-white/40">{sr.message}</p>
            <button
              onClick={() => setRevealed(true)}
              className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              <span>🔒</span> Click to see hint
            </button>
          </motion.div>
        ) : (
          <motion.div key="hint" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-sm font-medium text-amber-400 mb-2">{sr.hint}</div>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
            >
              ✦ Upgrade to see exact numbers
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => fetchJob(Number(id)),
  })

  const applyMutation = useMutation({
    mutationFn: (appStatus: string) =>
      createApplication({ job_id: Number(id), status: appStatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] })
      navigate(`/jobs/${id}/applied`)
    },
  })

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-8 w-2/3 bg-white/10 rounded" />
        <div className="h-4 w-1/3 bg-white/10 rounded" />
        <div className="h-32 bg-white/10 rounded-xl" />
      </div>
    )
  }

  if (!job) return <div className="text-center py-20 text-white/40">Job not found.</div>

  const al = job.application_link
  const daysSince = Math.floor((Date.now() - new Date(job.posted_at).getTime()) / 86400000)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/" className="text-xs text-white/40 hover:text-white/70 mb-6 inline-block transition-colors">
        ← Back to jobs
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-white/50">{job.company.name}</span>
                {job.salary_verified && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    ✓ Verified salary
                  </span>
                )}
                {job.is_stale && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
                    ⚠ Possibly stale
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/50">
                <span>📍 {job.location}</span>
                <span className="capitalize">{job.remote_policy}</span>
                <span className="capitalize">{job.seniority}</span>
                <span>{daysSince}d ago</span>
              </div>
            </div>

            {/* Apply buttons */}
            <div className="flex flex-col gap-2 min-w-40">
              {al.masked ? (
                <Link
                  to="/pricing"
                  className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-colors text-center"
                >
                  ✦ Unlock & Apply
                </Link>
              ) : (
                isAuthenticated ? (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => applyMutation.mutate('applied')}
                    disabled={applyMutation.isPending}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium text-sm transition-colors text-center"
                  >
                    {applyMutation.isPending ? 'Applying…' : 'Apply Now →'}
                  </motion.button>
                ) : (
                  <Link
                    to="/login"
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors text-center"
                  >
                    Sign in to Apply
                  </Link>
                )
              )}

              {isAuthenticated && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => applyMutation.mutate('saved')}
                  disabled={applyMutation.isPending}
                  className="px-6 py-2 rounded-xl glass glass-hover text-white/70 text-sm disabled:opacity-50 transition-all"
                >
                  + Save to Pipeline
                </motion.button>
              )}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <FrostedSalaryReveal job={job} />

          {job.match_score && (
            <div className="glass rounded-xl p-6">
              <div className="text-xs text-white/50 uppercase tracking-wider mb-3">Your Match</div>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-gradient">{job.match_score.score}%</div>
                {job.match_score.breakdown ? (
                  <div className="text-sm space-y-1 text-white/60">
                    <div>{job.match_score.breakdown.skills_matched}/{job.match_score.breakdown.skills_total} skills match</div>
                    {job.match_score.breakdown.missing_skills.length > 0 && (
                      <div className="text-xs text-amber-400">Missing: {job.match_score.breakdown.missing_skills.join(', ')}</div>
                    )}
                    <div>{job.match_score.breakdown.seniority_match ? '✓ Seniority match' : '~ Seniority gap'}</div>
                    <div>{job.match_score.breakdown.remote_match ? '✓ Remote match' : '~ Remote mismatch'}</div>
                  </div>
                ) : (
                  <Link to="/pricing" className="text-xs text-violet-400">Upgrade for breakdown →</Link>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="glass rounded-xl p-6">
          <div className="text-xs text-white/50 uppercase tracking-wider mb-3">Tech Stack</div>
          <div className="flex flex-wrap gap-2">
            {job.tech_stack.map((s) => (
              <span key={s.id} className="px-3 py-1.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 text-sm">
                {s.name}
              </span>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-6">
          <div className="text-xs text-white/50 uppercase tracking-wider mb-3">About {job.company.name}</div>
          {job.company.description && <p className="text-white/70 text-sm mb-4">{job.company.description}</p>}
          <div className="flex flex-wrap gap-4 text-sm text-white/50">
            {job.company.response_rate != null && (
              <span>📬 {Math.round(job.company.response_rate * 100)}% response rate</span>
            )}
            {job.company.avg_response_days != null && (
              <span>⏱ ~{job.company.avg_response_days}d to respond</span>
            )}
            {job.company.website && (
              <a href={job.company.website} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 transition-colors">
                Visit website →
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
