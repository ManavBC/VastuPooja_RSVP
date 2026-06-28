// db.js — initializes a small JSON-file database (data/rsvps.json) on first
// run and exposes helper functions for reading/writing RSVPs.
//
// Why a JSON file instead of a SQL engine: it needs zero native compilation
// (some SQLite bindings require build tools that aren't always available)
// and works identically on every platform and Node version. For a single
// event's guest list this is plenty durable — writes are atomic (written to
// a temp file, then renamed over the real one) so a crash mid-write can't
// corrupt existing data.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'rsvps.json');

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ nextId: 1, rsvps: [] }, null, 2));
  }
}
ensureDb();

function load() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function save(data) {
  // Write to a temp file first, then rename — avoids a half-written file
  // if the process is killed mid-write.
  const tmpPath = DB_PATH + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  fs.renameSync(tmpPath, DB_PATH);
}

function insertRsvp({ name, attending, guests }) {
  const data = load();
  const record = {
    id: data.nextId,
    name,
    attending,
    guests,
    created_at: new Date().toISOString()
  };
  data.rsvps.push(record);
  data.nextId += 1;
  save(data);
  return record;
}

function getAllRsvps() {
  return load().rsvps.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getStats() {
  const rsvps = load().rsvps;
  const yes = rsvps.filter(r => r.attending === 'yes').length;
  const no = rsvps.filter(r => r.attending === 'no').length;
  const guests = rsvps.filter(r => r.attending === 'yes').reduce((sum, r) => sum + (r.guests || 0), 0);
  return { yes, no, guests };
}

module.exports = { insertRsvp, getAllRsvps, getStats };

