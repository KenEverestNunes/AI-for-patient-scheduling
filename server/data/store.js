const fs = require('fs');
const path = require('path');
const neon = require('./neon');

// Hard-coded doctor data with specialties and body part mappings
const doctors = [
  {
    id: 'dr-chen',
    name: 'Dr. Sarah Chen',
    specialty: 'Orthopedics',
    bodyParts: ['knee', 'hip', 'shoulder', 'back', 'joints', 'spine', 'elbow', 'wrist', 'ankle', 'bone', 'fracture', 'ligament', 'tendon', 'muscle', 'arthritis'],
    bio: 'Board-certified orthopedic surgeon with 15 years of experience specializing in joint replacement and sports medicine.',
    office: {
      address: '100 Medical Center Blvd, Suite 200, Philadelphia, PA 19103',
      phone: '(215) 555-0101',
      hours: 'Mon-Fri 8:00 AM - 5:00 PM'
    }
  },
  {
    id: 'dr-rivera',
    name: 'Dr. Michael Rivera',
    specialty: 'Cardiology',
    bodyParts: ['heart', 'chest', 'blood pressure', 'cardiovascular', 'heartbeat', 'palpitations', 'circulation', 'artery', 'vein', 'cholesterol', 'cardiac'],
    bio: 'Interventional cardiologist specializing in preventive cardiology and cardiovascular disease management.',
    office: {
      address: '100 Medical Center Blvd, Suite 300, Philadelphia, PA 19103',
      phone: '(215) 555-0102',
      hours: 'Mon-Fri 9:00 AM - 5:00 PM'
    }
  },
  {
    id: 'dr-patel',
    name: 'Dr. Priya Patel',
    specialty: 'Dermatology',
    bodyParts: ['skin', 'rash', 'mole', 'acne', 'eczema', 'psoriasis', 'dermatitis', 'hives', 'sunburn', 'wart', 'lesion', 'itching', 'birthmark', 'hair loss'],
    bio: 'Dermatologist with expertise in medical and cosmetic dermatology, skin cancer screening, and treatment of chronic skin conditions.',
    office: {
      address: '250 Wellness Drive, Suite 110, Philadelphia, PA 19103',
      phone: '(215) 555-0103',
      hours: 'Mon-Thu 8:30 AM - 4:30 PM, Fri 8:30 AM - 12:00 PM'
    }
  },
  {
    id: 'dr-obrien',
    name: "Dr. James O'Brien",
    specialty: 'Gastroenterology',
    bodyParts: ['stomach', 'digestion', 'intestine', 'liver', 'colon', 'abdomen', 'nausea', 'heartburn', 'acid reflux', 'bowel', 'bloating', 'constipation', 'diarrhea', 'gallbladder'],
    bio: 'Gastroenterologist focused on digestive health, colonoscopy screening, and treatment of GI disorders.',
    office: {
      address: '250 Wellness Drive, Suite 220, Philadelphia, PA 19103',
      phone: '(215) 555-0104',
      hours: 'Mon-Fri 8:00 AM - 4:00 PM'
    }
  }
];

// DB persistence
const DB_PATH = path.join(__dirname, 'db.json');

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading DB:', err);
  }
  return { patients: [], appointments: [], chatSessions: {} };
}

