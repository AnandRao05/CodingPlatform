require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    
    const axios = require('axios');
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
    const res = await axios.get(url);
    console.log('Available Models (v1beta):');
    res.data.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`));
  } catch (error) {
    console.error('❌ Error listing models:', error.response?.data || error.message);
  }
}

listModels();
