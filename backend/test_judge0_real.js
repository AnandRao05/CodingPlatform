const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const judge0 = require('./utils/judge0');

async function testConnectivity() {
  console.log('Judge0 Configuration:', {
    isLocal: judge0.isLocal,
    USE_RAPIDAPI: judge0.USE_RAPIDAPI,
    URL: judge0.JUDGE0_API_URL,
    HOST: judge0.JUDGE0_API_HOST
  });

  if (!judge0.isConfigured()) {
    console.error('Judge0 is not configured!');
    return;
  }

  const { baseUrl, config } = judge0.getSubmitConfig();
  console.log('Using Base URL:', baseUrl);
  
  try {
    console.log('Checking Judge0 health/about...');
    const aboutRes = await axios.get(`${baseUrl}/about`, config);
    console.log('About Response:', aboutRes.data);
    
    console.log('Attempting a simple execution...');
    const submissionData = {
      source_code: Buffer.from('print("Hello from Antigravity")').toString('base64'),
      language_id: 71,
      stdin: ''
    };
    
    const submitRes = await axios.post(`${baseUrl}/submissions`, submissionData, {
      ...config,
      params: { base64_encoded: 'true', wait: 'true' }
    });
    
    console.log('Execution Status:', submitRes.data.status);
    console.log('Execution Output:', Buffer.from(submitRes.data.stdout || '', 'base64').toString());
    
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.error('Response Data:', err.response.data);
      console.error('Response Status:', err.response.status);
    }
  }
}

testConnectivity();
