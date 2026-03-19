import { useState, useRef, useEffect } from 'react'

const API_URL = '/api'

export default function ChatInterface({ patientData, sessionId }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${patientData?.firstName || 'there'}! 👋 I'm Kyra, your AI assistant at Kyron Medical Group. ${
        patientData?.reason 
          ? `I see you're here about "${patientData.reason}". Let me help you find the right specialist and schedule an appointment!` 
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

  const suggestionHints = [
    "📅 Schedule an appointment",
    "💊 Check my prescription refill",
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
  }, [])

  const sendMessage = async (e, customText = null) => {
    e?.preventDefault()
    
    const userMessage = (customText || input).trim()
    if (!userMessage || loading) return

    if (!customText) setInput('')
    else setInput('') // Clear input just in case
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
          content: `📞 ${data.message}`
        }])
      } else {
        setCallStatus('error')
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ ${data.message || 'Unable to place the call right now.'}`
        }])
      }
    } catch (err) {
      setCallStatus('error')
    }
    setTimeout(() => {
      setShowCallModal(false)
      setCallStatus(null)
    }, 3000)
  }

  // Format message content with basic markdown-like support
  const formatMessage = (content) => {
    // Split by newlines and handle basic formatting
    return content.split('\n').map((line, i) => {
      // Bold text
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        return <div key={i} className="ml-4 flex gap-2"><span>•</span><span dangerouslySetInnerHTML={{ __html: line.replace(/^[-•]\s*/, '') }} /></div>
      }
      // Numbered items
      const numMatch = line.match(/^(\d+)\.\s(.+)/)
      if (numMatch) {
        return <div key={i} className="ml-4 flex gap-2"><span className="text-sky-400 font-medium">{numMatch[1]}.</span><span dangerouslySetInnerHTML={{ __html: numMatch[2] }} /></div>
      }
      return <p key={i} className={line.trim() === '' ? 'h-2' : ''} dangerouslySetInnerHTML={{ __html: line }} />
    })
  }

  return (
    <div className="min-h-screen flex flex-col page-enter">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-slate-900/70 border-b border-white/5 py-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">Kyra • AI Assistant</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-400">Online</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Voice call button */}
            <button
              onClick={() => setShowCallModal(true)}
              className="btn-call flex items-center gap-2 text-sm py-2 px-4"
              id="voice-call-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Call Me
            </button>
          </div>
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto pb-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} message-enter`}
            >
              <div className={`max-w-[85%] md:max-w-[75%] ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-sky-500/90 to-cyan-500/90 text-white rounded-2xl rounded-br-md'
                  : 'glass-card text-slate-200 rounded-2xl rounded-bl-md'
              } px-4 py-3`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-sky-400">Kyra</span>
                  </div>
                )}
                <div className="text-sm leading-relaxed space-y-1">
                  {formatMessage(msg.content)}
                </div>
              </div>
            </div>
          ))}

          {/* Suggested Prompts Grid */}
          {messages.length === 1 && !loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 mb-8 message-enter">
              {suggestionHints.map((hint, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(null, hint)}
                  className="glass-card text-left p-4 rounded-xl text-sm text-slate-300 transition-all border border-white/5 hover:border-sky-500/30 hover:bg-white/5 hover:-translate-y-0.5"
                >
                  {hint}
                </button>
              ))}
            </div>
          )}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start message-enter">
              <div className="glass-card px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-sky-400">Kyra</span>
                </div>
                <div className="typing-indicator">
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

      {/* Input area */}
      <div className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-xl bg-slate-900/80 border-t border-white/5 pb-safe">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex gap-4">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="glass-input flex-1 py-4 text-base"
            disabled={loading}
            id="chat-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="btn-primary px-8 flex items-center justify-center rounded-xl"
            id="chat-send-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>

      {/* Voice call modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !callStatus && setShowCallModal(false)} />
          <div className="glass-card relative p-8 max-w-sm w-full text-center page-enter">
            {!callStatus && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Continue by Phone</h3>
                <p className="text-sm text-slate-400 mb-6">
                  Kyra will call you at <span className="text-white font-medium">{patientData?.phone}</span> and continue the conversation from where we left off.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCallModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVoiceCall}
                    className="btn-call flex-1"
                  >
                    📞 Call Me Now
                  </button>
                </div>
              </>
            )}
            {callStatus === 'calling' && (
              <div>
                <div className="spinner mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Connecting...</h3>
                <p className="text-sm text-slate-400">Placing your call now</p>
              </div>
            )}
            {callStatus === 'success' && (
              <div>
                <div className="text-4xl mb-4">✅</div>
                <h3 className="text-lg font-semibold text-white mb-2">Call Initiated!</h3>
                <p className="text-sm text-slate-400">You'll receive a call shortly</p>
              </div>
            )}
            {callStatus === 'error' && (
              <div>
                <div className="text-4xl mb-4">❌</div>
                <h3 className="text-lg font-semibold text-white mb-2">Call Failed</h3>
                <p className="text-sm text-slate-400">Please try again or call (215) 555-0100</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
