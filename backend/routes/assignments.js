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

const { evaluateSubmission } = require('../utils/codeEvaluator');


router.get('/student', auth, requireRole(['student']), async (req, res) => {
  try {
    const studentClassId = req.user.classId;
    if (!studentClassId) {
      return res.status(400).json({ message: 'Your account has no class ID assigned. Please contact your administrator.' });
    }

    
    const assignments = await Assignment.find({ isActive: true, classId: studentClassId })
      .populate('teacherId', 'name')
      .populate('problems.problemId', 'title difficulty')
      .sort({ dueDate: 1 });

    
    const validAssignments = assignments.filter(assignment => {
      assignment.problems = assignment.problems.filter(p => p.problemId !== null);
      return assignment.problems.length > 0;
    });

    
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

    
    if (assignment.classId !== req.user.classId) {
      return res.status(403).json({ message: 'You are not authorized to access this assignment.' });
    }

    
    assignment.problems = assignment.problems.filter(p => p.problemId !== null);

    if (assignment.problems.length === 0) {
      return res.status(400).json({ message: 'This assignment has no valid problems available' });
    }

    
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


router.post('/:assignmentId/problems/:problemId/submit', auth, requireRole(['student']), async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required' });
    }

    
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment || !assignment.isActive) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    
    if (assignment.classId !== req.user.classId) {
      return res.status(403).json({ message: 'You are not authorized to submit to this assignment.' });
    }

    
    
    
    
    

    
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

    
    const evaluation = await evaluateSubmission(code, language, problem.testCases || []);

    
    const submission = await Submission.create({
      assignmentId: req.params.assignmentId,
      problemId: req.params.problemId,
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


router.get('/:assignmentId/score', auth, requireRole(['student']), async (req, res) => {
  try {
    
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    
    if (assignment.classId !== req.user.classId) {
      return res.status(403).json({ message: 'You are not authorized to view this assignment.' });
    }

    
    const submissions = await Submission.find({
      assignmentId: req.params.assignmentId,
      studentId: req.user._id,
      isDraft: { $ne: true }
    }).populate('problemId', 'title');

    
    const totalProblems = assignment.problems.length;
    const problemScores = [];
    let totalScore = 0;

    for (const problem of assignment.problems) {
      const pId = problem.problemId._id.toString();
      
      const latestSub = await Submission.findOne({
        assignmentId: req.params.assignmentId,
        studentId: req.user._id,
        problemId: pId,
        isDraft: { $ne: true }
      }).sort({ submittedAt: -1 });

      if (latestSub) {
        totalScore += (latestSub.score || 0);
        problemScores.push({
          problemId: latestSub.problemId,
          problemTitle: problem.problemId.title,
          score: latestSub.score,
          status: latestSub.status,
          feedback: latestSub.feedback,
          submittedAt: latestSub.submittedAt
        });
      } else {
        problemScores.push({
          problemId: problem.problemId._id,
          problemTitle: problem.problemId.title,
          score: null,
          status: 'not_submitted',
          feedback: null,
          submittedAt: null
        });
      }
    }

    const maxPossibleScore = totalProblems * 100;
    const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
    const gradedCount = problemScores.filter(ps => ps.status !== 'not_submitted').length;

    res.json({
      assignmentId: assignment._id,
      assignmentTitle: assignment.title,
      totalProblems,
      gradedProblems: gradedCount,
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


router.get('/:assignmentId/submissions/teacher', auth, requireRole(['teacher']), async (req, res) => {
  try {
    
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


router.put('/submissions/:submissionId/grade', auth, requireRole(['teacher']), async (req, res) => {
  return res.status(400).json({ message: 'Manual grading is disabled. Submissions are auto-graded by the system.' });
});


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


router.delete('/:id', auth, requireRole(['teacher']), async (req, res) => {
  try {
    const assignment = await Assignment.findOne({
      _id: req.params.id,
      teacherId: req.user._id
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    
    await Submission.deleteMany({ assignmentId: req.params.id });

    

    await Assignment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/:id/edit', auth, requireRole(['teacher']), async (req, res) => {
  try {
    const assignment = await Assignment.findOne({
      _id: req.params.id,
      teacherId: req.user._id
    }).populate('problems.problemId', 'title difficulty category');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    
    assignment.problems = assignment.problems.filter(p => p.problemId !== null);

    res.json(assignment);
  } catch (error) {
    console.error('Get assignment for edit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/:assignmentId/scorecard/teacher', auth, requireRole(['teacher']), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId).populate('problems.problemId', 'title');
    if (!assignment || assignment.teacherId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Assignment not found or unauthorized' });
    }

    
    const User = require('../models/User');
    const students = await User.find({ classId: assignment.classId, role: 'student' }).select('name email');

    const scorecard = await Promise.all(students.map(async (student) => {
      let studentTotalScore = 0;
      const problemBreakdown = await Promise.all(assignment.problems.map(async (p) => {
        const latestSub = await Submission.findOne({
          assignmentId: assignment._id,
          studentId: student._id,
          problemId: p.problemId._id,
          isDraft: { $ne: true }
        }).sort({ submittedAt: -1 });

        const score = latestSub ? latestSub.score : 0;
        studentTotalScore += score;

        return {
          problemId: p.problemId._id,
          title: p.problemId.title,
          score: latestSub ? latestSub.score : null,
          status: latestSub ? latestSub.status : 'not_submitted',
          submittedAt: latestSub ? latestSub.submittedAt : null
        };
      }));

      const maxPossible = assignment.problems.length * 100;
      const percentage = maxPossible > 0 ? Math.round((studentTotalScore / maxPossible) * 100) : 0;

      return {
        studentId: student._id,
        studentName: student.name,
        studentEmail: student.email,
        totalScore: studentTotalScore,
        maxPossible,
        percentage,
        problemBreakdown
      };
    }));

    res.json({
      assignmentTitle: assignment.title,
      totalProblems: assignment.problems.length,
      studentsCount: students.length,
      scorecard
    });
  } catch (error) {
    console.error('Get scorecard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;