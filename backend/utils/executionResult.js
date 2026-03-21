/**
 * Judge0 Execution Result Parser
 * Maps Judge0 API response to structured LeetCode/Codeforces-style output.
 * No special imports required in student code - server-side only.
 *
 * Judge0 Status IDs:
 * 1: In Queue, 2: Processing
 * 3: Accepted, 4: Wrong Answer, 5: Time Limit Exceeded
 * 6: Compilation Error
 * 7-12: Runtime Errors (SIGSEGV, SIGXFSZ, SIGFPE, SIGABRT, NZEC, Other)
 */

const COMPILATION_STATUS_ID = 6;
const RUNTIME_STATUS_IDS = [7, 8, 9, 10, 11, 12];

/**
 * Extract the actual error message from Judge0 response.
 * Priority: compile_output (compiler errors) > stderr (runtime) > message
 */
function extractErrorMessage(result) {
  const parts = [];
  if (result.compile_output && result.compile_output.trim()) {
    parts.push(result.compile_output.trim());
  }
  if (result.stderr && result.stderr.trim()) {
    parts.push(result.stderr.trim());
  }
  if (result.message && result.message.trim() && !parts.includes(result.message.trim())) {
    parts.push(result.message.trim());
  }
  return parts.join('\n\n').trim() || 'An error occurred during execution';
}

/**
 * Determine error type from Judge0 status and output content
 */
function getErrorType(result) {
  const statusId = result.status?.id;

  if (statusId === COMPILATION_STATUS_ID) {
    return 'Compilation Error';
  }
  if (RUNTIME_STATUS_IDS.includes(statusId)) {
    return 'Runtime Error';
  }

  // Fallback: infer from output content when status is ambiguous
  const stderr = (result.stderr || '').toLowerCase();
  const compileOut = (result.compile_output || '').toLowerCase();
  const combined = `${stderr} ${compileOut}`;

  const syntaxIndicators = ['syntax error', 'parse error', 'invalid syntax'];
  const compilationIndicators = [
    'compilation failed', 'cannot find symbol', 'not declared',
    'undeclared', 'expected', 'unexpected'
  ];

  if (result.compile_output) return 'Compilation Error';
  if (syntaxIndicators.some(ind => combined.includes(ind))) return 'Syntax Error';
  if (compilationIndicators.some(ind => combined.includes(ind))) return 'Compilation Error';

  return 'Runtime Error';
}

/**
 * Check if Judge0 result indicates an error state (compilation or runtime failure)
 */
function isErrorResult(result) {
  if (!result || !result.status) return true;
  const id = result.status.id;
  return id === COMPILATION_STATUS_ID || RUNTIME_STATUS_IDS.includes(id) || !!(result.compile_output && result.compile_output.trim());
}

const decodeBase64 = (str) => {
  if (!str) return str;
  try {
    return Buffer.from(str, 'base64').toString('utf-8');
  } catch (e) {
    return str;
  }
};

/**
 * Parse Judge0 API response into structured execution result
 * @returns { success, type?, message?, output, stdout, stderr, compile_output, time, memory, status }
 */
function parseJudge0Result(rawResult) {
  const result = {
    ...rawResult,
    stdout: decodeBase64(rawResult.stdout),
    stderr: decodeBase64(rawResult.stderr),
    compile_output: decodeBase64(rawResult.compile_output),
    message: decodeBase64(rawResult.message)
  };

  const output = (result.stdout || '').trim();
  const isError = isErrorResult(result);

  if (isError) {
    const type = getErrorType(result);
    const message = extractErrorMessage(result);

    return {
      success: false,
      type,
      message,
      output: '',
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      compile_output: result.compile_output || '',
      time: result.time,
      memory: result.memory,
      status: result.status
    };
  }

  return {
    success: true,
    output,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    compile_output: result.compile_output || '',
    time: result.time,
    memory: result.memory,
    status: result.status
  };
}

module.exports = {
  parseJudge0Result,
  extractErrorMessage,
  getErrorType,
  isErrorResult,
  COMPILATION_STATUS_ID,
  RUNTIME_STATUS_IDS
};
