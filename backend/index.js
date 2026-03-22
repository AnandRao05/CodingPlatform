const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors(
  {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials:true,
  }
));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/online-coding-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));


const authRoutes = require('./routes/auth');
const codeRoutes = require('./routes/code');
const problemRoutes = require('./routes/problems');
const assignmentRoutes = require('./routes/assignments');
const userRoutes = require('./routes/users');
const submissionRoutes = require('./routes/submissions');
app.use('/api/auth', authRoutes);
app.use('/api/code', codeRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/submissions', submissionRoutes);


app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});


app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;