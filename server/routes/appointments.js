const express = require('express');
const router = express.Router();
const { appointments, patients } = require('../data/store');

// GET /api/appointments/:patientId - Get patient's appointments
router.get('/:patientId', (req, res) => {
  try {
    const patientAppointments = appointments.filter(a => a.patientId === req.params.patientId);
    res.json({ success: true, appointments: patientAppointments });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Failed to get appointments' });
  }
});

module.exports = router;
