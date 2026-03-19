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
    
    // Automatically discover the live Ngrok URL from the background daemon so the user never has to paste it
    let ngrokUrl = process.env.VAPI_WEBHOOK_URL || 'https://muzzy-braden-civilly.ngrok-free.dev';
    try {
      const ngrokRes = await fetch('http://127.0.0.1:4040/api/tunnels');
      if (ngrokRes.ok) {
        const data = await ngrokRes.json();
        const httpsTunnel = data.tunnels?.find(t => t.public_url.startsWith('https'));
        if (httpsTunnel) ngrokUrl = httpsTunnel.public_url;
      }
    } catch(e) { 
      // Silently fall back to .env if Ngrok isn't running locally (e.g. on EC2 production)
    }

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

    // Call Vapi API to initiate outbound call
    const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumberId: vapiPhoneNumberId,
        assistantId: vapiAssistantId,
        customer: {
          number: formattedPhone,
          name: patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'
        },
        assistantOverrides: {
          firstMessageMode: "assistant-speaks-first",
          firstMessage: `Hi ${patient?.firstName || 'there'}! This is Kyra from Kyron Medical Group. I'm continuing our conversation from the website. How can I help you?`,
          model: {
            provider: 'groq',
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            messages: [{
              role: "system",
              content: require('../services/groq').SYSTEM_PROMPT + '\n\nCRITICAL VOICE INSTRUCTION: You are speaking to the patient over a live phone call right now! THERE IS NO SCREEN OR CHAT INTERFACE. The user CANNOT click buttons. Do NOT ask them to click anything. If you find appointment slots, read out 2 or 3 of them distinctly and concisely. When they choose, YOU MUST USE THE bookAppointment TOOL to finalize the booking yourself over the phone!'
            }],
            tools: dynamicTools
          },
          variableValues: {
            chatContext: contextSummary || "No previous context. This is a new conversation.",
            patientName: patient ? patient.firstName : "Patient"
          },
          metadata: {
            sessionId,
            patientId
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

    // Dynamically derive the Webhook URL from the request host (Ngrok)
    const hostUrl = 'https://' + req.get('host');
    const dynamicTools = require('../services/groq').tools.map(t => ({
      async: false,
      messages: [{ type: "request-start", content: "Let me check the database..." }],
      ...t,
      server: { url: hostUrl + '/api/voice/tool' }
    }));

    return res.json({
      assistantOverrides: {
        firstMessage: greeting,
        model: {
          provider: 'groq',
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          messages: [{
            role: "system",
            content: require('../services/groq').SYSTEM_PROMPT + '\n\nCRITICAL VOICE INSTRUCTION: You are speaking to the patient over a live phone call right now! THERE IS NO SCREEN OR CHAT INTERFACE. The user CANNOT click buttons. Do NOT ask them to click anything. If you find appointment slots, read out 2 or 3 of them distinctly and concisely. When they choose, YOU MUST USE THE bookAppointment TOOL to finalize the booking yourself over the phone!'
          }],
          tools: dynamicTools
        },
        variableValues: {
          chatContext: contextSummary || "No previous context. This is a new conversation.",
          patientName: pName
        },
        metadata: {
          patientId: patient.id,
          sessionId: session ? session.id : null
        }
      }
    });

  } catch (error) {
    console.error('Inbound voice error:', error);
    res.json({});
  }
});

// POST /api/voice/tool - Handle Vapi Tool Execution Webhooks
router.post('/tool', async (req, res) => {
  try {
    const { message } = req.body;
    console.log('📞 VAPI TOOL WEBHOOK received. Type:', message?.type);
    console.log('📞 VAPI payload keys:', JSON.stringify(Object.keys(message || {})));

    const { handleFunctionCall } = require('../services/groq');
    const { getPatientByPhone } = require('../data/store');
    
    const customerNumber = message?.call?.customer?.number;
    const patientId = customerNumber ? getPatientByPhone(customerNumber)?.id : null;
    
    // Vapi uses different property names depending on tool configuration:
    // - message.toolWithToolCallList  (server tools with metadata)
    // - message.toolCallList          (basic tool calls)
    const toolList = message?.toolWithToolCallList || message?.toolCallList || [];

    if (toolList.length === 0) {
      console.warn('⚠️ No tool calls found in Vapi payload:', JSON.stringify(message));
      return res.json({ results: [] });
    }

    const results = [];

    for (const item of toolList) {
      // Support both { toolCall: {...} } and direct { id, function: {...} } shapes
      const toolCall = item.toolCall || item;
      const name = toolCall.function?.name;
      const rawArgs = toolCall.function?.arguments || '{}';
      const args = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs;

      console.log(`🤖 VAPI VOICE TOOL EXECUTION: ${name}`, args);
      const executionResult = handleFunctionCall(name, args, patientId);
      console.log(`✅ Tool result:`, JSON.stringify(executionResult).substring(0, 200));

      results.push({
        toolCallId: toolCall.id,
        result: JSON.stringify(executionResult)
      });
    }

    return res.json({ results });
  } catch (err) {
    console.error('Webhook execution error:', err);
    return res.status(500).json({ error: 'Tool execution failed' });
  }
});

module.exports = router;
