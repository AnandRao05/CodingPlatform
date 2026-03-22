const express = require('express');
const axios = require('axios');
const { auth } = require('../middleware/auth');
const judge0 = require('../utils/judge0');
const { evaluateSubmission } = require('../utils/codeEvaluator');
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const { parseJudge0Result } = require('../utils/executionResult');

const extractAxiosError = (err) => {
  if (err.response?.data) {
    if (typeof err.response.data === 'string') return err.response.data;
    if (err.response.data.message) return err.response.data.message;
    if (err.response.data.error) return err.response.data.error;
    return JSON.stringify(err.response.data);
  }
  return err.message;
};

const router = express.Router();


function errorResponse(type, message) {
  return { success: false, type, message, output: '' };
}

// Execute code using Judge0 API - Supports batch execution for multiple test cases
router.post('/execute', auth, async (req, res) => {
  try {
    const { source_code, language_id, stdin, testCases } = req.body;

    console.log('Execute request received:', { 
      source_code: source_code?.substring(0, 50) + '...', 
      language_id, 
      hasTestCases: !!testCases,
      count: testCases?.length || 1
    });

    if (!source_code) {
      return res.status(200).json(errorResponse('Validation Error', 'Source code is required'));
    }

    if (!judge0.isConfigured()) {
      return res.status(200).json(errorResponse('Service Error', 'Code execution service not configured.'));
    }

    const { baseUrl, config } = judge0.getSubmitConfig();
    
    
    const cases = testCases && Array.isArray(testCases) ? testCases : [{ input: stdin || '' }];
    
    // 1. Prepare and submit individual cases
    const tokens = [];
    for (const tc of cases) {
      const submissionData = {
        source_code: Buffer.from(source_code).toString('base64'),
        language_id: language_id || 71,
        stdin: tc.input ? Buffer.from(tc.input).toString('base64') : ''
      };
      
      const submitRes = await axios.post(`${baseUrl}/submissions`, submissionData, config);
      if (submitRes.data && submitRes.data.token) {
        tokens.push(submitRes.data.token);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (tokens.length !== cases.length) {
      return res.status(200).json(errorResponse('Execution Error', 'Failed to submit some test cases to execution service'));
    }

    
    const maxAttempts = 10;
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
          const resultResponse = await axios.get(`${resultUrl}/submissions/${tokens[i]}`, {
            ...resultConfig,
            params: { 
              base64_encoded: 'true',
              fields: 'stdout,stderr,status,time,memory,compile_output,message'
            }
          });
          
          if (resultResponse.data.status && resultResponse.data.status.id !== 1 && resultResponse.data.status.id !== 2) {
            batchResults[i] = resultResponse.data;
          } else {
            allDone = false;
          }
        } catch (e) {
          console.error(`Error polling token ${tokens[i]}:`, e.message);
          allDone = false;
        }
      }

      completed = allDone;

      if (!completed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    if (!completed) {
      return res.status(200).json({ ...errorResponse('Timeout Error', 'Execution took too long to complete.'), timeout: true });
    }

    
    const results = batchResults.map(result => parseJudge0Result(result));

    
    if (!testCases || !Array.isArray(testCases)) {
      return res.status(200).json(results[0]);
    }

    
    return res.status(200).json({ success: true, results });

  } catch (error) {
    console.error('Code execution error:', error.response?.data || error.message);
    const errMsg = extractAxiosError(error) || 'An unexpected error occurred';
    return res.status(200).json(errorResponse('Execution Error', errMsg));
  }
});


router.get('/languages', auth, async (req, res) => {
  try {
    if (!judge0.isConfigured()) {
      return res.status(503).json({ message: 'Code execution service not configured' });
    }

    const { baseUrl, config } = judge0.getResultConfig();
    const response = await axios.get(`${baseUrl}/languages`, config);

    res.json(response.data);
  } catch (error) {
    console.error('Languages fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch languages' });
  }
});


router.post('/console/log', auth, async (req, res) => {
  try {
    const { logs, sessionId } = req.body;

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ message: 'Logs array is required' });
    }

    
    
    

    const validLogs = logs.filter(log =>
      log.timestamp &&
      log.type &&
      log.content &&
      ['info', 'output', 'error', 'success', 'warning'].includes(log.type)
    );

    if (validLogs.length === 0) {
      return res.status(400).json({ message: 'No valid logs provided' });
    }

    
    console.log(`Console logs from student ${req.user._id}:`, validLogs.slice(-5)); 

    res.json({
      success: true,
      loggedCount: validLogs.length,
      message: 'Console logs processed successfully'
    });

  } catch (error) {
    console.error('Console logging error:', error);
    res.status(500).json({ message: 'Failed to process console logs' });
  }
});


