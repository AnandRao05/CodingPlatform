const axios = require('axios');
require('dotenv').config();

const sendEmail = async (to, subject, text, html) => {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.EMAIL_FROM;

    // 1. Validate required parameters
    if (!to || !subject || (!text && !html)) {
      throw new Error("Missing required email parameters (to, subject, text/html)");
    }

    // 2. Validate environment variables
    if (!apiKey) {
      throw new Error("BREVO_API_KEY is missing in .env configuration");
    }

    if (!fromEmail) {
      throw new Error("EMAIL_FROM is missing in .env configuration");
    }

    // 3. Validate API key type
    if (apiKey.startsWith('xsmtpsib')) {
      throw new Error("Invalid Brevo API Key format. You provided an SMTP key (starts with 'xsmtpsib-'). The Brevo HTTP API requires an API Key that starts with 'xkeysib-'.");
    }

    if (!apiKey.startsWith('xkeysib-')) {
      throw new Error("Invalid Brevo API Key format. Key must start with 'xkeysib-'");
    }

    console.log(`\n[Brevo Mailer] Initiating email delivery...`);
    console.log(`[Brevo Mailer] To: ${to}`);
    console.log(`[Brevo Mailer] From: ${fromEmail}`);

    const payload = {
      sender: {
        name: "RGUKT Coding Platform",
        email: fromEmail
      },
      to: [{ email: to }],
      subject: subject,
      textContent: text,
      htmlContent: html
    };

    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      payload,
      {
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      }
    );

    console.log(`[Brevo Mailer] ✅ Email sent successfully!`);
    console.log(`[Brevo Mailer] Message ID: ${response.data.messageId}\n`);

    return { 
      success: true, 
      data: response.data 
    };

  } catch (error) {
    console.error(`\n[Brevo Mailer] ❌ Email sending failed:`);
    const errorMessage = error.response?.data || error.message;
    console.error(errorMessage, '\n');

    return {
      success: false,
      error: errorMessage
    };
  }
};

// 🔐 OTP Email Function
const sendOtpEmail = async (email, otp, type = "Account Verification") => {
  const subject = `${otp} is your ${type} code`;
  const text = `Your OTP for ${type} is ${otp}. It expires in 10 minutes.`;
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 40px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #333333;">${type}</h2>
          <p style="color: #555555; font-size: 16px;">Here is your secure One-Time Password:</p>
          <div style="background-color: #f0f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h1 style="letter-spacing: 8px; color: #1e40af; margin: 0; font-size: 36px;">${otp}</h1>
          </div>
          <p style="color: #ef4444; font-weight: bold;">Expires in 10 minutes</p>
          <hr style="border: none; border-top: 1px solid #eeeeee; margin-top: 30px;" />
          <p style="color: #999999; font-size: 12px; margin-top: 20px;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      </body>
    </html>
  `;

  // Send the actual OTP to the user
  const result = await sendEmail(email, subject, text, html);

  // Notify the Admin/Sender about the delivery status
  const fromEmail = process.env.EMAIL_FROM;
  if (fromEmail) {
    if (result.success) {
      const adminSub = `✅ OTP Sent Successfully to ${email}`;
      const adminTxt = `An OTP for ${type} has been successfully dispatched to the receiver: ${email}.`;
      // Trigger notification asynchronously so we don't slow down the user's login flow
      sendEmail(fromEmail, adminSub, adminTxt, `<p>${adminTxt}</p>`).catch(err => console.error("Admin Notification Error:", err));
    } else {
      const adminSub = `❌ Failed to send OTP to ${email}`;
      const adminTxt = `Failed to deliver an OTP for ${type} to an invalid or rejected receiver: ${email}. Error details: ${JSON.stringify(result.error)}`;
      sendEmail(fromEmail, adminSub, adminTxt, `<p>${adminTxt}</p>`).catch(err => console.error("Admin Notification Error:", err));
    }
  }

  return result;
};

module.exports = { sendEmail, sendOtpEmail };