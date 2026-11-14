const express = require('express');
const router = express.Router();
const { appointments } = require('../data/store');
const { requireAuth } = require('../middleware/auth');

// GET /api/appointments/:patientId - Get patient's appointments (Protected)
router.get('/:patientId', requireAuth, (req, res) => {
  try {
    const patientAppointments = appointments.filter(a => a.patientId === req.params.patientId);
    res.json({ success: true, appointments: patientAppointments });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Failed to get appointments' });
  }
});

module.exports = router;
