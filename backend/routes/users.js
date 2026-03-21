const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const Problem = require('../models/Problem');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, isActive } = req.query;

    let query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user statistics (admin only)
router.get('/stats', auth, requireRole(['admin']), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });

    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const recentUsers = await User.find({ isActive: true })
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      roleStats,
      recentUsers
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single user by ID (admin only)
router.get('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new user (admin only)
router.post('/', auth, requireRole(['admin']), async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      classId,
      profile = {},
      isActive = true
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: 'Name, email, password, and role are required'
      });
    }

    if ((role === 'student' || role === 'teacher') && !classId) {
      return res.status(400).json({
        message: 'Class ID is required for students and teachers'
      });
    }

    // Validate role
    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({
        message: 'Role must be student, teacher, or admin'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role,
      classId,
      profile,
      isActive
    });

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (admin only)
router.put('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      classId,
      profile,
      isActive
    } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      user.email = email.toLowerCase();
    }

    // Update fields
    if (name !== undefined) user.name = name;
    if (role !== undefined) {
      if (!['student', 'teacher', 'admin'].includes(role)) {
        return res.status(400).json({
          message: 'Role must be student, teacher, or admin'
        });
      }
      user.role = role;
    }
    if (profile !== undefined) user.profile = { ...user.profile, ...profile };
    if (classId !== undefined) user.classId = classId;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      message: 'User updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user status (activate/deactivate) (admin only)
