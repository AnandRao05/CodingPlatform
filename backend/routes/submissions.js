const express = require('express');
const { auth } = require('../middleware/auth');
const Submission = require('../models/Submission');
const { analyzeCodeWithAI } = require('../services/aiCodeAnalyzer');

const router = express.Router();

// @route   POST /api/submissions/:id/analyze-ai
// @desc    Analyze student submission code with Gemini AI
// @access  Private
router.post('/:id/analyze-ai', auth, async (req, res) => {
  try {
    const submissionId = req.params.id;

    // Fetch submission from DB
    const submission = await Submission.findById(submissionId);
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Security check: Only the student who submitted (or an admin/teacher) can analyze it
    if (
      req.user.role === 'student' && 
      submission.studentId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to analyze this submission' });
    }

    // Ensure AI analysis is NOT triggered for compilation errors
    if (submission.status === 'compilation_error') {
      return res.status(400).json({ 
        message: 'Cannot analyze code with compilation errors. Please fix syntax errors first.' 
      });
    }

    // Ensure AI analysis is NOT triggered for empty code
    if (!submission.code || submission.code.trim() === '') {
      return res.status(400).json({ message: 'Cannot analyze empty code.' });
    }

    // If it already has an analysis, we optionally recalculate. 
    // We will proceed to call Gemini API.
    const analysisResult = await analyzeCodeWithAI(submission.code, submission.language);

    // Store AI result in DB
    submission.aiAnalysis = analysisResult;
    await submission.save();

    return res.status(200).json({
      message: 'Code analysis completed successfully',
      aiAnalysis: submission.aiAnalysis
    });

  } catch (error) {
    console.error('AI Analysis Error:', error);
    
    // Check if it's a JSON parse error from Gemini
    if (error instanceof SyntaxError) {
      return res.status(502).json({ message: 'Failed to parse AI response. Please try again later.' });
    }
    
    // Check if it's our artificial timeout error
    if (error.message === 'AI Analysis request timed out') {
      return res.status(504).json({ message: 'AI Analysis request timed out. Please try again later.' });
    }
    
    return res.status(500).json({ message: 'Failed to complete AI analysis. Server error.' });
  }
});

module.exports = router;
