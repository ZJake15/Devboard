import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import type { Job } from '../lib/api'

interface Props {
  job: Job
  index: number
}

const REMOTE_BADGE: Record<string, string> = {
  remote: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  hybrid: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  onsite: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
}

function SalaryChip({ job }: { job: Job }) {
  const [revealed, setRevealed] = useState(false)
  const sr = job.salary_range

  if (!sr.masked) {
    return (
      <span className="text-xs font-medium text-emerald-400">
        {sr.currency} {sr.min?.toLocaleString()}–{sr.max?.toLocaleString()}
      </span>
    )
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); setRevealed(true) }}
      className="group relative text-xs font-medium"
    >
      {revealed ? (
        <Link to="/pricing" className="text-violet-400 hover:text-violet-300 transition-colors">
          Unlock with Premium ✦
        </Link>
      ) : (
        <span className="flex items-center gap-1">
          <span className="salary-blur text-white/80 select-none text-xs">
            {sr.hint}
          </span>
          <span className="text-white/40 text-[10px]">🔒</span>
        </span>
      )}
    </button>
  )
}

function MatchRing({ score }: { score: number }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? '#34d399' : score >= 40 ? '#fbbf24' : '#f87171'

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width="44" height="44" className="-rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#1e1e2e" strokeWidth="4" />
        <motion.circle
          cx="22" cy="22" r={r}
          fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <span className="text-[10px] text-white/50 -mt-8 mb-2 font-mono font-bold" style={{ color }}>
        {score}%
      </span>
    </div>
  )
}

export function JobCard({ job, index }: Props) {
  const daysSince = Math.floor((Date.now() - new Date(job.posted_at).getTime()) / 86400000)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Link to={`/jobs/${job.id}`} className="block">
        <div className="glass glass-hover rounded-xl p-5 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Company */}
              <div className="flex items-center gap-2 mb-2">
                {(job.company.logo || job.company.logo_url) ? (
                  <img src={job.company.logo || job.company.logo_url} alt={job.company.name} className="w-6 h-6 rounded object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded bg-violet-600/30 flex items-center justify-center text-[10px] font-bold text-violet-400">
                    {job.company.name[0]}
                  </div>
                )}
                <span className="text-xs text-white/50">{job.company.name}</span>

                {job.salary_verified && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    ✓ Verified salary
                  </span>
                )}
                {job.is_stale && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
                    ⚠ Possibly stale
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="font-semibold text-white text-base leading-snug mb-2">{job.title}</h3>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs text-white/50">📍 {job.location}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${REMOTE_BADGE[job.remote_policy] ?? ''}`}>
                  {job.remote_policy}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10">
                  {job.seniority}
                </span>
                <span className="text-xs text-white/30">{daysSince}d ago</span>
              </div>

              {/* Tech stack */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {job.tech_stack.slice(0, 5).map((s) => (
                  <span key={s.id} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {s.name}
                  </span>
                ))}
                {job.tech_stack.length > 5 && (
                  <span className="text-[10px] text-white/30">+{job.tech_stack.length - 5}</span>
                )}
              </div>

              {/* Salary + company trust */}
              <div className="flex items-center gap-4">
                <SalaryChip job={job} />
                {job.company.response_rate != null && (
                  <span className="text-[10px] text-white/40">
                    {Math.round(job.company.response_rate * 100)}% response rate
                  </span>
                )}
              </div>
            </div>

            {/* Match score */}
            {job.match_score && (
              <div className="flex-shrink-0">
                <MatchRing score={job.match_score.score} />
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