router.get('/console/history', auth, async (req, res) => {
  try {
    
    
    res.json({
      logs: [],
      message: 'Console history feature not implemented yet'
    });
  } catch (error) {
    console.error('Console history error:', error);
    res.status(500).json({ message: 'Failed to fetch console history' });
  }
});


router.post('/test-input-output', auth, async (req, res) => {
  try {
    const { source_code, language_id, input } = req.body;

    if (!source_code) {
      return res.status(200).json({
        success: false,
        type: 'Validation Error',
        message: 'Source code is required',
        output: ''
      });
    }

    console.log('Input/Output test request received:', {
      source_code: source_code?.substring(0, 50) + '...',
      language_id,
      input: input?.substring(0, 50) + '...'
    });

    if (!judge0.isConfigured()) {
      return res.status(200).json({
        success: false,
        type: 'Service Error',
        message: 'Code execution service not configured. Set JUDGE0_API_URL or JUDGE0_API_KEY.',
        output: ''
      });
    }

    // Prepare submission data
    const submissionData = {
      source_code: Buffer.from(source_code).toString('base64'),
      language_id: language_id || 71, 
      stdin: input ? Buffer.from(input).toString('base64') : '',
      expected_output: null,
      stdout: null,
      stderr: null,
      compile_output: null,
      message: null,
      time: null,
      memory: null,
      status: null
    };

    const { baseUrl, config } = judge0.getSubmitConfig();
    config.params.wait = 'false';

    const submitResponse = await axios.post(`${baseUrl}/submissions`, submissionData, config);
    const submission = submitResponse.data;
    const token = submission.token;

    if (!token) {
      return res.status(200).json(errorResponse('Execution Error', 'Failed to submit code to execution service'));
    }

    
    const maxAttempts = 5;
    const pollInterval = 1000;
    let attempts = 0;
    let result = null;

    while (attempts < maxAttempts) {
      attempts++;

      const { baseUrl: resultUrl, config: resultConfig } = judge0.getResultConfig();
      const resultResponse = await axios.get(`${resultUrl}/submissions/${token}`, {
        ...resultConfig,
        params: { base64_encoded: 'true' }
      });

      result = resultResponse.data;

      
      if (result.status && result.status.id !== 1 && result.status.id !== 2) {
        
        break;
      }

      
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    
    if (!result || (result.status && (result.status.id === 1 || result.status.id === 2))) {
      return res.status(200).json({
        success: false,
        type: 'Timeout Error',
        message: 'Execution took too long to complete. Please optimize your code.',
        output: '',
        timeout: true
      });
    }

    // Parse Judge0 response (handles compilation, runtime, syntax errors)
    const parsed = parseJudge0Result(result);
    return res.status(200).json(parsed);

  } catch (error) {
    console.error('Input/Output testing error:', error);
    const errMsg = extractAxiosError(error) || 'An unexpected error occurred';
    const isNetwork = error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK';
    return res.status(200).json({
      success: false,
      type: isNetwork ? 'Service Error' : 'Execution Error',
      message: isNetwork ? 'Cannot reach code execution service. Please try again later.' : errMsg,
      output: ''
    });
  }
});

const { analyzeCodeWithAI } = require('../services/aiCodeAnalyzer');


router.post('/analyze-draft', auth, async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code || code.trim() === '') {
      return res.status(400).json({ message: 'Cannot analyze empty code.' });
    }

    const analysis = await analyzeCodeWithAI(code, language);
    res.json(analysis);
  } catch (error) {
    console.error('Draft analysis error:', error);
    res.status(500).json({ message: 'Server error during analysis' });
  }
});




router.post('/practice/:problemId/submit', auth, async (req, res) => {
  try {
    const { code, language } = req.body;
    const { problemId } = req.params;

    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required' });
    }

    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    
    const evaluation = await evaluateSubmission(code, language, problem.testCases || []);

    
    const submission = await Submission.create({
      problemId,
      studentId: req.user._id,
      code,
      language,
      status: evaluation.status,
      score: evaluation.score, 
      testResults: evaluation.testResults,
      passedTestCases: evaluation.passedTestCases,
      totalTestCases: evaluation.totalTestCases,
      errorMessage: evaluation.errorMessage,
      executionTime: evaluation.executionTime,
      memoryUsed: evaluation.memoryUsed,
      isPractice: true,
      isDraft: false
    });

    res.status(201).json({
      message: 'Practice submission completed',
      submission
    });

  } catch (error) {
    console.error('Practice submit error:', error);
    res.status(500).json({ message: error.message || 'Failed to process practice submission' });
  }
});



router.get('/practice/:problemId/submissions', auth, async (req, res) => {
  try {
    const { problemId } = req.params;
    const submissions = await Submission.find({
      problemId,
      studentId: req.user._id,
      isPractice: true,
      isDraft: { $ne: true }
    }).sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (error) {
    console.error('Get practice submissions error:', error);
    res.status(500).json({ message: 'Failed to fetch submission history' });
  }
});

module.exports = router;