const dotenv = require('dotenv');
dotenv.config();
const nodemailer = require('nodemailer');

async function testConnection() {
  console.log('Testing Gmail SMTP Connection...');
  console.log('User:', process.env.GMAIL_USER);
  console.log('Pass:', process.env.GMAIL_PASS ? '******** (Hidden)' : 'MISSING');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });

  try {
    await transporter.verify();
    console.log('\x1b[32m✔ SMTP Connection Verified Successfully!\x1b[0m');
    console.log('Your Gmail credentials are correct and Nodemailer can reach the servers.');
  } catch (error) {
    console.error('\x1b[31m✘ SMTP Connection Failed:\x1b[0m', error.message);
    if (error.code === 'EAUTH') {
      console.log('Hint: Check if your App Password is correct. You must use a 16-character App Password, not your regular password.');
    }
  }
}

testConnection();
