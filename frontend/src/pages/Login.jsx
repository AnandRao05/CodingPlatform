import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Mail, Lock, Loader2, ArrowRight, ShieldCheck, Code2, Cpu } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) newErrors.email = 'Email is required';
    else if (!emailRegex.test(email)) newErrors.email = 'Enter a valid email address';
    
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setErrors({ submit: result.error });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#0a0a0a] text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {}
      <div className="hidden lg:flex lg:w-1/2 bg-[#111] relative overflow-hidden border-r border-[#222]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-transparent to-blue-600/10 z-0"></div>
        
        {}
        <div className="absolute top-20 left-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/20 mb-8"
          >
            <Code2 className="w-10 h-10 text-white" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-5xl font-black text-center tracking-tighter text-white mb-6"
          >
            Elevate Your <br />
            <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent italic">Coding Potential</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-slate-400 text-center text-lg max-w-md leading-relaxed"
          >
            The premium platform for RGUKT students and faculty to solve, collaborate, and excel in modern software engineering.
          </motion.p>
        </div>
      </div>

      {}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {}
        <div className="lg:hidden absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
           <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[40%] bg-indigo-600/10 blur-[100px] rounded-full"></div>
           <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[40%] bg-blue-600/10 blur-[100px] rounded-full"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-black text-white tracking-tight mb-2">Welcome Back</h2>
            <p className="text-slate-400 font-medium">Please sign in to access your dashboard.</p>
          </div>

          <AnimatePresence>
            {successMessage && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl mb-8 flex items-center gap-3 text-emerald-400 text-sm font-medium"
              >
                <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                {successMessage}
              </motion.div>
            )}
            
            {errors.submit && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl mb-8 flex items-center gap-3 text-rose-400 text-sm font-medium"
              >
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                {errors.submit}
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
                  onChange={(e) => { setEmail(e.target.value); if (errors.submit) setErrors((prev) => ({ ...prev, submit: null })); }}
                  className={`w-full bg-[#111] border ${errors.email ? 'border-rose-500/50 focus:border-rose-500' : 'border-[#222] focus:border-indigo-500/50'} text-white pl-12 pr-4 py-3.5 rounded-xl outline-none transition-all shadow-inner placeholder:text-[#333] font-medium`}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="text-rose-500 text-[11px] font-bold ml-1 uppercase tracking-tighter">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs font-black uppercase tracking-widest text-[#555]">Password</label>
                <Link to="/forgot-password" title="Click to reset your password" className="text-[10px] font-black uppercase tracking-widest text-[#444] hover:text-indigo-400 transition-colors">Forgot Pwd?</Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-500 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (errors.submit) setErrors((prev) => ({ ...prev, submit: null })); }}
                  className={`w-full bg-[#111] border ${errors.password ? 'border-rose-500/50 focus:border-rose-500' : 'border-[#222] focus:border-indigo-500/50'} text-white pl-12 pr-4 py-3.5 rounded-xl outline-none transition-all shadow-inner placeholder:text-[#333] font-medium`}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  autoComplete="current-password"
                />
              </div>
              {errors.password && <p className="text-rose-500 text-[11px] font-bold ml-1 uppercase tracking-tighter">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4 ml-1" /></>}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;