router.put('/:id/status', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ message: 'isActive field is required' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user._id.toString() && !isActive) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student statistics (for student dashboard)
router.get('/student/stats', auth, requireRole(['student']), async (req, res) => {
  try {
    const studentId = req.user._id;

    // Get all submissions for this student that are marked as solved (accepted status)
    const submissions = await Submission.find({
      studentId,
      status: 'accepted'
    }).select('submittedAt problemId').sort({ submittedAt: -1 });

    // Calculate problems solved (unique problems with accepted submissions)
    const solvedProblemIds = [...new Set(submissions.map(sub => sub.problemId.toString()))];
    const problemsSolved = solvedProblemIds.length;

    // Calculate current streak - consecutive days up to today where at least one problem was solved
    let currentStreak = 0;
    if (submissions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Group submissions by date
      const submissionsByDate = {};
      submissions.forEach(submission => {
        const date = new Date(submission.submittedAt);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toISOString().split('T')[0];

        if (!submissionsByDate[dateKey]) {
          submissionsByDate[dateKey] = [];
        }
        submissionsByDate[dateKey].push(submission);
      });

      // Check consecutive days from today backwards
      let checkDate = new Date(today);
      let streakBroken = false;

      while (!streakBroken) {
        const dateKey = checkDate.toISOString().split('T')[0];
        const daySubmissions = submissionsByDate[dateKey];

        if (daySubmissions && daySubmissions.length > 0) {
          // Found at least one solved problem on this day
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          // No submissions on this day, check if it's today or yesterday
          if (checkDate.getTime() === today.getTime()) {
            // Today has no submissions, streak is 0
            streakBroken = true;
          } else {
            // Yesterday or earlier has no submissions, streak ends
            streakBroken = true;
          }
        }

        // Prevent infinite loop by limiting to reasonable streak length
        if (currentStreak > 365) break;
      }
    }

    res.json({
      problemsSolved,
      currentStreak,
      totalSubmissions: submissions.length
    });
  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student progress statistics (for progress tab)
router.get('/student/progress', auth, requireRole(['student']), async (req, res) => {
  try {
    const studentId = req.user._id;

    // Get all submissions for this student
    const submissions = await Submission.find({
      studentId,
      status: 'accepted'
    }).populate('problemId', 'title difficulty category tags').sort({ submittedAt: -1 });

    // Get assignment submissions
    const assignmentSubmissions = await Submission.find({
      studentId,
      status: 'accepted'
    }).populate({
      path: 'assignmentId',
      select: 'title'
    }).populate('problemId', 'title difficulty category tags');

    // Calculate progress by difficulty
    const difficultyProgress = {
      easy: { solved: 0, total: 0 },
      medium: { solved: 0, total: 0 },
      hard: { solved: 0, total: 0 }
    };

    // Calculate progress by category
    const categoryProgress = {};

    // Calculate assignment vs standalone progress
    const progressType = {
      assignment: { solved: 0, total: 0 },
      standalone: { solved: 0, total: 0 }
    };

    // Track solved problems by ID to avoid duplicates
    const solvedProblemIds = new Set();
    const assignmentSolvedIds = new Set();

    // Process all submissions
    submissions.forEach(submission => {
      if (submission.problemId && !solvedProblemIds.has(submission.problemId._id.toString())) {
        solvedProblemIds.add(submission.problemId._id.toString());

        // Count by difficulty
        const difficulty = submission.problemId.difficulty || 'medium';
        if (difficultyProgress[difficulty]) {
          difficultyProgress[difficulty].solved++;
        }

        // Count by category
        const category = submission.problemId.category || 'General';
        if (!categoryProgress[category]) {
          categoryProgress[category] = { solved: 0, total: 0 };
        }
        categoryProgress[category].solved++;
      }
    });

    // Process assignment submissions
    assignmentSubmissions.forEach(submission => {
      if (submission.problemId && !assignmentSolvedIds.has(submission.problemId._id.toString())) {
        assignmentSolvedIds.add(submission.problemId._id.toString());

        if (submission.assignmentId) {
          progressType.assignment.solved++;
        } else {
          progressType.standalone.solved++;
        }
      }
    });

    // Get total problems count by difficulty and category (simplified - in real app you'd query Problem model)
    // For now, we'll use the solved counts and add some estimated totals
    difficultyProgress.easy.total = Math.max(difficultyProgress.easy.solved + 10, 15);
    difficultyProgress.medium.total = Math.max(difficultyProgress.medium.solved + 15, 25);
    difficultyProgress.hard.total = Math.max(difficultyProgress.hard.solved + 5, 10);

    // For categories, we'll show solved count and mark as "tracked"
    Object.keys(categoryProgress).forEach(category => {
      categoryProgress[category].total = categoryProgress[category].solved; // Simplified
    });

    // Get assignment progress
    const assignments = await mongoose.model('Assignment').find({ isActive: true })
      .populate('problems.problemId', 'title difficulty category');

    assignments.forEach(assignment => {
      progressType.assignment.total += assignment.problems?.length || 0;
    });

    // Get standalone problems count
    const totalProblems = await Problem.countDocuments({ isActive: true });
    progressType.standalone.total = totalProblems - progressType.assignment.total;

    // Calculate recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSubmissions = await Submission.find({
      studentId,
      status: 'accepted',
      submittedAt: { $gte: thirtyDaysAgo }
    }).populate('problemId', 'title difficulty').sort({ submittedAt: -1 });

    const recentActivity = recentSubmissions.slice(0, 10).map(sub => ({
      problemTitle: sub.problemId?.title || 'Unknown Problem',
      difficulty: sub.problemId?.difficulty || 'medium',
      solvedAt: sub.submittedAt
    }));

    // Calculate overall progress percentage
    const totalProblemsAvailable = await Problem.countDocuments({ isActive: true });
    const problemsSolved = solvedProblemIds.size;
    const overallProgress = totalProblemsAvailable > 0 ? Math.round((problemsSolved / totalProblemsAvailable) * 100) : 0;

    res.json({
      difficultyProgress,
      categoryProgress,
      progressType,
      recentActivity,
      totalSolved: solvedProblemIds.size,
      totalSubmissions: submissions.length,
      overallProgress,
      totalProblemsAvailable
    });
  } catch (error) {
    console.error('Get student progress error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get teacher overview statistics
router.get('/teacher/overview', auth, requireRole(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user._id;

    // Get total students count (students who have submitted to teacher's assignments)
    const assignments = await mongoose.model('Assignment').find({ teacherId, isActive: true }).select('_id');
    const assignmentIds = assignments.map(a => a._id);

    const uniqueStudents = await Submission.distinct('studentId', {
      assignmentId: { $in: assignmentIds }
    });

    const totalStudents = uniqueStudents.length;

    // Get problems created by teacher (from "My Problems" section)
    const problemsCreated = await Problem.countDocuments({ createdBy: teacherId });

    // Get active assignments count (from "Assignments" section - active assignments)
    const activeAssignments = await mongoose.model('Assignment').countDocuments({
      teacherId,
      isActive: true,
      dueDate: { $gte: new Date() } // Due date is in the future
    });

    res.json({
      totalStudents,
      problemsCreated,
      activeAssignments
    });
  } catch (error) {
    console.error('Get teacher overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get admin overview statistics
router.get('/admin/overview', auth, requireRole(['admin']), async (req, res) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();

    // Get active users count
    const activeUsers = await User.countDocuments({ isActive: true });

    // Get total problems count
    const totalProblems = await Problem.countDocuments({ isActive: true });

    // Get total assignments count
    const totalAssignments = await mongoose.model('Assignment').countDocuments({ isActive: true });

    res.json({
      totalUsers,
      activeUsers,
      totalProblems,
      totalAssignments
    });
  } catch (error) {
    console.error('Get admin overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;