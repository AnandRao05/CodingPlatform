const axios = require('axios');

async function test() {
  const url = 'http://localhost:2358/submissions';
  const data = {
    source_code: 'print("Hello World" // syntax error',
    language_id: 71, 
    stdin: ''
  };
  const config = {
    headers: { 'Content-Type': 'application/json' },
    params: { base64_encoded: 'false', wait: 'true' }
  };
  
  try {
    console.log('Sending request to Judge0...');
    const res = await axios.post(url, data, config);
    console.log('Success:', res.status);
    console.log('Body:', res.data);
  } catch (err) {
    console.log('Error status:', err.response?.status);
    console.log('Error data:', err.response?.data);
    console.log('Message:', err.message);
  }
}

test();
