import { useState } from 'react'

const API_URL = '/api'

export default function IntakeForm({ onComplete }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    phone: '',
    email: '',
    reason: '',
    smsOptIn: false
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!formData.dob) newErrors.dob = 'Date of birth is required'
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()

      if (data.success) {
        onComplete(data.patient, data.sessionId)
      } else {
        setErrors({ submit: data.error || 'Something went wrong' })
      }
    } catch (err) {
      setErrors({ submit: 'Failed to connect to server. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col overflow-y-auto page-enter relative">
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 md:py-20 w-full">
        <div className="glass-card w-full max-w-xl p-6 sm:p-10 md:p-12 shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-white">Kyron Medical</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Patient Information</h2>
          <p className="text-sm text-slate-400">Please fill in your details to get started</p>
        </div>

        {errors.submit && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-slate-400 mb-2">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={`glass-input ${errors.firstName ? 'border-red-500/50' : ''}`}
                placeholder="John"
                id="intake-first-name"
              />
              {errors.firstName && <p className="text-xs text-red-400 mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={`glass-input ${errors.lastName ? 'border-red-500/50' : ''}`}
                placeholder="Doe"
                id="intake-last-name"
              />
              {errors.lastName && <p className="text-xs text-red-400 mt-1">{errors.lastName}</p>}
            </div>
          </div>

          {/* DOB */}
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Date of Birth</label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              className={`glass-input ${errors.dob ? 'border-red-500/50' : ''}`}
              id="intake-dob"
            />
            {errors.dob && <p className="text-xs text-red-400 mt-1">{errors.dob}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`glass-input ${errors.phone ? 'border-red-500/50' : ''}`}
              placeholder="(555) 123-4567"
              id="intake-phone"
            />
            {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`glass-input ${errors.email ? 'border-red-500/50' : ''}`}
              placeholder="john.doe@email.com"
              id="intake-email"
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Reason for Visit <span className="text-slate-500">(optional)</span></label>
            <input
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className="glass-input"
              placeholder="e.g., knee pain, skin checkup, heart palpitations..."
              id="intake-reason"
            />
          </div>

          {/* SMS Opt-in */}
          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              name="smsOptIn"
              checked={formData.smsOptIn}
              onChange={handleChange}
              className="mt-1 w-4 h-4 rounded accent-sky-500"
              id="intake-sms-optin"
            />
            <label htmlFor="intake-sms-optin" className="text-sm text-slate-400 cursor-pointer">
              I'd like to receive appointment confirmations and reminders via text message. 
              <span className="text-slate-500"> Standard messaging rates may apply.</span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-10"
            id="intake-submit-btn"
          >
            {loading ? (
              <>
                <div className="spinner" />
                Connecting...
              </>
            ) : (
              'Start Chat with Kyra →'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-8 font-medium tracking-wide flex items-center justify-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          Your information is securely encrypted under HIPAA guidelines
        </p>
      </div>
      </div>
    </div>
  )
}
