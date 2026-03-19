import { useState } from 'react'

export default function LandingPage({ onGetStarted }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="min-h-screen flex flex-col relative overflow-y-auto page-enter">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.05),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.05),transparent_50%)] pointer-events-none" />

      {/* Main Container */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 md:py-16 max-w-7xl mx-auto w-full relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">
          
          {/* Left Column: Hero Text */}
          <header className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center shadow-[0_0_30px_rgba(14,165,233,0.3)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-sky-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent drop-shadow-sm">
                Kyron Medical
              </h1>
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-[1.15] tracking-tight">
              Your Health, <br className="hidden lg:block"/>
              <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
                Simplified
              </span>
            </h2>

            <p className="text-lg md:text-xl text-slate-300 max-w-lg leading-relaxed mb-10">
              Schedule appointments, check prescription refills, and find office locations — perfectly streamlined through our intelligent medical AI assistant.
            </p>

            {/* CTA Group */}
            <div className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto">
              <button
                onClick={onGetStarted}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="btn-primary flex items-center justify-center gap-2 text-lg sm:text-xl px-10 py-4 sm:px-12 sm:py-4 rounded-2xl transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(14,165,233,0.4)] w-full sm:w-auto font-semibold"
                id="get-started-btn"
              >
                Get Started
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>
              
              <div className="flex items-center gap-3 hidden sm:flex">
                <div className="flex -space-x-3">
                   <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-900 shadow-sm flex items-center justify-center text-xs font-bold text-slate-400">AA</div>
                   <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-900 shadow-sm flex items-center justify-center text-xs font-bold text-slate-300">SK</div>
                   <div className="w-10 h-10 rounded-full bg-sky-900 border-2 border-slate-900 shadow-sm flex items-center justify-center text-xs font-bold text-sky-400">+</div>
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-sky-400">Join 10,000+</p>
                  <p className="text-[11px] text-slate-500 font-medium">Happy Patients</p>
                </div>
              </div>
            </div>
            
            <p className="mt-6 text-xs font-medium text-slate-500 uppercase tracking-widest">
              No account needed • 100% HIPAA Compliant
            </p>
          </header>

          {/* Right Column: Visual Mockup */}
          <div className="w-full max-w-md mx-auto lg:max-w-full lg:ml-auto relative hidden md:block">
            {/* Soft backdrop glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full pt-[100%] bg-gradient-to-tr from-sky-500/10 to-violet-500/10 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="glass-card rounded-[2rem] overflow-hidden border border-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative transform transition-transform duration-700 hover:-translate-y-2 max-w-md mx-auto">
              {/* Mockup Header */}
              <div className="px-6 py-5 border-b border-white/5 bg-white/5 backdrop-blur-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-sky-500/20">K</div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-wide">Kyra AI</h3>
                    <p className="text-xs text-sky-400 font-semibold flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shadow-[0_0_10px_rgba(56,189,248,0.8)]"></span>
                      Online Assistant
                    </p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </div>
              </div>
              
              {/* Mockup Body */}
              <div className="p-6 md:p-8 space-y-6 bg-slate-900/60 relative">
                 <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 flex-shrink-0 mt-1 shadow-md" />
                   <div className="bg-slate-800/80 p-4 rounded-2xl rounded-tl-sm text-sm text-slate-200 border border-white/5 leading-relaxed shadow-sm">
                     Hi there! I'm Kyra, your AI medical assistant. How can I help you today?
                   </div>
                 </div>
                 <div className="flex gap-4 flex-row-reverse">
                   <div className="bg-sky-500/20 border border-sky-400/30 p-4 rounded-2xl rounded-tr-sm text-sm text-white shadow-sm">
                     I'd like to book an appointment for my knee pain.
                   </div>
                 </div>
                 <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 flex-shrink-0 mt-1 shadow-md" />
                   <div className="bg-slate-800/80 p-4 rounded-2xl rounded-tl-sm text-sm text-slate-200 border border-white/5 leading-relaxed shadow-sm flex flex-col gap-3">
                     I can help with that. Dr. Smith is our orthopedic specialist. I have an opening this Thursday at 10:00 AM. Does that work for you?
                     <div className="flex gap-2 mt-1">
                        <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium text-white transition-colors border border-white/5">Yes, book it</button>
                        <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-slate-300 transition-colors border border-white/5">See other times</button>
                     </div>
                   </div>
                 </div>
              </div>

               {/* Mockup Input */}
               <div className="p-4 bg-slate-900/80 border-t border-white/5 flex gap-3 items-center">
                 <div className="flex-1 bg-slate-800/80 rounded-xl border border-white/5 p-3.5 px-4 text-sm text-slate-400 shadow-inner">
                   Type your message...
                 </div>
                 <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.3)] cursor-pointer hover:scale-105 transition-transform">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                 </div>
               </div>
            </div>

            {/* Floating Mini Feature */}
            <div className="absolute -bottom-6 -right-6 lg:-left-12 lg:right-auto glass-card p-4 rounded-2xl hidden sm:flex items-center gap-4 border border-white/10 shadow-2xl bg-slate-900/90 transform rotate-2 hover:rotate-0 transition-all duration-300 z-10 w-fit">
               <div className="w-11 h-11 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                 <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
               </div>
               <div>
                 <p className="text-sm font-bold text-white tracking-wide">100% Automated</p>
                 <p className="text-xs text-slate-400 mt-0.5 font-medium">No hold times</p>
               </div>
            </div>
          </div>
          
        </div>
      </div>

      <footer className="w-full text-center py-6 mt-auto relative z-10">
        <p className="text-xs text-slate-500 font-medium tracking-wider">
          Powered by Kyron Medical AI • &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}
