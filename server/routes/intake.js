const express = require('express');
const router = express.Router();
const { createPatient } = require('../data/store');
const { v4: uuidv4 } = require('uuid');
const { IntakeSchema } = require('../validators/intake');
const { generateSessionToken } = require('../middleware/auth');
const { intakeLimiter } = require('../middleware/rateLimit');

// POST /api/intake - Register a new patient
router.post('/', intakeLimiter, async (req, res) => {
  try {
    // Schema validation using Zod
    const validationResult = IntakeSchema.safeParse(req.body);
    if (!validationResult.success) {
      const issues = validationResult.error.issues || [];
      const formattedErrors = issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return res.status(400).json({
        error: 'Validation failed',
        details: formattedErrors
      });
    }

    const validatedData = validationResult.data;
    const patient = await createPatient(validatedData);

    // Create a chat session ID
    const sessionId = uuidv4();

    // Issue a session token for accessing patient-bound routes
    const sessionToken = generateSessionToken(patient.id, sessionId);

    res.json({
      success: true,
      patient,
      sessionId,
      sessionToken,
      message: `Welcome, ${patient.firstName}! Let's get you connected with the right doctor.`
    });
  } catch (error) {
    console.error('Intake error:', error);
    res.status(500).json({ error: 'Failed to process intake' });
  }
});

module.exports = router;
