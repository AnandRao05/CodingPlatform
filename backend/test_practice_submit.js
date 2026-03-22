const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const { evaluateSubmission } = require('./utils/codeEvaluator');
const Submission = require('./models/Submission');
const Problem = require('./models/Problem');
const Assignment = require('./models/Assignment');
const User = require('./models/User');
const app = require('./index');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/online-coding-platform');
  const user = await User.findOne({ role: 'student' });
  const problem = await Problem.findOne();
  
  if (!user || !problem) {
    console.log('No user or problem found');
    process.exit(1);
  }

  try {
    const code = 'console.log("Hello World");';
    const language = 'javascript';
    const evaluation = await evaluateSubmission(code, language, problem.testCases || []);
    
    console.log('Evaluation:', evaluation.status);

    const submission = await Submission.create({
      problemId: problem._id,
      studentId: user._id,
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
    
    console.log('Submission created:', submission._id);
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit();
}

test();
