import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import {
  api, fetchSkills, deleteAccount,
  fetchMyProjects, createProject, updateProject, deleteProject,
  uploadAvatar, removeAvatar,
  type Project,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { ImageUploader } from '../components/ImageUploader'

function DeleteAccountModal({ username, onConfirm, onCancel, loading }: {
  username: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const [typed, setTyped] = useState('')
  const confirmed = typed === username

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-md glass rounded-2xl p-6 border border-red-500/30"
      >
        <div className="text-red-400 text-3xl mb-3">⚠</div>
        <h2 className="text-lg font-bold text-white mb-2">Delete your account?</h2>
        <p className="text-white/60 text-sm mb-4">
          This permanently deletes your account, profile, applications, and saved searches.
          <strong className="text-white"> This cannot be undone.</strong>
        </p>

        <div className="mb-4">
          <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">
            Type <span className="text-white font-mono">{username}</span> to confirm
          </label>
          <input
            autoFocus
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={username}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm font-mono placeholder-white/20 focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 text-sm transition-colors"
          >
            Cancel
          </button>
          <motion.button
            onClick={onConfirm}
            disabled={!confirmed || loading}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-red-900 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {loading ? 'Deleting…' : 'Delete my account'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ProjectForm({ project, skillsList, onSave, onCancel }: {
  project?: Project
  skillsList: import('../lib/api').Skill[]
  onSave: (data: { title: string; description: string; url: string; tech_stack_ids: number[] }) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(project?.title ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [url, setUrl] = useState(project?.url ?? '')
  const [selectedSkills, setSelectedSkills] = useState<number[]>(project?.tech_stack?.map(s => s.id) ?? [])
  function toggle(id: number) {
    setSelectedSkills(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id])
  }
  return (
    <div className="border border-white/10 rounded-xl p-4 space-y-3">
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Project title *"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500 transition-colors" />
      <textarea value={description} onChange={e => setDescription(e.target.value)}
        placeholder="Short description of what you built..." rows={2}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500 transition-colors resize-none" />
      <input type="url" value={url} onChange={e => setUrl(e.target.value)}
        placeholder="https://github.com/you/project (optional)"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500 transition-colors" />
      <div>
        <p className="text-xs text-white/40 mb-1.5">Tech used</p>
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
          {skillsList.map(s => (
            <button key={s.id} type="button" onClick={() => toggle(s.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selectedSkills.includes(s.id) ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30'}`}>
              {s.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave({ title, description, url, tech_stack_ids: selectedSkills })}
          disabled={!title.trim()}
          className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">Save</button>
        <button onClick={onCancel} className="px-4 py-1.5 text-white/40 hover:text-white/70 text-xs transition-colors">Cancel</button>
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { user, tier, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: skills } = useQuery({ queryKey: ['skills'], queryFn: fetchSkills })
  const { data: projects } = useQuery({ queryKey: ['my-projects'], queryFn: fetchMyProjects })
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [addingProject, setAddingProject] = useState(false)

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-projects'] }); setAddingProject(false) },
  })
  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateProject(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-projects'] }); setEditingProject(null) },
  })
  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-projects'] }),
  })
  const [headline, setHeadline] = useState(user?.profile?.headline ?? '')
  const [yearsExp, setYearsExp] = useState(user?.profile?.years_experience ?? 0)
  const [selectedSkills, setSelectedSkills] = useState<number[]>(user?.profile?.skills?.map((s) => s.id) ?? [])
  const [remotePreference, setRemotePreference] = useState(user?.profile?.remote_preference ?? 'remote')
  const [saved, setSaved] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const updateMutation = useMutation({
    mutationFn: (data: object) => api.patch('/auth/me/', data).then((r) => r.data),
    onSuccess: async () => {
      await refreshUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      logout()
      navigate('/')
    },
  })

  function handleSave() {
    updateMutation.mutate({
      headline, years_experience: yearsExp, skill_ids: selectedSkills, remote_preference: remotePreference,
    })
  }

  function toggleSkill(id: number) {
    setSelectedSkills((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id])
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <div className="flex items-center gap-2">
            {user?.profile?.rank && (() => {
              const r = user.profile.rank as any
              const TIER_COLORS: Record<string, string> = {
                Platinum: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
                Gold:     'text-amber-300 bg-amber-500/10 border-amber-500/30',
                Silver:   'text-slate-300 bg-slate-500/10 border-slate-500/30',
                Bronze:   'text-orange-300 bg-orange-500/10 border-orange-500/30',
                Newcomer: 'text-green-300 bg-green-500/10 border-green-500/30',
              }
              return (
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${TIER_COLORS[r.tier] ?? ''}`}>
                  {r.tier_icon} {r.tier} · {r.score} pts
                </span>
              )
            })()}
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              tier === 'premium'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-white/10 text-white/50 border border-white/10'
            }`}>
              {tier === 'premium' ? '★ Premium' : 'Free'}
            </span>
          </div>
        </div>

        {/* Profile picture */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-xs text-white/50 uppercase tracking-wider mb-4">Profile Picture</h2>
          <ImageUploader
            currentUrl={user?.profile?.avatar ?? null}
            shape="circle"
            fallback={
              <span className="text-3xl font-bold text-violet-300">
                {user?.username?.[0]?.toUpperCase()}
              </span>
            }
            onUpload={async (file) => {
              const res = await uploadAvatar(file)
              return { url: res.avatar }
            }}
            onRemove={async () => { await removeAvatar() }}
            onChanged={refreshUser}
          />
        </div>

        {/* Rank breakdown card */}
        {user?.profile?.rank && (() => {
          const r = user.profile.rank as any
          return (
            <div className="glass rounded-xl p-5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Your Ranking</h2>
                <span className="text-xs text-white/30">Updates when companies rate your work</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total score', value: r.score, highlight: true },
                  { label: 'Portfolio pts', value: r.projects_score },
                  { label: 'Rating pts', value: (r.ratings_score >= 0 ? '+' : '') + r.ratings_score, red: r.ratings_score < 0 },
                  { label: 'Avg rating', value: r.average_rating != null ? `${r.average_rating}/100` : '—' },
                ].map(({ label, value, highlight, red }) => (
                  <div key={label} className="text-center glass rounded-xl p-3">
                    <div className={`text-xl font-bold ${red ? 'text-red-400' : highlight ? 'text-violet-300' : 'text-white'}`}>
                      {value}
                    </div>
                    <div className="text-xs text-white/40 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
              {r.ratings_received > 0 && (
                <p className="text-xs text-white/30 mt-3">
                  Based on {r.ratings_received} company rating{r.ratings_received !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )
        })()}

        <div className="glass rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">Headline</label>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Senior Python Engineer"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">Years of Experience</label>
            <input
              type="number"
              min={0}
              max={50}
              value={yearsExp}
              onChange={(e) => setYearsExp(Number(e.target.value))}
              className="w-32 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wider mb-2">Remote Preference</label>
            <div className="flex gap-2">
              {['onsite', 'hybrid', 'remote'].map((v) => (
                <button
                  key={v}
                  onClick={() => setRemotePreference(v)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors capitalize ${
                    remotePreference === v
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wider mb-2">Skills</label>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {skills?.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleSkill(s.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedSkills.includes(s.id)
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <motion.button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            whileTap={{ scale: 0.97 }}
            className="px-6 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saved ? '✓ Saved!' : updateMutation.isPending ? 'Saving...' : 'Save changes'}
          </motion.button>
        </div>

        {tier === 'free' && (
          <div className="glass rounded-xl p-6 border border-violet-500/20">
            <p className="text-sm text-white/70 mb-3">Upgrade to Premium to unlock exact salaries, apply directly, and track your pipeline.</p>
            <Link to="/pricing" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
              ✦ Upgrade to Premium
            </Link>
          </div>
        )}

        {/* Portfolio */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Portfolio & Finished Work</h2>
            {!addingProject && (
              <button
                onClick={() => setAddingProject(true)}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                + Add project
              </button>
            )}
          </div>

          <div className="space-y-3">
            {addingProject && (
              <ProjectForm
                skillsList={skills ?? []}
                onSave={data => createProjectMutation.mutate(data as any)}
                onCancel={() => setAddingProject(false)}
              />
            )}

            {projects?.map(proj => (
              editingProject?.id === proj.id ? (
                <ProjectForm
                  key={proj.id}
                  project={proj}
                  skillsList={skills ?? []}
                  onSave={data => updateProjectMutation.mutate({ id: proj.id, data })}
                  onCancel={() => setEditingProject(null)}
                />
              ) : (
                <div key={proj.id} className="border border-white/10 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-white text-sm">{proj.title}</div>
                      {proj.description && (
                        <p className="text-white/50 text-xs mt-1 leading-relaxed">{proj.description}</p>
                      )}
                      {proj.url && (
                        <a href={proj.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-violet-400 hover:text-violet-300 transition-colors mt-1 inline-block">
                          {proj.url}
                        </a>
                      )}
                      {proj.tech_stack?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {proj.tech_stack.map(s => (
                            <span key={s.id} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setEditingProject(proj)}
                        className="text-xs text-white/40 hover:text-violet-400 transition-colors">Edit</button>
                      <button onClick={() => deleteProjectMutation.mutate(proj.id)}
                        className="text-xs text-white/40 hover:text-red-400 transition-colors">✕</button>
                    </div>
                  </div>
                </div>
              )
            ))}

            {!addingProject && !projects?.length && (
              <p className="text-white/30 text-sm text-center py-4">
                Add your projects so companies can see your work.
              </p>
            )}
          </div>
        </div>

        {/* Danger zone */}
        <div className="glass rounded-xl p-6 border border-red-500/20">
          <h2 className="text-sm font-semibold text-red-400 mb-1">Danger Zone</h2>
          <p className="text-xs text-white/40 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/70 text-sm transition-colors"
          >
            Delete account
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showDeleteModal && (
          <DeleteAccountModal
            username={user?.username ?? ''}
            onConfirm={() => deleteMutation.mutate()}
            onCancel={() => setShowDeleteModal(false)}
            loading={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
