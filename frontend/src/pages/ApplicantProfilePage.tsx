import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import {
  api, fetchPublicProfile, reviewApplication, fetchRating, submitRating,
  type Application,
} from '../lib/api'

// ── Scheduling / Hire modal ───────────────────────────────────────────────────
function ScheduleModal({ applicantName, onSchedule, onHire, onReject, onCancel, loading }: {
  applicantName: string
  onSchedule: (date: string, notes: string) => void
  onHire: () => void
  onReject: () => void
  onCancel: () => void
  loading: boolean
}) {
  const [tab, setTab] = useState<'schedule' | 'hire' | 'reject'>('schedule')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
        className="relative w-full max-w-md glass rounded-2xl p-6 border border-violet-500/30"
      >
        <h2 className="text-lg font-bold text-white mb-1">Review {applicantName}</h2>
        <p className="text-white/40 text-xs mb-5">Choose how you'd like to proceed with this applicant.</p>

        {/* Tabs */}
        <div className="flex gap-1 p-1 glass rounded-xl mb-5">
          {([
            { key: 'schedule', label: '📅 Schedule Interview' },
            { key: 'hire',     label: '🤝 Hire Immediately' },
            { key: 'reject',   label: '✕ Reject' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t.key ? 'bg-violet-600 text-white' : 'text-white/50 hover:text-white/80'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'schedule' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">Interview Date & Time</label>
              <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">Notes for applicant (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Interview format, location, what to prepare..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500 transition-colors resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-colors">Cancel</button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => onSchedule(date, notes)}
                disabled={!date || loading}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                {loading ? 'Scheduling…' : 'Schedule Interview'}
              </motion.button>
            </div>
          </div>
        )}

        {tab === 'hire' && (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">🤝</div>
              <p className="text-emerald-400 text-sm font-medium">Hire {applicantName} immediately</p>
              <p className="text-white/40 text-xs mt-1">They will receive a job offer notification and their pipeline will update to "Offer".</p>
            </div>
            <div className="flex gap-3">
              <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-colors">Cancel</button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={onHire} disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
                {loading ? 'Hiring…' : '🎉 Hire Now'}
              </motion.button>
            </div>
          </div>
        )}

        {tab === 'reject' && (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">❌</div>
              <p className="text-red-400 text-sm font-medium">Reject {applicantName}</p>
              <p className="text-white/40 text-xs mt-1">Their application will be marked as rejected.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-colors">Cancel</button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={onReject} disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                {loading ? 'Rejecting…' : 'Reject Applicant'}
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
import { useAuth } from '../lib/auth'

const STATUS_STYLE: Record<string, string> = {
  saved:     'bg-blue-500/15 text-blue-400 border-blue-500/20',
  applied:   'bg-violet-500/15 text-violet-400 border-violet-500/20',
  interview: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  offer:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  rejected:  'bg-red-500/15 text-red-400 border-red-500/20',
}

const TIER_COLORS: Record<string, string> = {
  Platinum: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
  Gold:     'text-amber-300 bg-amber-500/10 border-amber-500/30',
  Silver:   'text-slate-300 bg-slate-500/10 border-slate-500/30',
  Bronze:   'text-orange-300 bg-orange-500/10 border-orange-500/30',
  Newcomer: 'text-green-300 bg-green-500/10 border-green-500/30',
}

function RatingSlider({ applicationId, onDone }: { applicationId: number; onDone: () => void }) {
  const [rating, setRating] = useState(70)
  const [feedback, setFeedback] = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => submitRating(applicationId, { rating, feedback }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['received-applications'] })
      qc.invalidateQueries({ queryKey: ['received-application', String(applicationId)] })
      qc.invalidateQueries({ queryKey: ['applicant-rating', applicationId] })
      onDone()
    },
  })

  const isLow = rating < 30
  const color = isLow ? 'text-red-400' : rating < 60 ? 'text-amber-400' : 'text-emerald-400'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/60">Rating</span>
        <span className={`text-2xl font-bold tabular-nums ${color}`}>{rating}<span className="text-sm text-white/30">/100</span></span>
      </div>

      <input
        type="range" min={0} max={100} value={rating}
        onChange={e => setRating(Number(e.target.value))}
        className="w-full accent-violet-500 h-2 rounded-full cursor-pointer"
      />

      {isLow && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          ⚠ Scores below 30/100 will deduct points from this developer's ranking.
        </motion.p>
      )}

      <div>
        <label className="block text-xs text-white/40 mb-1.5">Feedback (optional)</label>
        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          rows={2}
          placeholder="Share what you thought of their work..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500 transition-colors resize-none"
        />
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm font-medium transition-colors"
      >
        {mutation.isPending ? 'Submitting…' : 'Submit rating'}
      </motion.button>
    </div>
  )
}


