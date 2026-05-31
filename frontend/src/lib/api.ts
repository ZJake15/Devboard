import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Let the browser set multipart/form-data (with boundary) for file uploads
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh')
      if (refresh) {
        try {
          const { data } = await axios.post('/api/auth/token/refresh/', { refresh })
          localStorage.setItem('access', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          localStorage.removeItem('access')
          localStorage.removeItem('refresh')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

// Types
export interface Skill { id: number; name: string; slug: string }
export interface Company { id: number; name: string; slug: string; logo: string | null; logo_url: string; website: string; description: string; avg_response_days: number | null; response_rate: number | null }
export type SalaryRange =
  | { masked: false; min: number; max: number; currency: string }
  | { masked: true; hint: string; message: string }
export type ApplicationLink =
  | { masked: false; url: string }
  | { masked: true; message: string }
export interface MatchScore {
  score: number
  breakdown?: { skills_matched: number; skills_total: number; missing_skills: string[]; seniority_match: boolean; remote_match: boolean }
}
export interface Job {
  id: number
  title: string
  company: Company
  location: string
  remote_policy: 'onsite' | 'hybrid' | 'remote'
  tech_stack: Skill[]
  seniority: string
  salary_range: SalaryRange
  application_link: ApplicationLink
  salary_verified: boolean
  salary_band_hint: string
  posted_at: string
  repost_count: number
  is_active: boolean
  match_score: MatchScore | null
  is_stale: boolean
}
export interface PaginatedResponse<T> { count: number; next: string | null; previous: string | null; results: T[] }
export interface RankInfo { score: number; tier: string; tier_icon: string; projects_score: number; ratings_score: number; ratings_received: number; average_rating: number | null }
export interface Profile { tier: string; avatar: string | null; headline: string; years_experience: number; skills: Skill[]; remote_preference: string; rank?: RankInfo }
export interface User { id: number; username: string; email: string; first_name: string; last_name: string; is_staff: boolean; profile: Profile }
export interface Application { id: number; job: Job; status: string; notes: string; order: number; created_at: string; interview_scheduled_at?: string | null; interview_notes?: string; offer_response?: string; applicant_username?: string }
export interface SavedSearch { id: number; name: string; query_params: Record<string, string>; notify: boolean }
export interface SalaryBenchmark { role: string; location: string; seniority: string; count: number; min_salary: number; max_salary: number; avg_salary: number; p25: number; p50: number; p75: number }

// API functions
export const fetchJobs = (params: Record<string, string>) =>
  api.get<PaginatedResponse<Job>>('/jobs/', { params }).then((r) => r.data)

export const fetchJob = (id: number) =>
  api.get<Job>(`/jobs/${id}/`).then((r) => r.data)

export const fetchSkills = () =>
  api.get<Skill[]>('/auth/skills/').then((r) => r.data)

export const fetchMe = () =>
  api.get<User>('/auth/me/').then((r) => r.data)

export const login = (username: string, password: string) =>
  api.post<{ access: string; refresh: string }>('/auth/token/', { username, password }).then((r) => r.data)

export const register = (data: Record<string, unknown>) =>
  api.post<User>('/auth/register/', data).then((r) => r.data)

export const upgradeTier = () =>
  api.post<{ tier: string }>('/auth/upgrade/').then((r) => r.data)

export const deleteAccount = () =>
  api.delete('/auth/delete/')

// Company
export const registerCompany = (data: Record<string, unknown>) =>
  api.post<{ detail: string; username: string }>('/companies/register/', data).then(r => r.data)

export const verifyCompanyOTP = (username: string, otp_code: string) =>
  api.post<{ access: string; refresh: string; company: Company }>('/companies/verify-otp/', { username, otp_code }).then(r => r.data)

export const fetchMyCompany = () =>
  api.get<Company>('/companies/me/').then(r => r.data)

export const updateMyCompany = (data: Partial<Company>) =>
  api.patch<Company>('/companies/me/', data).then(r => r.data)

export const fetchMyJobs = () =>
  api.get<Job[]>('/jobs/my-jobs/').then(r => r.data)

export const fetchReceivedApplications = () =>
  api.get<Application[]>('/jobs/received-applications/').then(r => r.data)

export const reviewApplication = (
  id: number,
  payload: { action: 'schedule' | 'hire' | 'rejected'; interview_date?: string; interview_notes?: string }
) => api.post<Application>(`/jobs/received-applications/${id}/review/`, payload).then(r => r.data)

export interface Notification { id: number; type: string; title: string; message: string; is_read: boolean; link: string; created_at: string }

export const fetchNotifications = () =>
  api.get<Notification[]>('/auth/notifications/').then(r => r.data)

export const markNotificationsRead = (ids?: number[]) =>
  api.post('/auth/notifications/mark-read/', { ids: ids ?? [] })

export const offerJob = (username: string, job_id: number) =>
  api.post<Application>('/jobs/offer/', { username, job_id }).then(r => r.data)

export interface CompanyRating { id: number; rating: number; feedback: string; created_at: string }

export const fetchRating = (applicationId: number) =>
  api.get<{ rating: CompanyRating | null }>(`/jobs/received-applications/${applicationId}/rate/`).then(r => r.data)

export const submitRating = (applicationId: number, data: { rating: number; feedback: string }) =>
  api.post<CompanyRating>(`/jobs/received-applications/${applicationId}/rate/`, data).then(r => r.data)

export interface Project {
  id: number
  title: string
  description: string
  url: string
  tech_stack: Skill[]
  created_at: string
}

export interface PublicProfile {
  id: number
  username: string
  first_name: string
  last_name: string
  profile: {
    avatar: string | null
    headline: string
    years_experience: number
    skills: Skill[]
    remote_preference: string
    projects: Project[]
    rank: RankInfo
  }
}

// ── Image uploads ──────────────────────────────────────────────────────────
export const uploadAvatar = (file: File) => {
  const form = new FormData()
  form.append('avatar', file)
  return api.post<{ avatar: string }>('/auth/me/avatar/', form).then(r => r.data)
}

export const removeAvatar = () =>
  api.delete<{ avatar: null }>('/auth/me/avatar/').then(r => r.data)

export const uploadCompanyLogo = (file: File) => {
  const form = new FormData()
  form.append('logo', file)
  return api.post<{ logo: string }>('/companies/me/logo/', form).then(r => r.data)
}

export const removeCompanyLogo = () =>
  api.delete<{ logo: null }>('/companies/me/logo/').then(r => r.data)

export const fetchPublicProfile = (username: string) =>
  api.get<PublicProfile>(`/auth/users/${username}/`).then(r => r.data)

export const fetchMyProjects = () =>
  api.get<Project[]>('/auth/me/projects/').then(r => r.data)

export const createProject = (data: Omit<Project, 'id' | 'created_at' | 'tech_stack'> & { tech_stack_ids: number[] }) =>
  api.post<Project>('/auth/me/projects/', data).then(r => r.data)

export const updateProject = (id: number, data: Partial<Project> & { tech_stack_ids?: number[] }) =>
  api.patch<Project>(`/auth/me/projects/${id}/`, data).then(r => r.data)

export const deleteProject = (id: number) =>
  api.delete(`/auth/me/projects/${id}/`)

export const createJob = (data: Record<string, unknown>) =>
  api.post<Job>('/jobs/create/', data).then(r => r.data)

export const updateJob = (id: number, data: Record<string, unknown>) =>
  api.patch<Job>(`/jobs/my-jobs/${id}/`, data).then(r => r.data)

export const deleteJob = (id: number) =>
  api.delete(`/jobs/my-jobs/${id}/`)

export const fetchApplications = () =>
  api.get<Application[]>('/jobs/applications/').then((r) => r.data)

export const createApplication = (data: { job_id: number; status: string }) =>
  api.post<Application>('/jobs/applications/', data).then((r) => r.data)

export const updateApplication = (id: number, data: Partial<Application>) =>
  api.patch<Application>(`/jobs/applications/${id}/`, data).then((r) => r.data)

export const deleteApplication = (id: number) =>
  api.delete(`/jobs/applications/${id}/`)

export const respondToOffer = (id: number, response: 'accepted' | 'declined') =>
  api.post<Application>(`/jobs/applications/${id}/respond/`, { response }).then((r) => r.data)

export const fetchSavedSearches = () =>
  api.get<SavedSearch[]>('/jobs/saved-searches/').then((r) => r.data)

export const createSavedSearch = (data: Omit<SavedSearch, 'id'>) =>
  api.post<SavedSearch>('/jobs/saved-searches/', data).then((r) => r.data)

export const deleteSavedSearch = (id: number) =>
  api.delete(`/jobs/saved-searches/${id}/`)

export const fetchBenchmark = (params: Record<string, string>) =>
  api.get<SalaryBenchmark>('/jobs/salary/benchmark/', { params }).then((r) => r.data)

export const submitSalary = (data: Record<string, unknown>) =>
  api.post('/jobs/salary/submit/', data).then((r) => r.data)
