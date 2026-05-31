import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { fetchMyCompany, updateMyCompany } from '../lib/api'
import { useAuth } from '../lib/auth'

export function CompanySettingsPage() {
  const { isCompany } = useAuth()
  const [saved, setSaved] = useState(false)
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
      </motion.div>
    </div>
  )
}
