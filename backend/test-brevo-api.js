const { sendOtpEmail } = require('./utils/mailer');
require('dotenv').config();

async function test() {
  console.log("Testing email with API Key:", process.env.BREVO_API_KEY ? "Found" : "Missing");
  const result = await sendOtpEmail('nikhilmodem@gmail.com', '123456');
  console.log("Result:", result);
}
test();
