const express = require('express');
const axios = require('axios');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
const judge0 = require('../utils/judge0');

const extractAxiosError = (err) => {
  if (err.response?.data) {
    if (typeof err.response.data === 'string') return err.response.data;
    if (err.response.data.message) return err.response.data.message;
    if (err.response.data.error) return err.response.data.error;
    return JSON.stringify(err.response.data);
  }
  return err.message;
};

const getLanguageId = (language) => {
  const languages = { javascript: 63, python: 71, java: 62, c: 50, cpp: 54, csharp: 51, go: 60, ruby: 72, php: 68, rust: 73, typescript: 74 };
  return languages[language.toLowerCase()] || 71;
};

const { parseJudge0Result } = require('../utils/executionResult');

async function evaluateSubmission(code, language, testCases) {
  const language_id = getLanguageId(language);
  const results = [];
  let passedCount = 0;

  for (const tc of testCases) {
    try {
      const submissionData = {
        source_code: Buffer.from(code).toString('base64'),
        language_id,
        stdin: tc.input ? Buffer.from(tc.input).toString('base64') : '',
        expected_output: tc.expectedOutput ? Buffer.from(tc.expectedOutput).toString('base64') : ''
      };

      if (!judge0.isConfigured()) {
        throw new Error('Judge0 not configured. Set JUDGE0_API_URL (e.g. http://localhost:2358) or JUDGE0_API_KEY for RapidAPI.');
      }

      const { baseUrl, config } = judge0.getSubmitConfig();
      config.params.wait = 'false';

      const res = await axios.post(`${baseUrl}/submissions`, submissionData, config);
      const token = res.data.token;

      if (!token) throw new Error('Execution failed to return a token');

      // Poll for the result
      const maxAttempts = 10;
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
          break; // Done processing
        }

        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      }

      if (!result || (result.status && (result.status.id === 1 || result.status.id === 2))) {
        throw new Error('Execution took too long to complete.');
      }

      const parsed = parseJudge0Result(result);
      
      let passed = false;
      let actualOutput = '';
      let errorType = null;
      
      if (!parsed.success) {
        errorType = parsed.type === 'Compilation Error' ? 'compilation' : 'runtime';
        actualOutput = parsed.message;
      } else {
        const out = parsed.output; // trimmed stdout
        const exp = (tc.expectedOutput || '').trim();
        passed = out === exp;
        actualOutput = out;
      }

      if (passed) passedCount++;

      results.push({
        testCase: { 
          input: tc.isHidden ? 'Hidden' : tc.input, 
          expectedOutput: tc.isHidden ? 'Hidden' : tc.expectedOutput 
        },
        actualOutput: tc.isHidden ? (passed ? 'Output hidden' : (errorType === 'compilation' ? 'Compilation Error' : 'Runtime Error')) : actualOutput,
        passed,
        isHidden: tc.isHidden,
        errorType,
        executionTime: parseFloat(result.time || 0) * 1000,
        memoryUsed: (result.memory || 0) / 1024
      });
    } catch (err) {
      results.push({
        testCase: { 
          input: tc.isHidden ? 'Hidden' : tc.input, 
          expectedOutput: tc.isHidden ? 'Hidden' : tc.expectedOutput 
        },
        actualOutput: extractAxiosError(err),
        passed: false,
        isHidden: tc.isHidden,
        executionTime: 0,
        memoryUsed: 0
      });
    }
  }

  const score = testCases.length > 0 ? Math.round((passedCount / testCases.length) * 100) : 0;
  const status = score === 100 ? 'accepted' : 'wrong_answer';
  return { score, status, testResults: results };
}

