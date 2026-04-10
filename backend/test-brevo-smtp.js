const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'anandraokhetavath@gmail.com', // typical brevo login
    pass: process.env.BREVO_API_KEY
  }
});

transporter.verify(function(error, success) {
  if (error) {
    console.log("Error with anandraokhetavath@gmail.com:", error.message);
    // fallback test
    const transporter2 = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: 'nikhilmodem@gmail.com', // saw this in fallback simulation
        pass: process.env.BREVO_API_KEY
      }
    });
    transporter2.verify((err, succ) => {
      if (err) console.log("Error with nikhilmodem@gmail.com:", err.message);
      else console.log("Success with nikhilmodem@gmail.com!");
    });
  } else {
    console.log("Success with anandraokhetavath@gmail.com!");
  }
});
