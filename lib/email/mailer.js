import nodemailer from 'nodemailer';

/**
 * Send an email to the student when staff approves/dispatches a response.
 * Configured via environment variables in .env.local:
 *   SMTP_HOST (e.g., smtp.gmail.com)
 *   SMTP_PORT (e.g., 587 or 465)
 *   SMTP_USER (e.g., university.triage@gmail.com)
 *   SMTP_PASS (e.g., app password)
 *   SMTP_FROM (e.g., "University Complaint Triage <no-reply@university.edu>")
 */
export async function sendStudentEmail({ to, studentName, complaintNumber, responseText }) {
  if (!to) {
    console.warn('[Mailer Warning] No recipient email address provided.');
    return { success: false, reason: 'No student email provided' };
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const from = process.env.SMTP_FROM || `"University Complaint Triage" <${user || 'no-reply@university.edu'}>`;

  const subject = `Update regarding your Complaint Case #${complaintNumber}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #2563eb; color: #ffffff; padding: 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">University Complaint System</h2>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Case Reference: ${complaintNumber}</p>
      </div>
      <div style="padding: 24px;">
        <p>Dear <strong>${studentName || 'Student'}</strong>,</p>
        <p>Your submitted complaint (Ref: <strong>${complaintNumber}</strong>) has been processed by university staff. Below is the official response regarding your inquiry:</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; border-radius: 4px; margin: 20px 0; font-size: 15px;">
          ${responseText.replace(/\n/g, '<br/>')}
        </div>
        <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
          This is an automated notification from the University Complaint Triage Office. If you have additional documents, please reply directly to this message.
        </p>
      </div>
    </div>
  `;

  // If SMTP credentials are provided, send actual email
  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text: responseText,
        html: htmlContent,
      });

      console.log(`[Email Sent Successfully] MessageID: ${info.messageId} to ${to}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('[Mailer Error] Failed to dispatch real email:', err);
      return { success: false, error: err.message };
    }
  }

  // Fallback: Log email contents if SMTP is not configured yet
  console.log('====================================================');
  console.log(`[EMAIL DISPATCH SIMULATED — SMTP credentials not configured in .env.local]`);
  console.log(`TO: ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`BODY:\n${responseText}`);
  console.log('====================================================');

  return { success: true, simulated: true };
}
