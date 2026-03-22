const { evaluateSubmission } = require('./utils/codeEvaluator');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
  try {
    const testCases = [{ input: '1\n', expectedOutput: '2\n', isHidden: false }];
    const code = 'print(int(input()) + 1)';
    const res = await evaluateSubmission(code, 'python', testCases);
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Eval error:', err.message);
  }
}
test();
