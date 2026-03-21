const express = require('express');
const axios = require('axios');
const { auth } = require('../middleware/auth');
const judge0 = require('../utils/judge0');
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

// Unified error response helper (always HTTP 200 for consistent client handling)
function errorResponse(type, message) {
  return { success: false, type, message, output: '' };
}

// Execute code using Judge0 API - Always returns HTTP 200 with structured JSON
router.post('/execute', auth, async (req, res) => {
  try {
    const { source_code, language_id, stdin } = req.body;

    console.log('Execute request received:', { source_code: source_code?.substring(0, 50) + '...', language_id, stdin });

    if (!source_code) {
      return res.status(200).json(errorResponse('Validation Error', 'Source code is required'));
    }

    // Prepare submission data
    const submissionData = {
      source_code: Buffer.from(source_code).toString('base64'),
      language_id: language_id || 71, // Default to Python
      stdin: stdin ? Buffer.from(stdin).toString('base64') : '',
      expected_output: null,
      stdout: null,
      stderr: null,
      compile_output: null,
      message: null,
      time: null,
      memory: null,
      status: null
    };

    if (!judge0.isConfigured()) {
      return res.status(200).json(errorResponse('Service Error', 'Code execution service not configured. Set JUDGE0_API_URL or JUDGE0_API_KEY.'));
    }

    const { baseUrl, config } = judge0.getSubmitConfig();
    config.params.wait = 'false';

    const submitResponse = await axios.post(`${baseUrl}/submissions`, submissionData, config);

    console.log('Submit response:', submitResponse.data);

    const token = submitResponse.data.token;

    if (!token) {
      return res.status(200).json(errorResponse('Execution Error', 'Failed to submit code to execution service'));
    }

    // Poll for the result with timeout
    const maxAttempts = 5; // Maximum polling attempts (5 seconds total)
    const pollInterval = 1000; // 1 second between polls
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

      // Check if execution is complete
      if (result.status && result.status.id !== 1 && result.status.id !== 2) {
        // Status 1 = In Queue, Status 2 = Processing
        break;
      }

      // Wait before next poll
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    // If still processing after max attempts, return timeout error
    if (!result || (result.status && (result.status.id === 1 || result.status.id === 2))) {
      return res.status(200).json({ ...errorResponse('Timeout Error', 'Execution took too long to complete. Please optimize your code.'), timeout: true });
    }

    // Parse Judge0 response: captures compile_output, stderr, message (no special imports in student code)
    const parsed = parseJudge0Result(result);
    return res.status(200).json(parsed);

  } catch (error) {
    console.error('Code execution error:', error.response?.data || error.message);
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

// Get supported languages
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

// Console logging endpoint for students
router.post('/console/log', auth, async (req, res) => {
  try {
    const { logs, sessionId } = req.body;

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ message: 'Logs array is required' });
    }

    // For now, we'll just validate and return success
    // In a production system, you might want to store these logs in a database
    // or send them to a logging service for analysis

    const validLogs = logs.filter(log =>
      log.timestamp &&
      log.type &&
      log.content &&
      ['info', 'output', 'error', 'success', 'warning'].includes(log.type)
    );

    if (validLogs.length === 0) {
      return res.status(400).json({ message: 'No valid logs provided' });
    }

    // Log to server console for debugging (optional)
    console.log(`Console logs from student ${req.user._id}:`, validLogs.slice(-5)); // Last 5 logs

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

// Get console history for a student (optional feature)
router.get('/console/history', auth, async (req, res) => {
  try {
    // In a real implementation, you would fetch from database
    // For now, return empty array
    res.json({
      logs: [],
      message: 'Console history feature not implemented yet'
    });
  } catch (error) {
    console.error('Console history error:', error);
    res.status(500).json({ message: 'Failed to fetch console history' });
  }
});

// Input/Output testing endpoint for students
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
      language_id: language_id || 71, // Default to Python
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

    // Poll for the result with timeout
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

      // Check if execution is complete
      if (result.status && result.status.id !== 1 && result.status.id !== 2) {
        // Status 1 = In Queue, Status 2 = Processing
        break;
      }

      // Wait before next poll
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    // If still processing after max attempts, return timeout error
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

module.exports = router;