import { useState, useRef, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export default function ChatInterface({ patientData, sessionId }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${patientData?.firstName || 'there'}! 👋 I'm Aria, your AI assistant at CareSync Health. ${
        patientData?.reason 
          ? `I see you're here about "**${patientData.reason}**". Let me help you find the right specialist and schedule an appointment!` 
          : `How can I help you today? I can help you schedule appointments, check prescription refills, or answer questions about our offices.`
      }`
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)
  const [callStatus, setCallStatus] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const callTimeoutRef = useRef(null)

  const suggestionHints = [
    "📅 Schedule an appointment",
    "🏢 What are your office hours?",
    "👨‍⚕️ Do you have a dermatologist?"
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
    return () => {
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current)
      }
    }
  }, [])

  const sendMessage = async (e, customText = null) => {
    e?.preventDefault()
    
    const userMessage = (customText || input).trim()
    if (!userMessage || loading) return

    if (!customText) setInput('')
    else setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId,
          patientId: patientData?.id
        })
      })

      const data = await res.json()
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.message || "I'm sorry, I'm having trouble right now. Please try again." 
      }])
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I'm having trouble connecting. Please try again, or call our office at (215) 555-0100." 
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleVoiceCall = async () => {
    setCallStatus('calling')
    try {
      const res = await fetch(`${API_URL}/voice/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          patientId: patientData?.id,
          phoneNumber: patientData?.phone
        })
      })

      const data = await res.json()
      if (data.success) {
        setCallStatus('success')
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `📞 ${data.message || 'Call initiated. Please answer your phone!'}`
        }])
      } else {
        setCallStatus('error')
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ ${data.message || data.error || 'Unable to place the call right now.'}`
        }])
      }
    } catch (err) {
      setCallStatus('error')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Unable to place the call right now. Please check your connection or contact our office at (215) 555-0100.`
      }])
    }
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current)
    }
    callTimeoutRef.current = setTimeout(() => {
      setShowCallModal(false)
      setCallStatus(null)
    }, 3000)
  }

  const formatMessage = (content) => {
    return content.split('\n').map((line, i) => {
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        return <div key={i} className="ml-5 flex gap-3 my-1"><span className="text-sky-400">•</span><span dangerouslySetInnerHTML={{ __html: line.replace(/^[-•]\s*/, '') }} /></div>
      }
      const numMatch = line.match(/^(\d+)\.\s(.+)/)
      if (numMatch) {
        return <div key={i} className="ml-5 flex gap-3 my-1"><span className="text-sky-400 font-bold">{numMatch[1]}.</span><span dangerouslySetInnerHTML={{ __html: numMatch[2] }} /></div>
      }
      return <p key={i} className={line.trim() === '' ? 'h-3' : 'mb-2 last:mb-0'} dangerouslySetInnerHTML={{ __html: line }} />
    })
  }

  return (
    <div className="min-h-screen flex flex-col page-enter bg-slate-900/40">
      <header className="sticky top-0 z-20 backdrop-blur-2xl bg-slate-900/80 border-b border-white/10 py-3 shadow-lg">
        <div className="w-full px-6 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center shadow-md shadow-sky-500/20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">Aria • AI Assistant</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-sm font-medium text-slate-400">Online</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowCallModal(true)}
            className="btn-call flex items-center gap-2.5 text-base py-2.5 px-6 shadow-lg shadow-emerald-500/20 cursor-pointer"
            id="voice-call-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Call Me Instead
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-48">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-10 space-y-8">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} message-enter`}
            >
              <div className={`max-w-[85%] md:max-w-[75%] ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-sky-500 to-cyan-500 text-white rounded-[1.5rem] rounded-br-md shadow-lg shadow-sky-500/20'
                  : 'glass-card text-slate-200 rounded-[1.5rem] rounded-bl-md border-white/10 shadow-lg bg-slate-800/80 backdrop-blur-xl'
              } px-6 py-4.5`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2.5 mb-3 border-b border-white/5 pb-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                    </div>
                    <span className="text-sm font-bold text-sky-400 tracking-wide">Aria</span>
                  </div>
                )}
                <div className="text-[15px] md:text-base leading-relaxed space-y-1">
                  {formatMessage(msg.content)}
                </div>
              </div>
            </div>
          ))}

          {messages.length === 1 && !loading && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-14 mb-8 message-enter">
              {suggestionHints.map((hint, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(null, hint)}
                  className="glass-card text-left p-5 rounded-2xl text-sm font-medium text-slate-300 transition-all border border-white/5 hover:border-sky-500/40 hover:bg-white/10 hover:-translate-y-1 shadow-md hover:shadow-sky-500/10"
                >
                  {hint}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex justify-start message-enter">
              <div className="glass-card px-6 py-5 rounded-[1.5rem] rounded-bl-md bg-slate-800/80 border-white/10">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-sky-400">Kyra</span>
                </div>
                <div className="typing-indicator px-2">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-2xl bg-slate-900/90 border-t border-white/10 pb-safe pt-4 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        <form onSubmit={sendMessage} className="max-w-5xl mx-auto px-6 sm:px-8 pb-6 flex gap-4">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
            className="glass-input flex-1 py-4 px-6 text-base md:text-lg rounded-2xl bg-white/5 focus:bg-white/10 border-white/10"
            disabled={loading}
            id="chat-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="btn-primary px-8 flex items-center justify-center rounded-2xl disabled:opacity-50 disabled:hover:transform-none"
            id="chat-send-btn"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>

      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => !callStatus && setShowCallModal(false)} />
          <div className="glass-card relative p-10 max-w-md w-full text-center page-enter border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] rounded-[2rem]">
            {!callStatus && (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-extrabold text-white mb-3">Continue by Phone</h3>
                <p className="text-base text-slate-400 mb-8 leading-relaxed">
                  Kyra will call you at <span className="text-white font-bold">{patientData?.phone}</span> and continue the conversation from where we left off.
                </p>
                <div className="flex gap-4">
                  <button onClick={() => setShowCallModal(false)} className="btn-secondary flex-1 py-4 text-base font-bold rounded-xl">Cancel</button>
                  <button onClick={handleVoiceCall} className="btn-call flex-1 py-4 text-base font-bold rounded-xl flex items-center justify-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                    Call Me Now
                  </button>
                </div>
              </>
            )}
            {/* Keeping the loading/success states the same logic, just matching the new styling if they trigger */}
            {callStatus === 'calling' && (
              <div className="py-6">
                <div className="spinner mx-auto mb-6 w-12 h-12 border-4 border-sky-500/20 border-t-sky-400" />
                <h3 className="text-xl font-bold text-white mb-2">Connecting...</h3>
                <p className="text-base text-slate-400">Placing your call now</p>
              </div>
            )}
            {callStatus === 'success' && (
              <div className="py-6">
                <div className="text-6xl mb-6 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">✅</div>
                <h3 className="text-xl font-bold text-white mb-2">Call Initiated!</h3>
                <p className="text-base text-slate-400">You'll receive a call shortly</p>
              </div>
            )}
            {callStatus === 'error' && (
              <div className="py-6">
                <div className="text-6xl mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">❌</div>
                <h3 className="text-xl font-bold text-white mb-2">Call Failed</h3>
                <p className="text-base text-slate-400">Please try again or call (215) 555-0100</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}