const axios = require('axios');
require('dotenv').config();

async function testApiKey() {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    const response = await axios.get('https://api.brevo.com/v3/account', {
      headers: {
        'api-key': apiKey,
        'Accept': 'application/json'
      }
    });
    console.log("Success:", Object.keys(response.data));
  } catch(err) {
    console.log("Error:", err.response?.status, err.response?.data);
  }
}
testApiKey();
