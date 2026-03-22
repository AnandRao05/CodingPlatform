const axios = require('axios');
const judge0 = require('./judge0');
const { parseJudge0Result } = require('./executionResult');

const getLanguageId = (language) => {
  const languages = { 
    javascript: 63, 
    python: 71, 
    java: 62, 
    c: 50, 
    cpp: 54, 
    csharp: 51, 
    go: 60, 
    ruby: 72, 
    php: 68, 
    rust: 73, 
    typescript: 74 
  };
  return languages[language.toLowerCase()] || 71;
};

async function evaluateSubmission(code, language, testCases) {
  const language_id = getLanguageId(language);
  
  if (!testCases || testCases.length === 0) {
    return { score: 100, status: 'accepted', testResults: [] };
  }

  try {
    if (!judge0.isConfigured()) {
      throw new Error('Judge0 not configured.');
    }

    const { baseUrl, config } = judge0.getSubmitConfig();
    
    
    const tokens = [];
    for (const tc of testCases) {
      const submissionData = {
        source_code: Buffer.from(code).toString('base64'),
        language_id,
        stdin: tc.input ? Buffer.from(tc.input).toString('base64') : '',
        expected_output: tc.expectedOutput ? Buffer.from(tc.expectedOutput).toString('base64') : ''
      };
      
      const res = await axios.post(`${baseUrl}/submissions`, submissionData, config);
      if (res.data && res.data.token) {
        tokens.push(res.data.token);
      }
      // Add a small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (tokens.length !== testCases.length) {
      throw new Error('Failed to submit all test cases to Judge0');
    }

    
    const maxAttempts = 15;
    const pollInterval = 1000;
    let attempts = 0;
    let batchResults = new Array(tokens.length).fill(null);
    let completed = false;

    while (attempts < maxAttempts && !completed) {
      attempts++;
      const { baseUrl: resultUrl, config: resultConfig } = judge0.getResultConfig();
      
      let allDone = true;
      for (let i = 0; i < tokens.length; i++) {
        if (batchResults[i] && batchResults[i].status && batchResults[i].status.id !== 1 && batchResults[i].status.id !== 2) {
          continue; 
        }
        
        try {
          const res = await axios.get(`${resultUrl}/submissions/${tokens[i]}`, {
            ...resultConfig,
            params: { 
              base64_encoded: 'true',
              fields: 'stdout,stderr,status,time,memory,compile_output,message'
            }
          });
          
          if (res.data.status && res.data.status.id !== 1 && res.data.status.id !== 2) {
            batchResults[i] = res.data;
          } else {
            allDone = false;
          }
        } catch (e) {
          console.error(`Error polling token ${tokens[i]}`, e.message);
          allDone = false; 
        }
      }

      completed = allDone;

      if (!completed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    if (!completed) {
      throw new Error('Code evaluation timed out');
    }

    
    const testResults = batchResults.map((result, index) => {
      const parsed = parseJudge0Result(result);
      const tc = testCases[index];
      
      const actual = (parsed.output || '').trim();
      const expected = (tc.expectedOutput || '').trim();
      const passed = parsed.success && actual === expected;

      return {
        testCase: {
          input: tc.input,
          expectedOutput: tc.expectedOutput
        },
        actualOutput: actual || parsed.message || 'No output',
        passed,
        isHidden: tc.isHidden || false,
        errorType: parsed.type !== 'success' ? parsed.type : null,
        executionTime: parsed.time,
        memoryUsed: parsed.memory
      };
    });

    const passedCount = testResults.filter(r => r.passed).length;
    const totalCount = testResults.length;
    const score = Math.round((passedCount / totalCount) * 100);
    
    let overallStatus = 'accepted';
    let errorMessage = '';

    const compilationError = testResults.find(r => r.errorType === 'compilation');
    const runtimeError = testResults.find(r => r.errorType === 'runtime');
    const timeoutError = testResults.find(r => r.errorType === 'timeout');

    if (compilationError) {
      overallStatus = 'compilation_error';
      errorMessage = compilationError.actualOutput || 'Compilation Error';
    } else if (runtimeError) {
      overallStatus = 'runtime_error';
      errorMessage = runtimeError.actualOutput || 'Runtime Error';
    } else if (timeoutError) {
      overallStatus = 'time_limit_exceeded';
      errorMessage = 'Time Limit Exceeded';
    } else if (passedCount < totalCount) {
      overallStatus = 'wrong_answer';
      const firstFailed = testResults.find(r => !r.passed);
      errorMessage = `Test Case Failed. Expected: ${firstFailed.testCase.expectedOutput}, Got: ${firstFailed.actualOutput}`.substring(0, 200);
    }

    
    const totalExecutionTime = testResults.reduce((acc, r) => acc + (r.executionTime || 0), 0);
    const maxMemoryUsed = Math.max(...testResults.map(r => r.memoryUsed || 0));

    return {
      status: overallStatus,
      score,
      testResults,
      passedTestCases: passedCount,
      totalTestCases: totalCount,
      errorMessage,
      executionTime: totalExecutionTime,
      memoryUsed: maxMemoryUsed
    };

  } catch (error) {
    console.error('Code evaluation error:', error.message);
    throw error;
  }
}

module.exports = {
  evaluateSubmission,
  getLanguageId
};
