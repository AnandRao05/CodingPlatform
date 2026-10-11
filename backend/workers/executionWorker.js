const { Worker } = require('bullmq');
const { redisConnectionOptions, isRedisAvailable } = require('../config/redis');
const Submission = require('../models/Submission');
const { evaluateSubmission } = require('../utils/codeEvaluator');
const { releaseSubmissionLock } = require('../queues/executionQueue');

const CONCURRENCY = process.env.WORKER_CONCURRENCY ? parseInt(process.env.WORKER_CONCURRENCY) : 5;

let executionWorker = null;
let workerErrorCount = 0;
const MAX_WORKER_ERRORS_BEFORE_SILENCE = 5;

function initExecutionWorker() {
  if (executionWorker) return executionWorker;
  if (!process.env.REDIS_URL || !isRedisAvailable()) return null;

  try {
    executionWorker = new Worker(
      'code-submissions',
      async (job) => {
        const { submissionId, code, language, testCases, studentId, problemId } = job.data;
        console.log(`[Worker] Processing submission ${submissionId} (Job ${job.id})`);

        try {
          // 1. Mark as evaluating
          await Submission.findByIdAndUpdate(submissionId, {
            status: 'evaluating'
          });

          // 2. Evaluate submission using Judge0 with rate limiting
          const evaluation = await evaluateSubmission(code, language, testCases || []);

          // 3. Atomically persist final graded results
          const updatedSubmission = await Submission.findByIdAndUpdate(
            submissionId,
            {
              status: evaluation.status,
              score: evaluation.score,
              testResults: evaluation.testResults,
              passedTestCases: evaluation.passedTestCases,
              totalTestCases: evaluation.totalTestCases,
              errorMessage: evaluation.errorMessage,
              executionTime: evaluation.executionTime,
              memoryUsed: evaluation.memoryUsed,
              gradedAt: new Date()
            },
            { new: true }
          );

          // 4. Release submission lock
          await releaseSubmissionLock(studentId, problemId);

          console.log(`[Worker] Successfully graded submission ${submissionId}: ${evaluation.status} (${evaluation.score}%)`);
          return updatedSubmission;

        } catch (error) {
          console.error(`[Worker] Error processing submission ${submissionId} (Attempt ${job.attemptsMade + 1}/${job.opts.attempts}):`, error.message);

          // If this is the final attempt, mark submission as failed in DB and clear lock
          if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
            await Submission.findByIdAndUpdate(submissionId, {
              status: 'runtime_error',
              errorMessage: `Execution service error: ${error.message || 'Exceeded retry attempts'}`
            });
            await releaseSubmissionLock(studentId, problemId);
          }

          throw error; // Rethrow so BullMQ handles exponential backoff retry
        }
      },
      {
        connection: redisConnectionOptions,
        concurrency: CONCURRENCY,
        limiter: {
          max: 10,
          duration: 1000 // Throttled: max 10 jobs dispatched to Judge0 per second
        }
      }
    );

    executionWorker.on('completed', (job) => {
      console.log(`[Worker] Job ${job.id} completed.`);
    });

    executionWorker.on('failed', (job, err) => {
      console.warn(`[Worker] Job ${job.id} failed:`, err.message);
    });

    executionWorker.on('error', (err) => {
      workerErrorCount++;
      if (workerErrorCount <= MAX_WORKER_ERRORS_BEFORE_SILENCE) {
        console.warn(`[Worker] Worker internal error (${workerErrorCount}/${MAX_WORKER_ERRORS_BEFORE_SILENCE}):`, err.message);
      } else if (workerErrorCount === MAX_WORKER_ERRORS_BEFORE_SILENCE + 1) {
        console.warn('[Worker] Redis unreachable. Worker will auto-recover when Redis is back. Silencing further errors.');
      }
      // BullMQ handles reconnection internally; no action needed here
    });

    executionWorker.on('ready', () => {
      workerErrorCount = 0; // Reset counter on successful reconnect
      console.log('[Worker] Worker connected to Redis and ready.');
    });

    console.log(`[Worker] Code execution worker initialized with concurrency=${CONCURRENCY} and rate limiting.`);
    return executionWorker;

  } catch (err) {
    console.warn('[Worker] Could not initialize BullMQ worker:', err.message);
    return null;
  }
}

module.exports = {
  initExecutionWorker
};
