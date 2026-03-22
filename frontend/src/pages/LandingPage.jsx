import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Code2, Shield, Users, Terminal, Cpu, Globe, 
  ArrowRight, CheckCircle2, Zap, Layout
} from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30 font-sans selection:text-white">
      {}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-500">
              <Terminal className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white">RGUKT <span className="text-indigo-400">CODE</span></span>
          </div>
          <div className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Features</a>
            <Link to="/login" className="px-6 py-2.5 bg-white text-slate-950 rounded-xl text-sm font-black hover:bg-slate-200 transition-all active:scale-95 shadow-xl shadow-white/5">LOGIN</Link>
          </div>
        </div>
      </nav>

      {}
      <main className="relative pt-32 pb-20 overflow-hidden">
        {}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent"></div>
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/20 blur-[120px] rounded-full -z-10"></div>
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-cyan-500/10 blur-[100px] rounded-full -z-10"></div>

        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
          >
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Next Gen Coding Platform</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-8 leading-[0.9]"
          >
            Master the Art <br />
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">of Problem Solving</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 font-medium mb-12 leading-relaxed"
          >
            A high-performance algorithm laboratory designed for RGUKT students and faculty. Experience real-time evaluation, secure testing, and comprehensive analytics.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <Link to="/login" className="group relative px-10 py-5 bg-indigo-600 rounded-2xl text-white font-black text-lg shadow-2xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center gap-3 overflow-hidden">
              <span className="relative z-10">GET STARTED</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </Link>
          </motion.div>
        </div>
      </main>

      {}
      <section id="features" className="py-32 bg-slate-950 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-6">Built for every role</h2>
            <div className="w-20 h-1.5 bg-indigo-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                icon: Layout, 
                title: 'Student Interface', 
                desc: 'A LeetCode-inspired workspace with Monaco Editor, real-time testing, and submission history tracking.',
                color: 'from-blue-500 to-cyan-400'
              },
              { 
                icon: Users, 
                title: 'Teacher Control', 
                desc: 'Easily manage assignments, track student performance, and create custom algorithmic challenges.',
                color: 'from-indigo-500 to-purple-400'
              },
              { 
                icon: Shield, 
                title: 'Root Admin', 
                desc: 'Complete oversight of the platform. Manage users, security policies, and system-wide configurations.',
                color: 'from-rose-500 to-amber-400'
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -8 }}
                className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all group"
              >
                <div className={`w-14 h-14 bg-gradient-to-tr ${feature.color} rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-indigo-500/10 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-black text-white mb-4">{feature.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {}
      <footer className="py-20 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <Terminal className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-lg font-black tracking-tighter text-white">RGUKT <span className="text-slate-500">CODE</span></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;