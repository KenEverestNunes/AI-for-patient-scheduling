import { useState } from 'react'

export default function LandingPage({ onGetStarted }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="min-h-screen flex flex-col relative overflow-y-auto page-enter text-white">
      {/* Top Left Logo */}
      <div className="absolute top-6 left-6 md:top-8 md:left-10 z-50 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.3)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <span className="font-bold text-lg tracking-wide hidden sm:block">CareSync Health</span>
      </div>

      {/* Background Ambience */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.05),transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.05),transparent_50%)] pointer-events-none" />

      {/* Main Centered Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 md:py-20 w-full relative z-10 ">
        
        {/* Massive Hero Glass Card */}
        <div className="glass-card border border-white/10 backdrop-blur-3xl rounded-[2.5rem] w-full max-w-4xl p-6 sm:p-12 md:p-16 lg:p-20 shadow-[0_30px_80px_rgba(0,0,0,0.5)] flex flex-col items-center text-center">
          
          

          <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight max-w-3xl">
            Your Health, <br className="hidden sm:block"/>
            <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
              Simplified
            </span>
          </h2>

          <p className="text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed mb-10 mx-auto">
            Schedule appointments, check prescription refills, and find office locations and perfectly streamlined through our intelligent medical AI assistant.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 w-full sm:w-auto ">
            <button
              onClick={onGetStarted}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="btn-primary flex items-center justify-center gap-2 text-lg sm:text-xl px-10 py-4 sm:px-12 sm:py-4 rounded-2xl font-semibold w-full sm:w-auto"
              id="get-started-btn"
            >
              Get Started
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>
          <div className="flex items-center gap-3 pt-8 pb-0 ">
              <div className="flex -space-x-3">
                 <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-900 shadow-sm flex items-center justify-center text-xs font-bold text-slate-400 z-30">AA</div>
                 <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-900 shadow-sm flex items-center justify-center text-xs font-bold text-slate-300 z-20">SK</div>
                 <div className="w-10 h-10 rounded-full bg-sky-900 border-2 border-slate-900 shadow-sm flex items-center justify-center text-xs font-bold text-sky-400 z-10">+</div>
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-sky-400 mb-0.5">Join 10,000+</p>
                <p className="text-[11px] text-slate-400 font-medium">Happy Patients</p>
              </div>
            </div> 
          
          <p className="mt-8 mb-0 text-xs font-medium text-slate-500 uppercase tracking-widest text-center">
            No account needed • Privacy-First Architecture
          </p>
          
        </div>
      </div>

      <footer className="w-full text-center py-6 mt-auto relative z-10">
        <p className="text-xs text-slate-500 font-medium tracking-wider">
          Powered by CareSync Health AI • &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}
