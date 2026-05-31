import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { fetchJobs } from '../lib/api'
import { JobCard } from '../components/JobCard'
import { FilterPanel } from '../components/FilterPanel'

function SkeletonCard() {
  return (
    <div className="glass rounded-xl p-5 animate-pulse">
      <div className="flex gap-3 mb-3">
        <div className="w-6 h-6 rounded bg-white/10" />
        <div className="h-3 w-24 rounded bg-white/10" />
      </div>
      <div className="h-5 w-3/4 rounded bg-white/10 mb-2" />
      <div className="h-3 w-1/2 rounded bg-white/10 mb-3" />
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => <div key={i} className="h-5 w-16 rounded-full bg-white/10" />)}
      </div>
    </div>
  )
}

function Pagination({ count, page, onPage }: { count: number; page: number; onPage: (p: number) => void }) {
  const pageSize = 12
  const totalPages = Math.ceil(count / pageSize)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="px-4 py-2 text-sm rounded-lg glass glass-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        ← Prev
      </button>
      <span className="text-sm text-white/50">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        className="px-4 py-2 text-sm rounded-lg glass glass-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        Next →
      </button>
    </div>
  )
}

export function JobListPage() {
  const [params, setParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const page = parseInt(params.get('page') ?? '1', 10)
  const search = params.get('search') ?? ''

  const queryParams: Record<string, string> = {}
  params.forEach((v, k) => { queryParams[k] = v })

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', Object.fromEntries(params)],
    queryFn: () => fetchJobs(queryParams),
    placeholderData: (prev) => prev,
  })

  function setSearch(value: string) {
    const next = new URLSearchParams(params)
    next.delete('page')
    if (value) next.set('search', value)
    else next.delete('search')
    setParams(next)
  }

  function setPage(p: number) {
    const next = new URLSearchParams(params)
    next.set('page', String(p))
    setParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          Find your next <span className="text-gradient">engineering role</span>
        </h1>
        <p className="text-white/50 text-sm">
          {data?.count ?? '...'} active jobs · transparent salaries for premium members
        </p>
      </motion.div>

      {/* Search bar */}
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Search jobs, companies, or tech..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
        />
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 md:hidden px-3 py-1.5 text-xs glass rounded-lg text-white/60"
        >
          Filters
        </button>
      </div>

      <div className="flex gap-8">
        {/* Filters sidebar — desktop */}
        <div className="hidden md:block w-56 flex-shrink-0">
          <FilterPanel />
        </div>

        {/* Mobile filter drawer */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 md:hidden"
            >
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowFilters(false)} />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25 }}
                className="absolute bottom-0 left-0 right-0 bg-[var(--surface-solid)] rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-white">Filters</h3>
                  <button onClick={() => setShowFilters(false)} className="text-white/50 hover:text-white">✕</button>
                </div>
                <FilterPanel />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Job grid */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : data?.results.length === 0 ? (
            <div className="text-center py-16 text-white/40">
              <p className="text-3xl mb-2">🔍</p>
              <p>No jobs found. Try adjusting your filters.</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div layout className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                {data?.results.map((job, i) => (
                  <JobCard key={job.id} job={job} index={i} />
                ))}
              </motion.div>
            </AnimatePresence>
          )}

          {data && <Pagination count={data.count} page={page} onPage={setPage} />}
        </div>
      </div>
    </div>
  )
}
