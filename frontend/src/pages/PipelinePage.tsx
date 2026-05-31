import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  fetchApplications, deleteApplication, fetchNotifications, markNotificationsRead,
  respondToOffer, type Application,
} from '../lib/api'
import { useAuth } from '../lib/auth'

const COLUMNS: { key: string; label: string; color: string }[] = [
  { key: 'saved',     label: 'Saved',     color: 'bg-blue-500/20 border-blue-500/30 text-blue-300' },
  { key: 'applied',   label: 'Applied',   color: 'bg-violet-500/20 border-violet-500/30 text-violet-300' },
  { key: 'interview', label: 'Interview', color: 'bg-amber-500/20 border-amber-500/30 text-amber-300' },
  { key: 'offer',     label: 'Offer 🎉',  color: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' },
  { key: 'rejected',  label: 'Rejected',  color: 'bg-red-500/20 border-red-500/30 text-red-300' },
]

function AppCard({ app, onDelete, onRespond, responding }: {
  app: Application
  onDelete?: (id: number) => void
  onRespond?: (id: number, response: 'accepted' | 'declined') => void
  responding?: boolean
}) {
  const navigate = useNavigate()
  const daysSince = Math.floor((Date.now() - new Date(app.created_at).getTime()) / 86400000)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={() => navigate(`/jobs/${app.job.id}`)}
      className="glass glass-hover rounded-xl p-4 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-white/40 mb-0.5">{app.job.company.name}</div>
          <div className="font-medium text-white text-sm leading-tight">{app.job.title}</div>
          <div className="text-xs text-white/40 mt-1">📍 {app.job.location} · {daysSince}d ago</div>

          {/* Interview scheduled info */}
          {app.interview_scheduled_at && (
            <div className="mt-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1">
              📅 Interview: {new Date(app.interview_scheduled_at).toLocaleString('en-PH', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </div>
          )}

          {/* Offer state */}
          {app.status === 'offer' && app.offer_response !== 'accepted' && (
            <div className="mt-2 text-xs text-emerald-400">🎉 You received a job offer!</div>
          )}
          {app.offer_response === 'accepted' && (
            <div className="mt-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-1">
              ✓ You accepted this offer
            </div>
          )}
        </div>

        {/* Only saved jobs can be removed by the user */}
        {app.status === 'saved' && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(app.id) }}
            className="flex-shrink-0 text-white/25 hover:text-red-400 transition-colors text-sm px-1"
            title="Remove saved job"
          >
            ✕
          </button>
        )}
      </div>

      {/* Accept / Decline buttons on an active, unanswered offer */}
      {app.status === 'offer' && !app.offer_response && onRespond && (
        <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onRespond(app.id, 'accepted')}
            disabled={responding}
            className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
          >
            {responding ? '…' : '✓ Accept offer'}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onRespond(app.id, 'declined')}
            disabled={responding}
            className="flex-1 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50 text-xs font-medium transition-colors"
          >
            Decline
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}

export function PipelinePage() {
  const { isAuthenticated, tier } = useAuth()
  const qc = useQueryClient()
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const { data: apps, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: fetchApplications,
    enabled: isAuthenticated,
  })

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteApplication,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  })

  const respondMutation = useMutation({
    mutationFn: ({ id, response }: { id: number; response: 'accepted' | 'declined' }) =>
      respondToOffer(id, response),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  })

  // Unread approval/offer notifications
  const approvalNotifs = notifications?.filter(
    n => !n.is_read && (n.type === 'interview_scheduled' || n.type === 'application_approved' || n.type === 'job_offer')
  ) ?? []

  function dismissBanner() {
    setBannerDismissed(true)
    if (approvalNotifs.length) {
      markNotificationsRead(approvalNotifs.map(n => n.id))
        .then(() => qc.invalidateQueries({ queryKey: ['notifications'] }))
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-white/50 mb-4">Sign in to access your pipeline.</p>
        <Link to="/login" className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm">Sign in</Link>
      </div>
    )
  }

  if (tier !== 'premium') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-white mb-2">Premium feature</h2>
        <p className="text-white/50 mb-6 text-sm">Upgrade to Premium to track your applications with a Kanban pipeline.</p>
        <Link to="/pricing" className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-colors">
          ✦ Upgrade to Premium
        </Link>
      </div>
    )
  }

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = apps?.filter(a => a.status === col.key) ?? []
    return acc
  }, {} as Record<string, Application[]>)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Application Pipeline</h1>
        <p className="text-white/50 text-sm">{apps?.length ?? 0} applications tracked · statuses are updated by companies</p>
      </motion.div>

      {/* Approval notification banner */}
      <AnimatePresence>
        {!bannerDismissed && approvalNotifs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-5 py-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-emerald-400 font-medium text-sm">
                  🎉 {approvalNotifs.length === 1
                    ? approvalNotifs[0].title
                    : `You have ${approvalNotifs.length} new updates on your applications!`}
                </p>
                {approvalNotifs.length === 1 && approvalNotifs[0].message && (
                  <p className="text-emerald-400/70 text-xs mt-0.5">{approvalNotifs[0].message}</p>
                )}
              </div>
              <button onClick={dismissBanner} className="text-emerald-400/60 hover:text-emerald-400 transition-colors text-sm flex-shrink-0">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-4 min-w-max">
          {isLoading
            ? COLUMNS.map(col => (
                <div key={col.key} className="w-64 flex-shrink-0">
                  <div className="h-8 glass rounded-lg animate-pulse mb-3" />
                  {[1, 2].map(i => <div key={i} className="h-24 glass rounded-xl animate-pulse mb-2" />)}
                </div>
              ))
            : COLUMNS.map(col => (
                <div key={col.key} className="w-64 flex-shrink-0 flex flex-col">
                  <div className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg border mb-3 inline-flex items-center gap-2 self-start ${col.color}`}>
                    {col.label}
                    <span className="opacity-60">{grouped[col.key].length}</span>
                  </div>

                  <div className="flex flex-col gap-2 flex-1">
                    <AnimatePresence>
                      {grouped[col.key].map(app => (
                        <AppCard
                          key={app.id}
                          app={app}
                          onDelete={col.key === 'saved' ? id => deleteMutation.mutate(id) : undefined}
                          onRespond={(id, response) => respondMutation.mutate({ id, response })}
                          responding={respondMutation.isPending}
                        />
                      ))}
                    </AnimatePresence>
                    <div className="mt-2 h-16 border border-dashed border-white/10 rounded-xl flex items-center justify-center text-white/15 text-xs">
                      {grouped[col.key].length === 0 ? 'Empty' : ''}
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {(!apps || apps.length === 0) && !isLoading && (
        <div className="text-center py-8 text-white/40">
          <p className="mb-2">No applications yet.</p>
          <Link to="/" className="text-violet-400 hover:text-violet-300 text-sm">Browse jobs and apply →</Link>
        </div>
      )}
    </div>
  )
}
