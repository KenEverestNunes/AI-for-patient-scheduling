const express = require('express');
const router = express.Router();
const { getChatSession, getPatient } = require('../data/store');

// POST /api/voice/handoff - Initiate voice call handoff
router.post('/handoff', async (req, res) => {
  try {
    const { sessionId, patientId, phoneNumber } = req.body;

    if (!sessionId || !phoneNumber) {
      return res.status(400).json({ error: 'sessionId and phoneNumber are required' });
    }

    // Get chat context
    const session = getChatSession(sessionId);
    const patient = getPatient(patientId);

    // Build context summary for voice AI
    const contextSummary = session.messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const vapiApiKey = process.env.VAPI_API_KEY;
    const vapiAssistantId = process.env.VAPI_ASSISTANT_ID;

    if (!vapiApiKey || !vapiAssistantId) {
      return res.status(500).json({ 
        error: 'Voice AI not configured',
        message: 'Voice call feature is not yet configured. Please contact our office at (215) 555-0100.'
      });
    }

    // Call Vapi API to initiate outbound call
    const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistantId: vapiAssistantId,
        customer: {
          number: phoneNumber,
          name: patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'
        },
        assistantOverrides: {
          firstMessage: `Hi ${patient?.firstName || 'there'}! This is Kyra from Kyron Medical Group. I'm continuing our conversation from the website. How can I help you?`,
          metadata: {
            sessionId,
            patientId,
            chatContext: contextSummary
          }
        }
      })
    });

    if (!vapiResponse.ok) {
      const errorData = await vapiResponse.text();
      console.error('Vapi API error:', errorData);
      return res.status(500).json({ 
        error: 'Failed to initiate call',
        message: 'Unable to place the call right now. Please try again or call us directly at (215) 555-0100.'
      });
    }

    const callData = await vapiResponse.json();

    res.json({
      success: true,
      callId: callData.id,
      message: `Great! You'll receive a call at ${phoneNumber} shortly. Kyra will continue helping you from where we left off.`
    });
  } catch (error) {
    console.error('Voice handoff error:', error);
    res.status(500).json({ 
      error: 'Failed to initiate voice call',
      message: 'Unable to place the call right now. Please try again or call us directly at (215) 555-0100.'
    });
  }
});

// POST /api/voice/inbound - Handle inbound calls from Vapi (Assistant-Request Webhook)
router.post('/inbound', (req, res) => {
  try {
    const payload = req.body;
    
    // Vapi calls this endpoint to get initial configuration
    if (payload?.message?.type !== 'assistant-request') {
      return res.json({}); 
    }

    const customerNumber = payload.message.call?.customer?.number;
    
    const defaultResponse = {
      assistantOverrides: {
        firstMessage: "Hi! You've reached Kyron Medical Group. How can I help you today?"
      }
    };

    if (!customerNumber) {
      return res.json(defaultResponse);
    }

    const { getPatientByPhone, getLatestSessionForPatient } = require('../data/store');
    const patient = getPatientByPhone(customerNumber);

    if (!patient) {
      return res.json(defaultResponse);
    }

    const session = getLatestSessionForPatient(patient.id);
    let contextSummary = '';
    
    if (session && session.messages?.length > 0) {
      contextSummary = session.messages.map(m => m.role + ': ' + m.content).join('\n');
    }

    const hasContext = contextSummary.trim().length > 0;
    const pName = patient.firstName || 'there';
    const greeting = hasContext 
      ? "Hi " + pName + "! This is Kyra from Kyron Medical. I'm picking up right from where we left off. How can I continue helping you?"
      : "Hi " + pName + "! This is Kyra from Kyron Medical Group. How can I help you today?";

    return res.json({
      assistantOverrides: {
        firstMessage: greeting,
        metadata: {
          patientId: patient.id,
          sessionId: session ? session.id : null,
          chatContext: contextSummary
        }
      }
    });

  } catch (error) {
    console.error('Inbound voice error:', error);
    res.json({});
  }
});

module.exports = router;
