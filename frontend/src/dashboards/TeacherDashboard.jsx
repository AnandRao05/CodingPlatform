import useAuthStore from '../stores/authStore';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MonacoCodeEditor from '../components/MonacoCodeEditor';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, ClipboardList, User, Menu, X, LogOut,
  Plus, Edit2, Trash2, Eye, CheckCircle, XCircle, Clock, Check
} from 'lucide-react';

const TeacherDashboard = () => {
  const { user, logout, getAuthHeaders, API_BASE_URL } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [assignments, setAssignments] = useState([]);
  const [problems, setProblems] = useState([]);
  const [myProblems, setMyProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modals & Forms
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({ title: '', description: '', classId: user?.classId || '', dueDate: '', instructions: '', selectedProblems: [] });
  const [showCreateProblem, setShowCreateProblem] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  const [problemForm, setProblemForm] = useState({
    title: '', description: '', difficulty: 'easy', category: '', tags: [], timeLimit: 1000, memoryLimit: 256,
    sampleInput: '', sampleOutput: '', constraints: '', hints: [], testCases: [{ input: '', expectedOutput: '', isHidden: false }]
  });
  
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' });
  
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showCodeViewer, setShowCodeViewer] = useState(false);
  const [overviewStats, setOverviewStats] = useState({ totalStudents: 0, problemsCreated: 0, activeAssignments: 0 });

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    if (activeTab === 'overview') loadOverviewStats();
    else if (activeTab === 'assignments') { loadAssignments(); loadProblems(); }
    else if (activeTab === 'problems') loadMyProblems();
    else if (activeTab === 'profile') setProfileForm({ name: user?.name || '', email: user?.email || '' });
  }, [activeTab, user]);

  const apiCall = async (endpoint, options = {}) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { ...(options.body && { 'Content-Type': 'application/json' }), ...getAuthHeaders() }
    });
    if (!res.ok) throw await res.json().catch(() => ({ message: 'API Error' }));
    return res.json();
  };

  const loadAssignments = async () => { setLoading(true); try { setAssignments(await apiCall('/assignments/teacher')); } catch (e) { console.error(e); } finally { setLoading(false); } };
  const loadProblems = async () => { try { const d = await apiCall('/problems?limit=1000'); setProblems(d.problems || []); } catch (e) { console.error(e); } };
  const loadMyProblems = async () => { setLoading(true); try { const d = await apiCall('/problems/teacher/my-problems'); setMyProblems(d.problems || []); } catch (e) { console.error(e); } finally { setLoading(false); } };
  const loadOverviewStats = async () => { try { setOverviewStats(await apiCall('/users/teacher/overview')); } catch (e) { console.error(e); } };

  const handleCreateAssignment = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      // Always enforce teacher's own classId — never rely on form input for classId
      const classId = user?.classId || assignmentForm.classId;
      if (!classId) return alert('Your account is not assigned to a class. Contact admin.');
      await apiCall('/assignments', { method: 'POST', body: JSON.stringify({ ...assignmentForm, classId, problems: assignmentForm.selectedProblems.map(problemId => ({ problemId, order: 0 })), totalPoints: 100 }) });
      setShowCreateAssignment(false); setAssignmentForm({ title: '', description: '', classId: user?.classId || '', dueDate: '', instructions: '', selectedProblems: [] }); loadAssignments(); alert('Assignment created!');
    } catch (e) { alert(e.message || 'Failed to create assignment'); } finally { setLoading(false); }
  };

  const handleUpdateAssignment = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const classId = user?.classId || assignmentForm.classId;
      await apiCall(`/assignments/${editingAssignment._id}`, { method: 'PUT', body: JSON.stringify({ ...assignmentForm, classId, problems: assignmentForm.selectedProblems.map(problemId => ({ problemId, order: 0 })), totalPoints: 100 }) });
      setShowEditForm(false); setEditingAssignment(null); setAssignmentForm({ title: '', description: '', classId: user?.classId || '', dueDate: '', instructions: '', selectedProblems: [] }); loadAssignments(); alert('Assignment updated!');
    } catch (e) { alert(e.message || 'Failed to update assignment'); } finally { setLoading(false); }
  };

  const handleDeleteAssignment = async (id) => {
    if (!confirm('Are you sure?')) return;
    try { await apiCall(`/assignments/${id}`, { method: 'DELETE' }); loadAssignments(); alert('Deleted!'); } catch (e) { alert(e.message || 'Failed to delete'); }
  };

  const handleCreateProblem = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await apiCall('/problems', { method: 'POST', body: JSON.stringify(problemForm) }); setShowCreateProblem(false); resetProblemForm(); loadMyProblems(); loadProblems(); alert('Problem created!'); }
    catch (e) { alert(e.message || 'Failed'); } finally { setLoading(false); }
  };

  const handleUpdateProblem = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await apiCall(`/problems/${editingProblem._id}`, { method: 'PUT', body: JSON.stringify(problemForm) }); setShowCreateProblem(false); setEditingProblem(null); resetProblemForm(); loadMyProblems(); loadProblems(); alert('Problem updated!'); }
    catch (e) { alert(e.message || 'Failed'); } finally { setLoading(false); }
  };

  const handleDeleteProblem = async (id) => {
    if (!confirm('Are you sure?')) return;
    try { await apiCall(`/problems/${id}`, { method: 'DELETE' }); loadMyProblems(); loadProblems(); alert('Deleted!'); } catch (e) { alert(e.message || 'Failed to delete'); }
  };

  const viewAssignmentSubmissions = async (assignment) => {
    setLoading(true);
    try {
      const data = await apiCall(`/assignments/${assignment._id}/submissions/teacher`);
      setSelectedAssignment(data.assignment); setAssignmentSubmissions(data.submissions); setShowSubmissions(true); setActiveTab('assignments');
    } catch (e) { alert('Failed to load submissions'); } finally { setLoading(false); }
  };

  const executeSubmissionCode = async (code, language) => {
    try {
      const languages = { javascript: 63, python: 71, java: 62, c: 50, cpp: 54, csharp: 51, go: 60, ruby: 72, php: 68, rust: 73, typescript: 74 };
      const langId = languages[language.toLowerCase()] || 63;
      const result = await apiCall('/code/execute', { method: 'POST', body: JSON.stringify({ source_code: code, language_id: langId, stdin: selectedSubmission.problemId.sampleInput || '' }) });
      if (result.success) {
        return { overallResult: 'EXECUTED', stdout: result.output || result.stdout || '', stderr: result.stderr || '', compile_output: result.compile_output || '', time: result.time || '', memory: result.memory || '' };
      }
      return { overallResult: 'ERROR', error: result.message || result.type || 'Execution failed', type: result.type };
    } catch (e) { return { overallResult: 'ERROR', error: e.message }; }
  };

  const handleEditProfile = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const d = await apiCall('/auth/profile', { method: 'PUT', body: JSON.stringify(profileForm) });
      useAuthStore.setState({ user: d.user }); setShowEditProfile(false); alert('Profile updated!');
    } catch (e) { alert(e.message || 'Failed to update'); } finally { setLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return alert('Passwords do not match');
    if (passwordForm.newPassword.length < 6) return alert('Minimum 6 characters');
    
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
    } catch (e) { alert(e.message || 'Failed to update password'); } finally { setLoading(false); }
  };

  const handleProblemToggle = (id) => setAssignmentForm(p => ({ ...p, selectedProblems: p.selectedProblems.includes(id) ? p.selectedProblems.filter(pid => pid !== id) : [...p.selectedProblems, id] }));
  const resetProblemForm = () => setProblemForm({ title: '', description: '', difficulty: 'easy', category: '', tags: [], timeLimit: 1000, memoryLimit: 256, sampleInput: '', sampleOutput: '', constraints: '', hints: [], testCases: [{ input: '', expectedOutput: '', isHidden: false }] });
  const startEditProblem = async (p) => {
    try {
      const full = await apiCall(`/problems/${p._id}/admin`);
      setProblemForm({ title: full.title, description: full.description, difficulty: full.difficulty, category: full.category, tags: full.tags || [], timeLimit: full.timeLimit, memoryLimit: full.memoryLimit, sampleInput: full.sampleInput || '', sampleOutput: full.sampleOutput || '', constraints: full.constraints || '', hints: full.hints || [], testCases: full.testCases || [{ input: '', expectedOutput: '', isHidden: false }] });
      setEditingProblem(full); setShowCreateProblem(true); setActiveTab('problems');
    } catch (e) { alert('Failed to load problem'); }
  };

  const handleEditAssignment = async (a) => {
    setLoading(true);
    try {
      const d = await apiCall(`/assignments/${a._id}/edit`);
      setEditingAssignment(d); setShowEditForm(true); setActiveTab('assignments');
      setAssignmentForm({ title: d.title, description: d.description, classId: d.classId, dueDate: new Date(d.dueDate).toISOString().slice(0, 16), instructions: d.instructions || '', selectedProblems: d.problems.map(p => p.problemId._id) });
    } catch (e) { alert('Failed to load assignment'); } finally { setLoading(false); }
  };

  const navigation = [
    { id: 'overview', name: 'Overview', icon: LayoutDashboard },
    { id: 'problems', name: 'My Problems', icon: BookOpen },
    { id: 'assignments', name: 'Assignments', icon: ClipboardList },
    { id: 'profile', name: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <motion.aside initial={false} animate={{ width: sidebarOpen ? '260px' : '80px' }} className="bg-slate-900 text-white min-h-screen flex flex-col shrink-0 sticky top-0 transition-all z-40">
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          {sidebarOpen && <span className="text-lg tracking-wide font-semibold truncate bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">RGUKT Platform</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors ml-auto">
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-2">
          {navigation.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setShowCreateAssignment(false); setShowSubmissions(false); setShowEditForm(false); setShowCreateProblem(false); }} className={`w-full flex items-center p-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <item.icon className={`w-5 h-5 shrink-0 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} />
              {sidebarOpen && <span className="ml-3 font-medium tracking-wide">{item.name}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center p-3 rounded-xl text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors">
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="ml-3 font-medium">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Layout */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shrink-0 sticky top-0 z-30 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-slate-800 capitalize">
            {navigation.find(n => n.id === activeTab)?.name}
          </h1>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-sm font-medium text-slate-600">Welcome, <span className="text-indigo-600 font-bold">{user?.name || 'Teacher'}</span></div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto p-8 relative">
          <AnimatePresence mode='wait'>
            
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-6xl mx-auto space-y-8">
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">Teaching Overview</h2>
                  <p className="text-slate-500">A quick glance at your platform statistics and activities.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[ 
                    { label: 'Total Students', value: overviewStats.totalStudents, icon: User, color: 'text-indigo-600', bg: 'bg-indigo-50', iconBg: 'bg-indigo-100' },
                    { label: 'Problems Created', value: overviewStats.problemsCreated, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50', iconBg: 'bg-emerald-100' },
                    { label: 'Active Assignments', value: overviewStats.activeAssignments, icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50', iconBg: 'bg-amber-100' }
                  ].map((stat, i) => (
                    <motion.div key={i} whileHover={{ y: -4 }} className={`${stat.bg} rounded-2xl p-6 border border-white shadow-sm flex items-center gap-5 transition-transform`}>
                      <div className={`p-4 rounded-xl ${stat.iconBg}`}>
                        <stat.icon className={`w-8 h-8 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider">{stat.label}</p>
                        <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'problems' && (
              <motion.div key="problems" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-6xl mx-auto">
                {!showCreateProblem ? (
                  <>
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-1">My Problems Repository</h2>
                        <p className="text-slate-500">Manage algorithmic problems you've created for your classes.</p>
                      </div>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowCreateProblem(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Create Problem
                      </motion.button>
                    </div>

                    {loading ? (
                      <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-indigo-600"></div></div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myProblems.length > 0 ? myProblems.map(problem => (
                          <motion.div key={problem._id} layoutId={`problem-${problem._id}`} className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 transition-shadow">
                            <h3 className="font-bold text-lg text-slate-800 mb-2 truncate">{problem.title}</h3>
                            <div className="flex items-center gap-2 mb-6">
                              <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize ${problem.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' : problem.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{problem.difficulty}</span>
                              <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg">{problem.category}</span>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                              <button onClick={() => startEditProblem(problem)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition"><Edit2 className="w-4 h-4"/> Edit</button>
                              <button onClick={() => handleDeleteProblem(problem._id)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition"><Trash2 className="w-4 h-4"/> Delete</button>
                            </div>
                          </motion.div>
                        )) : (
                          <div className="col-span-full py-20 flex flex-col items-center bg-white rounded-3xl border border-dashed border-slate-300">
                            <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-2xl mb-4 text-slate-400"><BookOpen className="w-8 h-8" /></div>
                            <h3 className="text-xl font-bold text-slate-700 mb-2">No problems found</h3>
                            <p className="text-slate-500 mb-6 text-center max-w-sm">You haven't added any coding problems to your repository yet.</p>
                            <button onClick={() => setShowCreateProblem(true)} className="text-indigo-600 font-semibold hover:text-indigo-700">Create your first problem &rarr;</button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50">
                    <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-800">{editingProblem ? 'Edit Problem' : 'Create New Problem'}</h3>
                        <p className="text-slate-500 mt-1">Fill out the details below to publish an algorithmic problem.</p>
                      </div>
                      <button onClick={() => { setShowCreateProblem(false); setEditingProblem(null); resetProblemForm(); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition"><X className="w-6 h-6"/></button>
                    </div>
                    <form onSubmit={editingProblem ? handleUpdateProblem : handleCreateProblem} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Problem Title <span className="text-red-500">*</span></label>
                          <input type="text" value={problemForm.title} onChange={e => setProblemForm({...problemForm, title: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm" placeholder="e.g., Two Sum" required />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Difficulty <span className="text-red-500">*</span></label>
                          <select value={problemForm.difficulty} onChange={e => setProblemForm({...problemForm, difficulty: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm" required>
                            <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Category <span className="text-red-500">*</span></label>
                          <select value={problemForm.category} onChange={e => setProblemForm({...problemForm, category: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm" required>
                            <option value="">Select...</option><option value="Array">Array</option><option value="String">String</option><option value="Linked List">Linked List</option><option value="Tree">Tree</option><option value="Dynamic Programming">Dynamic Programming</option><option value="Graph">Graph</option><option value="Math">Math</option><option value="Sorting">Sorting</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Time Limit (ms)</label>
                          <input type="number" value={problemForm.timeLimit} onChange={e => setProblemForm({...problemForm, timeLimit: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Memory Limit (MB)</label>
                          <input type="number" value={problemForm.memoryLimit} onChange={e => setProblemForm({...problemForm, memoryLimit: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Description <span className="text-red-500">*</span></label>
                        <textarea value={problemForm.description} onChange={e => setProblemForm({...problemForm, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm h-32 resize-y" placeholder="Explain the problem statement thoroughly..." required />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Sample Input</label>
                          <textarea value={problemForm.sampleInput} onChange={e => setProblemForm({...problemForm, sampleInput: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-mono text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm h-24" placeholder="Input string format..." />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Sample Output</label>
                          <textarea value={problemForm.sampleOutput} onChange={e => setProblemForm({...problemForm, sampleOutput: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-mono text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm h-24" placeholder="Expected output format..." />
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                          <h4 className="text-lg font-bold text-slate-800">Test Cases <span className="text-red-500">*</span></h4>
                          <button type="button" onClick={() => setProblemForm(p => ({...p, testCases: [...p.testCases, {input:'', expectedOutput:'', isHidden:false}]}))} className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-200 transition flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add Case</button>
                        </div>
                        <div className="space-y-4">
                          {problemForm.testCases.map((tc, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group">
                              {problemForm.testCases.length > 1 && (
                                <button type="button" onClick={() => setProblemForm(p => ({...p, testCases: p.testCases.filter((_, i) => i !== idx)}))} className="absolute right-3 top-3 text-red-300 hover:text-red-500 transition p-1"><X className="w-5 h-5"/></button>
                              )}
                              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Case {idx + 1}</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-semibold text-slate-600 mb-1">Input</label><textarea value={tc.input} onChange={e => { const nc = [...problemForm.testCases]; nc[idx].input = e.target.value; setProblemForm({...problemForm, testCases: nc}); }} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 font-mono text-xs focus:ring-2 focus:ring-indigo-500 h-20" required /></div>
                                <div><label className="block text-xs font-semibold text-slate-600 mb-1">Expected Output</label><textarea value={tc.expectedOutput} onChange={e => { const nc = [...problemForm.testCases]; nc[idx].expectedOutput = e.target.value; setProblemForm({...problemForm, testCases: nc}); }} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 font-mono text-xs focus:ring-2 focus:ring-indigo-500 h-20" required /></div>
                              </div>
                              <label className="mt-3 flex items-center gap-2 cursor-pointer w-max">
                                <input type="checkbox" checked={tc.isHidden} onChange={e => { const nc = [...problemForm.testCases]; nc[idx].isHidden = e.target.checked; setProblemForm({...problemForm, testCases: nc}); }} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                                <span className="text-sm font-medium text-slate-600">Hidden Test Case</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <button type="button" onClick={() => { setShowCreateProblem(false); setEditingProblem(null); resetProblemForm(); }} className="px-6 py-3 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
                        <button type="submit" disabled={loading || problemForm.testCases.length === 0} className="px-6 py-3 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 shadow-md shadow-indigo-600/20">{loading ? 'Saving...' : (editingProblem ? 'Update Problem' : 'Publish Problem')}</button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === 'assignments' && (
              <motion.div key="assignments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">
                      {showSubmissions ? `Grade: ${selectedAssignment?.title}` : showEditForm ? `Edit: ${editingAssignment?.title}` : showCreateAssignment ? 'New Assignment' : 'Class Assignments'}
                    </h2>
                    <p className="text-slate-500">
                      {showSubmissions ? "Review student submissions and provide feedback." : showCreateAssignment || showEditForm ? "Configure your assignment details and select problems." : "Manage homework and exams for your classes."}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {showSubmissions && <button onClick={() => { setShowSubmissions(false); setSelectedAssignment(null); setAssignmentSubmissions([]); }} className="px-4 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium transition">Back</button>}
                    {showEditForm && <button onClick={() => { setShowEditForm(false); setEditingAssignment(null); }} className="px-4 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium transition">Cancel</button>}
                    {!showSubmissions && !showEditForm && !showCreateAssignment && (
                      <button onClick={() => setShowCreateAssignment(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition flex items-center gap-2"><Plus className="w-4 h-4"/> Create</button>
                    )}
                    {(showCreateAssignment && !showSubmissions && !showEditForm) && (
                      <button onClick={() => setShowCreateAssignment(false)} className="px-4 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium transition">Cancel</button>
                    )}
                  </div>
                </div>

                {showSubmissions ? (
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                    {assignmentSubmissions.length === 0 ? (
                      <div className="py-20 text-center text-slate-500">No submissions received yet.</div>
                    ) : (
                      <div className="grid gap-6">
                        {assignmentSubmissions.map(sub => (
                          <div key={sub._id} className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 flex flex-col xl:flex-row gap-6">
                            <div className="flex-1 space-y-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-bold text-lg text-slate-800">{sub.studentId.name}</h3>
                                  <p className="text-sm text-slate-500">{sub.studentId.email}</p>
                                </div>
                                <div className="text-right">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${sub.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : sub.status === 'wrong_answer' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {sub.status === 'accepted' ? <CheckCircle className="w-3.5 h-3.5"/> : sub.status === 'wrong_answer' ? <XCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                    {sub.status.replace('_', ' ')}
                                  </span>
                                  {sub.score !== undefined && <p className="text-sm font-bold text-slate-700 mt-2">Score: {sub.score}/100</p>}
                                </div>
                              </div>
                              <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <p className="text-sm font-semibold text-slate-700 mb-2">Problem: {sub.problemId.title}</p>
                                <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto">
                                  <pre className="text-xs text-blue-300 font-mono"><code>{sub.code.length > 200 ? sub.code.substring(0,200) + '...' : sub.code}</code></pre>
                                </div>
                              </div>
                              {sub.feedback && <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-sm text-indigo-900"><span className="font-bold mr-2">Feedback given:</span>{sub.feedback}</div>}
                            </div>
                            <div className="w-full xl:w-80 flex flex-col gap-3 justify-end border-t xl:border-t-0 xl:border-l border-slate-200 pt-6 xl:pt-0 xl:pl-6">
                              <button onClick={() => { setSelectedSubmission(sub); setShowCodeViewer(true); }} className="w-full bg-slate-800 text-white rounded-xl py-2.5 font-medium flex items-center justify-center gap-2 hover:bg-slate-700 transition"><Eye className="w-4 h-4"/> Review Code</button>

                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (showCreateAssignment || showEditForm) ? (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50">
                    <form onSubmit={showEditForm ? handleUpdateAssignment : handleCreateAssignment} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="block text-sm font-semibold text-slate-700 mb-2">Title <span className="text-red-500">*</span></label><input type="text" value={assignmentForm.title} onChange={e => setAssignmentForm({...assignmentForm, title: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition" required /></div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Class ID <span className="text-xs font-normal text-emerald-600 ml-1">(auto-set from your profile)</span></label>
                          <div className="flex items-center px-4 py-3 rounded-xl border-2 border-emerald-100 bg-emerald-50 text-emerald-800 font-bold tracking-wider">
                            <span className="text-emerald-600 mr-2 text-xs font-black uppercase">Class:</span>{user?.classId || 'Not assigned — contact admin'}
                          </div>
                        </div>
                        <div className="md:col-span-2"><label className="block text-sm font-semibold text-slate-700 mb-2">Description</label><textarea value={assignmentForm.description} onChange={e => setAssignmentForm({...assignmentForm, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition h-20" required /></div>
                        <div><label className="block text-sm font-semibold text-slate-700 mb-2">Due Date *</label><input type="datetime-local" value={assignmentForm.dueDate} onChange={e => setAssignmentForm({...assignmentForm, dueDate: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition" required /></div>
                        <div><label className="block text-sm font-semibold text-slate-700 mb-2">Instructions</label><input type="text" value={assignmentForm.instructions} onChange={e => setAssignmentForm({...assignmentForm, instructions: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition" /></div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-4">Select Problems for Assignment</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-72 overflow-y-auto p-2 border border-slate-200 rounded-2xl bg-slate-50">
                          {problems.length === 0 ? <p className="col-span-full p-4 text-center text-slate-500">No problems available. Create in "My Problems" first.</p> : problems.map(prob => (
                            <label key={prob._id} className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer border-2 transition-all ${assignmentForm.selectedProblems.includes(prob._id) ? 'border-indigo-600 bg-indigo-50 shadow-md shadow-indigo-600/10' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                              <input type="checkbox" checked={assignmentForm.selectedProblems.includes(prob._id)} onChange={() => handleProblemToggle(prob._id)} className="mt-1 w-4 h-4 text-indigo-600 rounded" />
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 truncate">{prob.title}</p>
                                <div className="flex gap-2 mt-1">
                                  <span className="text-[10px] uppercase font-bold text-slate-500">{prob.difficulty}</span>
                                  <span className="text-[10px] uppercase font-bold text-indigo-500">{prob.category}</span>
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                        <p className="text-sm font-medium text-slate-500 mt-2">Selected: <span className="text-indigo-600 font-bold">{assignmentForm.selectedProblems.length}</span> items</p>
                      </div>

                      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <button type="button" onClick={() => { setShowCreateAssignment(false); setShowEditForm(false); }} className="px-6 py-3 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
                        <button type="submit" disabled={loading || assignmentForm.selectedProblems.length === 0} className="px-6 py-3 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50">Save Assignment</button>
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? <div className="col-span-full text-center py-20 text-slate-500">Loading assignments...</div> : assignments.length === 0 ? (
                       <div className="col-span-full py-20 flex flex-col items-center bg-white rounded-3xl border border-dashed border-slate-300">
                        <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-2xl mb-4 text-slate-400"><ClipboardList className="w-8 h-8" /></div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">No active assignments</h3>
                        <p className="text-slate-500 mb-6 text-center max-w-sm">Create an assignment to start tracking student solutions and grading.</p>
                      </div>
                    ) : assignments.map(a => (
                      <motion.div key={a._id} whileHover={{ y: -4 }} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all flex flex-col">
                        <h3 className="font-bold text-xl text-slate-800 mb-2">{a.title}</h3>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{a.description}</p>
                        <div className="space-y-2 mb-6 bg-slate-50 rounded-xl p-3 text-sm">
                          <div className="flex justify-between"><span className="text-slate-500">Class IDs</span><span className="font-semibold text-slate-700">{a.classId}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Problems</span><span className="font-semibold text-indigo-600">{a.problems?.length||0} included</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Due</span><span className="font-semibold text-red-600">{new Date(a.dueDate).toLocaleDateString()}</span></div>
                        </div>
                        <div className="mt-auto grid grid-cols-2 gap-2">
                          <button onClick={() => viewAssignmentSubmissions(a)} className="col-span-2 bg-indigo-50 text-indigo-700 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-100 transition flex items-center justify-center gap-2"><Eye className="w-4 h-4"/> View Submissions</button>
                          <button onClick={() => handleEditAssignment(a)} className="bg-slate-100 text-slate-700 py-2 rounded-xl font-medium text-sm hover:bg-slate-200 transition flex items-center justify-center gap-2">Edit</button>
                          <button onClick={() => handleDeleteAssignment(a._id)} className="bg-red-50 text-red-600 py-2 rounded-xl font-medium text-sm hover:bg-red-100 transition flex items-center justify-center gap-2">Delete</button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-4xl mx-auto space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">Teacher Identity</h2>
                  <p className="text-slate-500">Manage your profile, credentials, and settings.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-slate-100"><User className="w-24 h-24" /></div>
                    <div className="relative">
                      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><User className="w-5 h-5 text-indigo-600"/> Personal Details</h3>
                      {!showEditProfile ? (
                        <div className="space-y-4">
                          <div><p className="text-sm font-medium text-slate-500">Full Name</p><p className="text-lg font-bold text-slate-800">{user?.name || 'N/A'}</p></div>
                          <div><p className="text-sm font-medium text-slate-500">Email Address</p><p className="text-lg font-bold text-slate-800">{user?.email || 'N/A'}</p></div>
                          <button onClick={() => setShowEditProfile(true)} className="mt-4 px-5 py-2 bg-indigo-50 font-medium text-indigo-700 rounded-xl hover:bg-indigo-100 transition">Modify Details</button>
                        </div>
                      ) : (
                        <form onSubmit={handleEditProfile} className="space-y-4">
                          <div><label className="block text-sm font-semibold text-slate-700 mb-1">Name</label><input type="text" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500" required /></div>
                          <div><label className="block text-sm font-semibold text-slate-700 mb-1">Email</label><input type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500" required /></div>
                          <div className="flex gap-2 pt-2">
                            <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-medium hover:bg-indigo-700 transition">Save</button>
                            <button type="button" onClick={() => setShowEditProfile(false)} className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-xl font-medium hover:bg-slate-200 transition">Cancel</button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Edit2 className="w-5 h-5 text-indigo-600"/> Security</h3>
                    {!showChangePassword ? (
                      <div className="pt-4">
                        <p className="text-slate-600 mb-6">Keep your account secure by resetting your password regularly.</p>
                        <button onClick={() => setShowChangePassword(true)} className="px-5 py-2.5 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-900 transition">Update Password</button>
                      </div>
                    ) : (
                      <form onSubmit={handleChangePassword} className="space-y-4">
                         <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-300 mb-4 text-center">
                            <p className="text-sm text-slate-500">Provide your current secret and a new one to update your credentials.</p>
                         </div>
                         <div className="space-y-4">
                           <input type="password" placeholder="Current Password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" required />
                           <input type="password" placeholder="New Password" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" minLength="6" required />
                           <input type="password" placeholder="Confirm New Password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" minLength="6" required />
                         </div>
                         <div className="flex gap-2 pt-4">
                           <button type="submit" disabled={loading} className="flex-1 bg-slate-800 text-white pt-3 pb-3 rounded-xl font-bold hover:bg-slate-900 transition shadow-lg">
                             {loading ? 'PROCESSING...' : 'CONFIRM UPDATE'}
                           </button>
                           <button type="button" onClick={() => {setShowChangePassword(false); setOtpSent(false);}} className="flex-1 bg-slate-100 text-slate-700 pt-3 pb-3 rounded-xl font-bold hover:bg-slate-200 transition">CANCEL</button>
                         </div>
                       </form>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Code Viewer Modal */}
      <AnimatePresence>
        {showCodeViewer && selectedSubmission && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 shrink-0">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-200">
              <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50 shrink-0">
                <div><h3 className="text-lg font-bold text-slate-800">Code Submission</h3><p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{selectedSubmission.studentId.name} • {selectedSubmission.problemId.title}</p></div>
                <button onClick={() => { setShowCodeViewer(false); setSelectedSubmission(null); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
                <div className="w-full lg:w-1/3 border-r border-slate-100 p-6 overflow-y-auto space-y-6 shrink-0 bg-slate-50/50">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Submission Details</h4>
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 shadow-sm">
                      <div className="flex justify-between"><span className="text-sm text-slate-500">Language</span><span className="text-sm font-bold text-indigo-600">{selectedSubmission.language}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-slate-500">Status</span><span className={`text-sm font-bold capitalize ${selectedSubmission.status==='accepted'?'text-emerald-600':'text-red-500'}`}>{selectedSubmission.status.replace('_',' ')}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-slate-500">Time</span><span className="text-sm font-medium text-slate-700">{new Date(selectedSubmission.submittedAt).toLocaleString()}</span></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Problem Requirements</h4>
                    <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                      <h5 className="font-bold text-amber-900 mb-2">{selectedSubmission.problemId.title}</h5>
                      <p className="text-xs text-amber-800 leading-relaxed mb-4">{selectedSubmission.problemId.description}</p>
                      {selectedSubmission.problemId.sampleInput && (
                        <div><p className="text-[10px] font-bold uppercase text-amber-700 mb-1">Sample Input</p><pre className="bg-white/60 p-2 rounded block text-xs font-mono border border-amber-200/50 mb-3">{selectedSubmission.problemId.sampleInput}</pre></div>
                      )}
                      {selectedSubmission.problemId.sampleOutput && (
                        <div><p className="text-[10px] font-bold uppercase text-amber-700 mb-1">Sample Output</p><pre className="bg-white/60 p-2 rounded block text-xs font-mono border border-amber-200/50">{selectedSubmission.problemId.sampleOutput}</pre></div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-h-0 relative">
                  <MonacoCodeEditor onSubmit={executeSubmissionCode} isSubmitting={false} problem={selectedSubmission.problemId} assignment={null} initialCode={selectedSubmission.code} readOnly={true} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeacherDashboard;
