const express = require('express');
const router = express.Router();
const { getChatSession, getPatient, getPatientByPhone, getLatestSessionForPatient } = require('../data/store');
const { verifyVapiWebhook } = require('../middleware/vapiAuth');

// Resolve the public backend URL for Vapi webhooks (Railway, Render, or custom domain)
function getWebhookBaseUrl(req) {
  const envUrl = process.env.VAPI_WEBHOOK_URL || process.env.BACKEND_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/$/, '');
  }

  if (req && req.headers && req.headers.host) {
    const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const host = req.headers.host;
    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
      return `${proto}://${host}`;
    }
  }

  return (envUrl || `http://localhost:${process.env.PORT || 3001}`).replace(/\/$/, '');
}

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
    
    const webhookBaseUrl = getWebhookBaseUrl(req);
    console.log(`📡 Voice webhook URL: ${webhookBaseUrl}/api/voice/tool`);

    const dynamicTools = require('../services/groq').tools.map(t => ({
      async: false,
      messages: [{ type: "request-start", content: "Let me check the system..." }],
      ...t,
      server: { url: `${webhookBaseUrl}/api/voice/tool?patientId=${patientId || ''}` }
    }));

    if (!vapiApiKey || !vapiAssistantId || !vapiPhoneNumberId) {
      return res.status(500).json({ 
        error: 'Voice AI not configured',
        message: 'Voice call feature is missing API Key, Assistant ID, or Phone Number ID. Please check your Vapi configuration.'
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
          endCallPhrases: ["Goodbye.", "Goodbye!"],
          model: {
            provider: 'groq',
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: require('../services/groq').SYSTEM_PROMPT + '\n\nCRITICAL VOICE INSTRUCTION: This is a VOICE CALL. Be EXTREMELY CONCISE. Use very short sentences (under 15 words). Acknowledge the previous chat context briefly, then ask for the next step. Never list more than 2-3 options at once.\n\nPATIENT NAME: {{patientName}}\nPREVIOUS CHAT CONTEXT:\n{{chatContext}}'
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

    res.json({
      success: true,
      callId: data.id,
      message: `Call initiated to ${formattedPhone}. Please answer your phone!`
    });
  } catch (error) {
    console.error('Failed to initiate call:', error);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

// POST /api/voice/inbound - Handle inbound call webhook from Vapi
router.post('/inbound', verifyVapiWebhook, async (req, res) => {
  const payload = req.body;
  
  const defaultResponse = {
    assistantOverrides: {
      firstMessage: "Hi! You've reached CareSync Health. How can I help you today?"
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
      ? `Hi ${pName}! This is Aria from CareSync Health. I'm picking up from our chat. How can I help?`
      : `Thank you for calling CareSync Health. This is Aria, your scheduling assistant. How may I help you today?`;

    const webhookBaseUrl = getWebhookBaseUrl(req);

    const dynamicTools = require('../services/groq').tools.map(t => ({
      async: false,
      messages: [{ type: "request-start", content: "Let me check the system..." }],
      ...t,
      server: { url: `${webhookBaseUrl}/api/voice/tool?patientId=${patient ? patient.id : ''}` }
    }));

    return res.json({
      assistantOverrides: {
        endCallPhrases: ["Goodbye.", "Goodbye!"],
        firstMessage: greeting,
        model: {
          provider: 'groq',
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: require('../services/groq').SYSTEM_PROMPT + '\n\nCRITICAL VOICE INSTRUCTION: This is a VOICE CALL. Be EXTREMELY CONCISE. Use very short sentences (under 15 words). Briefly acknowledge the chat history, then ask for the next step. Never list more than 2-3 options at once.\n\nPATIENT NAME: {{patientName}}\nPREVIOUS CHAT CONTEXT:\n{{chatContext}}'
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
router.post('/tool', verifyVapiWebhook, async (req, res) => {
  try {
    const payload = req.body;
    const { message } = payload;

    let patientId = req.query.patientId;
    let customerNumber = message?.call?.customer?.number || payload.call?.customer?.number;
    
    // Fallback patient matching
    if (!patientId && customerNumber) {
      const patient = getPatientByPhone(customerNumber);
      patientId = patient ? patient.id : null;
    }

    if (message?.type === 'tool-calls' && Array.isArray(message.toolCallList)) {
      const results = [];
      
      for (const toolCall of message.toolCallList) {
        const name = toolCall.function?.name || toolCall.name;
        const argsRaw = toolCall.function?.arguments || toolCall.arguments;
        
        let args = argsRaw;
        if (typeof argsRaw === 'string') {
          try { args = JSON.parse(argsRaw); } catch (e) { args = {}; }
        }

        console.log(`🔧 Voice tool-calls: ${name} | Patient ID: ${patientId}`);
        const result = require('../services/groq').handleFunctionCall(name, args, patientId);
        
        results.push({
          toolCallId: toolCall.id,
          result: result
        });
      }
      
      return res.status(200).json({ results });
    } else if (message?.type === 'tool-call') {
      const toolCall = message.toolCall;
      const { name, arguments: args } = toolCall;
      
      console.log(`🔧 Voice tool-call (legacy): ${name} | Patient ID: ${patientId}`);
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
