-- CareSync Health: Database Schema for Neon Serverless PostgreSQL
-- Migration for Issue #3

CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(64) PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    dob VARCHAR(20) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    reason TEXT DEFAULT '',
    sms_opt_in BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients (phone);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients (email);

CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(64) PRIMARY KEY,
    slot_id VARCHAR(100) UNIQUE NOT NULL,
    patient_id VARCHAR(64) REFERENCES patients(id) ON DELETE SET NULL,
    doctor_id VARCHAR(50) NOT NULL,
    doctor_name VARCHAR(100) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    date_time VARCHAR(50) NOT NULL,
    date VARCHAR(20) NOT NULL,
    time VARCHAR(20) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'confirmed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments (doctor_id);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) REFERENCES patients(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages (session_id, created_at);
