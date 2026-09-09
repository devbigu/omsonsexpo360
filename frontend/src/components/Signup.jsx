import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { signup } from '../services/api';

const Signup = ({ onSignup }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // OTP functionality commented out - can be re-enabled later
  // import { signup, sendOtp, verifyOtp } from '../services/api';
  // const [otp, setOtp] = useState('');
  // const [step, setStep] = useState('signup'); // 'signup', 'otp'

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      // Signup without OTP - IP approval will be handled on backend
      const res = await signup(name, email, password);
      if (res.token) {
        // User created, token received - IP request sent to admin
        onSignup(res.token);
        if (res.message) {
          setMessage(res.message);
        }
      }
    } catch (error) {
      console.error(error);
      setError(error.message || 'Could not create account. Please try again.');
    }
  };

  // OTP functions commented out for future use
  // const handleVerifyOtp = async (e) => {
  //   e.preventDefault();
  //   setError('');
  //   setMessage('');
  //   try {
  //     const res = await verifyOtp(email, otp);
  //     if (res.success) {
  //       onSignup(res.token);
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     setError(error.message || 'Invalid OTP. Please try again.');
  //   }
  // };

  // const handleResendOtp = async () => {
  //   setError('');
  //   try {
  //     await sendOtp(email);
  //     setMessage('OTP has been resent to your email.');
  //   } catch (error) {
  //     setError(error.message || 'Failed to resend OTP.');
  //   }
  // };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md ">
        {/* Card */}
        <div className="bg-blue-500 rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src="/logo.png" alt="Logo" className="h-16 w-auto" />
          </div>

          <h1 className="text-3xl font-bold text-gray-50 text-center mb-2">Create Account</h1>
          <p className="text-gray-50 text-center text-sm mb-8">Join us and start managing exhibitions</p>

          <form onSubmit={handleSignup} className="space-y-5">
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            {message && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
                {message}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-50 mb-2">Full Name</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-10 transition bg-gray-50 text-gray-900 placeholder-gray-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-50 mb-2">Email Address</label>
              <input
                type="email"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-10 transition bg-gray-50 text-gray-900 placeholder-gray-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-50 mb-2">Password</label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-10 transition bg-gray-50 text-gray-900 placeholder-gray-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-200 shadow-md hover:shadow-lg mt-6"
            >
              Sign Up
            </button>
          </form>

          {/* OTP form commented out - can be re-enabled later */}
          {/* {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              {error && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                  {error}
                </div>
              )}
              {message && (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
                  {message}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Enter OTP</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-10 transition bg-gray-50 text-gray-900 placeholder-gray-500"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP sent to your email"
                  required
                  maxLength="6"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-200 shadow-md hover:shadow-lg"
              >
                Verify OTP
              </button>
              <button
                type="button"
                className="w-full px-4 py-3 border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition duration-200"
                onClick={handleResendOtp}
              >
                Resend OTP
              </button>
              <button
                type="button"
                className="w-full px-4 py-3 border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition duration-200"
                onClick={() => setStep('signup')}
              >
                Back
              </button>
            </form>
          )} */}

          <p className="text-center text-gray-50 text-sm mt-8">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-700 font-semibold transition"
            >
              Login
            </Link>
          </p>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Signup;