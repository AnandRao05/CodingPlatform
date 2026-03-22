const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:3000/api';

async function verifyDraftAnalysis() {
  console.log('Verifying Draft Analysis Endpoint...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/code/analyze-draft`, {
      code: 'print("Hello World")',
      language: 'python'
    });
    
    console.log('Response Status:', response.status);
    console.log('Analysis Result:', JSON.stringify(response.data, null, 2));
    
    const keys = ["timeComplexity", "spaceComplexity", "logicExplanation", "readability", "variableEnhancement", "optimization", "bugs", "bestPractices"];
    const missing = keys.filter(k => !response.data[k]);
    
    if (missing.length === 0) {
      console.log('✅ All expected AI analysis keys are present.');
    } else {
      console.log('❌ Missing keys:', missing.join(', '));
    }
  } catch (error) {
    console.error('❌ Verification failed:', error.response?.data || error.message);
  }
}

verifyDraftAnalysis();
