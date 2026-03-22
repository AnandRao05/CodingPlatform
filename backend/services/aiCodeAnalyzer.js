const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeCodeWithAI(code, language) {
  try {
    
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('YOUR_')) {
      console.warn("Gemini API key not configured. Using fallback analysis.");
      return getFallbackAnalysis(code, language);
    }

    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            timeComplexity: { type: "string" },
            spaceComplexity: { type: "string" },
            readability: { type: "string" },
            naming: { type: "string" },
            optimization: { type: "string" },
            bugs: { type: "string" },
            bestPractices: { type: "string" }
          },
          required: ["timeComplexity", "spaceComplexity", "readability", "naming", "optimization", "bugs", "bestPractices"]
        }
      }
    }, { apiVersion: "v1beta" });
    
    const prompt = `You are a professional code reviewer. Analyze the following ${language} code and provide detailed feedback for each field in the requested schema.
    
    CODE:
    ${code}`;

    
    const requestPromise = model.generateContent(prompt);
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("AI Analysis request timed out")), 15000);
    });

    const result = await Promise.race([requestPromise, timeoutPromise]);
    const responseText = result.response.text();

    return JSON.parse(responseText.trim());
    
  } catch (error) {
    console.error("AI Analysis Error Details:", error.message);
    
    
    
    console.warn("AI Analysis failed. Returning professional fallback analysis.");
    return getFallbackAnalysis(code, language);
  }
}

function getFallbackAnalysis(code, language) {
  return {
    timeComplexity: "Unable to determine precisely without AI. Please review loops and recursive calls for efficiency.",
    spaceComplexity: "Memory usage depends on input size. Check for large data structures or deep recursion.",
    readability: "Code structure is present. Ensure consistent indentation and logical grouping of functions.",
    naming: "Use descriptive names for variables and functions to improve maintainability and follow language-specific naming conventions.",
    optimization: "Consider edge cases and potential bottlenecks in your logic.",
    bugs: "Manually verify edge cases like empty inputs, extremely large values, or null references.",
    bestPractices: "Follow standard coding conventions for " + language + " to ensure professional quality code."
  };
}

module.exports = {
  analyzeCodeWithAI
};
