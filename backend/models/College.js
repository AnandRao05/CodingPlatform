/**
 * College Model
 * 
 * Represents a college/institution in the multi-tenant architecture.
 * Each college has its own isolated data including classes, subjects, users, and assignments.
 * 
 * Key Features:
 * - Unique college code for identification
 * - Domain-based access control (optional)
 * - Active/inactive status for college management
 * - Contact information for college administration
 */
const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 20,
    match: /^[A-Z0-9]+$/ // Alphanumeric only
  },
  domain: {
    type: String,
    trim: true,
    lowercase: true,
    // Optional: for email domain validation (e.g., "university.edu")
    validate: {
      validator: function(v) {
        return !v || /^[a-z0-9.-]+$/.test(v);
      },
      message: props => `${props.value} is not a valid domain format`
    }
  },
  description: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    pincode: String
  },
  contact: {
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    phone: String,
    website: String
  },
  settings: {
    allowStudentSignup: {
      type: Boolean,
      default: true
    },
    allowTeacherSignup: {
      type: Boolean,
      default: false
    },
    requireEmailVerification: {
      type: Boolean,
      default: false
    },
    maxStudentsPerClass: {
      type: Number,
      default: 100
    },
    maxClassesPerTeacher: {
      type: Number,
      default: 5
    }
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

// Update the updatedAt field before saving
collegeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
collegeSchema.index({ code: 1 }, { unique: true });
collegeSchema.index({ isActive: 1 });
collegeSchema.index({ domain: 1 }, { sparse: true });

// Static method to find active college by code
collegeSchema.statics.findActiveByCode = async function(code) {
  return this.findOne({ code: code.toUpperCase(), isActive: true });
};

// Static method to find active college by domain
collegeSchema.statics.findActiveByDomain = async function(domain) {
  return this.findOne({ domain: domain.toLowerCase(), isActive: true });
};

// Instance method to check if user can signup
collegeSchema.methods.canSignup = function(role) {
  if (!this.isActive) return false;
  if (role === 'student') return this.settings.allowStudentSignup;
  if (role === 'teacher') return this.settings.allowTeacherSignup;
  return false;
};

module.exports = mongoose.model('College', collegeSchema);
