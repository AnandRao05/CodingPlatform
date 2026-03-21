const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

/**
 * Send a professional email
 */
const sendEmail = async (to, subject, text, html) => {
  try {
    const mailOptions = {
      from: `"RGUKT Coding Platform" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return info;
  } catch (error) {
    console.error('Email send error:', error);
    // Fallback info for the user if credentials are not yet set
    console.log(`\n\x1b[33m--- GMAIL SIMULATION FOR ${to} ---\x1b[0m`);
    console.log(`\x1b[1mSubject:\x1b[0m ${subject}`);
    console.log(`\x1b[1mBody:\x1b[0m    ${text}`);
    console.log(`\x1b[33m---------------------------------------\x1b[0m\n`);
    return { mock: true };
  }
};

/**
 * Send OTP specific email
 */
const sendOtpEmail = async (email, otp, type = 'Account Verification') => {
  const subject = `${otp} is your ${type} code`;
  const text = `Your secure code for ${type} is: ${otp}. It expires in 10 minutes.`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        .container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc; }
        .card { background-color: #ffffff; border-radius: 24px; padding: 40px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        .logo { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 16px; margin-bottom: 24px; }
        .logo-text { color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.025em; }
        .header { font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 8px; text-align: center; }
        .subheader { font-size: 16px; color: #64748b; margin-bottom: 32px; text-align: center; }
        .otp-box { background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 20px; padding: 32px; text-align: center; margin-bottom: 32px; }
        .otp-code { font-size: 40px; font-weight: 900; letter-spacing: 0.25em; color: #1e293b; font-family: "Courier New", Courier, monospace; }
        .expiry { text-align: center; font-size: 14px; font-weight: 600; color: #ef4444; margin-bottom: 32px; }
        .footer { text-align: center; border-top: 1px solid #e2e8f0; padding-top: 32px; }
        .footer-text { font-size: 12px; color: #94a3b8; line-height: 1.6; }
        .brand { font-weight: 700; color: #4f46e5; margin-top: 8px; }
      </style>
    </head>
    <body style="margin: 0; padding: 0;">
      <div class="container">
        <div class="card">
          <div style="text-align: center;">
            <div class="logo"><span class="logo-text">RGUKT CODING</span></div>
          </div>
          <h1 class="header">Secure Verification Code</h1>
          <p class="subheader">You requested a verification code for <strong>${type}</strong>. Please use the terminal below to proceed.</p>
          
          <div class="otp-box">
             <div class="otp-code">${otp}</div>
          </div>
          
          <p class="expiry">Expires in 10 minutes</p>
          
          <div class="footer">
            <p class="footer-text">
              If you didn't request this code, you can safely ignore this email. Someone may have entered your address by mistake.
            </p>
            <div class="brand">RGUKT Advanced Coding Division</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  return sendEmail(email, subject, text, html);
};

module.exports = { sendEmail, sendOtpEmail };
