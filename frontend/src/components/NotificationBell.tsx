import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchNotifications, markNotificationsRead, type Notification } from '../lib/api'

const TYPE_ICON: Record<string, string> = {
  new_application:      '📨',
  application_approved: '🎉',
  interview_scheduled:  '📅',
  job_offer:            '🤝',
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 30_000,
  })

  const markRead = useMutation({
    mutationFn: (ids?: number[]) => markNotificationsRead(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unread = notifications?.filter(n => !n.is_read) ?? []
  const unreadCount = unread.length

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleClick(n: Notification) {
    markRead.mutate([n.id])
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        title="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[var(--app-bg)]"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-[var(--surface-solid)] border border-white/10 rounded-xl shadow-2xl z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 sticky top-0 bg-[var(--surface-solid)]">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markRead.mutate(undefined)}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {!notifications?.length ? (
              <div className="px-4 py-10 text-center text-white/30 text-sm">
                <p className="text-2xl mb-2">🔕</p>
                No notifications yet.
              </div>
            ) : (
              <div>
                {notifications.slice(0, 20).map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors flex gap-3 ${
                      n.is_read ? 'opacity-60' : ''
                    }`}
                  >
                    <span className="text-lg flex-shrink-0">{TYPE_ICON[n.type] ?? '🔔'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white leading-snug">{n.title}</p>
                      {n.message && <p className="text-xs text-white/40 mt-0.5 leading-snug">{n.message}</p>}
                      <p className="text-[10px] text-white/25 mt-1">
                        {new Date(n.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 mt-1.5" />}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
