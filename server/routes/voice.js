const express = require('express');
const router = express.Router();
const { getChatSession, getPatient, getPatientByPhone, getLatestSessionForPatient } = require('../data/store');

// POST /api/voice/handoff - Initiate voice call handoff
router.post('/handoff', async (req, res) => {
  try {
    const { sessionId, patientId, phoneNumber } = req.body;

    if (!sessionId || !phoneNumber) {
      return res.status(400).json({ error: 'sessionId and phoneNumber are required' });
    }

    // Strictly format phone number specifically for Vapi's E.164 requirement
    let formattedPhone = String(phoneNumber).replace(/\D/g, '');
    if (formattedPhone.length === 10) formattedPhone = '+1' + formattedPhone;
    else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) formattedPhone = '+' + formattedPhone;
    else if (!formattedPhone.startsWith('+')) formattedPhone = '+' + formattedPhone;

    // Get chat context
    const session = getChatSession(sessionId);
    const patient = getPatient(patientId);

    // Build context summary for voice AI
    const contextSummary = session.messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const vapiApiKey = process.env.VAPI_API_KEY;
    const vapiAssistantId = process.env.VAPI_ASSISTANT_ID;
    const vapiPhoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
    
    // Automatically discover the live Ngrok URL
    let ngrokUrl = process.env.VAPI_WEBHOOK_URL || 'https://muzzy-braden-civilly.ngrok-free.dev';
    try {
      const ngrokRes = await fetch('http://127.0.0.1:4040/api/tunnels');
      if (ngrokRes.ok) {
        const data = await ngrokRes.json();
        const httpsTunnel = data.tunnels?.find(t => t.public_url.startsWith('https'));
        if (httpsTunnel) ngrokUrl = httpsTunnel.public_url;
      }
    } catch(e) { }

    const dynamicTools = require('../services/groq').tools.map(t => ({
      async: false,
      messages: [{ type: "request-start", content: "Let me check the system..." }],
      ...t,
      server: { url: ngrokUrl + '/api/voice/tool' }
    }));

    if (!vapiApiKey || !vapiAssistantId || !vapiPhoneNumberId) {
      return res.status(500).json({ 
        error: 'Voice AI not configured',
        message: 'Voice call feature is missing Phone Number ID. Please check your Vapi configuration.'
      });
    }

    const response = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumberId: vapiPhoneNumberId,
        customer: {
          number: formattedPhone,
          name: patient ? patient.firstName : 'Patient'
        },
        assistantId: vapiAssistantId,
        assistantOverrides: {
          model: {
            provider: 'groq',
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: require('../services/groq').SYSTEM_PROMPT + '\n\nCRITICAL VOICE INSTRUCTION: This is a VOICE CALL. Be EXTREMELY CONCISE. Use very short sentences (under 15 words). Acknowledge the previous chat context briefly, then asking for the next step. Never list more than 2-3 options at once.'
              }
            ],
            tools: dynamicTools
          },
          variableValues: {
            chatContext: contextSummary || "No previous context. This is a new conversation.",
            patientName: patient ? patient.firstName : "Patient"
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Vapi API error:', data);
      return res.status(response.status).json(data);
    }

    res.json({ success: true, callId: data.id });
  } catch (error) {
    console.error('Failed to initiate call:', error);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

// POST /api/voice/inbound - Handle inbound call webhook from Vapi
router.post('/inbound', async (req, res) => {
  const payload = req.body;
  
  const defaultResponse = {
    assistantOverrides: {
      firstMessage: "Hi! You've reached Kyron Medical Group. How can I help you today?"
    }
  };

  if (payload.message?.type === 'assistant-request' || payload.message?.type === 'conversation-start') {
    const customerNumber = payload.message.call?.customer?.number;
    const patient = getPatientByPhone(customerNumber);

    if (!patient) return res.json(defaultResponse);

    const session = getLatestSessionForPatient(patient.id);
    let contextSummary = '';
    
    if (session && session.messages?.length > 0) {
      contextSummary = session.messages.map(m => m.role + ': ' + m.content).join('\n');
    }

    const hasContext = contextSummary.trim().length > 0;
    const pName = patient.firstName || 'there';
    
    const greeting = hasContext 
      ? `Hi ${pName}! This is Riley from Kyron Medical. I'm picking up from our chat. How can I help?`
      : `Thank you for calling Kyron Medical Group. This is Riley, your scheduling assistant. How may I help you today?`;

    // Discover Ngrok URL
    let ngrokUrl = process.env.VAPI_WEBHOOK_URL || 'https://muzzy-braden-civilly.ngrok-free.dev';
    try {
      const ngrokRes = await fetch('http://127.0.0.1:4040/api/tunnels');
      if (ngrokRes.ok) {
        const data = await ngrokRes.json();
        const httpsTunnel = data.tunnels?.find(t => t.public_url.startsWith('https'));
        if (httpsTunnel) ngrokUrl = httpsTunnel.public_url;
      }
    } catch(e) { }

    const dynamicTools = require('../services/groq').tools.map(t => ({
      async: false,
      messages: [{ type: "request-start", content: "Let me check the system..." }],
      ...t,
      server: { url: ngrokUrl + '/api/voice/tool' }
    }));

    return res.json({
      assistantOverrides: {
        firstMessage: greeting,
        model: {
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: require('../services/groq').SYSTEM_PROMPT + '\n\nCRITICAL VOICE INSTRUCTION: This is a VOICE CALL. Be EXTREMELY CONCISE. Use very short sentences (under 15 words). Briefly acknowledge the chat history, then ask for the next step. Never list more than 2-3 options at once.'
            }
          ],
          tools: dynamicTools
        },
        variableValues: {
          chatContext: contextSummary || "No previous context. This is a new conversation.",
          patientName: pName
        }
      }
    });
  }

  res.status(200).json({ ok: true });
});

// POST /api/voice/tool - Handle tool calls from Vapi
router.post('/tool', async (req, res) => {
  try {
    const payload = req.body;
    const { message } = payload;

    if (message?.type === 'tool-call') {
      const toolCall = message.toolCall;
      const { name, arguments: args } = toolCall;
      const customerNumber = message.call?.customer?.number;
      console.log(`🔧 Voice tool call: ${name} from ${customerNumber}`);
      
      const patient = getPatientByPhone(customerNumber);
      const patientId = patient ? patient.id : null;
      console.log(`👤 Matched patient for voice: ${patient ? patient.firstName : 'NONE'} (ID: ${patientId})`);

      const result = require('../services/groq').handleFunctionCall(name, args, patientId);
      
      return res.status(200).json(result);
    }
    res.status(400).json({ error: 'Not a tool call' });
  } catch (error) {
    console.error('Tool error:', error);
    res.status(500).json({ error: 'Tool execution failed' });
  }
});

module.exports = router;
