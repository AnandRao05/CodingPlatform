require('dotenv').config();
const { analyzeCodeWithAI } = require('./services/aiCodeAnalyzer');

async function testGemini() {
  console.log('Testing Gemini API with key:', process.env.GEMINI_API_KEY ? 'Present (Hidden)' : 'Missing');
  
  const code = `
  function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
      const complement = target - nums[i];
      if (map.has(complement)) return [map.get(complement), i];
      map.set(nums[i], i);
    }
  }
  `;
  
  try {
    const result = await analyzeCodeWithAI(code, 'javascript');
    console.log('✅ Gemini API Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Gemini API Error:', error.message);
  }
}

testGemini();
