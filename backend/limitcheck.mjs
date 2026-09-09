// Checks the multer size cap is actually enforced (it was a function before,
// which busboy ignores => no limit). Run: node limitcheck.mjs
import express from 'express';
import { MulterError } from 'multer';
import assert from 'assert';
import { cardUpload } from './config/multer.js';

const app = express();
app.post('/u', cardUpload.fields([{ name: 'image', maxCount: 5 }]), (req, res) => res.json({ ok: true }));
app.use((e, _req, res, _next) => res.status(400).json({ code: e instanceof MulterError ? e.code : 'OTHER' }));
const srv = app.listen(5099);

const post = async (bytes) => {
  const fd = new FormData();
  fd.append('image', new File([Buffer.alloc(bytes, 0xff)], 'x.jpg', { type: 'image/jpeg' }));
  const r = await fetch('http://localhost:5099/u', { method: 'POST', body: fd });
  return [r.status, (await r.json()).code];
};

const [okStatus] = await post(1024 * 1024);
assert.equal(okStatus, 200, '1MB should be accepted');
const [bigStatus, bigCode] = await post(12 * 1024 * 1024);
assert.equal(bigStatus, 400, '12MB should be rejected');
assert.equal(bigCode, 'LIMIT_FILE_SIZE', 'rejection should be the size limit');

console.log('PASS  1MB accepted, 12MB rejected with LIMIT_FILE_SIZE');
srv.close();
