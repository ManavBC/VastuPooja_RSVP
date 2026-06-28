// mailer.js — sends you an email when someone RSVPs.
// If SMTP_* env vars aren't set, this quietly does nothing (RSVPs still save fine).

const nodemailer = require('nodemailer');

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL } = process.env;
const isConfigured = SMTP_HOST && SMTP_USER && SMTP_PASS && NOTIFY_EMAIL;

let transporter = null;
if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 465,
    secure: Number(SMTP_PORT) !== 587, // true for 465, false for 587/STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

async function notifyNewRsvp(rsvp) {
  if (!transporter) {
    console.log('[mailer] SMTP not configured — skipping email notification.');
    return { sent: false, reason: 'not_configured' };
  }

  const subject = rsvp.attending === 'yes'
    ? `${rsvp.name} is coming! (${rsvp.guests} guest${rsvp.guests === 1 ? '' : 's'})`
    : `${rsvp.name} can't make it`;

  const text = [
    `Name: ${rsvp.name}`,
    `Attending: ${rsvp.attending === 'yes' ? 'Yes' : 'No'}`,
    `Guests: ${rsvp.guests}`,
    `Submitted: ${rsvp.created_at}`
  ].join('\n');

  try {
    await transporter.sendMail({
      from: SMTP_USER,
      to: NOTIFY_EMAIL,
      subject: `Housewarming RSVP — ${subject}`,
      text
    });
    return { sent: true };
  } catch (err) {
    console.error('[mailer] Failed to send notification email:', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { notifyNewRsvp };
