import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { fetchMyJobs, fetchMyCompany, deleteJob, fetchReceivedApplications, type Job, type Application } from '../lib/api'
import { useAuth } from '../lib/auth'

const REMOTE_LABEL: Record<string, string> = {
  remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site',
}
const SENIORITY_LABEL: Record<string, string> = {
  intern: 'Intern', junior: 'Junior', mid: 'Mid',
  senior: 'Senior', lead: 'Lead', principal: 'Principal',
}
const STATUS_STYLE: Record<string, string> = {
  saved:     'bg-blue-500/15 text-blue-400 border-blue-500/20',
  applied:   'bg-violet-500/15 text-violet-400 border-violet-500/20',
  interview: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  offer:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  rejected:  'bg-red-500/15 text-red-400 border-red-500/20',
}

function JobRow({ job, onDelete }: { job: Job; onDelete: (id: number) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="glass glass-hover rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap"
    >
      <div className="min-w-0">
        <div className="font-medium text-white text-sm">{job.title}</div>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-xs text-white/40">📍 {job.location}</span>
          <span className="text-xs text-white/40">{REMOTE_LABEL[job.remote_policy]}</span>
          <span className="text-xs text-white/40">{SENIORITY_LABEL[job.seniority]}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
            job.is_active
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
              : 'bg-white/10 text-white/40 border-white/10'
          }`}>
            {job.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to={`/company/jobs/${job.id}/edit`}
          className="px-3 py-1.5 text-xs glass rounded-lg text-violet-400 hover:text-violet-300 border border-violet-500/20 hover:border-violet-500/50 transition-colors"
        >
          Edit
        </Link>
        <button
          onClick={() => onDelete(job.id)}
          className="px-3 py-1.5 text-xs rounded-lg text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
        >
          Delete
        </button>
      </div>
    </motion.div>
  )
}

function ApplicationRow({ app }: { app: Application & { applicant_username?: string } }) {
  const navigate = useNavigate()
  const daysSince = Math.floor((Date.now() - new Date(app.created_at).getTime()) / 86400000)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/company/applicants/${app.id}`)}
      className="glass glass-hover rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-400 font-bold text-sm flex-shrink-0">
          {app.applicant_username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-white text-sm">{app.applicant_username ?? 'Unknown'}</div>
          <div className="text-xs text-white/40 mt-0.5">
            applied to <span className="text-white/60">{app.job.title}</span> · {daysSince}d ago
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`text-xs px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLE[app.status] ?? 'bg-white/10 text-white/50 border-white/10'}`}>
          {app.status === 'interview' ? '✓ Approved' : app.status}
        </span>
        <span className="text-white/30 text-sm">→</span>
      </div>
    </motion.div>
  )
}

type Tab = 'jobs' | 'applications'

export function CompanyDashboardPage() {
  const { isCompany } = useAuth()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('jobs')

  const { data: company } = useQuery({
    queryKey: ['my-company'],
    queryFn: fetchMyCompany,
    enabled: isCompany,
  })

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['my-jobs'],
    queryFn: fetchMyJobs,
    enabled: isCompany,
  })

  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ['received-applications'],
    queryFn: fetchReceivedApplications,
    enabled: isCompany && activeTab === 'applications',
  })

  const deleteMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-jobs'] }),
  })

  if (!isCompany) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-white/50 mb-4">This page is for company accounts.</p>
        <Link to="/register/company" className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm">
          Register as a company
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold text-white">{company?.name ?? '…'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                Company
              </span>
            </div>
            <p className="text-white/40 text-sm">
              {jobs?.length ?? 0} jobs · {applications?.length ?? '?'} applications received
            </p>
          </div>
          <Link
            to="/company/jobs/new"
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            + Post a job
          </Link>
        </div>
      </motion.div>

      {/* Company info card */}
      {company && (
        <div className="glass rounded-xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              {company.description && (
                <p className="text-sm text-white/60 mb-2">{company.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-xs text-white/40">
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    {company.website}
                  </a>
                )}
                {company.response_rate != null && (
                  <span>📬 {Math.round(company.response_rate * 100)}% response rate</span>
                )}
              </div>
            </div>
            <Link
              to="/company/settings"
              className="text-xs text-white/40 hover:text-white/70 border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              Edit company →
            </Link>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass rounded-xl mb-6 w-fit">
        {(['jobs', 'applications'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === tab
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {tab === 'jobs' ? `Jobs (${jobs?.length ?? 0})` : `Applications (${applications?.length ?? 0})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'jobs' && (
          <motion.div
            key="jobs"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {jobsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 glass rounded-xl animate-pulse" />)}
              </div>
            ) : jobs?.length === 0 ? (
              <div className="text-center py-16 glass rounded-xl">
                <p className="text-white/30 mb-3">No jobs posted yet.</p>
                <Link
                  to="/company/jobs/new"
                  className="text-violet-400 hover:text-violet-300 text-sm transition-colors"
                >
                  Post your first job →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {jobs?.map(job => (
                    <JobRow
                      key={job.id}
                      job={job}
                      onDelete={id => deleteMutation.mutate(id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'applications' && (
          <motion.div
            key="applications"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {appsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 glass rounded-xl animate-pulse" />)}
              </div>
            ) : applications?.length === 0 ? (
              <div className="text-center py-16 glass rounded-xl">
                <p className="text-white/30 mb-1">No applications yet.</p>
                <p className="text-white/20 text-xs">Applications will appear here when developers apply to your jobs.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {applications?.map(app => (
                  <ApplicationRow key={app.id} app={app as any} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
