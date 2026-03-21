import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Loader2, ArrowLeft, ShieldCheck, Code2, Cpu } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showResetFields, setShowResetFields] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { API_BASE_URL } = useAuthStore();
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        setShowResetFields(true);
      } else {
        setError(data.message || 'Something went wrong');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const resetRes = await fetch(`${API_BASE_URL}/auth/reset-password-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password })
      });
      
      const data = await resetRes.json();
      if (resetRes.ok) {
        setSuccess('Password reset successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(data.message || 'Invalid or expired OTP');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    if (!showResetFields) handleRequestOtp(e);
    else handleResetPassword(e);
  };

  return (
    <div className="min-h-screen w-full flex bg-[#0a0a0a] text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {/* Left Decoration Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#111] relative overflow-hidden border-r border-[#222]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-transparent to-blue-600/10 z-0"></div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/20 mb-8"
          >
            <Code2 className="w-10 h-10 text-white" />
          </motion.div>
          
          <h1 className="text-5xl font-black text-center tracking-tighter text-white mb-6">
            Secure Your <br />
            <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent italic">Account</span>
          </h1>
          <p className="text-slate-400 text-center text-lg max-w-md leading-relaxed">
            Real-time OTP verification ensures that only you can reset your credentials.
          </p>
        </div>
      </div>

      {/* Right Reset Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-10 text-center lg:text-left">
            <Link to="/login" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-xs font-black uppercase tracking-widest mb-6 transition-colors group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Login
            </Link>
            <h2 className="text-3xl font-black text-white tracking-tight mb-2">
              {showResetFields ? 'Set New Password' : 'Forgot Password?'}
            </h2>
            <p className="text-slate-400 font-medium">
              {showResetFields ? 'Enter the OTP from your email and your new password.' : 'Enter your email and we\'ll send you a recovery code.'}
            </p>
          </div>

          <AnimatePresence>
            {success && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl mb-8 flex items-center gap-3 text-emerald-400 text-sm font-medium"
              >
                <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                {success}
              </motion.div>
            )}
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl mb-8 flex items-center gap-3 text-rose-400 text-sm font-medium"
              >
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-[#555] ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-500 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  disabled={showResetFields}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-[#111] border border-[#222] focus:border-indigo-500/50 text-white pl-12 pr-4 py-3.5 rounded-xl outline-none transition-all shadow-inner placeholder:text-[#333] font-medium ${showResetFields ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <AnimatePresence>
              {showResetFields && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  className="space-y-4 overflow-hidden pt-2"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-[#555] ml-1">6-Digit Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-[#111] border border-[#222] focus:border-indigo-500/50 text-white px-4 py-3.5 rounded-xl outline-none transition-all shadow-inner text-center font-black tracking-[0.5em] text-lg"
                      placeholder="000000"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-[#555] ml-1">New Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#111] border border-[#222] focus:border-indigo-500/50 text-white px-4 py-3.5 rounded-xl outline-none transition-all shadow-inner"
                      placeholder="Min. 6 characters"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-[#555] ml-1">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#111] border border-[#222] focus:border-indigo-500/50 text-white px-4 py-3.5 rounded-xl outline-none transition-all shadow-inner"
                      placeholder="Repeat password"
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 ${showResetFields ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 shadow-emerald-600/20' : 'bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-indigo-600/20'}`}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{showResetFields ? 'Reset Password' : 'Send Recovery Code'}</>}
            </button>
          </form>
          
          {success && (
             <div className="mt-8">
               <p className="text-slate-500 text-xs text-center border-t border-[#222] pt-8">
                 Didn't receive an email? Check your spam folder or <button onClick={() => setSuccess('')} className="text-white hover:text-indigo-400 font-bold ml-1 transition-colors">try again</button>.
               </p>
             </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
