import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { fetchSkills, createJob, updateJob, api, type Job } from '../lib/api'
import { useAuth } from '../lib/auth'

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

type FormState = {
  title: string
  location: string
  remote_policy: string
  seniority: string
  salary_min: string
  salary_max: string
  currency: string
  salary_verified: boolean
  salary_band_hint: string
  application_link: string
  is_active: boolean
  tech_stack_ids: number[]
}

const EMPTY: FormState = {
  title: '', location: '', remote_policy: 'hybrid', seniority: 'mid',
  salary_min: '', salary_max: '', currency: 'PHP',
  salary_verified: false, salary_band_hint: '', application_link: '',
  is_active: true, tech_stack_ids: [],
}

export function PostJobPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isCompany } = useAuth()

  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: skills } = useQuery({ queryKey: ['skills'], queryFn: fetchSkills })

  // Load existing job for edit mode
  const { data: existingJob } = useQuery({
    queryKey: ['my-job-edit', id],
    queryFn: () => api.get<Job>(`/jobs/my-jobs/${id}/`).then(r => r.data),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existingJob) {
      setForm({
        title: existingJob.title,
        location: existingJob.location,
        remote_policy: existingJob.remote_policy,
        seniority: existingJob.seniority,
        salary_min: existingJob.salary_range && !existingJob.salary_range.masked ? String(existingJob.salary_range.min ?? '') : '',
        salary_max: existingJob.salary_range && !existingJob.salary_range.masked ? String(existingJob.salary_range.max ?? '') : '',
        currency: existingJob.salary_range && !existingJob.salary_range.masked ? existingJob.salary_range.currency : 'PHP',
        salary_verified: existingJob.salary_verified,
        salary_band_hint: existingJob.salary_band_hint,
        application_link: existingJob.application_link && !existingJob.application_link.masked ? existingJob.application_link.url : '',
        is_active: existingJob.is_active,
        tech_stack_ids: existingJob.tech_stack.map(s => s.id),
      })
    }
  }, [existingJob])

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEdit ? updateJob(Number(id), data) : createJob(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-jobs'] })
      navigate('/company/dashboard')
    },
    onError: (err: any) => {
      const data = err?.response?.data ?? {}
      const flat: Record<string, string> = {}
      for (const [k, v] of Object.entries(data)) {
        flat[k] = Array.isArray(v) ? (v as string[]).join(' ') : String(v)
      }
      setErrors(flat)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    mutation.mutate({
      ...form,
      salary_min: form.salary_min ? Number(form.salary_min) : null,
      salary_max: form.salary_max ? Number(form.salary_max) : null,
    })
  }

  function toggleSkill(id: number) {
    setForm(f => ({
      ...f,
      tech_stack_ids: f.tech_stack_ids.includes(id)
        ? f.tech_stack_ids.filter(s => s !== id)
        : [...f.tech_stack_ids, id],
    }))
  }

  if (!isCompany) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-white/50">Company accounts only.</p>
        <Link to="/register/company" className="text-violet-400 text-sm mt-2 inline-block">Register as a company →</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/company/dashboard" className="text-xs text-white/40 hover:text-white/70 mb-6 inline-block transition-colors">
        ← Back to dashboard
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-6">
          {isEdit ? 'Edit job listing' : 'Post a new job'}
        </h1>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-7 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">Job Title *</label>
            <input
              required
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Senior Backend Engineer"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500 transition-colors"
            />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">Location *</label>
            <input
              required
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Bonifacio Global City, Taguig"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Remote policy + Seniority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">Work Style</label>
              <div className="flex flex-col gap-1.5">
                {REMOTE_OPTIONS.map(o => (
                  <button key={o.value} type="button" onClick={() => setForm(f => ({ ...f, remote_policy: o.value }))}
                    className={`text-xs px-3 py-2 rounded-lg border text-left transition-colors ${form.remote_policy === o.value ? 'bg-violet-600 border-violet-500 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">Seniority</label>
              <div className="flex flex-col gap-1.5">
                {SENIORITY_OPTIONS.map(o => (
                  <button key={o.value} type="button" onClick={() => setForm(f => ({ ...f, seniority: o.value }))}
                    className={`text-xs px-3 py-2 rounded-lg border text-left transition-colors ${form.seniority === o.value ? 'bg-violet-600 border-violet-500 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Salary */}
          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">Salary Range (PHP / month)</label>
            <div className="flex items-center gap-3">
              <input type="number" value={form.salary_min} onChange={e => setForm(f => ({ ...f, salary_min: e.target.value }))}
                placeholder="Min" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500 transition-colors" />
              <span className="text-white/30 text-sm">–</span>
              <input type="number" value={form.salary_max} onChange={e => setForm(f => ({ ...f, salary_max: e.target.value }))}
                placeholder="Max" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" id="sv" checked={form.salary_verified} onChange={e => setForm(f => ({ ...f, salary_verified: e.target.checked }))} className="accent-violet-500" />
              <label htmlFor="sv" className="text-xs text-white/50 cursor-pointer">Mark salary as verified</label>
            </div>
          </div>

          {/* Salary hint */}
          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">Salary Hint (shown to free users)</label>
            <input value={form.salary_band_hint} onChange={e => setForm(f => ({ ...f, salary_band_hint: e.target.value }))}
              placeholder='e.g. "Top 20% for Backend roles in BGC"'
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500 transition-colors" />
          </div>

          {/* Tech stack */}
          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wider mb-2">Tech Stack</label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {skills?.map(s => (
                <button key={s.id} type="button" onClick={() => toggleSkill(s.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${form.tech_stack_ids.includes(s.id) ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'}`}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-violet-500" />
            <label htmlFor="active" className="text-sm text-white/70 cursor-pointer">Publish immediately (visible to job seekers)</label>
          </div>

          {errors.non_field_errors && <p className="text-red-400 text-sm">{errors.non_field_errors}</p>}

          <motion.button type="submit" disabled={mutation.isPending} whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold text-sm transition-colors">
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Post job listing'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