// Get assignments for a student — STRICTLY filtered by student's own classId
router.get('/student', auth, requireRole(['student']), async (req, res) => {
  try {
    const studentClassId = req.user.classId;
    if (!studentClassId) {
      return res.status(400).json({ message: 'Your account has no class ID assigned. Please contact your administrator.' });
    }

    // KEY FIX: Only fetch assignments whose classId matches the student's classId
    const assignments = await Assignment.find({ isActive: true, classId: studentClassId })
      .populate('teacherId', 'name')
      .populate('problems.problemId', 'title difficulty')
      .sort({ dueDate: 1 });

    // Filter out assignments with invalid problem references
    const validAssignments = assignments.filter(assignment => {
      assignment.problems = assignment.problems.filter(p => p.problemId !== null);
      return assignment.problems.length > 0;
    });

    // Get submission status for each valid assignment
    const assignmentsWithStatus = await Promise.all(
      validAssignments.map(async (assignment) => {
        const submissions = await Submission.find({
          assignmentId: assignment._id,
          studentId: req.user._id,
          isDraft: { $ne: true }
        }).sort({ submittedAt: 1 }).select('problemId status score');

        const submissionStatus = {};
        submissions.forEach(sub => {
          submissionStatus[sub.problemId.toString()] = {
            status: sub.status,
            score: sub.score
          };
        });

        return {
          ...assignment.toObject(),
          submissionStatus
        };
      })
    );

    res.json(assignmentsWithStatus);
  } catch (error) {
    console.error('Get student assignments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single assignment details for student
router.get('/:id/student', auth, requireRole(['student']), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('teacherId', 'name')
      .populate('problems.problemId');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (!assignment.isActive) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Enforce class-based access control
    if (assignment.classId !== req.user.classId) {
      return res.status(403).json({ message: 'You are not authorized to access this assignment.' });
    }

    // Filter out invalid problem references
    assignment.problems = assignment.problems.filter(p => p.problemId !== null);

    if (assignment.problems.length === 0) {
      return res.status(400).json({ message: 'This assignment has no valid problems available' });
    }

    // Get student's submissions for this assignment
    const submissions = await Submission.find({
      assignmentId: assignment._id,
      studentId: req.user._id,
      isDraft: { $ne: true }
    }).sort({ submittedAt: -1 }).populate('problemId', 'title');

    const drafts = await Submission.find({
      assignmentId: assignment._id,
      studentId: req.user._id,
      isDraft: true
    });

    res.json({
      assignment,
      submissions,
      drafts
    });
  } catch (error) {
    console.error('Get assignment details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit solution for assignment problem
router.post('/:assignmentId/problems/:problemId/submit', auth, requireRole(['student']), async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required' });
    }

    // Verify assignment exists, is active, and belongs to the student's class
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment || !assignment.isActive) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // KEY FIX: Enforce class-based access control on submission
    if (assignment.classId !== req.user.classId) {
      return res.status(403).json({ message: 'You are not authorized to submit to this assignment.' });
    }

    // Check if assignment is past due date
    if (new Date() > assignment.dueDate) {
      return res.status(400).json({ message: 'Assignment is past due date' });
    }

    // Verify problem is part of this assignment
    const problemInAssignment = assignment.problems.find(
      p => p.problemId.toString() === req.params.problemId
    );
    if (!problemInAssignment) {
      return res.status(400).json({ message: 'Problem not part of this assignment' });
    }

    const problem = await Problem.findById(req.params.problemId);
    if (!problem) {
      return res.status(404).json({ message: 'Problem details not found' });
    }

    // Evaluate code synchronously since we only have a few test cases usually
    const evaluation = await evaluateSubmission(code, language, problem.testCases || []);

    // Create new submission in a single atomic operation
    const submission = await Submission.create({
      assignmentId: req.params.assignmentId,
      problemId: req.params.problemId,
      studentId: req.user._id,
      code,
      language,
      status: evaluation.status,
      score: evaluation.score,
      testResults: evaluation.testResults,
      submittedAt: new Date(),
      isDraft: false
    });

    res.status(submission.isNew ? 201 : 200).json({
      message: 'Submission graded successfully',
      submission
    });
  } catch (error) {
    console.error('Submit solution error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save a draft of the solution (Auto-save)
router.post('/:assignmentId/problems/:problemId/draft', auth, requireRole(['student']), async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required' });
    }

    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment || !assignment.isActive || assignment.classId !== req.user.classId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const problem = await Problem.findById(req.params.problemId);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    const draft = await Submission.findOneAndUpdate(
      {
        assignmentId: req.params.assignmentId,
        problemId: req.params.problemId,
        studentId: req.user._id,
        isDraft: true
      },
      {
        $set: {
          code,
          language,
          updatedAt: new Date()
        }
      },
      { 
        upsert: true, 
        new: true, 
        setDefaultsOnInsert: true
      }
    );

    res.status(200).json({ message: 'Draft saved', draft });
  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student's submissions for an assignment
router.get('/:assignmentId/submissions', auth, requireRole(['student']), async (req, res) => {
  try {
    const submissions = await Submission.find({
      assignmentId: req.params.assignmentId,
      studentId: req.user._id
    })
    .populate('problemId', 'title difficulty')
    .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student's submissions for a specific problem in an assignment
router.get('/:assignmentId/problems/:problemId/submissions', auth, requireRole(['student']), async (req, res) => {
  try {
    const submissions = await Submission.find({
      assignmentId: req.params.assignmentId,
      problemId: req.params.problemId,
      studentId: req.user._id,
      isDraft: { $ne: true }
    })
    .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (error) {
    console.error('Get problem submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get assignment score for student
router.get('/:assignmentId/score', auth, requireRole(['student']), async (req, res) => {
  try {
    // Verify assignment exists and student belongs to the same class
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Enforce class-based access control on score view
    if (assignment.classId !== req.user.classId) {
      return res.status(403).json({ message: 'You are not authorized to view this assignment.' });
    }

    // Get all submissions for this assignment by this student
    const submissions = await Submission.find({
      assignmentId: req.params.assignmentId,
      studentId: req.user._id,
      isDraft: { $ne: true }
    }).populate('problemId', 'title');

    // Calculate total score
    const totalProblems = assignment.problems.length;
    const gradedSubmissions = submissions.filter(sub => sub.score !== undefined && sub.score !== null);
    const totalScore = gradedSubmissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
    const maxPossibleScore = totalProblems * 100;
    const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

    // Get problem-wise breakdown
    const problemScores = assignment.problems.map(problem => {
      const submission = submissions.find(sub => sub.problemId._id.toString() === problem.problemId._id.toString());
      return {
        problemId: problem.problemId._id,
        problemTitle: problem.problemId.title,
        score: submission?.score || null,
        status: submission?.status || 'not_submitted',
        feedback: submission?.feedback || null,
        submittedAt: submission?.submittedAt || null
      };
    });

    res.json({
      assignmentId: assignment._id,
      assignmentTitle: assignment.title,
      totalProblems,
      gradedProblems: gradedSubmissions.length,
      totalScore,
      maxPossibleScore,
      percentage,
      problemScores
    });
  } catch (error) {
    console.error('Get assignment score error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// TEACHER ROUTES

// Create new assignment (teacher only)
router.post('/', auth, requireRole(['teacher']), async (req, res) => {
  try {
    const {
      title,
      description,
      problems,
      classId,
      dueDate,
      instructions,
      totalPoints
    } = req.body;

    if (!title || !description || !problems || !classId || !dueDate) {
      return res.status(400).json({
        message: 'Title, description, problems, classId, and dueDate are required'
      });
    }

    const assignment = new Assignment({
      title,
      description,
      problems,
      classId,
      teacherId: req.user._id,
      dueDate: new Date(dueDate),
      instructions: instructions || '',
      totalPoints: totalPoints || 100
    });

    await assignment.save();

    res.status(201).json({
      message: 'Assignment created successfully',
      assignment
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get assignments created by teacher
router.get('/teacher', auth, requireRole(['teacher']), async (req, res) => {
  try {
    const assignments = await Assignment.find({ teacherId: req.user._id })
      .populate('problems.problemId', 'title difficulty')
      .sort({ createdAt: -1 });

    res.json(assignments);
  } catch (error) {
    console.error('Get teacher assignments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get submissions for an assignment (teacher only)
router.get('/:assignmentId/submissions/teacher', auth, requireRole(['teacher']), async (req, res) => {
  try {
    // Verify teacher owns this assignment
    const assignment = await Assignment.findOne({
      _id: req.params.assignmentId,
      teacherId: req.user._id
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const submissions = await Submission.find({
      assignmentId: req.params.assignmentId,
      isDraft: { $ne: true }
    })
    .populate('studentId', 'name email')
    .populate('problemId', 'title')
    .sort({ submittedAt: -1 });

    // Handle null problem references (if problem was deleted)
    const validSubmissions = submissions.map(sub => {
      const subObj = sub.toObject ? sub.toObject() : sub;
      if (!subObj.problemId) {
        subObj.problemId = { _id: 'deleted', title: '(Deleted Problem)' };
      }
      return subObj;
    });

    res.json({
      assignment,
      submissions: validSubmissions
    });
  } catch (error) {
    console.error('Get assignment submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Grade a submission (teacher only) - DISABLED (Auto-grading enabled)
router.put('/submissions/:submissionId/grade', auth, requireRole(['teacher']), async (req, res) => {
  return res.status(400).json({ message: 'Manual grading is disabled. Submissions are auto-graded by the system.' });
});

// Update assignment (teacher only)
router.put('/:id', auth, requireRole(['teacher']), async (req, res) => {
  try {
    const {
      title,
      description,
      problems,
      classId,
      dueDate,
      instructions,
      totalPoints,
      isActive
    } = req.body;

    const assignment = await Assignment.findOne({
      _id: req.params.id,
      teacherId: req.user._id
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Update fields
    if (title !== undefined) assignment.title = title;
    if (description !== undefined) assignment.description = description;
    if (problems !== undefined) assignment.problems = problems;
    if (classId !== undefined) assignment.classId = classId;
    if (dueDate !== undefined) assignment.dueDate = new Date(dueDate);
    if (instructions !== undefined) assignment.instructions = instructions;
    if (totalPoints !== undefined) assignment.totalPoints = totalPoints;
    if (isActive !== undefined) assignment.isActive = isActive;

    await assignment.save();

    res.json({
      message: 'Assignment updated successfully',
      assignment
    });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete assignment (teacher only)
router.delete('/:id', auth, requireRole(['teacher']), async (req, res) => {
  try {
    const assignment = await Assignment.findOne({
      _id: req.params.id,
      teacherId: req.user._id
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Cascade delete submissions so the assignment deleting won't error out
    await Submission.deleteMany({ assignmentId: req.params.id });

    // Then delete the assignment itself

    await Assignment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single assignment for editing (teacher only)
router.get('/:id/edit', auth, requireRole(['teacher']), async (req, res) => {
  try {
    const assignment = await Assignment.findOne({
      _id: req.params.id,
      teacherId: req.user._id
    }).populate('problems.problemId', 'title difficulty category');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Filter out invalid problem references to prevent frontend crashes
    assignment.problems = assignment.problems.filter(p => p.problemId !== null);

    res.json(assignment);
  } catch (error) {
    console.error('Get assignment for edit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;