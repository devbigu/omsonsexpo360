// Throwaway end-to-end check of the scan pipeline. Run from backend/ with the
// server already listening on :5000.
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import fs from 'fs';
import User from './models/User.js';
import Exhibition from './models/Exhibition.js';

dotenv.config({ quiet: true });

const BASE = 'http://localhost:5000';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
};

await mongoose.connect(process.env.MONGO_URI);

// --- a real user + a currently-live exhibition to save against ---
let user = await User.findOne({ email: 'e2e@test.local' });
if (!user) {
  user = await User.create({
    name: 'E2E Tester',
    email: 'e2e@test.local',
    password: 'x',
    isEmailVerified: true,
  });
}
const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h' });

const now = new Date();
let exhibition = await Exhibition.findOne({ name: 'E2E Live Exhibition' });
if (!exhibition) {
  exhibition = await Exhibition.create({
    name: 'E2E Live Exhibition',
    startTime: new Date(now.getTime() - 36e5),
    endTime: new Date(now.getTime() + 36e5),
    timezone: 'UTC+00:00',
    country: 'United Kingdom',
  });
} else {
  exhibition.startTime = new Date(now.getTime() - 36e5);
  exhibition.endTime = new Date(now.getTime() + 36e5);
  await exhibition.save();
}

const auth = { Authorization: `Bearer ${token}` };
const imgBuf = fs.readFileSync('./testcard.jpg');
const asFile = () => new File([imgBuf], 'testcard.jpg', { type: 'image/jpeg' });

// --- 1. auth gate ---
{
  const r = await fetch(`${BASE}/api/cards/`);
  check('unauthenticated GET /api/cards is rejected', r.status === 401, `status ${r.status}`);
}

// --- 2. OCR (Gemini) ---
let ocrFields = null;
{
  const fd = new FormData();
  fd.append('image', asFile());
  const r = await fetch(`${BASE}/api/cards/extract-ocr`, { method: 'POST', headers: auth, body: fd });
  const j = await r.json().catch(() => ({}));
  ocrFields = j.fields;
  check('POST /api/cards/extract-ocr returns fields', r.ok && j.success && !!j.fields,
    r.ok ? JSON.stringify(j.fields) : `status ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  if (j.fields) {
    check('  OCR read the company name', /northwind/i.test(j.fields.companyName || ''), j.fields.companyName);
    check('  OCR read the contact person', /priya/i.test(j.fields.contactPerson || ''), j.fields.contactPerson);
    check('  OCR read the email', /northwindlabs/i.test(j.fields.email || ''), j.fields.email);
  }
}

// --- 3. save a card with 2 images ---
let savedCard = null;
{
  const fd = new FormData();
  fd.append('image', asFile());
  fd.append('image', asFile());
  fd.append('fields', JSON.stringify(ocrFields || { companyName: 'Northwind Labs Ltd' }));
  fd.append('exhibitionId', exhibition._id.toString());
  fd.append('createdBy', 'e2e');
  const r = await fetch(`${BASE}/api/cards/save-entry`, { method: 'POST', headers: auth, body: fd });
  const j = await r.json().catch(() => ({}));
  savedCard = j.data;
  check('POST /api/cards/save-entry stores the card', r.ok && j.success,
    r.ok ? `id ${j.data?._id}` : `status ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  check('  both images were persisted', savedCard?.images?.length === 2, JSON.stringify(savedCard?.images));
}

// --- 4. the uploaded files are actually reachable ---
if (savedCard?.images?.length) {
  for (const rel of savedCard.images) {
    const r = await fetch(`${BASE}${rel}`);
    const type = r.headers.get('content-type') || '';
    check(`GET ${rel} serves an image`, r.ok && type.startsWith('image/'), `status ${r.status} type ${type}`);
  }
  // this is what the browser did before the fix: resolve against the frontend
  const r = await fetch(`http://localhost:5173${savedCard.images[0]}`).catch(() => null);
  check('  (context) same path on the frontend origin does NOT serve an image',
    !r || !(r.headers.get('content-type') || '').startsWith('image/'),
    r ? `status ${r.status} type ${r.headers.get('content-type')}` : 'frontend not running');
}

// --- 5. listing, scoped to the exhibition ---
{
  const r = await fetch(`${BASE}/api/cards/?exhibitionId=${exhibition._id}`, { headers: auth });
  const j = await r.json().catch(() => ({}));
  const mine = j.data?.find((c) => c._id === savedCard?._id);
  check('GET /api/cards?exhibitionId returns the saved card', r.ok && !!mine, `${j.data?.length} card(s)`);
  check('  image paths come back backend-relative', !!mine?.images?.[0]?.startsWith('/'), mine?.images?.[0]);
}

// --- 6. exhibition liveness guard ---
{
  const past = await Exhibition.create({
    name: 'E2E Ended Exhibition',
    startTime: new Date(now.getTime() - 10 * 864e5),
    endTime: new Date(now.getTime() - 9 * 864e5),
    timezone: 'UTC+00:00',
    country: 'United Kingdom',
  });
  const fd = new FormData();
  fd.append('image', asFile());
  fd.append('fields', JSON.stringify({ companyName: 'Should Not Save' }));
  fd.append('exhibitionId', past._id.toString());
  const r = await fetch(`${BASE}/api/cards/save-entry`, { method: 'POST', headers: auth, body: fd });
  check('saving to an ended exhibition is refused', r.status === 403, `status ${r.status}`);
  await Exhibition.findByIdAndDelete(past._id);
}

// --- 7. edit an existing card ---
if (savedCard?._id) {
  const r = await fetch(`${BASE}/api/cards/${savedCard._id}`, {
    method: 'PUT',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { designation: 'Director of Procurement' } }),
  });
  const j = await r.json().catch(() => ({}));
  check('PUT /api/cards/:id updates a field', r.ok && j.data?.designation === 'Director of Procurement',
    j.data?.designation);
}

console.log('\n' + '='.repeat(60));
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) console.log('FAILED:\n' + failed.map((f) => `  - ${f.name} :: ${f.detail}`).join('\n'));

await mongoose.disconnect();
process.exit(failed.length ? 1 : 0);
