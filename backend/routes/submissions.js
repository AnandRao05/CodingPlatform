const express = require('express');
const { auth } = require('../middleware/auth');
const Submission = require('../models/Submission');
const { analyzeCodeWithAI } = require('../services/aiCodeAnalyzer');

const router = express.Router();


router.post('/:id/analyze-ai', auth, async (req, res) => {
  try {
    const submissionId = req.params.id;

    
    const submission = await Submission.findById(submissionId);
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    
    if (
      req.user.role === 'student' && 
      submission.studentId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to analyze this submission' });
    }

    
    if (submission.aiAnalysis && submission.aiAnalysis.timeComplexity) {
      return res.status(200).json(submission.aiAnalysis);
    }

    
    if (submission.status === 'compilation_error') {
      return res.status(400).json({ 
        message: 'Cannot analyze code with compilation errors. Please fix syntax errors first.' 
      });
    }

    
    if (!submission.code || submission.code.trim() === '') {
      return res.status(400).json({ message: 'Cannot analyze empty code.' });
    }

    
    const analysisResult = await analyzeCodeWithAI(submission.code, submission.language);

   
    submission.aiAnalysis = analysisResult;
    await submission.save();

    return res.status(200).json(submission.aiAnalysis);

  } catch (error) {
    console.error('AI Analysis Error:', error);
    
    
    if (error instanceof SyntaxError) {
      return res.status(502).json({ message: 'Failed to parse AI response. Please try again later.' });
    }
    
    
    if (error.message === 'AI Analysis request timed out') {
      return res.status(504).json({ message: 'AI Analysis request timed out. Please try again later.' });
    }
    
    return res.status(500).json({ message: 'Failed to complete AI analysis. Server error.' });
  }
});

module.exports = router;
