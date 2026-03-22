import useAuthStore from '../stores/authStore';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, BookOpen, User, Menu, X, LogOut,
  Plus, Edit2, Trash2, ShieldCheck, UserPlus, Search, Filter,
  CheckCircle, XCircle, Clock, Settings, ArrowRight, Activity, Cpu, Globe,
  Lock, Unlock
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, getAuthHeaders, API_BASE_URL, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [problems, setProblems] = useState([]);
  const [users, setUsers] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    classId: '',
    isActive: true,
    profile: {}
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: ''
  });
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    profile: {}
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'easy',
    category: '',
    tags: [],
    timeLimit: 1000,
    memoryLimit: 256,
    sampleInput: '',
    sampleOutput: '',
    constraints: '',
    hints: [],
    testCases: [{ input: '', expectedOutput: '', isHidden: false }]
  });


  const navigation = [
    { id: 'overview', name: 'System Overview', icon: LayoutDashboard },
    { id: 'users', name: 'User Management', icon: Users },
    { id: 'problems', name: 'Problem Management', icon: BookOpen },
    { id: 'profile', name: 'Admin Profile', icon: User }
  ];

  
  useEffect(() => {
    if (activeTab === 'problems') {
      loadProblems();
    } else if (activeTab === 'users') {
      loadUsers();
      loadUserStats();
    } else if (activeTab === 'profile') {
      loadUserStats(); 
    }
  }, [activeTab]);

  const apiCall = async (endpoint, options = {}) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { ...(options.body && { 'Content-Type': 'application/json' }), ...getAuthHeaders(), ...options.headers }
    });
    if (!res.ok) throw await res.json().catch(() => ({ message: 'API Error' }));
    return res.json();
  };

  const loadProblems = async () => { setLoading(true); try { const d = await apiCall('/problems'); setProblems(d.problems || []); } catch (e) { console.error(e); } finally { setLoading(false); } };
  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter) params.append('role', roleFilter);
      const d = await apiCall(`/users?${params.toString()}`);
      setUsers(d.users || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadUserStats = async () => { try { setUserStats(await apiCall('/users/stats')); } catch (e) { console.error(e); } };
  const loadAdminStats = async () => { try {  } catch (e) { console.error(e); } };

  const handleCreateProblem = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setLoading(true);
    try {
      await apiCall('/problems', { method: 'POST', body: JSON.stringify(formData) });
      setShowCreateForm(false); resetForm(); loadProblems(); alert('Problem created successfully!');
    } catch (e) { alert(e.message || 'Failed to create problem'); } finally { setLoading(false); }
  };

  const handleUpdateProblem = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setLoading(true);
    try {
      await apiCall(`/problems/${editingProblem._id}`, { method: 'PUT', body: JSON.stringify(formData) });
      setEditingProblem(null); resetForm(); loadProblems(); alert('Problem updated successfully!');
    } catch (e) { alert(e.message || 'Failed to update problem'); } finally { setLoading(false); }
  };

  const handleDeleteProblem = async (id) => {
    if (!confirm('Are you sure?')) return;
    try { await apiCall(`/problems/${id}`, { method: 'DELETE' }); loadProblems(); alert('Deleted!'); } catch (e) { alert(e.message || 'Failed'); }
  };

  const startEdit = async (p) => {
    try {
      const full = await apiCall(`/problems/${p._id}/admin`);
      setFormData({ ...full, testCases: full.testCases || [{ input: '', expectedOutput: '', isHidden: false }] });
      setEditingProblem(full); setShowCreateForm(true);
    } catch (e) { alert('Failed to load problem'); }
  };

  const handleCreateUser = async () => {
    try {
      await apiCall('/users', { method: 'POST', body: JSON.stringify(userFormData) });
      setShowUserForm(false); resetUserForm(); loadUsers(); loadUserStats(); alert('User created!');
    } catch (e) { alert(e.message || 'Failed'); }
  };

  const handleUpdateUser = async () => {
    try {
      const updateData = { ...userFormData }; delete updateData.password;
      await apiCall(`/users/${editingUser._id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      setEditingUser(null); resetUserForm(); loadUsers(); alert('User updated!');
    } catch (e) { alert(e.message || 'Failed'); }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Are you sure?')) return;
    try { await apiCall(`/users/${id}`, { method: 'DELETE' }); loadUsers(); loadUserStats(); alert('Deleted!'); } catch (e) { alert(e.message || 'Failed'); }
  };

  const handleToggleUserStatus = async (id, status) => {
    try {
      await apiCall(`/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ isActive: !status }) });
      loadUsers(); loadUserStats(); alert('Status updated!');
    } catch (e) { alert(e.message || 'Failed'); }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) return alert('Passwords mismatch');
    
    setLoading(true);
    try {
      await apiCall('/auth/update-password-direct', { 
        method: 'PUT', 
        body: JSON.stringify({ 
          currentPassword: passwordData.currentPassword, 
          newPassword: passwordData.newPassword 
        }) 
      });
      setShowPasswordChange(false); 
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' });
      alert('Password updated successfully!');
    } catch (e) { alert(e.message || 'Failed to update password'); } finally { setLoading(false); }
  };

  const handleProfileUpdate = async () => {
    try {
      await apiCall('/auth/profile', { method: 'PUT', body: JSON.stringify(profileData) });
      alert('Profile updated!'); setShowEditProfile(false); window.location.reload();
    } catch (e) { alert(e.message || 'Failed'); }
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const startEditUser = (u) => {
    setUserFormData({ name: u.name, email: u.email, password: '', role: u.role, classId: u.classId || '', isActive: u.isActive, profile: u.profile || {} });
    setEditingUser(u); setShowUserForm(true);
  };

  const addTestCase = () => setFormData(p => ({ ...p, testCases: [...p.testCases, { input: '', expectedOutput: '', isHidden: false }] }));
  const removeTestCase = (i) => setFormData(p => ({ ...p, testCases: p.testCases.filter((_, idx) => idx !== i) }));
  const updateTestCase = (i, f, v) => setFormData(p => ({ ...p, testCases: p.testCases.map((tc, idx) => idx === i ? { ...tc, [f]: v } : tc) }));

  const resetForm = () => { setFormData({ title: '', description: '', difficulty: 'easy', category: '', tags: [], timeLimit: 1000, memoryLimit: 256, sampleInput: '', sampleOutput: '', constraints: '', hints: [], testCases: [{ input: '', expectedOutput: '', isHidden: false }] }); setEditingProblem(null); setShowCreateForm(false); };
  const resetUserForm = () => { setUserFormData({ name: '', email: '', password: '', role: 'student', classId: '', isActive: true, profile: {} }); setEditingUser(null); setShowUserForm(false); };

  const renderOverview = () => (
<motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[ 
          { label: 'Total Users', value: userStats?.totalUsers || 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', iconBg: 'bg-indigo-100' },
          { label: 'Active Sessions', value: userStats?.activeUsers || 0, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50', iconBg: 'bg-emerald-100' },
          { label: 'System Problems', value: problems.length, icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50', iconBg: 'bg-amber-100' }
        ].map((stat, i) => (
          <motion.div key={i} whileHover={{ y: -4 }} className={`${stat.bg} rounded-3xl p-8 border border-white shadow-xl shadow-slate-200/50 flex items-center gap-6 transition-transform`}>
            <div className={`p-5 rounded-2xl ${stat.iconBg}`}>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className={`text-4xl font-black mt-1 ${stat.color} tracking-tighter`}>{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderUsers = () => (
    <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">User Management</h2>
          <p className="text-slate-500">Search and organize all students, teachers, and administrators.</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowUserForm(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Add New User
        </motion.button>
      </div>

      {}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
           <input
             type="text"
             placeholder="Search by name or email..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition"
           />
        </div>
        <div className="flex gap-4">
           <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none text-slate-600 text-sm font-medium"
              >
                <option value="">All Roles</option>
                <option value="student">Students</option>
                <option value="teacher">Teachers</option>
                <option value="admin">Admins</option>
              </select>
           </div>
           <button onClick={loadUsers} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition">Apply Filters</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-indigo-600"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">User Details</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Role</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Class ID</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map(u => (
                  <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-sm">
                           {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{u.name}</p>
                          <p className="text-xs text-slate-500 font-medium">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                        u.role === 'teacher' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-700">{u.classId || 'SYSTEM'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <div className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></div>
                        <span className={u.isActive ? 'text-emerald-600' : 'text-rose-600'}>{u.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEditUser(u)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Edit User"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => handleToggleUserStatus(u._id, u.isActive)} className={`p-2 rounded-lg transition ${u.isActive ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={u.isActive ? 'Deactivate' : 'Activate'}>
                           {u.isActive ? <XCircle className="w-4 h-4"/> : <CheckCircle className="w-4 h-4"/>}
                        </button>
                        <button onClick={() => handleDeleteUser(u._id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Delete User"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderProblems = () => (
    <motion.div key="problems" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-6xl mx-auto">
      {!showCreateForm ? (
        <>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Global Repository</h2>
              <p className="text-slate-500">Manage all coding problems available on the platform.</p>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowCreateForm(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create New Problem
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {problems.map(problem => (
              <motion.div key={problem._id} className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 transition-shadow">
                <h3 className="font-bold text-lg text-slate-800 mb-2 truncate">{problem.title}</h3>
                <div className="flex items-center gap-2 mb-6 text-xs font-black uppercase tracking-widest">
                  <span className={`px-2.5 py-1 rounded-lg ${problem.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' : problem.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{problem.difficulty}</span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">{problem.category}</span>
                </div>
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button onClick={() => startEdit(problem)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition"><Edit2 className="w-4 h-4"/> Edit</button>
                  <button onClick={() => handleDeleteProblem(problem._id)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"><Trash2 className="w-4 h-4"/> Delete</button>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-2xl">
           <div className="flex justify-between items-start mb-12">
              <div>
                 <h3 className="text-3xl font-black text-slate-800 tracking-tight">{editingProblem ? 'Logic Refinement' : 'Bootstrap New Scenario'}</h3>
                 <p className="text-slate-500 mt-2">Configure problem constraints, description and automated test vectors.</p>
              </div>
              <button onClick={resetForm} className="p-3 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition"><X className="w-6 h-6"/></button>
           </div>
           
           <form onSubmit={editingProblem ? handleUpdateProblem : handleCreateProblem} className="space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                 <div className="lg:col-span-2 space-y-8">
                    <div className="space-y-3">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Problem Title</label>
                       <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition text-lg font-bold" placeholder="Two Sum II" required />
                    </div>
                    <div className="space-y-3">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Problem Manifest</label>
                       <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition h-64 resize-none leading-relaxed" placeholder="Detailed problem specs..." required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-3">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Sample Input</label>
                          <textarea value={formData.sampleInput} onChange={e => setFormData({...formData, sampleInput: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-mono text-xs h-24" placeholder="Input format..." />
                       </div>
                       <div className="space-y-3">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Sample Output</label>
                          <textarea value={formData.sampleOutput} onChange={e => setFormData({...formData, sampleOutput: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-mono text-xs h-24" placeholder="Expected output..." />
                       </div>
                    </div>
                 </div>
                 <div className="space-y-8">
                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 space-y-8">
                       <div className="space-y-3">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Complexity Class</label>
                          <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})} className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 font-black appearance-none uppercase text-[10px] tracking-widest">
                             <option value="easy">Easy (Linear)</option><option value="medium">Medium (Polynom)</option><option value="hard">Hard (Exp)</option>
                          </select>
                       </div>
                       <div className="space-y-3">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Algorithm Category</label>
                          <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm" required>
                             <option value="">Select...</option>
                             <option value="Array">Array</option><option value="String">String</option><option value="Linked List">Linked List</option><option value="Tree">Tree</option><option value="DP">Dynamic Programming</option><option value="Graph">Graph</option><option value="Math">Math</option><option value="Sorting">Sorting</option>
                          </select>
                       </div>
                       <div className="grid grid-cols-1 gap-6">
                          <div className="space-y-3">
                             <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Execution Timeout (ms)</label>
                             <input type="number" value={formData.timeLimit} onChange={e => setFormData({...formData, timeLimit: e.target.value})} className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-black text-sm" />
                          </div>
                          <div className="space-y-3">
                             <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Memory Perimeter (MB)</label>
                             <input type="number" value={formData.memoryLimit} onChange={e => setFormData({...formData, memoryLimit: e.target.value})} className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-black text-sm" />
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
                 <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full"></div>
                 <div className="flex justify-between items-center mb-8 relative">
                    <h4 className="text-xl font-black text-white">Test Vector Engine</h4>
                    <button type="button" onClick={addTestCase} className="px-6 py-3 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition shadow-xl shadow-white/10 flex items-center gap-2"><Plus className="w-4 h-4"/> ADD VECTOR</button>
                 </div>
                 <div className="space-y-6 relative">
                    {formData.testCases.map((tc, idx) => (
                       <div key={idx} className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-sm relative group">
                          {formData.testCases.length > 1 && <button type="button" onClick={() => removeTestCase(idx)} className="absolute right-4 top-4 p-2 text-rose-400 hover:text-rose-300 transition"><Trash2 className="w-5 h-5"/></button>}
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">VECTOR #{idx+1}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-2"><label className="text-[10px] font-black text-slate-600 uppercase">Input Payload</label><textarea value={tc.input} onChange={e => updateTestCase(idx, 'input', e.target.value)} className="w-full p-4 bg-white/5 border border-white/10 rounded-xl font-mono text-xs h-24 text-blue-100 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500 transition" required /></div>
                             <div className="space-y-2"><label className="text-[10px] font-black text-slate-600 uppercase">Expected Result</label><textarea value={tc.expectedOutput} onChange={e => updateTestCase(idx, 'expectedOutput', e.target.value)} className="w-full p-4 bg-white/5 border border-white/10 rounded-xl font-mono text-xs h-24 text-emerald-100 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500 transition" required /></div>
                          </div>
                          <label className="mt-6 flex items-center gap-3 cursor-pointer w-max">
                             <div className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-1 ${tc.isHidden ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                                <input type="checkbox" checked={tc.isHidden} onChange={e => updateTestCase(idx, 'isHidden', e.target.checked)} className="hidden" />
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${tc.isHidden ? 'translate-x-4' : 'translate-x-0'}`}></div>
                             </div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stealth Vector (Hidden from public)</span>
                          </label>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="flex gap-4 pt-10 border-t border-slate-100">
                 <button type="submit" className="px-12 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm hover:bg-indigo-700 transition shadow-2xl shadow-indigo-600/40 uppercase tracking-widest">{editingProblem ? 'COMMIT LOGIC' : 'PUBLISH ENGINE'}</button>
                 <button type="button" onClick={resetForm} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black text-sm hover:bg-slate-200 transition uppercase tracking-widest">ABORT</button>
              </div>
           </form>
        </motion.div>
      )}
    </motion.div>
  );

  const renderProfile = () => (
    <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Administrator Identity</h2>
        <p className="text-slate-500">Manage your administrative credentials and security settings.</p>
      </div>
      
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 text-slate-50"><ShieldCheck className="w-32 h-32 opacity-20" /></div>
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white flex items-center justify-center text-3xl font-black mb-8 shadow-xl shadow-indigo-600/20">
             {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Full Name</p>
              <p className="text-xl font-bold text-slate-800">{user?.name || 'Admin User'}</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Primary Email</p>
              <p className="text-xl font-bold text-slate-800">{user?.email || 'admin@rgukt.ac.in'}</p>
            </div>
          </div>
          <div className="flex gap-4">
             <button onClick={() => setShowEditProfile(true)} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition shadow-lg shadow-slate-900/20">Edit Details</button>
             <button onClick={() => setShowPasswordChange(true)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-bold text-sm hover:bg-slate-50 transition">Reset Password</button>
          </div>
        </div>
      </div>
      
      {}
    </motion.div>
  );

  const openEditProfile = () => {
    setProfileData({
      name: user?.name || '',
      email: user?.email || '',
      profile: {
        totalStudents: userStats?.totalUsers || ''
      }
    });
    setShowEditProfile(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <motion.aside initial={false} animate={{ width: sidebarOpen ? '280px' : '80px' }} className="bg-slate-900 text-white min-h-screen flex flex-col shrink-0 sticky top-0 transition-all z-40 shadow-2xl">
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
          {sidebarOpen && <span className="text-lg font-black tracking-tighter bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">RGUKT ADMIN</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/10 rounded-xl transition-colors ml-auto text-slate-400">
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 py-8 px-4 space-y-2">
          {navigation.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setShowCreateForm(false); setShowUserForm(false); }} className={`w-full flex items-center p-3.5 rounded-2xl transition-all duration-300 group ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 translate-x-1' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <item.icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-white' : 'text-slate-500'}`} />
              {sidebarOpen && <span className="ml-4 font-bold text-sm tracking-wide">{item.name}</span>}
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

      {}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shrink-0 sticky top-0 z-30 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-slate-800 capitalize">
            {navigation.find(n => n.id === activeTab)?.name}
          </h1>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-sm font-medium text-slate-600 hidden sm:block">Admin: <span className="text-indigo-600 font-bold">{user?.name}</span></div>
            <button onClick={() => setSidebarOpen(true)} className="p-2 bg-slate-100 lg:hidden rounded-lg text-slate-600"><Menu className="w-5 h-5"/></button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 relative">
          <AnimatePresence mode='wait'>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'problems' && renderProblems()}
            {activeTab === 'profile' && renderProfile()}
          </AnimatePresence>
        </div>
      </main>

      {}
      <AnimatePresence>
        {showUserForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-white/20">
              <div className="p-8 pb-0 flex justify-between items-start">
                 <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingUser ? 'Update Profile' : 'Access Provisioning'}</h3>
                    <p className="text-slate-500 text-sm mt-1">{editingUser ? 'Modify existing user credentials.' : 'Create a new secure system account.'}</p>
                 </div>
                 <button onClick={resetUserForm} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-8 space-y-5">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Full Identity</label>
                   <input type="text" value={userFormData.name} onChange={(e) => setUserFormData(p => ({ ...p, name: e.target.value }))} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition" placeholder="John Doe" required />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Auth Email</label>
                   <input type="email" value={userFormData.email} onChange={(e) => setUserFormData(p => ({ ...p, email: e.target.value }))} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition" placeholder="user@rgukt.ac.in" required />
                </div>
                {!editingUser && (
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Master Password</label>
                     <input type="password" value={userFormData.password} onChange={(e) => setUserFormData(p => ({ ...p, password: e.target.value }))} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition" placeholder="••••••••" required />
                  </div>
                )}
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Privilege Tier</label>
                   <select value={userFormData.role} onChange={(e) => setUserFormData(p => ({ ...p, role: e.target.value }))} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition appearance-none">
                     <option value="student">Student</option>
                     <option value="teacher">Teacher</option>
                     <option value="admin">Administrator</option>
                   </select>
                </div>
                {(userFormData.role === 'student' || userFormData.role === 'teacher') && (
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Class Identifier <span className="text-red-400">*</span> {userFormData.role === 'teacher' && <span className="text-amber-500 normal-case font-normal text-[9px]">(Required — teacher can only assign to this class)</span>}</label>
                     <input type="text" value={userFormData.classId} onChange={(e) => setUserFormData(p => ({ ...p, classId: e.target.value }))} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition" placeholder="e.g. CS-2024" required />
                  </div>
                )}
                <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition">
                   <input type="checkbox" checked={userFormData.isActive} onChange={(e) => setUserFormData(p => ({ ...p, isActive: e.target.checked }))} className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500/20 border-slate-200" />
                   <div>
                      <p className="text-sm font-bold text-slate-700 leading-tight">Authorize Account</p>
                      <p className="text-[10px] text-slate-500 font-medium">Permit system-wide authentication for this identity.</p>
                   </div>
                </label>
                <div className="flex gap-3 pt-4">
                  <button onClick={editingUser ? handleUpdateUser : handleCreateUser} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-600/30">CONFIRM ACTION</button>
                  <button onClick={resetUserForm} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition">ABORT</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {showPasswordChange && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-10 ring-1 ring-white/20">
               <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-8 flex items-center gap-3"><ShieldCheck className="w-8 h-8 text-indigo-600"/> Update Security</h3>
               <div className="space-y-6">
                 <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-300 mb-6">
                   <p className="text-sm text-slate-500 text-center">Enter your current credentials and a new secure password.</p>
                 </div>
                 <div className="space-y-4">
                   <input type="password" placeholder="Current Password" value={passwordData.currentPassword} onChange={(e) => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))} className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 transition outline-none" required />
                   <input type="password" placeholder="New Password" value={passwordData.newPassword} onChange={(e) => setPasswordData(p => ({ ...p, newPassword: e.target.value }))} className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 transition outline-none" required />
                   <input type="password" placeholder="Confirm New Password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))} className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 transition outline-none" required />
                 </div>
               </div>
               <div className="flex gap-4 mt-10">
                 <button onClick={handlePasswordChange} disabled={loading} className={`flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition shadow-xl shadow-slate-900/20 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                   {loading ? 'COMMITING...' : 'UPDATE PASSWORD'}
                 </button>
                 <button onClick={() => {setShowPasswordChange(false); setOtpSent(false);}} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition">CANCEL</button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {showEditProfile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-10">
               <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-8">Update Core Profile</h3>
               <div className="space-y-6">
                  <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Display Name</label><input type="text" value={profileData.name} onChange={(e) => setProfileData(p => ({ ...p, name: e.target.value }))} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 transition" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Communication Email</label><input type="email" value={profileData.email} onChange={(e) => setProfileData(p => ({ ...p, email: e.target.value }))} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 transition" /></div>
                  <div className="flex gap-4 mt-10">
                    <button onClick={handleProfileUpdate} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-600/30">UPDATE</button>
                    <button onClick={() => setShowEditProfile(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition">CANCEL</button>
                  </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;