import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, BookOpen, ClipboardList, User, LogOut, Menu, CheckCircle, XCircle, Clock, Eye, Play, StopCircle, RefreshCw, Send, Check } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import MonacoCodeEditor from '../components/MonacoCodeEditor';
import LeetCodeWorkspace from '../components/LeetCodeWorkspace';

const StudentDashboard = () => {
  const { user, getAuthHeaders, API_BASE_URL, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [problems, setProblems] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const [loading, setLoading] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditorMinimized, setIsEditorMinimized] = useState(false);
  
  const [assignmentScore, setAssignmentScore] = useState(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [studentStats, setStudentStats] = useState({ problemsSolved: 0, currentStreak: 0 });

  // Profile forms
  const [profileForm, setProfileForm] = useState({ name: user?.name, email: user?.email });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' });
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Common API Call Helper
  const apiCall = async (endpoint, options = {}) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json', ...options.headers }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'API Error');
    return data;
  };

  useEffect(() => {
    if (activeTab === 'overview') loadStudentStats();
    else if (activeTab === 'problems') loadProblems();
    else if (activeTab === 'assignments') loadAssignments();
  }, [activeTab]);

  const loadStudentStats = async () => {
    try {
      const data = await apiCall('/users/student/stats');
      setStudentStats(data);
    } catch (error) { console.error('Failed to load stats', error); }
  };

  const loadProblems = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/problems');
      setProblems(data.problems || []);
    } catch (error) { console.error('Failed to load problems', error); } finally { setLoading(false); }
  };

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/assignments/student');
      const assignmentsWithSubmissions = await Promise.all(
        data.map(async (assignment) => {
          try {
            const submissionsData = await apiCall(`/assignments/${assignment._id}/submissions`);
            return { ...assignment, submissions: submissionsData || [] };
          } catch { return { ...assignment, submissions: [] }; }
        })
      );
      setAssignments(assignmentsWithSubmissions);
    } catch { setAssignments([]); } finally { setLoading(false); }
  };

  const selectProblem = async (problem) => {
    try {
      const fullProblem = await apiCall(`/problems/${problem._id}`);
      setSelectedProblem(fullProblem);
      setSelectedAssignment(null);
      setActiveTab('solve');
      setSubmissionResult(null);
    } catch (error) { alert('Failed to load problem details'); }
  };

  const selectAssignment = async (assignment) => {
    try {
      const data = await apiCall(`/assignments/${assignment._id}/student`);
      setSelectedAssignment(data);
      if (data.assignment.problems?.length > 0) {
        setSelectedProblem(data.assignment.problems[0].problemId);
      }
      setActiveTab('solve');
      setSubmissionResult(null);
    } catch (error) { alert('Failed to load assignment details'); }
  };

  const submitSolution = async (code, language) => {
    if (!selectedProblem) return;
    setIsSubmitting(true); setSubmissionResult(null);
    try {
      const languages = { javascript: 63, python: 71, java: 62, c: 50, 'c++': 54, cpp: 54, 'c#': 51, csharp: 51, go: 60, ruby: 72, php: 68, rust: 73, typescript: 74 };
      const selectedLangId = languages[language.toLowerCase()];
      if (!selectedLangId) throw new Error('Unsupported language');

      const visibleTestCases = selectedProblem.testCases.filter(tc => !tc.isHidden);
      let allPassed = true;
      const results = [];

      for (const tc of visibleTestCases) {
        try {
          const result = await apiCall('/code/execute', {
            method: 'POST',
            body: JSON.stringify({ source_code: code, language_id: selectedLangId, stdin: tc.input })
          });
          if (result.success) {
            const actualOutput = (result.output || result.stdout || '').trim();
            const expectedOutput = tc.expectedOutput.trim();
            const passed = actualOutput === expectedOutput;
            if (!passed) allPassed = false;
            results.push({ input: tc.input, expectedOutput, actualOutput, passed });
          } else {
            allPassed = false;
            results.push({ input: tc.input, expectedOutput: tc.expectedOutput, actualOutput: result.message || result.type || 'Execution failed', passed: false, error: true });
          }
        } catch (error) {
          allPassed = false;
          results.push({ input: tc.input, expectedOutput: tc.expectedOutput, actualOutput: error.message, passed: false, error: true });
        }
      }

      setSubmissionResult({ overallResult: allPassed ? 'CORRECT' : 'WRONG', testResults: results, totalTests: visibleTestCases.length, passedTests: results.filter(r => r.passed).length });
      if (allPassed) loadStudentStats();
    } catch (error) {
      setSubmissionResult({ overallResult: 'ERROR', error: error.message });
    } finally { setIsSubmitting(false); }
  };

  const submitAssignmentSolution = async (code, language) => {
    if (!selectedAssignment || !selectedProblem) return;
    setIsSubmitting(true); setSubmissionResult(null);
    try {
      const data = await apiCall(`/assignments/${selectedAssignment.assignment._id}/problems/${selectedProblem._id}/submit`, {
        method: 'POST', body: JSON.stringify({ code, language })
      });
      setSubmissionResult({ overallResult: 'SUBMITTED', message: data.message || 'Solution submitted successfully!', testResults: data.submission?.testResults, passedTests: data.submission?.score === 100 ? 1 : 0 });
      loadStudentStats();
    } catch (error) {
      setSubmissionResult({ overallResult: 'ERROR', error: error.message });
    } finally { setIsSubmitting(false); }
  };

  const viewAssignmentScore = async (assignment) => {
    try {
      const scoreData = await apiCall(`/assignments/${assignment._id}/score`);
      setAssignmentScore(scoreData);
      setShowScoreModal(true);
    } catch { alert('Failed to load assignment score'); }
  };

  const handleEditProfile = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const data = await apiCall('/auth/profile', { method: 'PUT', body: JSON.stringify(profileForm) });
      useAuthStore.setState({ user: data.user });
      setShowEditProfile(false);
      alert('Profile updated!');
    } catch (e) { alert(e.message || 'Failed to update'); } finally { setLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return alert('Passwords mismatch');
    
    setLoading(true);
    try {
      await apiCall('/auth/update-password-direct', { 
        method: 'PUT', 
        body: JSON.stringify({ 
          currentPassword: passwordForm.currentPassword, 
          newPassword: passwordForm.newPassword 
        }) 
      });
      setShowChangePassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' });
      alert('Password updated successfully!');
    } catch (e) { alert(e.message || 'Error updating password'); } finally { setLoading(false); }
  };

  const navigation = [
    { id: 'overview', name: 'Overview', icon: LayoutDashboard },
    { id: 'assignments', name: 'My Assignments', icon: ClipboardList },
    { id: 'problems', name: 'Practice Problems', icon: BookOpen },
    { id: 'profile', name: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans">
      <motion.aside initial={false} animate={{ width: sidebarOpen ? '260px' : '80px' }} className="bg-slate-900 text-white min-h-screen flex flex-col shrink-0 sticky top-0 transition-all z-40">
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          {sidebarOpen && <span className="text-lg tracking-wide font-semibold truncate bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">RGUKT Platform</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors ml-auto">
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-2">
          {navigation.map(item => {
            const isActive = activeTab === item.id || (item.id === 'assignments' && activeTab === 'solve' && selectedAssignment) || (item.id === 'problems' && activeTab === 'solve' && !selectedAssignment);
            return (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSelectedProblem(null); setSelectedAssignment(null); }} className={`w-full flex items-center p-3 rounded-xl transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {sidebarOpen && <span className="ml-3 font-medium tracking-wide">{item.name}</span>}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button onClick={logout} className="w-full flex items-center p-3 rounded-xl text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors">
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="ml-3 font-medium">Logout</span>}
          </button>
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shrink-0 sticky top-0 z-30 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-slate-800 capitalize">
            {activeTab === 'solve' ? (selectedAssignment ? 'Solving Assignment' : 'Solving Problem') : navigation.find(n => n.id === activeTab)?.name}
          </h1>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-sm font-medium text-slate-600">Student: <span className="text-indigo-600 font-bold">{user?.name}</span></div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 relative">
          <AnimatePresence mode='wait'>
            
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-6xl mx-auto space-y-8">
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">Learning Overview</h2>
                  <p className="text-slate-500">Track your coding journey and personal progression.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div whileHover={{ y: -4 }} className="bg-indigo-50 rounded-2xl p-6 border border-white shadow-sm flex items-center gap-5 transition-transform">
                    <div className="p-4 rounded-xl bg-indigo-100"><BookOpen className="w-8 h-8 text-indigo-600" /></div>
                    <div>
                      <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Problems Solved</p>
                      <p className="text-3xl font-bold mt-1 text-indigo-600">{studentStats.problemsSolved || 0}</p>
                    </div>
                  </motion.div>
                  <motion.div whileHover={{ y: -4 }} className="bg-emerald-50 rounded-2xl p-6 border border-white shadow-sm flex items-center gap-5 transition-transform">
                    <div className="p-4 rounded-xl bg-emerald-100"><Play className="w-8 h-8 text-emerald-600" /></div>
                    <div>
                      <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Current Streak (Days)</p>
                      <p className="text-3xl font-bold mt-1 text-emerald-600">{studentStats.currentStreak || 0}</p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {activeTab === 'problems' && (
              <motion.div key="problems" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                   <div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-1">Practice Repository</h2>
                      <p className="text-slate-500">Sharpen your skills with these algorithmic challenges.</p>
                   </div>
                </div>
                {loading ? <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-indigo-600"></div></div> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {problems.length > 0 ? problems.map(problem => (
                      <motion.div key={problem._id} layoutId={`problem-${problem._id}`} onClick={() => selectProblem(problem)} className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer group">
                        <h3 className="font-bold text-lg text-slate-800 mb-2 truncate group-hover:text-indigo-600 transition-colors">{problem.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">{problem.description}</p>
                        <div className="flex items-center gap-2 mb-4">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize ${problem.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' : problem.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{problem.difficulty}</span>
                          <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg">{problem.category}</span>
                        </div>
                        <div className="pt-4 border-t border-slate-100">
                          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-800 group-hover:bg-indigo-600 transition-colors"><BookOpen className="w-4 h-4"/> Solve Challenge</button>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                        <p className="text-slate-500">No practice problems available at the moment.</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'assignments' && (
              <motion.div key="assignments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-6xl mx-auto">
                 <div className="flex justify-between items-center mb-8">
                   <div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-1">My Homework & Exams</h2>
                      <p className="text-slate-500">Complete these assignments before their due dates.</p>
                   </div>
                 </div>
                 {loading ? <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-indigo-600"></div></div> : (
                   <div className="grid grid-cols-1 gap-6">
                     {assignments.length > 0 ? assignments.map(assignment => {
                       const totalProblems = assignment.problems?.length || 0;
                       const submittedProblems = Object.values(assignment.submissionStatus || {}).filter(status => status.status === 'accepted').length;
                       const isOverdue = new Date() > new Date(assignment.dueDate);
                       return (
                         <motion.div key={assignment._id} onClick={() => selectAssignment(assignment)} className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 transition cursor-pointer flex flex-col md:flex-row gap-6 group">
                            <div className="flex-1 space-y-4">
                               <div className="flex items-start justify-between">
                                 <div>
                                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition">{assignment.title}</h3>
                                    <p className="text-slate-500 mt-1">{assignment.description}</p>
                                 </div>
                               </div>
                               <div className="flex flex-wrap items-center gap-3">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {isOverdue ? <Clock className="w-3.5 h-3.5"/> : <CheckCircle className="w-3.5 h-3.5"/>} {isOverdue ? 'Overdue' : 'Active'}
                                  </span>
                                  <span className="text-sm font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-lg flex items-center gap-1.5"><ClipboardList className="w-4 h-4"/> {submittedProblems}/{totalProblems} solved</span>
                                  <span className="text-sm font-medium bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg">Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                                  {assignment.teacherId && <span className="text-sm text-slate-500">By: {assignment.teacherId.name}</span>}
                               </div>
                               <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                                 {assignment.problems?.map(p => {
                                   const sub = assignment.submissions?.find(s => s.problemId === p.problemId._id);
                                   return (
                                     <div key={p.problemId._id} className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-xl">
                                       <span className="text-sm font-semibold text-slate-700">{p.problemId.title}</span>
                                       <div className="flex gap-2 items-center">
                                         {sub ? (
                                           <>
                                             <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${sub.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : sub.status === 'wrong_answer' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                               {sub.status.replace('_', ' ')}
                                             </span>
                                             {sub.score !== undefined && <span className="font-bold text-indigo-600 text-sm ml-1">{sub.score}/100</span>}
                                           </>
                                         ) : <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unattempted</span>}
                                       </div>
                                     </div>
                                   );
                                 })}
                               </div>
                            </div>
                            <div className="w-full md:w-56 flex flex-col justify-end gap-3 md:border-l border-slate-100 md:pl-6">
                               <button onClick={(e) => { e.stopPropagation(); viewAssignmentScore(assignment); }} className="w-full py-2.5 rounded-xl font-semibold bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-600 hover:text-indigo-600 transition flex items-center justify-center gap-2"><Eye className="w-4 h-4"/> View Score</button>
                               <button className="w-full py-2.5 rounded-xl font-semibold bg-slate-800 text-white hover:bg-slate-700 transition flex items-center justify-center gap-2"><Play className="w-4 h-4"/> Solve Now</button>
                            </div>
                         </motion.div>
                       );
                     }) : (
                       <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                         <p className="text-slate-500">No active assignments assigned to your class.</p>
                       </div>
                     )}
                   </div>
                 )}
              </motion.div>
            )}

            {activeTab === 'solve' && (selectedProblem || selectedAssignment) && (
              <motion.div key="solve" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-[#0a0a0a]">
                <LeetCodeWorkspace
                  problem={selectedProblem}
                  assignment={selectedAssignment}
                  onSubmit={() => {
                    loadStudentStats();
                    if (selectedAssignment) {
                       selectAssignment(selectedAssignment.assignment);
                    }
                  }}
                  onBack={() => {
                    setSelectedProblem(null);
                    setSelectedAssignment(null);
                    setActiveTab(selectedAssignment ? 'assignments' : 'problems');
                  }}
                  onProblemChange={(prob) => {
                    setSelectedProblem(prob);
                    setSubmissionResult(null);
                  }}
                />
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-4xl mx-auto space-y-6">
                 <div className="mb-8">
                   <h2 className="text-2xl font-bold text-slate-800">Account Settings</h2>
                   <p className="text-slate-500">Manage your profile and security credentials.</p>
                 </div>
                 <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 items-start">
                   <div className="w-24 h-24 rounded-full bg-indigo-100 border-4 border-indigo-50 flex items-center justify-center shrink-0">
                     <span className="text-3xl font-black text-indigo-600 tracking-tighter">{user?.name?.charAt(0) || 'U'}</span>
                   </div>
                   <div className="flex-1 space-y-4">
                      {showEditProfile ? (
                        <form onSubmit={handleEditProfile} className="space-y-4">
                          <input type="text" value={profileForm.name} onChange={e=>setProfileForm({...profileForm, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500" required />
                          <input type="email" value={profileForm.email} onChange={e=>setProfileForm({...profileForm, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500" required />
                          <div className="flex gap-2">
                            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition">Save Profile</button>
                            <button type="button" onClick={()=>setShowEditProfile(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <div>
                          <h3 className="text-2xl font-bold text-slate-800">{user?.name}</h3>
                          <p className="text-slate-500 mt-1">{user?.email}</p>
                          <p className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-lg mt-3">Role: {user?.role}</p>
                          <button onClick={()=>setShowEditProfile(true)} className="block mt-5 px-5 py-2 rounded-xl border-2 border-slate-200 font-semibold text-slate-700 hover:border-indigo-600 hover:text-indigo-600 transition">Edit Profile</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                     <h3 className="text-xl font-bold text-slate-800 mb-6">Security Settings</h3>
                     {showChangePassword ? (
                       <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                         <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-300 mb-4 text-center">
                            <p className="text-sm text-slate-500">Update your account credentials using your current password.</p>
                         </div>
                         <div className="space-y-4">
                           <input type="password" placeholder="Current Password" value={passwordForm.currentPassword} onChange={e=>setPasswordForm({...passwordForm, currentPassword: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition outline-none" required />
                           <input type="password" placeholder="New Password" value={passwordForm.newPassword} onChange={e=>setPasswordForm({...passwordForm, newPassword: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition outline-none" required />
                           <input type="password" placeholder="Confirm New Password" value={passwordForm.confirmPassword} onChange={e=>setPasswordForm({...passwordForm, confirmPassword: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition outline-none" required />
                         </div>
                         <div className="flex gap-2 pt-2">
                            <button type="submit" disabled={loading} className="px-5 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition w-full shadow-lg">
                              {loading ? 'Updating...' : 'Update Password'}
                            </button>
                            <button type="button" onClick={()=>{setShowChangePassword(false); setOtpSent(false);}} className="px-5 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition">Cancel</button>
                         </div>
                       </form>
                     ) : (
                       <button onClick={()=>setShowChangePassword(true)} className="px-5 py-2.5 rounded-xl border-2 border-slate-200 font-semibold text-slate-700 hover:border-indigo-600 hover:text-indigo-600 transition">Change Password</button>
                     )}
                  </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* Assignment Score Modal */}
      <AnimatePresence>
        {showScoreModal && assignmentScore && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Assignment Report</h2>
                <button onClick={() => setShowScoreModal(false)} className="p-2 bg-white hover:bg-rose-50 hover:text-rose-600 rounded-full transition shadow-sm border border-slate-200"><XCircle className="w-5 h-5"/></button>
              </div>
              <div className="p-6 overflow-y-auto">
                <h3 className="text-xl font-bold text-slate-800 mb-6">{assignmentScore.assignmentTitle}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-black text-indigo-600">{assignmentScore.totalScore}</span>
                    <span className="text-xs font-bold text-indigo-800 uppercase tracking-widest mt-1">Total Score</span>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-black text-emerald-600">{assignmentScore.percentage}%</span>
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest mt-1">Accuracy</span>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-black text-amber-600">{assignmentScore.gradedProblems}/{assignmentScore.totalProblems}</span>
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-widest mt-1">Graded</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-black text-slate-600">{assignmentScore.maxPossibleScore}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Max Base</span>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Problem Breakdown</h4>
                <div className="space-y-3">
                  {assignmentScore.problemScores.map((problem, index) => (
                    <div key={problem.problemId} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-bold text-slate-700">{index + 1}. {problem.problemTitle}</h5>
                        <div className="flex gap-2 items-center">
                          {problem.score !== null ? (
                            <>
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${problem.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{problem.status.replace('_', ' ')}</span>
                              <span className="font-black text-indigo-600">{problem.score}/100</span>
                            </>
                          ) : <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentDashboard;