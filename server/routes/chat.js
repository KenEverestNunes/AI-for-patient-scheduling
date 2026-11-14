const express = require('express');
const router = express.Router();
const { chat } = require('../services/groq');
const { getChatSession, addMessage } = require('../data/store');
const { requireAuth } = require('../middleware/auth');
const { chatLimiter } = require('../middleware/rateLimit');

// POST /api/chat - Send a message and get AI response (Rate-limited)
router.post('/', chatLimiter, async (req, res) => {
  try {
    const { message, sessionId, patientId } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({ error: 'message and sessionId are required' });
    }

    // Get or create chat session
    const session = await getChatSession(sessionId);
    if (patientId) session.patientId = patientId;

    // Add user message to session
    await addMessage(sessionId, 'user', message);

    // Get AI response
    const { text } = await chat(session.messages, patientId);

    // Add assistant response to session
    await addMessage(sessionId, 'assistant', text);

    res.json({
      success: true,
      message: text,
      sessionId
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      message: "I'm sorry, I'm having trouble right now. Please try again in a moment, or call our office at (215) 555-0100."
    });
  }
});

// GET /api/chat/:sessionId - Get chat history (Protected)
router.get('/:sessionId', requireAuth, async (req, res) => {
  try {
    const session = await getChatSession(req.params.sessionId);
    res.json({ success: true, messages: session.messages });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

module.exports = router;
