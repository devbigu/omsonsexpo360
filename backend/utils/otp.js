export const generateOtp = () => {
  // Generate 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const isOtpValid = (otpExpires) => {
  if (!otpExpires) return false;
  return new Date() < new Date(otpExpires);
};