export function ApplicantProfilePage() {
  const { applicationId } = useParams<{ applicationId: string }>()
  const { isCompany } = useAuth()
  const qc = useQueryClient()
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showRatingForm, setShowRatingForm] = useState(false)

  type AppWithUser = Application & { applicant_username: string }

  const { data: application } = useQuery({
    queryKey: ['received-application', applicationId],
    queryFn: () =>
      api.get<AppWithUser[]>('/jobs/received-applications/')
        .then(r => r.data.find(a => a.id === Number(applicationId))),
    enabled: isCompany && !!applicationId,
  })

  const username = (application as any)?.applicant_username

  const { data: profile, isLoading } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => fetchPublicProfile(username!),
    enabled: !!username,
  })

  const { data: ratingData, refetch: refetchRating } = useQuery({
    queryKey: ['applicant-rating', Number(applicationId)],
    queryFn: () => fetchRating(Number(applicationId)),
    enabled: isCompany && !!applicationId && application?.status === 'interview',
  })

  const reviewMutation = useMutation({
    mutationFn: (payload: { action: 'schedule' | 'hire' | 'rejected'; interview_date?: string; interview_notes?: string }) =>
      reviewApplication(Number(applicationId), payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['received-applications'] })
      qc.invalidateQueries({ queryKey: ['received-application', applicationId] })
      setShowReviewModal(false)
    },
  })

  if (!isCompany) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-white/50">Company accounts only.</p>
      </div>
    )
  }

  const currentStatus = application?.status
  const alreadyReviewed = currentStatus === 'interview' || currentStatus === 'offer' || currentStatus === 'rejected'
  const canRate = currentStatus === 'interview' || currentStatus === 'offer'
  const rank = profile?.profile?.rank

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/company/dashboard"
        className="text-xs text-white/40 hover:text-white/70 mb-6 inline-block transition-colors">
        ← Back to dashboard
      </Link>

      {isLoading || !profile ? (
        <div className="space-y-4 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="glass rounded-2xl" style={{height: i===1?'6rem':i===2?'8rem':'12rem'}} />)}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

          {/* Header */}
          <div className="glass rounded-2xl p-6 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-2xl font-bold text-violet-300">
                {profile.username[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {profile.first_name || profile.last_name
                    ? `${profile.first_name} ${profile.last_name}`.trim()
                    : profile.username}
                </h1>
                <p className="text-white/50 text-sm">@{profile.username}</p>
                {profile.profile?.headline && (
                  <p className="text-white/70 text-sm mt-0.5">{profile.profile.headline}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {currentStatus && (
                <span className={`text-xs px-3 py-1.5 rounded-full border capitalize ${STATUS_STYLE[currentStatus] ?? ''}`}>
                  {currentStatus === 'interview' ? '✓ Approved' : currentStatus}
                </span>
              )}
              {rank && (
                <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${TIER_COLORS[rank.tier] ?? ''}`}>
                  {rank.tier_icon} {rank.tier} · {rank.score} pts
                </span>
              )}
            </div>
          </div>

          {/* Rank breakdown */}
          {rank && (
            <div className="glass rounded-2xl p-5">
              <h2 className="text-xs text-white/40 uppercase tracking-wider mb-4">Developer Ranking</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center glass rounded-xl p-3">
                  <div className={`text-2xl font-bold ${TIER_COLORS[rank.tier]?.split(' ')[0] ?? 'text-white'}`}>{rank.score}</div>
                  <div className="text-xs text-white/40 mt-0.5">Total pts</div>
                </div>
                <div className="text-center glass rounded-xl p-3">
                  <div className="text-2xl font-bold text-white">{rank.projects_score}</div>
                  <div className="text-xs text-white/40 mt-0.5">Portfolio pts</div>
                </div>
                <div className="text-center glass rounded-xl p-3">
                  <div className={`text-2xl font-bold ${rank.ratings_score < 0 ? 'text-red-400' : 'text-white'}`}>{rank.ratings_score >= 0 ? '+' : ''}{rank.ratings_score}</div>
                  <div className="text-xs text-white/40 mt-0.5">Rating pts</div>
                </div>
                <div className="text-center glass rounded-xl p-3">
                  <div className="text-2xl font-bold text-white">{rank.average_rating ?? '—'}</div>
                  <div className="text-xs text-white/40 mt-0.5">Avg rating</div>
                </div>
              </div>
            </div>
          )}

          {/* About */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xs text-white/40 uppercase tracking-wider mb-4">About</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: profile.profile?.years_experience ?? 0, label: 'Years exp.' },
                { value: profile.profile?.skills?.length ?? 0, label: 'Skills' },
                { value: (profile.profile?.remote_preference ?? '—').slice(0, 3), label: 'Work style' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center glass rounded-xl p-4">
                  <div className="text-2xl font-bold text-white capitalize">{value}</div>
                  <div className="text-xs text-white/40 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          {profile.profile?.skills?.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h2 className="text-xs text-white/40 uppercase tracking-wider mb-4">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {profile.profile.skills.map(s => (
                  <span key={s.id} className="text-xs px-3 py-1.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">{s.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xs text-white/40 uppercase tracking-wider mb-4">
              Portfolio & Finished Work
              <span className="ml-2 text-white/20 normal-case">({profile.profile?.projects?.length ?? 0})</span>
            </h2>
            {!profile.profile?.projects?.length ? (
              <p className="text-white/30 text-sm">This applicant hasn't added any portfolio items yet.</p>
            ) : (
              <div className="space-y-4">
                {profile.profile.projects.map(proj => (
                  <div key={proj.id} className="border border-white/10 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-medium text-white text-sm">{proj.title}</div>
                        {proj.description && <p className="text-white/50 text-xs mt-1 leading-relaxed">{proj.description}</p>}
                      </div>
                      {proj.url && (
                        <a href={proj.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex-shrink-0">
                          View →
                        </a>
                      )}
                    </div>
                    {proj.tech_stack?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {proj.tech_stack.map(s => (
                          <span key={s.id} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10">{s.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review actions */}
          {!alreadyReviewed ? (
            <div className="glass rounded-2xl p-6 border border-white/10">
              <h2 className="text-sm font-semibold text-white mb-1">Review this applicant</h2>
              <p className="text-white/40 text-xs mb-5">
                Schedule an interview, hire them immediately, or reject the application.
                The applicant sees the result in their pipeline right away.
              </p>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowReviewModal(true)}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors">
                Review applicant →
              </motion.button>
            </div>
          ) : currentStatus === 'rejected' ? (
            <div className="rounded-2xl p-5 text-center bg-red-500/10 border border-red-500/20">
              <p className="text-sm font-medium text-red-400">✕ You have rejected this applicant</p>
            </div>
          ) : currentStatus === 'interview' ? (
            <div className="rounded-2xl p-5 bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-amber-400">📅 Interview scheduled</p>
                {(application as any)?.interview_scheduled_at && (
                  <p className="text-amber-400/70 text-xs mt-0.5">
                    {new Date((application as any).interview_scheduled_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                )}
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => reviewMutation.mutate({ action: 'hire' })}
                disabled={reviewMutation.isPending}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium transition-colors">
                {reviewMutation.isPending ? 'Hiring…' : '🤝 Hire now'}
              </motion.button>
            </div>
          ) : currentStatus === 'offer' ? (
            <div className="rounded-2xl p-5 text-center bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm font-medium text-emerald-400">🎉 You hired this applicant — offer sent!</p>
            </div>
          ) : null}

          {/* Rating section — only when approved (interview stage) */}
          {canRate && (
            <div className="glass rounded-2xl p-6 border border-violet-500/20">
              <h2 className="text-sm font-semibold text-white mb-1">Rate their work</h2>
              <p className="text-white/40 text-xs mb-4">
                Your rating affects their developer ranking.
                <span className="text-red-400"> Scores below 30/100 deduct points.</span>
              </p>

              {ratingData?.rating ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`text-3xl font-bold tabular-nums ${ratingData.rating.rating < 30 ? 'text-red-400' : ratingData.rating.rating < 60 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {ratingData.rating.rating}<span className="text-sm text-white/30">/100</span>
                    </div>
                    <span className="text-xs text-white/40">Rating submitted</span>
                  </div>
                  {ratingData.rating.feedback && (
                    <p className="text-white/50 text-sm italic">"{ratingData.rating.feedback}"</p>
                  )}
                  {!showRatingForm && (
                    <button onClick={() => setShowRatingForm(true)}
                      className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                      Update rating →
                    </button>
                  )}
                  {showRatingForm && (
                    <RatingSlider applicationId={Number(applicationId)} onDone={() => { setShowRatingForm(false); refetchRating() }} />
                  )}
                </div>
              ) : (
                <RatingSlider applicationId={Number(applicationId)} onDone={() => refetchRating()} />
              )}
            </div>
          )}

        </motion.div>
      )}

      <AnimatePresence>
        {showReviewModal && (
          <ScheduleModal
            applicantName={profile?.username ?? ''}
            onSchedule={(date, notes) => reviewMutation.mutate({
              action: 'schedule',
              interview_date: new Date(date).toISOString(),
              interview_notes: notes,
            })}
            onHire={() => reviewMutation.mutate({ action: 'hire' })}
            onReject={() => reviewMutation.mutate({ action: 'rejected' })}
            onCancel={() => setShowReviewModal(false)}
            loading={reviewMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
