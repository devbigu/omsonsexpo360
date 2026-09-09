import nodemailer from 'nodemailer';

// Create Gmail SMTP transporter - optimized for Render deployment
const createTransporter = () => {
  const {
    EMAIL_SERVICE,
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_SECURE,
  } = process.env;

  // Check if credentials are provided
  if (!EMAIL_USER || !EMAIL_PASS) {
    return null; // Return null instead of throwing - let caller handle it
  }

  // If EMAIL_HOST is provided, use custom SMTP settings
  if (EMAIL_HOST) {
    return nodemailer.createTransport({
      host: EMAIL_HOST,
      port: Number(EMAIL_PORT) || 587,
      secure: EMAIL_SECURE
        ? EMAIL_SECURE === 'true'
        : Number(EMAIL_PORT || 587) === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
      connectionTimeout: 20000, // 20 seconds for Render
      greetingTimeout: 10000,
      socketTimeout: 20000,
      // Retry configuration for reliability
      pool: true,
      maxConnections: 1,
      maxMessages: 3,
    });
  }

  // Default to Gmail service (works best with EMAIL_SERVICE=gmail)
  return nodemailer.createTransport({
    service: EMAIL_SERVICE || 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    connectionTimeout: 20000, // 20 seconds for Render
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
};

export const sendOtpEmail = async (email, otp) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Create Gmail SMTP transporter
  const transporter = createTransporter();
  
  if (!transporter) {
    // No email credentials configured
    if (!isProduction) {
      console.log(`📧 [DEV MODE] Email not configured. OTP for ${email}: ${otp}`);
      return { success: true };
    }
    throw new Error('Email credentials are not configured. Please set EMAIL_USER and EMAIL_PASS in production.');
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP for BizCard',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #60a5fa;">BizCard OTP Verification</h2>
          <p>Your OTP code is:</p>
          <div style="background: linear-gradient(135deg, #60a5fa, #f472b6); color: white; padding: 20px; text-align: center; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this OTP, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent via SMTP');
    return { success: true };
  } catch (error) {
    console.error('❌ Email send error:', error);
    console.error('Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    
    // In development, log OTP to console as fallback
    if (!isProduction) {
      console.log(`📧 [DEV MODE] SMTP failed. OTP for ${email}: ${otp}`);
      return { success: true };
    }
    
    // In production, provide specific error messages
    let errorMessage = 'Failed to send email';
    if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Email server connection timeout. Check EMAIL_HOST and EMAIL_PORT settings. For Gmail, use EMAIL_SERVICE=gmail with an App Password.';
    } else if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. For Gmail, make sure you\'re using an App Password (not your regular password). Generate one at: https://myaccount.google.com/apppasswords';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to email server. Check EMAIL_HOST and EMAIL_PORT. For Gmail, use EMAIL_SERVICE=gmail.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

