import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { fetchSavedSearches, deleteSavedSearch, createSavedSearch } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useState } from 'react'

export function SavedSearchesPage() {
  const { isAuthenticated } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: searches, isLoading } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: fetchSavedSearches,
    enabled: isAuthenticated,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSavedSearch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-searches'] }),
  })

  const saveMutation = useMutation({
    mutationFn: createSavedSearch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-searches'] })
      setNewName('')
      setSaving(false)
    },
  })

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-white/50 mb-4">Sign in to save your searches.</p>
        <Link to="/login" className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm">Sign in</Link>
      </div>
    )
  }

  const currentParams = Object.fromEntries(params.entries())
  const hasCurrentSearch = Object.keys(currentParams).some((k) => k !== 'page')

  function restoreSearch(queryParams: Record<string, string>) {
    const sp = new URLSearchParams(queryParams)
    navigate(`/?${sp.toString()}`)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Saved Searches</h1>

        {/* Save current search */}
        {hasCurrentSearch && (
          <div className="glass rounded-xl p-5 border border-violet-500/20">
            <p className="text-sm text-white/70 mb-3">Save your current filters as a named search:</p>
            {saving ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Remote Python Senior"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
                <button
                  onClick={() => saveMutation.mutate({ name: newName, query_params: currentParams, notify: false })}
                  disabled={!newName || saveMutation.isPending}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
                >
                  Save
                </button>
                <button onClick={() => setSaving(false)} className="text-white/40 hover:text-white/70 text-sm px-2">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSaving(true)}
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                + Save current search
              </button>
            )}
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 glass rounded-xl animate-pulse" />)}
          </div>
        ) : searches?.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <p>No saved searches yet.</p>
            <Link to="/" className="text-violet-400 hover:text-violet-300 text-sm mt-2 inline-block">Browse jobs →</Link>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {searches?.map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="glass glass-hover rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-medium text-white text-sm">{s.name}</div>
                    <div className="text-xs text-white/40 mt-0.5">
                      {Object.entries(s.query_params).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => restoreSearch(s.query_params)}
                      className="text-xs px-3 py-1.5 glass rounded-lg text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(s.id)}
                      className="text-xs text-white/30 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  )
}
