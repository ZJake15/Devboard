import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { fetchMyCompany, updateMyCompany, uploadCompanyLogo, removeCompanyLogo, deleteAccount } from '../lib/api'
import { useAuth } from '../lib/auth'
import { ImageUploader } from '../components/ImageUploader'

function DeleteCompanyModal({ companyName, onConfirm, onCancel, loading }: {
  companyName: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const [typed, setTyped] = useState('')
  const confirmed = typed.trim() === companyName.trim()

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
        className="relative w-full max-w-md glass rounded-2xl p-6 border border-red-500/30"
      >
        <div className="text-red-400 text-3xl mb-3">⚠</div>
        <h2 className="text-lg font-bold text-white mb-2">Delete company account?</h2>
        <p className="text-white/60 text-sm mb-4">
          This permanently deletes your company, <strong className="text-white">all its job listings</strong>,
          and every application & rating tied to them. <strong className="text-white">This cannot be undone.</strong>
        </p>
        <div className="mb-4">
          <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">
            Type <span className="text-white font-mono">{companyName}</span> to confirm
          </label>
          <input
            autoFocus
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={companyName}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/30 text-sm transition-colors">
            Cancel
          </button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={onConfirm} disabled={!confirmed || loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-red-900 disabled:opacity-50 text-white text-sm font-medium transition-colors">
            {loading ? 'Deleting…' : 'Delete company'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function CompanySettingsPage() {
  const { isCompany, logout } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [form, setForm] = useState({
    name: '', website: '', description: '',
  })

  const { data: company, isLoading } = useQuery({
    queryKey: ['my-company'],
    queryFn: fetchMyCompany,
    enabled: isCompany,
  })

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name,
        website: company.website ?? '',
        description: company.description ?? '',
      })
    }
  }, [company])

  const mutation = useMutation({
    mutationFn: () => updateMyCompany(form),
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      logout()
      navigate('/')
    },
  })

  if (!isCompany) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-white/50">Company accounts only.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/company/dashboard" className="text-xs text-white/40 hover:text-white/70 mb-6 inline-block transition-colors">
        ← Back to dashboard
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-6">Company Settings</h1>

        <div className="glass rounded-2xl p-7 space-y-5">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/10 rounded-lg" />)}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs text-white/50 uppercase tracking-wider mb-3">Company Logo</label>
                <ImageUploader
                  currentUrl={company?.logo ?? company?.logo_url ?? null}
                  shape="square"
                  fallback={
                    <span className="text-3xl font-bold text-violet-300">
                      {company?.name?.[0]?.toUpperCase()}
                    </span>
                  }
                  onUpload={async (file) => {
                    const res = await uploadCompanyLogo(file)
                    return { url: res.logo }
                  }}
                  onRemove={async () => { await removeCompanyLogo() }}
                  onChanged={() => qc.invalidateQueries({ queryKey: ['my-company'] })}
                />
              </div>

              <div>
                <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">Company Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">Website</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="https://yourcompany.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  placeholder="Tell developers what your company does..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                />
              </div>

              <motion.button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                whileTap={{ scale: 0.97 }}
                className="px-6 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm font-medium transition-colors"
              >
                {saved ? '✓ Saved!' : mutation.isPending ? 'Saving…' : 'Save changes'}
              </motion.button>
            </>
          )}
        </div>

        {/* Danger zone */}
        <div className="glass rounded-2xl p-6 border border-red-500/20 mt-6">
          <h2 className="text-sm font-semibold text-red-400 mb-1">Danger Zone</h2>
          <p className="text-xs text-white/40 mb-4">
            Permanently delete this company account along with all its job listings and applications.
            This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/70 text-sm transition-colors"
          >
            Delete company account
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showDeleteModal && (
          <DeleteCompanyModal
            companyName={company?.name ?? ''}
            onConfirm={() => deleteMutation.mutate()}
            onCancel={() => setShowDeleteModal(false)}
            loading={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
