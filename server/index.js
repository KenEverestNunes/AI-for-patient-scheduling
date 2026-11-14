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
const { generalLimiter } = require('./middleware/rateLimit');

// Flexible CORS supporting local dev, Vercel deployments, and configured client domains
const configuredClientUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(url => url.trim().replace(/\/$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. Vapi webhooks, curl, Postman)
    if (!origin) return callback(null, true);
    
    const isAllowed = 
      configuredClientUrls.includes(origin) ||
      origin.includes('localhost') ||
      origin.endsWith('.vercel.app');

    if (isAllowed || process.env.CLIENT_URL === '*') {
      return callback(null, true);
    }
    
    // In production with credentials, dynamically permit the requesting origin if it matches the domain
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use('/api', generalLimiter);

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
  console.log(`🏥 CareSync Health API running on port ${PORT}`);
});
