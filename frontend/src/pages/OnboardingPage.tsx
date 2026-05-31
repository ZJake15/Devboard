import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchSkills, api } from '../lib/api'
import { useAuth } from '../lib/auth'

const REMOTE_OPTIONS = [
  {
    value: 'remote',
    label: 'Remote',
    description: 'Work from anywhere',
    icon: '🌍',
  },
  {
    value: 'hybrid',
    label: 'Hybrid',
    description: 'Mix of office and home',
    icon: '⚡',
  },
  {
    value: 'onsite',
    label: 'On-site',
    description: 'In the office full-time',
    icon: '🏢',
  },
]

const STEPS = ['welcome', 'remote', 'skills', 'done'] as const
type Step = typeof STEPS[number]

export function OnboardingPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const { data: skills } = useQuery({ queryKey: ['skills'], queryFn: fetchSkills })

  const [step, setStep] = useState<Step>('welcome')
  const [remotePreference, setRemotePreference] = useState('remote')
  const [selectedSkills, setSelectedSkills] = useState<number[]>([])

  const saveMutation = useMutation({
    mutationFn: () =>
      api.patch('/auth/me/', {
        remote_preference: remotePreference,
        skill_ids: selectedSkills,
      }),
    onSuccess: async () => {
      await refreshUser()
      setStep('done')
    },
  })

  function toggleSkill(id: number) {
    setSelectedSkills(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      {/* Progress dots */}
      {step !== 'done' && (
        <div className="flex items-center gap-2 mb-10">
          {['remote', 'skills'].map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                stepIndex > i + 1
                  ? 'w-8 bg-violet-500'
                  : stepIndex === i + 1
                  ? 'w-8 bg-violet-500'
                  : 'w-4 bg-white/15'
              }`}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ── Step 0: Welcome ── */}
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center max-w-md w-full"
          >
            <div className="text-5xl mb-6">👋</div>
            <h1 className="text-3xl font-bold text-white mb-3">
              Welcome, <span className="text-gradient">{user?.username}</span>!
            </h1>
            <p className="text-white/50 text-sm mb-8 leading-relaxed">
              Let's personalise your experience so we can show you the most relevant roles and your match score on every job.
              <br />Takes less than a minute.
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep('remote')}
              className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors"
            >
              Let's go →
            </motion.button>
            <button
              onClick={() => navigate('/')}
              className="mt-3 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Skip for now
            </button>
          </motion.div>
        )}

        {/* ── Step 1: Remote preference ── */}
        {step === 'remote' && (
          <motion.div
            key="remote"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="max-w-md w-full"
          >
            <h2 className="text-xl font-bold text-white mb-1 text-center">How do you prefer to work?</h2>
            <p className="text-white/40 text-sm text-center mb-8">We'll highlight jobs that match your preference.</p>

            <div className="space-y-3 mb-8">
              {REMOTE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setRemotePreference(opt.value)}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left ${
                    remotePreference === opt.value
                      ? 'bg-violet-600/20 border-violet-500/60 shadow-lg shadow-violet-500/10'
                      : 'glass border-white/10 hover:border-white/25'
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <div className="font-medium text-white text-sm">{opt.label}</div>
                    <div className="text-xs text-white/40 mt-0.5">{opt.description}</div>
                  </div>
                  {remotePreference === opt.value && (
                    <span className="ml-auto text-violet-400 text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep('skills')}
              className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors"
            >
              Continue →
            </motion.button>
          </motion.div>
        )}

        {/* ── Step 2: Skills ── */}
        {step === 'skills' && (
          <motion.div
            key="skills"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="max-w-lg w-full"
          >
            <h2 className="text-xl font-bold text-white mb-1 text-center">Pick your tech stack</h2>
            <p className="text-white/40 text-sm text-center mb-8">
              Select all the technologies you know. We'll use these to calculate your match score.
            </p>

            <div className="flex flex-wrap gap-2 justify-center mb-4 max-h-72 overflow-y-auto px-1">
              {skills?.map(s => {
                const selected = selectedSkills.includes(s.id)
                return (
                  <motion.button
                    key={s.id}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => toggleSkill(s.id)}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                      selected
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                        : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30 hover:text-white/90'
                    }`}
                  >
                    {selected && <span className="mr-1.5">✓</span>}
                    {s.name}
                  </motion.button>
                )
              })}
            </div>

            {selectedSkills.length > 0 && (
              <p className="text-center text-xs text-violet-400 mb-4">
                {selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''} selected
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('remote')}
                className="px-5 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/30 text-sm transition-colors"
              >
                ← Back
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-semibold text-sm transition-colors"
              >
                {saveMutation.isPending
                  ? 'Saving…'
                  : selectedSkills.length === 0
                  ? 'Skip for now'
                  : 'Finish setup →'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md w-full"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="text-6xl mb-6"
            >
              🎉
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">You're all set!</h1>
            <p className="text-white/50 text-sm mb-8">
              Your profile is ready. Every job listing will now show your personalised match score.
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/')}
              className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors"
            >
              Browse jobs →
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
