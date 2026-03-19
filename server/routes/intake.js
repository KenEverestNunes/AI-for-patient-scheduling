const express = require('express');
const router = express.Router();
const { createPatient } = require('../data/store');
const { v4: uuidv4 } = require('uuid');

// POST /api/intake - Register a new patient
router.post('/', (req, res) => {
  try {
    const { firstName, lastName, dob, phone, email, reason, smsOptIn } = req.body;

    // Validation
    if (!firstName || !lastName || !dob || !phone || !email) {
      return res.status(400).json({ error: 'All fields are required: firstName, lastName, dob, phone, email' });
    }

    const patient = createPatient({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dob,
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      reason: reason?.trim() || '',
      smsOptIn: smsOptIn || false
    });

    // Create a chat session ID
    const sessionId = uuidv4();

    res.json({
      success: true,
      patient,
      sessionId,
      message: `Welcome, ${patient.firstName}! Let's get you connected with the right doctor.`
    });
  } catch (error) {
    console.error('Intake error:', error);
    res.status(500).json({ error: 'Failed to process intake' });
  }
});

module.exports = router;
