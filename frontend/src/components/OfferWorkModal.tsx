import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchPublicProfile, offerJob, type Job, type PublicProfile } from '../lib/api'

const TIER_COLORS: Record<string, string> = {
  Platinum: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
  Gold:     'text-amber-300 bg-amber-500/10 border-amber-500/30',
  Silver:   'text-slate-300 bg-slate-500/10 border-slate-500/30',
  Bronze:   'text-orange-300 bg-orange-500/10 border-orange-500/30',
  Newcomer: 'text-green-300 bg-green-500/10 border-green-500/30',
}

export function OfferWorkModal({ jobs, onClose }: { jobs: Job[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [username, setUsername] = useState('')
  const [jobId, setJobId] = useState<number | ''>(jobs[0]?.id ?? '')
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [lookupError, setLookupError] = useState('')
  const [done, setDone] = useState(false)

  const lookup = useMutation({
    mutationFn: (name: string) => fetchPublicProfile(name.trim()),
    onSuccess: (p) => { setProfile(p); setLookupError('') },
    onError: () => { setProfile(null); setLookupError('No developer found with that username.') },
  })

  const offer = useMutation({
    mutationFn: () => offerJob(username.trim(), Number(jobId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['received-applications'] })
      setDone(true)
    },
  })

  const offerError = (offer.error as any)?.response?.data?.detail

  const selectedJob = jobs.find(j => j.id === Number(jobId))
  const rank = profile?.profile?.rank

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
        className="relative w-full max-w-md glass rounded-2xl p-6 border border-violet-500/30 max-h-[90vh] overflow-y-auto"
      >
        {done ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-lg font-bold text-white mb-1">Offer sent!</h2>
            <p className="text-white/50 text-sm mb-6">
              <span className="text-white">{username}</span> has been offered{' '}
              <span className="text-white">{selectedJob?.title}</span>. They'll see it in their pipeline.
            </p>
            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
              Done
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-white mb-1">Offer work to a developer</h2>
            <p className="text-white/40 text-xs mb-5">
              Enter a developer's username, pick a role, and send them a direct job offer.
            </p>

            {/* Username lookup */}
            <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">Developer username</label>
            <div className="flex gap-2 mb-2">
              <input
                value={username}
                onChange={e => { setUsername(e.target.value); setProfile(null); setLookupError('') }}
                placeholder="e.g. premium_user"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500 transition-colors"
              />
              <button
                onClick={() => username.trim() && lookup.mutate(username)}
                disabled={!username.trim() || lookup.isPending}
                className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white text-sm transition-colors"
              >
                {lookup.isPending ? '…' : 'Look up'}
              </button>
            </div>
            {lookupError && <p className="text-red-400 text-xs mb-3">{lookupError}</p>}

            {/* Developer preview */}
            {profile && (
              <div className="border border-white/10 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-violet-600/30 border border-violet-500/30 flex items-center justify-center font-bold text-violet-300">
                    {profile.profile?.avatar ? (
                      <img src={profile.profile.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      profile.username[0].toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">{profile.username}</div>
                    {profile.profile?.headline && (
                      <div className="text-xs text-white/40 truncate">{profile.profile.headline}</div>
                    )}
                  </div>
                  {rank && (
                    <span className={`ml-auto text-[10px] px-2 py-1 rounded-full border font-medium ${TIER_COLORS[rank.tier] ?? ''}`}>
                      {rank.tier_icon} {rank.tier}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.profile?.skills?.slice(0, 6).map(s => (
                    <span key={s.id} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                      {s.name}
                    </span>
                  ))}
                  {!profile.profile?.skills?.length && (
                    <span className="text-xs text-white/30">No skills listed</span>
                  )}
                </div>
              </div>
            )}

            {/* Job select */}
            <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">Offer this role</label>
            {jobs.length === 0 ? (
              <p className="text-xs text-amber-400 mb-4">You have no jobs posted yet. Post a job first.</p>
            ) : (
              <select
                value={jobId}
                onChange={e => setJobId(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors mb-4"
              >
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title} — {j.location}</option>
                ))}
              </select>
            )}

            {offerError && <p className="text-red-400 text-xs mb-3">{offerError}</p>}

            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-colors">
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => offer.mutate()}
                disabled={!profile || !jobId || offer.isPending}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                {offer.isPending ? 'Sending…' : '🤝 Send offer'}
              </motion.button>
            </div>
            {!profile && (
              <p className="text-white/25 text-[11px] text-center mt-2">Look up a developer first to enable the offer.</p>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
