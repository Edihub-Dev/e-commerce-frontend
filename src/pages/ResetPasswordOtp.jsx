import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { pageVariants, scaleIn, buttonHover } from '../utils/animations';
import { verifyPasswordResetOtp } from '../utils/api';

const ResetPasswordOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', otp: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const initialEmail = location.state?.email;
    if (initialEmail) {
      setFormData((prev) => ({ ...prev, email: initialEmail }));
    }
  }, [location.state]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    }

    if (!formData.otp) {
      newErrors.otp = 'Verification code is required';
    } else if (!/^[0-9]{6}$/.test(formData.otp)) {
      newErrors.otp = 'Please enter the 6-digit code you received';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setSubmitting(true);
      await verifyPasswordResetOtp({
        email: formData.email,
        otp: formData.otp,
      });
      toast.success('Password reset successful. You can now log in with your new password.', {
        autoClose: 1000,
      });
      navigate('/login');
    } catch (error) {
      toast.error(error.message, { autoClose: 1000 });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="container mx-auto px-4 py-16 flex justify-center"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div
        className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md border"
        variants={scaleIn}
        initial="initial"
        animate="animate"
      >
        <h2 className="text-2xl font-bold text-center">Verify reset code</h2>
        <p className="text-sm text-center text-gray-600">
          Enter the six-digit code we sent to your email to finish resetting your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
              Verification Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              id="otp"
              name="otp"
              value={formData.otp}
              onChange={(event) => {
                const value = event.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                setFormData((prev) => ({ ...prev, otp: value }));
              }}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm tracking-widest text-center focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${
                errors.otp ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.otp && <p className="mt-1 text-sm text-red-600">{errors.otp}</p>}
          </div>

          <div>
            <motion.button
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70"
              variants={buttonHover}
              whileHover="hover"
              whileTap="tap"
            >
              {submitting ? 'Verifying...' : 'Verify & Continue'}
            </motion.button>
          </div>
        </form>

        <p className="text-sm text-center text-gray-600">
          Didn&apos;t get a code?{' '}
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            Try again
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
};

export default ResetPasswordOtp;
