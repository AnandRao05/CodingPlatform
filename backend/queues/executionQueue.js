const { Queue } = require('bullmq');
const { redisClient, redisConnectionOptions, isRedisAvailable } = require('../config/redis');

let submissionQueue = null;

if (process.env.REDIS_URL) {
  try {
    submissionQueue = new Queue('code-submissions', {
      connection: redisConnectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 500
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
          count: 1000
        }
      }
    });

    submissionQueue.on('error', (err) => {
      if (isRedisAvailable()) {
        console.warn('[SubmissionQueue] Queue warning:', err.message);
      }
    });
  } catch (err) {
    console.warn('[SubmissionQueue] Failed to initialize BullMQ queue:', err.message);
  }
}

/**
 * Acquire an idempotency lock in Redis to prevent rapid double-clicks / concurrent submissions
 */
async function acquireSubmissionLock(studentId, problemId, ttlSeconds = 10) {
  if (!isRedisAvailable() || !redisClient) {
    return true; // Fallback: allow submission if Redis lock is unavailable
  }

  try {
    const lockKey = `sub_lock:${studentId}:${problemId}`;
    const result = await redisClient.set(lockKey, 'locked', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (err) {
    console.warn('[SubmissionLock] Error acquiring lock, proceeding:', err.message);
    return true;
  }
}

/**
 * Release an idempotency lock
 */
async function releaseSubmissionLock(studentId, problemId) {
  if (!isRedisAvailable() || !redisClient) return;

  try {
    const lockKey = `sub_lock:${studentId}:${problemId}`;
    await redisClient.del(lockKey);
  } catch (err) {
    console.warn('[SubmissionLock] Error releasing lock:', err.message);
  }
}

/**
 * Add a submission grading job to the queue
 */
async function addSubmissionJob(jobData) {
  if (!submissionQueue || !isRedisAvailable()) {
    return null; // Signals that caller should use synchronous fallback
  }

  const { submissionId } = jobData;
  const job = await submissionQueue.add('evaluate-submission', jobData, {
    jobId: submissionId.toString()
  });

  return job;
}

module.exports = {
  submissionQueue,
  addSubmissionJob,
  acquireSubmissionLock,
  releaseSubmissionLock,
  isQueueAvailable: () => isRedisAvailable() && submissionQueue !== null
};
