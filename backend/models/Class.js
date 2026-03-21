/**
 * Class Model
 * 
 * Represents a class/batch within a college.
 * Classes are used to group students and organize subjects.
 * 
 * Key Features:
 * - Belongs to a specific college (collegeId)
 * - Has year and department for organization
 * - Can have multiple subjects assigned
 * - Tracks student count for analytics
 */
const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 20
  },
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: true,
    index: true
  },
  department: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  year: {
    type: Number,
    required: true,
    min: 1,
    max: 6 // Support for up to 6-year programs
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  section: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: 5,
    default: 'A'
  },
  academicYear: {
    type: String,
    required: true,
    match: /^\d{4}-\d{4}$/, // Format: "2024-2025"
    default: function() {
      const now = new Date();
      const year = now.getFullYear();
      return `${year}-${year + 1}`;
    }
  },
  capacity: {
    type: Number,
    default: 60,
    min: 1,
    max: 500
  },
  studentCount: {
    type: Number,
    default: 0,
    min: 0
  },
  advisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Faculty advisor for the class
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for unique class code within a college
classSchema.index({ collegeId: 1, code: 1 }, { unique: true });

// Index for better query performance
classSchema.index({ collegeId: 1, isActive: 1 });
classSchema.index({ collegeId: 1, department: 1, year: 1 });
classSchema.index({ collegeId: 1, academicYear: 1 });

// Update the updatedAt field before saving
classSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to find classes by college
classSchema.statics.findByCollege = async function(collegeId, includeInactive = false) {
  const query = { collegeId };
  if (!includeInactive) query.isActive = true;
  return this.find(query).sort({ department: 1, year: 1, section: 1 });
};

// Static method to find class with college validation
classSchema.statics.findInCollege = async function(classId, collegeId) {
  return this.findOne({ _id: classId, collegeId, isActive: true });
};

// Instance method to check if class is at capacity
classSchema.methods.isAtCapacity = function() {
  return this.studentCount >= this.capacity;
};

// Instance method to increment student count
classSchema.methods.incrementStudentCount = async function() {
  if (this.isAtCapacity()) {
    throw new Error('Class has reached maximum capacity');
  }
  this.studentCount += 1;
  return this.save();
};

// Instance method to decrement student count
classSchema.methods.decrementStudentCount = async function() {
  if (this.studentCount > 0) {
    this.studentCount -= 1;
    return this.save();
  }
};

// Virtual for full class name
classSchema.virtual('fullName').get(function() {
  return `${this.department} - Year ${this.year} - Section ${this.section}`;
});

// Ensure virtual fields are serialized
classSchema.set('toJSON', { virtuals: true });
classSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Class', classSchema);
