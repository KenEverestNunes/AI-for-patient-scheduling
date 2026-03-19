// Email service using SendGrid API
// Sign up at https://sendgrid.com and get an API key, then verify a Single Sender email

async function sendAppointmentConfirmation({ patient, appointment }) {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const verifiedSender = process.env.SENDGRID_SENDER_EMAIL;
  
  if (!sendgridApiKey || !verifiedSender) {
    console.log('📧 Email not configured (no SENDGRID_API_KEY or SENDGRID_SENDER_EMAIL). Skipping email.');
    console.log('📧 Would have sent confirmation to:', patient.email);
    console.log('📧 Appointment:', JSON.stringify(appointment, null, 2));
    return { success: false, reason: 'Email not configured' };
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #f1f5f9; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 32px; }
        .logo { text-align: center; margin-bottom: 24px; }
        .logo h1 { color: #0ea5e9; font-size: 24px; margin: 0; }
        .logo p { color: #94a3b8; font-size: 14px; margin: 4px 0 0; }
        h2 { color: #0ea5e9; font-size: 20px; margin: 0 0 20px; }
        .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .detail-label { color: #94a3b8; font-size: 14px; }
        .detail-value { color: #f1f5f9; font-size: 14px; font-weight: 600; }
        .highlight { background: linear-gradient(135deg, rgba(14,165,233,0.15), rgba(6,182,212,0.1)); border: 1px solid rgba(14,165,233,0.2); border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center; }
        .highlight .date { font-size: 18px; font-weight: 700; color: #0ea5e9; }
        .highlight .time { font-size: 14px; color: #94a3b8; margin-top: 4px; }
        .footer { text-align: center; margin-top: 24px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="logo">
            <h1>⚕️ Kyron Medical Group</h1>
            <p>Appointment Confirmation</p>
          </div>
          
          <h2>Hi ${patient.firstName}! Your appointment is confirmed ✅</h2>
          
          <div class="highlight">
            <div class="date">${appointment.date}</div>
            <div class="time">${appointment.time}</div>
          </div>

          <div class="detail-row">
            <span class="detail-label">Doctor</span><span class="detail-value">${appointment.doctorName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Specialty</span><span class="detail-value">${appointment.specialty}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Reason</span><span class="detail-value">${appointment.reason}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Location</span><span class="detail-value">100 Medical Center Blvd, Philadelphia, PA 19103</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Contact</span><span class="detail-value">(215) 555-0100</span>
          </div>
          
          <div style="text-align: center; margin-top: 24px;">
            <p style="color: #94a3b8; font-size: 13px;">Please arrive 15 minutes before your appointment.<br>Bring a valid photo ID and insurance card.</p>
          </div>

          <div class="footer">
            <p>Need to reschedule or cancel? Call us at (215) 555-0100</p>
            <p>© 2025 Kyron Medical Group • Philadelphia, PA</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: patient.email }],
          subject: `Appointment Confirmed — ${appointment.date} at ${appointment.time} with ${appointment.doctorName}`
        }],
        from: { email: verifiedSender, name: "Kyron Medical" },
        content: [{ type: "text/html", value: emailHtml }]
      }),
    });

    if (response.ok) {
      console.log(`📧 Confirmation email sent via SendGrid to ${patient.email}`);
      return { success: true };
    } else {
      const errorData = await response.json();
      console.error('📧 SendGrid error:', JSON.stringify(errorData, null, 2));
      return { success: false, error: errorData };
    }
  } catch (error) {
    console.error('📧 Email error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { sendAppointmentConfirmation };
