const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chat');
const intakeRoutes = require('./routes/intake');
const appointmentRoutes = require('./routes/appointments');
const voiceRoutes = require('./routes/voice');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/intake', intakeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/voice', voiceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🏥 Kyron Medical API running on port ${PORT}`);
});
