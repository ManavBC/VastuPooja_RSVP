// server.js — the whole backend. Run with: npm start

require('dotenv').config();
const path = require('path');
const express = require('express');
const { insertRsvp, getAllRsvps, getStats } = require('./db');
const { notifyNewRsvp } = require('./mailer');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST_PASSCODE = process.env.HOST_PASSCODE || 'changeme';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Event details, handed to the frontend so they only live in one place (.env)
app.get('/api/event-info', (req, res) => {
  res.json({
    hostName: process.env.HOST_NAME || 'Alex & Jamie',
    eventDate: process.env.EVENT_DATE || 'Saturday, August 9, 2026',
    eventTime: process.env.EVENT_TIME || '10:00 AM – 1:00 PM',
    lunchTime: process.env.LUNCH_TIME || '12:30 PM',
    eventAddress: process.env.EVENT_ADDRESS || '123 Maple Street, Springfield',
    hostPhone: process.env.HOST_PHONE || '',
    hostPhone2: process.env.HOST_PHONE2 || ''
  });
});

// Guests submit their RSVP here
app.post('/api/rsvp', async (req, res) => {
  const { name, attending, guests } = req.body || {};

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (attending !== 'yes' && attending !== 'no') {
    return res.status(400).json({ error: "attending must be 'yes' or 'no'" });
  }
  const guestCount = attending === 'yes' ? Math.max(1, Math.min(10, Number(guests) || 1)) : 0;

  const rsvp = insertRsvp({ name: name.trim(), attending, guests: guestCount });

  // Fire-and-forget — a slow or failed email never blocks the guest's confirmation
  notifyNewRsvp(rsvp).catch(() => {});

  res.status(201).json({ ok: true, rsvp });
});

// Host dashboard data — guarded by a passcode (sent as a header, not logged in plain URLs)
app.get('/api/rsvps', (req, res) => {
  const passcode = req.header('x-host-passcode') || req.query.passcode;
  if (passcode !== HOST_PASSCODE) {
    return res.status(401).json({ error: 'Incorrect passcode' });
  }
  res.json({ rsvps: getAllRsvps(), stats: getStats() });
});

app.listen(PORT, () => {
  console.log(`Housewarming RSVP server running at http://localhost:${PORT}`);
  console.log(`Database file: ${path.join(__dirname, 'data', 'rsvps.json')}`);
});
