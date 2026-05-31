import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchSkills } from '../lib/api'

const REMOTE_OPTIONS = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]

const SENIORITY_OPTIONS = [
  { value: 'intern', label: 'Intern' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'principal', label: 'Principal' },
]

function MultiSelect({ param, options }: { param: string; options: { value: string; label: string }[] }) {
  const [params, setParams] = useSearchParams()
  const current = params.getAll(param)

  function toggle(value: string) {
    const next = new URLSearchParams(params)
    next.delete('page')
    const existing = next.getAll(param)
    if (existing.includes(value)) {
      next.delete(param)
      existing.filter((v) => v !== value).forEach((v) => next.append(param, v))
    } else {
      next.append(param, value)
    }
    setParams(next)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => toggle(o.value)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            current.includes(o.value)
              ? 'bg-violet-600 border-violet-500 text-white'
              : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30 hover:text-white/90'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function FilterPanel() {
  const [params, setParams] = useSearchParams()
  const { data: skills } = useQuery({ queryKey: ['skills'], queryFn: fetchSkills })

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    next.delete('page')
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  function clearAll() {
    setParams(new URLSearchParams())
  }

  const hasFilters = [...params.keys()].some((k) => k !== 'page')

  return (
    <aside className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Filters</h2>
        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Clear all
          </button>
        )}
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Location</label>
        <input
          type="text"
          placeholder="Berlin, Remote..."
          defaultValue={params.get('location') ?? ''}
          onChange={(e) => setParam('location', e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
        />
      </div>

      {/* Remote policy */}
      <div>
        <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Work Style</label>
        <MultiSelect param="remote_policy" options={REMOTE_OPTIONS} />
      </div>

      {/* Seniority */}
      <div>
        <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Seniority</label>
        <MultiSelect param="seniority" options={SENIORITY_OPTIONS} />
      </div>

      {/* Tech stack */}
      <div>
        <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Tech Stack</label>
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          {skills?.map((s) => {
            const selected = params.getAll('tech_stack').includes(s.slug)
            return (
              <button
                key={s.id}
                onClick={() => {
                  const next = new URLSearchParams(params)
                  next.delete('page')
                  const current = next.getAll('tech_stack')
                  if (selected) {
                    next.delete('tech_stack')
                    current.filter((v) => v !== s.slug).forEach((v) => next.append('tech_stack', v))
                  } else {
                    next.append('tech_stack', s.slug)
                  }
                  setParams(next)
                }}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selected
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                }`}
              >
                {s.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Salary min */}
      <div>
        <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Min Salary (USD)</label>
        <input
          type="number"
          step="10000"
          placeholder="e.g. 100000"
          defaultValue={params.get('salary_min') ?? ''}
          onChange={(e) => setParam('salary_min', e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
        />
      </div>

      {/* Salary verified only */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={params.get('salary_verified') === 'true'}
            onChange={(e) => setParam('salary_verified', e.target.checked ? 'true' : '')}
            className="accent-violet-500"
          />
          <span className="text-sm text-white/70">Verified salary only</span>
        </label>
      </div>
    </aside>
  )
}
