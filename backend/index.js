const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const connectWithRetry = (retries = 5, delay = 3000) => {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/online-coding-platform', {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
      console.error(`MongoDB connection error (${retries} retries left):`, err.message);
      if (retries > 0) {
        console.log(`Retrying in ${delay / 1000}s...`);
        setTimeout(() => connectWithRetry(retries - 1, delay), delay);
      } else {
        console.error('Could not connect to MongoDB after multiple retries. Check your Atlas IP allowlist and network.');
      }
    });
};

connectWithRetry();


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