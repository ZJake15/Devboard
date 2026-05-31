import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

interface AuditEntry {
  id: number
  username: string
  action: string
  action_display: string
  resource_type: string
  resource_id: number | null
  ip_address: string | null
  metadata: Record<string, unknown>
  created_at: string
}

interface PaginatedAudit {
  count: number
  next: string | null
  previous: string | null
  results: AuditEntry[]
}

interface ActionChoice {
  value: string
  label: string
}

const ACTION_COLORS: Record<string, string> = {
  'user.register':       'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'user.login':          'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'user.logout':         'bg-slate-500/15 text-slate-400 border-slate-500/30',
  'user.profile_update': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  'user.tier_upgrade':   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'job.view':            'bg-violet-500/15 text-violet-400 border-violet-500/30',
  'application.create':  'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  'application.update':  'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'application.delete':  'bg-red-500/15 text-red-400 border-red-500/30',
  'saved_search.create': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'saved_search.delete': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'salary.submit':       'bg-teal-500/15 text-teal-400 border-teal-500/30',
}

function MetadataCell({ meta }: { meta: Record<string, unknown> }) {
  const entries = Object.entries(meta).filter(([k]) => k !== 'username')
  if (!entries.length) return <span className="text-white/20">—</span>
  return (
    <span className="text-xs text-white/50 font-mono">
      {entries.map(([k, v]) => `${k}: ${v}`).join(' · ')}
    </span>
  )
}

// Summary card shown at the top for login activity
function LoginSummaryCard({ entries }: { entries: AuditEntry[] }) {
  const logins = entries.filter(e => e.action === 'user.login')
  if (!logins.length) return null

  return (
    <div className="glass rounded-xl p-5 border border-blue-500/20 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-blue-400 text-lg">🔑</span>
        <h2 className="text-sm font-semibold text-white">Recent Logins</h2>
        <span className="text-xs text-white/30">{logins.length} on this page</span>
      </div>
      <div className="space-y-2">
        {logins.slice(0, 5).map(entry => (
          <div key={entry.id} className="flex items-center justify-between gap-4 py-2 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-400 text-xs font-bold flex-shrink-0">
                {entry.username?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0">
                <span className="text-sm font-medium text-white">{entry.username}</span>
                <div className="text-xs text-white/40 mt-0.5">
                  {new Date(entry.created_at).toLocaleString('en-PH', {
                    weekday: 'short', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300">
                {entry.ip_address ?? 'unknown IP'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AuditLogPage() {
  const { user, isAuthenticated } = useAuth()
  const [params, setParams] = useSearchParams()
  const page = parseInt(params.get('page') ?? '1', 10)
  const actionFilter = params.get('action') ?? ''

  const queryParams: Record<string, string> = {}
  if (actionFilter) queryParams.action = actionFilter
  if (page > 1) queryParams.page = String(page)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', queryParams],
    queryFn: () => api.get<PaginatedAudit>('/audit/', { params: queryParams }).then(r => r.data),
    enabled: isAuthenticated,
  })

  const { data: actionChoices } = useQuery({
    queryKey: ['audit-actions'],
    queryFn: () => api.get<ActionChoice[]>('/audit/actions/').then(r => r.data),
    enabled: isAuthenticated,
  })

  // Fetch all login events for the summary card (no pagination filter)
  const { data: loginData } = useQuery({
    queryKey: ['audit-log-logins'],
    queryFn: () =>
      api.get<PaginatedAudit>('/audit/', { params: { action: 'user.login' } }).then(r => r.data),
    enabled: isAuthenticated && !actionFilter,
  })

  function setPage(p: number) {
    const next = new URLSearchParams(params)
    next.set('page', String(p))
    setParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function setAction(value: string) {
    const next = new URLSearchParams(params)
    next.delete('page')
    if (value) next.set('action', value)
    else next.delete('action')
    setParams(next)
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-white/50 mb-4">Sign in to view your audit log.</p>
        <Link to="/login" className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm">Sign in</Link>
      </div>
    )
  }

  const isStaff = user?.is_staff ?? false
  const pageSize = 12
  const totalPages = data ? Math.ceil(data.count / pageSize) : 1

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Log</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {isStaff ? 'All user activity' : 'Your account activity'} · {data?.count ?? '…'} entries
            </p>
          </div>
          <select
            value={actionFilter}
            onChange={e => setAction(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
          >
            <option value="">All actions</option>
            {actionChoices?.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Login summary card — shown when no action filter is active */}
      {!actionFilter && loginData?.results && (
        <LoginSummaryCard entries={loginData.results} />
      )}

      {/* Full activity table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Time</th>
                {isStaff && <th className="text-left px-4 py-3">User</th>}
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Resource</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Details</th>
                {/* IP always visible — key column for login tracking */}
                <th className="text-left px-4 py-3">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5 animate-pulse">
                      <td className="px-4 py-3"><div className="h-3 w-28 bg-white/10 rounded" /></td>
                      {isStaff && <td className="px-4 py-3"><div className="h-3 w-20 bg-white/10 rounded" /></td>}
                      <td className="px-4 py-3"><div className="h-5 w-32 bg-white/10 rounded-full" /></td>
                      <td className="px-4 py-3 hidden sm:table-cell"><div className="h-3 w-24 bg-white/10 rounded" /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><div className="h-3 w-40 bg-white/10 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-24 bg-white/10 rounded" /></td>
                    </tr>
                  ))
                : data?.results.map((entry, i) => {
                    const isLogin = entry.action === 'user.login'
                    return (
                      <motion.tr
                        key={entry.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className={`border-b border-white/5 transition-colors ${
                          isLogin ? 'bg-blue-500/[0.03] hover:bg-blue-500/[0.06]' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="px-4 py-3 text-white/40 whitespace-nowrap text-xs font-mono">
                          {new Date(entry.created_at).toLocaleString('en-PH', {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        {isStaff && (
                          <td className="px-4 py-3 text-white/70 font-medium">{entry.username}</td>
                        )}
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${ACTION_COLORS[entry.action] ?? 'bg-white/10 text-white/50 border-white/10'}`}>
                            {entry.action_display}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/40 hidden sm:table-cell text-xs">
                          {entry.resource_type
                            ? `${entry.resource_type}${entry.resource_id ? ` #${entry.resource_id}` : ''}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <MetadataCell meta={entry.metadata} />
                        </td>
                        <td className="px-4 py-3">
                          {entry.ip_address ? (
                            <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                              isLogin
                                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                                : 'text-white/40'
                            }`}>
                              {entry.ip_address}
                            </span>
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                        </td>
                      </motion.tr>
                    )
                  })}
            </tbody>
          </table>
        </div>

        {data?.results.length === 0 && !isLoading && (
          <div className="text-center py-12 text-white/30">
            <p>No audit entries{actionFilter ? ' for this action' : ''}.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 text-sm rounded-lg glass glass-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ← Prev
          </button>
          <span className="text-sm text-white/40">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm rounded-lg glass glass-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