function saveDB() {
  try {
    const data = JSON.stringify({ patients, appointments, chatSessions }, null, 2);
    fs.writeFileSync(DB_PATH, data, 'utf8');
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}

const db = loadDB();
let patients = db.patients || [];
let appointments = db.appointments || [];
let chatSessions = db.chatSessions || {};

// Sync with Neon PostgreSQL if DATABASE_URL is configured
async function syncNeonOnStartup() {
  if (!neon.isNeonConfigured()) return;
  try {
    await neon.initSchema();
    const patientsRes = await neon.query('SELECT * FROM patients ORDER BY created_at ASC');
    if (patientsRes && patientsRes.rows) {
      for (const row of patientsRes.rows) {
        if (!patients.some(p => p.id === row.id)) {
          patients.push({
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            dob: row.dob,
            phone: row.phone,
            email: row.email,
            reason: row.reason || '',
            smsOptIn: row.sms_opt_in,
            createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
          });
        }
      }
    }
    const aptsRes = await neon.query('SELECT * FROM appointments ORDER BY created_at ASC');
    if (aptsRes && aptsRes.rows) {
      for (const row of aptsRes.rows) {
        if (!appointments.some(a => a.id === row.id || a.slotId === row.slot_id)) {
          appointments.push({
            id: row.id,
            slotId: row.slot_id,
            patientId: row.patient_id,
            doctorId: row.doctor_id,
            doctorName: row.doctor_name,
            specialty: row.specialty,
            dateTime: row.date_time,
            date: row.date,
            time: row.time,
            reason: row.reason,
            status: row.status,
            createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
          });
          const slot = availabilities.find(s => s.id === row.slot_id);
          if (slot) slot.booked = true;
        }
      }
    }
    console.log(`✅ Loaded ${patients.length} patients and ${appointments.length} appointments from Neon PostgreSQL`);
  } catch (err) {
    console.error('⚠️ Neon startup sync warning:', err.message);
  }
}

if (neon.isNeonConfigured()) {
  syncNeonOnStartup();
}

// Generate availability slots for the next 45 days
function generateAvailabilities() {
  const availabilities = [];
  const now = new Date();

  for (const doctor of doctors) {
    for (let dayOffset = 1; dayOffset <= 45; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);

      // Skip weekends
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Generate slots from 9 AM to 4:30 PM (30 min each)
      const slotHours = [9, 9.5, 10, 10.5, 11, 11.5, 13, 13.5, 14, 14.5, 15, 15.5, 16];

      for (const hour of slotHours) {
        const slotDate = new Date(date);
        slotDate.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);

        availabilities.push({
          id: `${doctor.id}-${slotDate.toISOString()}`,
          doctorId: doctor.id,
          doctorName: doctor.name,
          specialty: doctor.specialty,
          dateTime: slotDate.toISOString(),
          date: slotDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          time: slotDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          dayOfWeek: slotDate.toLocaleDateString('en-US', { weekday: 'long' }),
          booked: false
        });
      }
    }
  }

  return availabilities;
}

let availabilities = generateAvailabilities();

// Sync booked status from persisted appointments
function syncAvailabilities() {
  appointments.forEach(apt => {
    const slot = availabilities.find(s => s.id === apt.slotId);
    if (slot) slot.booked = true;
  });
}
syncAvailabilities();

