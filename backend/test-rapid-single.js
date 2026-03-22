const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function testSingle() {
  try {
    const url = 'https://judge0-ce.p.rapidapi.com/submissions';
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': process.env.JUDGE0_API_KEY,
        'X-RapidAPI-Host': process.env.JUDGE0_API_HOST
      },
      params: { base64_encoded: 'false', wait: 'true' }
    };
    const data = {
      source_code: 'print("hello")',
      language_id: 71,
      stdin: ''
    };
    console.log("sending single request...");
    const res = await axios.post(url, data, config);
    console.log("Response:", res.status, res.data);
  } catch (err) {
    console.error('Rapid API Error:', err.response?.status, err.response?.data, err.message);
  }
}
testSingle();
