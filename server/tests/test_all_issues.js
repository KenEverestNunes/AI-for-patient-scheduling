/**
 * Comprehensive Automated Test Suite for Issues #3, #4, #5, #6
 * CareSync Health
 */
const assert = require('assert');
const express = require('express');
const http = require('http');

// Set test environment secrets
process.env.JWT_SECRET = 'test-jwt-secret-12345';
process.env.VAPI_WEBHOOK_SECRET = 'test-vapi-secret-67890';
process.env.GROQ_API_KEY = 'gsk_test_dummy_key_for_testing';

const intakeRoutes = require('../routes/intake');
const voiceRoutes = require('../routes/voice');
const appointmentRoutes = require('../routes/appointments');
const chatRoutes = require('../routes/chat');
const { generateSessionToken } = require('../middleware/auth');
const { IntakeSchema } = require('../validators/intake');
const neon = require('../data/neon');
const store = require('../data/store');

const app = express();
app.use(express.json());
app.use('/api/intake', intakeRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/chat', chatRoutes);

let server;
let baseUrl;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    
    const req = http.request(url, {
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting CareSync Health Automated Verification Suite...\n');

  // --- ISSUE #6: Intake Schema Validation Tests ---
  console.log('--- Testing Issue #6: Zod Schema Validation on /api/intake ---');

  // 1. Rejects non-string firstName
  const res1 = await makeRequest('POST', '/api/intake', {
    firstName: 12345,
    lastName: 'Doe',
    dob: '1990-01-01',
    phone: '2155550199',
    email: 'test@example.com'
  });
  assert.strictEqual(res1.status, 400, 'Should return 400 for non-string firstName');
  assert.ok(res1.body.details.some(d => d.field === 'firstName'), 'Should name firstName field error');
  console.log('  ✓ Correctly rejected non-string firstName with 400');

  // 2. Rejects invalid DOB format
  const res2 = await makeRequest('POST', '/api/intake', {
    firstName: 'Jane',
    lastName: 'Doe',
    dob: 'invalid-dob',
    phone: '2155550199',
    email: 'jane@example.com'
  });
  assert.strictEqual(res2.status, 400, 'Should return 400 for invalid DOB format');
  console.log('  ✓ Correctly rejected invalid DOB format with 400');

  // 3. Rejects invalid email format
  const res3 = await makeRequest('POST', '/api/intake', {
    firstName: 'Jane',
    lastName: 'Doe',
    dob: '1990-05-15',
    phone: '2155550199',
    email: 'not-an-email'
  });
  assert.strictEqual(res3.status, 400, 'Should return 400 for invalid email');
  console.log('  ✓ Correctly rejected invalid email format with 400');

  // 4. Accepts valid payload and issues sessionToken (Issue #4 + #6)
  const res4 = await makeRequest('POST', '/api/intake', {
    firstName: 'Alice',
    lastName: 'Smith',
    dob: '1985-04-12',
    phone: '(215) 555-0188',
    email: 'alice.smith@example.com',
    reason: 'Knee discomfort',
    smsOptIn: true
  });
  assert.strictEqual(res4.status, 200, 'Should return 200 for valid intake payload');
  assert.strictEqual(res4.body.success, true);
  assert.ok(res4.body.patient.id, 'Should generate patient ID');
  assert.ok(res4.body.sessionToken, 'Should issue signed session token (Issue #4)');
  console.log('  ✓ Valid intake payload succeeded and returned sessionToken');

  const validPatientId = res4.body.patient.id;
  const validSessionId = res4.body.sessionId;
  const validToken = res4.body.sessionToken;

  // --- ISSUE #5: Vapi Webhook Security Tests ---
  console.log('\n--- Testing Issue #5: Vapi Webhook Security (/api/voice/*) ---');

  // 1. Rejects request without x-vapi-secret
  const res5 = await makeRequest('POST', '/api/voice/tool', {
    message: { type: 'tool-calls', toolCallList: [] }
  });
  assert.strictEqual(res5.status, 401, 'Should return 401 when x-vapi-secret is missing');
  console.log('  ✓ Rejects unauthenticated tool calls with 401 Unauthorized');

  // 2. Rejects request with wrong secret
  const res6 = await makeRequest('POST', '/api/voice/tool', {
    message: { type: 'tool-calls', toolCallList: [] }
  }, { 'x-vapi-secret': 'wrong-secret' });
  assert.strictEqual(res6.status, 401, 'Should return 401 when x-vapi-secret is incorrect');
  console.log('  ✓ Rejects mismatched secret with 401 Unauthorized');

  // 3. Accepts request with correct x-vapi-secret
  const res7 = await makeRequest('POST', '/api/voice/tool', {
    message: { type: 'tool-calls', toolCallList: [] }
  }, { 'x-vapi-secret': process.env.VAPI_WEBHOOK_SECRET });
  assert.strictEqual(res7.status, 200, 'Should accept valid x-vapi-secret');
  console.log('  ✓ Accepts authorized webhook calls with 200 OK');

  // --- ISSUE #4: Protected Patient Routes Tests ---
  console.log('\n--- Testing Issue #4: Protected Patient Data Routes & Authorization ---');

  // 1. Rejects unauthenticated appointments access
  const res8 = await makeRequest('GET', `/api/appointments/${validPatientId}`);
  assert.strictEqual(res8.status, 401, 'Should return 401 for unauthenticated appointments access');
  console.log('  ✓ Blocked unauthenticated GET /api/appointments/:id with 401');

  // 2. Rejects token belonging to a different patient (403 Forbidden)
  const wrongToken = generateSessionToken('other-patient-id-999', validSessionId);
  const res9 = await makeRequest('GET', `/api/appointments/${validPatientId}`, null, {
    'Authorization': `Bearer ${wrongToken}`
  });
  assert.strictEqual(res9.status, 403, 'Should return 403 when token patientId does not match route');
  console.log('  ✓ Blocked cross-patient access attempt with 403 Forbidden');

  // 3. Allows access with matching valid token
  const res10 = await makeRequest('GET', `/api/appointments/${validPatientId}`, null, {
    'Authorization': `Bearer ${validToken}`
  });
  assert.strictEqual(res10.status, 200, 'Should return 200 with valid session token');
  assert.strictEqual(res10.body.success, true);
  console.log('  ✓ Authorized patient access with valid Bearer session token');

  // --- ISSUE #3: Neon Schema and Persistence Layer ---
  console.log('\n--- Testing Issue #3: Neon PostgreSQL Persistence Layer ---');
  assert.strictEqual(typeof neon.isNeonConfigured, 'function', 'neon module exports isNeonConfigured');
  assert.strictEqual(typeof neon.query, 'function', 'neon module exports query');
  assert.strictEqual(typeof neon.initSchema, 'function', 'neon module exports initSchema');
  console.log('  ✓ Neon database client exports valid query and schema initialization methods');

  const fs = require('fs');
  const path = require('path');
  const schemaSql = fs.readFileSync(path.join(__dirname, '../data/schema.sql'), 'utf8');
  assert.ok(schemaSql.includes('CREATE TABLE IF NOT EXISTS patients'), 'Schema includes patients table');
  assert.ok(schemaSql.includes('CREATE TABLE IF NOT EXISTS appointments'), 'Schema includes appointments table');
  assert.ok(schemaSql.includes('slot_id VARCHAR(100) UNIQUE NOT NULL'), 'Schema enforces UNIQUE(slot_id) race condition prevention');
  assert.ok(schemaSql.includes('CREATE TABLE IF NOT EXISTS chat_sessions'), 'Schema includes chat_sessions table');
  assert.ok(schemaSql.includes('CREATE TABLE IF NOT EXISTS chat_messages'), 'Schema includes chat_messages table');
  console.log('  ✓ Schema.sql correctly defines all 4 required tables with unique constraints');

  console.log('\n🎉 ALL TESTS PASSED! All 4 issues verified successfully.\n');
}

server = app.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  try {
    await runTests();
  } catch (err) {
    console.error('\n❌ Test failure:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
