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
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .logo-section { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 32px; }
        .logo-icon { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #0ea5e9, #06b6d4); display: flex; align-items: center; justify-content: center; }
        .logo-text { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }
        h2 { color: #0ea5e9; font-size: 20px; margin: 0 0 20px; text-align: center; }
        .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
        .detail-label { color: #64748b; font-size: 14px; }
        .detail-value { color: #0f172a; font-size: 14px; font-weight: 600; }
        .highlight { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 16px; margin: 24px 0; text-align: center; }
        .highlight .date { font-size: 18px; font-weight: 700; color: #0284c7; }
        .highlight .time { font-size: 14px; color: #64748b; margin-top: 4px; }
        .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="logo-section">
            <div class="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <h1 class="logo-text">Kyron Medical</h1>
          </div>
          
          <h2>Hi ${patient.firstName}! Your appointment is confirmed ✅</h2>
          
          <div class="highlight">
            <div class="date">${appointment.date}</div>
            <div class="time">${appointment.time}</div>
          </div>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border-collapse: collapse;">
            <tr>
              <td class="detail-label" style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; width: 30%;">Doctor</td>
              <td class="detail-value" style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">${appointment.doctorName}</td>
            </tr>
            <tr>
              <td class="detail-label" style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">Specialty</td>
              <td class="detail-value" style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">${appointment.specialty}</td>
            </tr>
            <tr>
              <td class="detail-label" style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">Reason</td>
              <td class="detail-value" style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">${appointment.reason}</td>
            </tr>
            <tr>
              <td class="detail-label" style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">Location</td>
              <td class="detail-value" style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">100 Medical Center Blvd, Philadelphia, PA 19103</td>
            </tr>
            <tr>
              <td class="detail-label" style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">Contact</td>
              <td class="detail-value" style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">(215) 555-0100</td>
            </tr>
          </table>
          
          <div style="text-align: center; margin-top: 32px;">
            <p style="color: #64748b; font-size: 13px; line-height: 1.5;">Please arrive 15 minutes before your appointment.<br>Bring a valid photo ID and insurance card.</p>
          </div>

          <div class="footer">
            <p>Need to reschedule or cancel? Call us at (215) 555-0100</p>
            <p>© ${new Date().getFullYear()} Kyron Medical • Philadelphia, PA</p>
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