// Find the best matching doctor for a body part / reason
function matchDoctor(reason) {
  if (!reason || typeof reason !== 'string') return null;
  const reasonLower = reason.toLowerCase().trim();
  if (!reasonLower) return null;
  let bestMatch = null;
  let bestScore = 0;

  for (const doctor of doctors) {
    let score = 0;
    for (const bodyPart of doctor.bodyParts) {
      if (reasonLower.includes(bodyPart.toLowerCase())) {
        score += bodyPart.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = doctor;
    }
  }

  return bestMatch;
}

// Search available slots
function searchAvailabilities({ doctorId, preferredDay, preferredTimeRange, limit = 5 }) {
  let slots = availabilities.filter(s => !s.booked);

  if (doctorId) {
    slots = slots.filter(s => s.doctorId === doctorId);
  }

  if (preferredDay) {
    const dayLower = preferredDay.toLowerCase();
    slots = slots.filter(s => s.dayOfWeek.toLowerCase().includes(dayLower));
  }

  if (preferredTimeRange) {
    const range = preferredTimeRange.toLowerCase();
    slots = slots.filter(s => {
      const hour = new Date(s.dateTime).getHours();
      if (range.includes('morning')) return hour < 12;
      if (range.includes('afternoon')) return hour >= 12 && hour < 17;
      if (range.includes('evening')) return hour >= 17;
      return true;
    });
  }

  return slots.slice(0, limit);
}

// Book an appointment
function bookAppointment({ slotId, patientId, reason }) {
  const slot = availabilities.find(s => s.id === slotId);
  if (!slot) return { success: false, error: 'Slot not found' };
  if (slot.booked) return { success: false, error: 'Slot already booked' };

  slot.booked = true;

  const appointment = {
    id: `apt-${Date.now()}`,
    slotId,
    patientId,
    doctorId: slot.doctorId,
    doctorName: slot.doctorName,
    specialty: slot.specialty,
    dateTime: slot.dateTime,
    date: slot.date,
    time: slot.time,
    reason,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };

  appointments.push(appointment);
  saveDB();

  // Async write-through to Neon PostgreSQL if configured
  if (neon.isNeonConfigured()) {
    neon.query(
      `INSERT INTO appointments (id, slot_id, patient_id, doctor_id, doctor_name, specialty, date_time, date, time, reason, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (slot_id) DO NOTHING`,
      [
        appointment.id,
        appointment.slotId,
        appointment.patientId,
        appointment.doctorId,
        appointment.doctorName,
        appointment.specialty,
        appointment.dateTime,
        appointment.date,
        appointment.time,
        appointment.reason,
        appointment.status,
        appointment.createdAt
      ]
    ).catch(err => console.error('Failed to write appointment to Neon:', err.message));
  }

  return { success: true, appointment };
}

// Patient management
function createPatient(data) {
  const patient = {
    id: `patient-${Date.now()}`,
    ...data,
    createdAt: new Date().toISOString()
  };
  patients.push(patient);
  saveDB();

  // Async write-through to Neon PostgreSQL if configured
  if (neon.isNeonConfigured()) {
    neon.query(
      `INSERT INTO patients (id, first_name, last_name, dob, phone, email, reason, sms_opt_in, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [
        patient.id,
        patient.firstName,
        patient.lastName,
        patient.dob,
        patient.phone,
        patient.email,
        patient.reason || '',
        Boolean(patient.smsOptIn),
        patient.createdAt
      ]
    ).catch(err => console.error('Failed to write patient to Neon:', err.message));
  }

  return patient;
}

function getPatient(id) {
  return patients.find(p => p.id === id);
}

function getPatientByPhone(phone) {
  const cleanFormat = (p) => (p || '').replace(/\D/g, '');
  const cleanSearch = cleanFormat(phone);
  if (!cleanSearch) return null;
  // Match last 10 digits to handle international/local variations (+1 etc)
  const searchSuffix = cleanSearch.slice(-10);
  return patients
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
    .find(p => cleanFormat(p.phone).slice(-10) === searchSuffix);
}

// Chat session management
function getChatSession(sessionId) {
  if (!chatSessions[sessionId]) {
    chatSessions[sessionId] = {
      id: sessionId,
      messages: [],
      createdAt: new Date().toISOString()
    };
    saveDB();
  }
  return chatSessions[sessionId];
}

function getLatestSessionForPatient(patientId) {
  const sessions = Object.values(chatSessions).filter(s => s.patientId === patientId);
  if (!sessions.length) return null;
  return sessions.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

function addMessage(sessionId, role, content) {
  const session = getChatSession(sessionId);
  session.messages.push({ role, content, timestamp: new Date().toISOString() });
  saveDB();

  // Async write-through to Neon PostgreSQL if configured
  if (neon.isNeonConfigured()) {
    const timestamp = session.messages[session.messages.length - 1].timestamp;
    neon.query(
      `INSERT INTO chat_sessions (id, patient_id, created_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [session.id, session.patientId || null, session.createdAt]
    ).then(() => {
      return neon.query(
        `INSERT INTO chat_messages (session_id, role, content, created_at)
         VALUES ($1, $2, $3, $4)`,
        [session.id, role, content, timestamp]
      );
    }).catch(err => console.error('Failed to write chat message to Neon:', err.message));
  }

  return session;
}

module.exports = {
  doctors,
  availabilities,
  appointments,
  patients,
  matchDoctor,
  searchAvailabilities,
  bookAppointment,
  createPatient,
  getPatient,
  getPatientByPhone,
  getChatSession,
  getLatestSessionForPatient,
  addMessage,
  chatSessions
};
