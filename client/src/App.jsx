import { useState } from 'react'
import './index.css'
import LandingPage from './components/LandingPage'
import IntakeForm from './components/IntakeForm'
import ChatInterface from './components/ChatInterface'

function App() {
  const [currentPage, setCurrentPage] = useState('landing')
  const [patientData, setPatientData] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [sessionToken, setSessionToken] = useState(null)

  const handleGetStarted = () => {
    setCurrentPage('intake')
  }

  const handleIntakeComplete = (patient, session, token) => {
    setPatientData(patient)
    setSessionId(session)
    setSessionToken(token)
    setCurrentPage('chat')
  }

  return (
    <div className="relative min-h-screen">
      {/* Animated background */}
      <div className="animated-bg" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Main content */}
      <div className="relative z-10">
        {currentPage === 'landing' && (
          <LandingPage onGetStarted={handleGetStarted} />
        )}
        {currentPage === 'intake' && (
          <IntakeForm onComplete={handleIntakeComplete} />
        )}
        {currentPage === 'chat' && (
          <ChatInterface
            patientData={patientData}
            sessionId={sessionId}
            sessionToken={sessionToken}
          />
        )}
      </div>
    </div>
  )
}

export default App
