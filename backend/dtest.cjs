const d = require('dotenv');
const r = d.config();
console.log('cwd:', process.cwd());
console.log('error:', r.error && r.error.message);
console.log('parsed keys:', Object.keys(r.parsed || {}));
console.log('MONGO_URI set:', !!process.env.MONGO_URI);
console.log('GEMINI set:', !!process.env.GEMINI_API_KEY);
