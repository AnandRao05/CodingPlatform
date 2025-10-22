import useAuthStore from '../stores/authStore';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TeacherDashboard = () => {
  const { user, logout, getAuthHeaders, API_BASE_URL } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [assignments, setAssignments] = useState([]);
  const [problems, setProblems] = useState([]);
  const [myProblems, setMyProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    classId: '',
    dueDate: '',
    instructions: '',
    selectedProblems: []
  });
  const [problemForm, setProblemForm] = useState({
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
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showCreateProblem, setShowCreateProblem] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [overviewStats, setOverviewStats] = useState({
    totalStudents: 0,
    problemsCreated: 0,
    activeAssignments: 0
  });

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverviewStats();
    } else if (activeTab === 'assignments') {
      loadAssignments();
      loadProblems();
    } else if (activeTab === 'problems') {
      loadMyProblems();
    } else if (activeTab === 'profile') {
      // Initialize profile form with current user data
      setProfileForm({
        name: user?.name || '',
        email: user?.email || ''
      });
    }
  }, [activeTab, user]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/assignments/teacher`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error('Failed to load assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProblems = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/problems`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setProblems(data.problems || []);
      }
    } catch (error) {
      console.error('Failed to load problems:', error);
    }
  };

  const loadMyProblems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/problems/teacher/my-problems`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setMyProblems(data.problems || []);
      }
    } catch (error) {
      console.error('Failed to load my problems:', error);
      alert('Failed to load problems. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const problemsData = assignmentForm.selectedProblems.map(problemId => ({
        problemId,
        order: 0
      }));

      const response = await fetch(`${API_BASE_URL}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          title: assignmentForm.title,
          description: assignmentForm.description,
          problems: problemsData,
          classId: assignmentForm.classId,
          dueDate: assignmentForm.dueDate,
          instructions: assignmentForm.instructions,
          totalPoints: 100
        })
      });

      if (response.ok) {
        setShowCreateAssignment(false);
        setAssignmentForm({
          title: '',
          description: '',
          classId: '',
          dueDate: '',
          instructions: '',
          selectedProblems: []
        });
        loadAssignments();
        alert('Assignment created successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create assignment');
      }
    } catch (error) {
      console.error('Create assignment error:', error);
      alert('Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleProblemToggle = (problemId) => {
    setAssignmentForm(prev => ({
      ...prev,
      selectedProblems: prev.selectedProblems.includes(problemId)
        ? prev.selectedProblems.filter(id => id !== problemId)
        : [...prev.selectedProblems, problemId]
    }));
  };

  const viewAssignmentSubmissions = async (assignment) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/assignments/${assignment._id}/submissions/teacher`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedAssignment(data.assignment);
        setAssignmentSubmissions(data.submissions);
        setShowSubmissions(true);
        setActiveTab('assignments');
      }
    } catch (error) {
      console.error('Failed to load submissions:', error);
      alert('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = async (submissionId, score, feedback) => {
    try {
      const response = await fetch(`${API_BASE_URL}/assignments/submissions/${submissionId}/grade`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ score: parseInt(score), feedback })
      });

      if (response.ok) {
        // Refresh submissions
        const currentAssignment = selectedAssignment;
        if (currentAssignment) {
          await viewAssignmentSubmissions(currentAssignment);
        }
        alert('Submission graded successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to grade submission');
      }
    } catch (error) {
      console.error('Grade submission error:', error);
      alert('Failed to grade submission');
    }
  };

  const handleEditAssignment = async (assignment) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/assignments/${assignment._id}/edit`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const assignmentData = await response.json();
        setEditingAssignment(assignmentData);
        setAssignmentForm({
          title: assignmentData.title,
          description: assignmentData.description,
          classId: assignmentData.classId,
          dueDate: new Date(assignmentData.dueDate).toISOString().slice(0, 16),
          instructions: assignmentData.instructions || '',
          selectedProblems: assignmentData.problems.map(p => p.problemId._id)
        });
        setShowEditForm(true);
        setActiveTab('assignments');
      }
    } catch (error) {
      console.error('Failed to load assignment for editing:', error);
      alert('Failed to load assignment for editing');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAssignment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const problemsData = assignmentForm.selectedProblems.map(problemId => ({
        problemId,
        order: 0
      }));

      const response = await fetch(`${API_BASE_URL}/assignments/${editingAssignment._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          title: assignmentForm.title,
          description: assignmentForm.description,
          problems: problemsData,
          classId: assignmentForm.classId,
          dueDate: assignmentForm.dueDate,
          instructions: assignmentForm.instructions,
          totalPoints: 100
        })
      });

      if (response.ok) {
        setShowEditForm(false);
        setEditingAssignment(null);
        setAssignmentForm({
          title: '',
          description: '',
          classId: '',
          dueDate: '',
          instructions: '',
          selectedProblems: []
        });
        loadAssignments();
        alert('Assignment updated successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update assignment');
      }
    } catch (error) {
      console.error('Update assignment error:', error);
      alert('Failed to update assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        loadAssignments();
        alert('Assignment deleted successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete assignment');
      }
    } catch (error) {
      console.error('Delete assignment error:', error);
      alert('Failed to delete assignment');
    }
  };

  const handleCreateProblem = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/problems`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(problemForm)
      });

      if (response.ok) {
        setShowCreateProblem(false);
        resetProblemForm();
        loadMyProblems();
        alert('Problem created successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create problem');
      }
    } catch (error) {
      console.error('Create problem error:', error);
      alert('Failed to create problem. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProblem = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/problems/${editingProblem._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(problemForm)
      });

      if (response.ok) {
        setShowCreateProblem(false);
        setEditingProblem(null);
        resetProblemForm();
        loadMyProblems();
        alert('Problem updated successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update problem');
      }
    } catch (error) {
      console.error('Update problem error:', error);
      alert('Failed to update problem. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProblem = async (problemId) => {
    if (!confirm('Are you sure you want to delete this problem? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/problems/${problemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        loadMyProblems();
        alert('Problem deleted successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete problem');
      }
    } catch (error) {
      console.error('Delete problem error:', error);
      alert('Failed to delete problem. Please try again.');
    }
  };

  const startEditProblem = async (problem) => {
    try {
      const response = await fetch(`${API_BASE_URL}/problems/${problem._id}/admin`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const fullProblem = await response.json();
        setProblemForm({
          title: fullProblem.title,
          description: fullProblem.description,
          difficulty: fullProblem.difficulty,
          category: fullProblem.category,
          tags: fullProblem.tags || [],
          timeLimit: fullProblem.timeLimit,
          memoryLimit: fullProblem.memoryLimit,
          sampleInput: fullProblem.sampleInput || '',
          sampleOutput: fullProblem.sampleOutput || '',
          constraints: fullProblem.constraints || '',
          hints: fullProblem.hints || [],
          testCases: fullProblem.testCases || [{ input: '', expectedOutput: '', isHidden: false }]
        });
        setEditingProblem(fullProblem);
        setShowCreateProblem(true);
        setActiveTab('problems');
      }
    } catch (error) {
      console.error('Failed to load problem for editing:', error);
      alert('Failed to load problem details. Please try again.');
    }
  };

  const resetProblemForm = () => {
    setProblemForm({
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
  };

  const loadOverviewStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/teacher/overview`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setOverviewStats(data);
      }
    } catch (error) {
      console.error('Failed to load overview stats:', error);
    }
  };

  const addTestCase = () => {
    setProblemForm(prev => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', expectedOutput: '', isHidden: false }]
    }));
  };

  const removeTestCase = (index) => {
    setProblemForm(prev => ({
      ...prev,
      testCases: prev.testCases.filter((_, i) => i !== index)
    }));
  };

  const updateTestCase = (index, field, value) => {
    setProblemForm(prev => ({
      ...prev,
      testCases: prev.testCases.map((tc, i) =>
        i === index ? { ...tc, [field]: value } : tc
      )
    }));
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          name: profileForm.name,
          email: profileForm.email
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Update user in auth store
        useAuthStore.setState({ user: data.user });
        setShowEditProfile(false);
        alert('Profile updated successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert('New password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      if (response.ok) {
        setShowChangePassword(false);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        alert('Password changed successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      alert('Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'problems', label: 'My Problems' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'profile', label: 'Profile' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome, {user?.name || 'Teacher'}!</p>
          </div>
        </div>

        <div className="mb-6">
          <nav className="flex space-x-1 bg-white p-1 rounded-lg shadow">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Teaching Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800">Total Students</h3>
                  <p className="text-2xl font-bold text-blue-600">{overviewStats.totalStudents}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800">Problems Created</h3>
                  <p className="text-2xl font-bold text-green-600">{overviewStats.problemsCreated}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-yellow-800">Active Assignments</h3>
                  <p className="text-2xl font-bold text-yellow-600">{overviewStats.activeAssignments}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'problems' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">My Problems</h2>
                <button
                  onClick={() => setShowCreateProblem(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Create Problem
                </button>
              </div>

              {showCreateProblem && (
                <div className="bg-gray-50 p-6 rounded-lg mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">
                      {editingProblem ? 'Edit Problem' : 'Create New Problem'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowCreateProblem(false);
                        setEditingProblem(null);
                        resetProblemForm();
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={editingProblem ? handleUpdateProblem : handleCreateProblem} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Problem Title *</label>
                        <input
                          type="text"
                          value={problemForm.title}
                          onChange={(e) => setProblemForm(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter problem title"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Difficulty *</label>
                        <select
                          value={problemForm.difficulty}
                          onChange={(e) => setProblemForm(prev => ({ ...prev, difficulty: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Category *</label>
                      <select
                        value={problemForm.category}
                        onChange={(e) => setProblemForm(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Category</option>
                        <option value="Array">Array</option>
                        <option value="String">String</option>
                        <option value="Linked List">Linked List</option>
                        <option value="Tree">Tree</option>
                        <option value="Dynamic Programming">Dynamic Programming</option>
                        <option value="Graph">Graph</option>
                        <option value="Backtracking">Backtracking</option>
                        <option value="Greedy">Greedy</option>
                        <option value="Bit Manipulation">Bit Manipulation</option>
                        <option value="Math">Math</option>
                        <option value="Sorting">Sorting</option>
                        <option value="Searching">Searching</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Problem Description *</label>
                      <textarea
                        value={problemForm.description}
                        onChange={(e) => setProblemForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                        placeholder="Describe the problem..."
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Sample Input</label>
                        <textarea
                          value={problemForm.sampleInput}
                          onChange={(e) => setProblemForm(prev => ({ ...prev, sampleInput: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 font-mono text-sm"
                          placeholder="Example input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Sample Output</label>
                        <textarea
                          value={problemForm.sampleOutput}
                          onChange={(e) => setProblemForm(prev => ({ ...prev, sampleOutput: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 font-mono text-sm"
                          placeholder="Example output"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Constraints</label>
                      <textarea
                        value={problemForm.constraints}
                        onChange={(e) => setProblemForm(prev => ({ ...prev, constraints: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                        placeholder="Time/space constraints..."
                      />
                    </div>

                    <div>
                      <h4 className="text-lg font-medium mb-3">Test Cases *</h4>
                      {problemForm.testCases.map((testCase, index) => (
                        <div key={index} className="border rounded-lg p-4 mb-4">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-medium">Test Case {index + 1}</span>
                            {problemForm.testCases.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTestCase(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">Input</label>
                              <textarea
                                value={testCase.input}
                                onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg font-mono text-sm h-20"
                                placeholder="Test input..."
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Expected Output</label>
                              <textarea
                                value={testCase.expectedOutput}
                                onChange={(e) => updateTestCase(index, 'expectedOutput', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg font-mono text-sm h-20"
                                placeholder="Expected output..."
                                required
                              />
                            </div>
                          </div>
                          <div className="mt-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={testCase.isHidden}
                                onChange={(e) => updateTestCase(index, 'isHidden', e.target.checked)}
                                className="mr-2"
                              />
                              <span className="text-sm">Hidden test case</span>
                            </label>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addTestCase}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mb-4"
                      >
                        Add Test Case
                      </button>
                    </div>

                    <div className="flex justify-end space-x-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateProblem(false);
                          setEditingProblem(null);
                          resetProblemForm();
                        }}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading || problemForm.testCases.length === 0}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
                      >
                        {loading ? (editingProblem ? 'Updating...' : 'Creating...') : (editingProblem ? 'Update Problem' : 'Create Problem')}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="mb-4">
                <input type="text" placeholder="Search my problems..." className="px-4 py-2 border rounded-lg w-full md:w-64" />
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">Loading problems...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myProblems.map(problem => (
                    <div key={problem._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h3 className="font-semibold text-lg mb-2">{problem.title}</h3>
                      <p className="text-sm text-gray-600 capitalize mb-3">
                        {problem.difficulty} • {problem.category}
                      </p>
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => startEditProblem(problem)}
                          className="text-blue-500 hover:text-blue-700 font-medium text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProblem(problem._id)}
                          className="text-red-500 hover:text-red-700 font-medium text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {myProblems.length === 0 && !loading && (
                    <div className="col-span-full text-center py-12">
                      <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Problems Found</h3>
                      <p className="text-gray-500 mb-4">You haven't created any problems yet. Click the button above to create your first problem!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'assignments' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  {showSubmissions ? `Submissions for ${selectedAssignment?.title}` :
                   showEditForm ? `Edit Assignment: ${editingAssignment?.title}` : 'Assignments'}
                </h2>
                <div className="flex space-x-2">
                  {showSubmissions && (
                    <button
                      onClick={() => {
                        setShowSubmissions(false);
                        setSelectedAssignment(null);
                        setAssignmentSubmissions([]);
                      }}
                      className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                    >
                      Back to Assignments
                    </button>
                  )}
                  {showEditForm && (
                    <button
                      onClick={() => {
                        setShowEditForm(false);
                        setEditingAssignment(null);
                        setAssignmentForm({
                          title: '',
                          description: '',
                          classId: '',
                          dueDate: '',
                          instructions: '',
                          selectedProblems: []
                        });
                      }}
                      className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                    >
                      Cancel Edit
                    </button>
                  )}
                  {!showSubmissions && !showEditForm && (
                    <button
                      onClick={() => setShowCreateAssignment(!showCreateAssignment)}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      {showCreateAssignment ? 'Cancel' : 'Create Assignment'}
                    </button>
                  )}
                </div>
              </div>

              {showCreateAssignment && (
                <div className="bg-gray-50 p-6 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold mb-4">Create New Assignment</h3>
                  <form onSubmit={handleCreateAssignment} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Assignment Title</label>
                        <input
                          type="text"
                          value={assignmentForm.title}
                          onChange={(e) => setAssignmentForm(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter assignment title"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Class ID</label>
                        <input
                          type="text"
                          value={assignmentForm.classId}
                          onChange={(e) => setAssignmentForm(prev => ({ ...prev, classId: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., CS101"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={assignmentForm.description}
                        onChange={(e) => setAssignmentForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                        placeholder="Describe the assignment..."
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Due Date</label>
                        <input
                          type="datetime-local"
                          value={assignmentForm.dueDate}
                          onChange={(e) => setAssignmentForm(prev => ({ ...prev, dueDate: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Instructions (Optional)</label>
                        <input
                          type="text"
                          value={assignmentForm.instructions}
                          onChange={(e) => setAssignmentForm(prev => ({ ...prev, instructions: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Additional instructions..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Select Problems</label>
                      <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-white">
                        {problems.length === 0 ? (
                          <p className="text-gray-500 text-sm">No problems available. Create some problems first.</p>
                        ) : (
                          <div className="space-y-2">
                            {problems.map(problem => (
                              <label key={problem._id} className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={assignmentForm.selectedProblems.includes(problem._id)}
                                  onChange={() => handleProblemToggle(problem._id)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                  <span className="font-medium">{problem.title}</span>
                                  <span className={`ml-2 text-xs px-2 py-1 rounded capitalize ${
                                    problem.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                    problem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {problem.difficulty}
                                  </span>
                                  <span className="ml-2 text-xs text-gray-500">{problem.category}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Selected: {assignmentForm.selectedProblems.length} problems
                      </p>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowCreateAssignment(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading || assignmentForm.selectedProblems.length === 0}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
                      >
                        {loading ? 'Creating...' : 'Create Assignment'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {showEditForm && editingAssignment && (
                <div className="bg-gray-50 p-6 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold mb-4">Edit Assignment</h3>
                  <form onSubmit={handleUpdateAssignment} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Assignment Title</label>
                        <input
                          type="text"
                          value={assignmentForm.title}
                          onChange={(e) => setAssignmentForm(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter assignment title"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Class ID</label>
                        <input
                          type="text"
                          value={assignmentForm.classId}
                          onChange={(e) => setAssignmentForm(prev => ({ ...prev, classId: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., CS101"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={assignmentForm.description}
                        onChange={(e) => setAssignmentForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                        placeholder="Describe the assignment..."
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Due Date</label>
                        <input
                          type="datetime-local"
                          value={assignmentForm.dueDate}
                          onChange={(e) => setAssignmentForm(prev => ({ ...prev, dueDate: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Instructions (Optional)</label>
                        <input
                          type="text"
                          value={assignmentForm.instructions}
                          onChange={(e) => setAssignmentForm(prev => ({ ...prev, instructions: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Additional instructions..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Select Problems</label>
                      <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-white">
                        {problems.length === 0 ? (
                          <p className="text-gray-500 text-sm">No problems available. Create some problems first.</p>
                        ) : (
                          <div className="space-y-2">
                            {problems.map(problem => (
                              <label key={problem._id} className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={assignmentForm.selectedProblems.includes(problem._id)}
                                  onChange={() => handleProblemToggle(problem._id)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                  <span className="font-medium">{problem.title}</span>
                                  <span className={`ml-2 text-xs px-2 py-1 rounded capitalize ${
                                    problem.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                    problem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {problem.difficulty}
                                  </span>
                                  <span className="ml-2 text-xs text-gray-500">{problem.category}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Selected: {assignmentForm.selectedProblems.length} problems
                      </p>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="submit"
                        disabled={loading || assignmentForm.selectedProblems.length === 0}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
                      >
                        {loading ? 'Updating...' : 'Update Assignment'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {showSubmissions ? (
                <div className="space-y-4">
                  {assignmentSubmissions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No submissions yet for this assignment.
                    </div>
                  ) : (
                    assignmentSubmissions.map(submission => (
                      <div key={submission._id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{submission.studentId.name}</h3>
                            <p className="text-sm text-gray-600">{submission.studentId.email}</p>
                            <p className="text-sm text-gray-500">
                              Submitted: {new Date(submission.submittedAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 text-sm rounded ${
                              submission.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              submission.status === 'wrong_answer' ? 'bg-red-100 text-red-800' :
                              submission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {submission.status.replace('_', ' ').toUpperCase()}
                            </span>
                            {submission.score !== undefined && (
                              <p className="text-sm font-medium mt-1">{submission.score}/100</p>
                            )}
                          </div>
                        </div>

                        <div className="mb-3">
                          <h4 className="font-medium mb-1">{submission.problemId.title}</h4>
                          <div className="bg-gray-100 p-3 rounded text-sm font-mono max-h-32 overflow-y-auto">
                            <pre>{submission.code}</pre>
                          </div>
                        </div>

                        {submission.feedback && (
                          <div className="mb-3">
                            <h4 className="font-medium mb-1">Feedback:</h4>
                            <p className="text-sm text-gray-700 bg-blue-50 p-2 rounded">{submission.feedback}</p>
                          </div>
                        )}

                        <div className="flex items-center space-x-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Score"
                            className="w-20 px-2 py-1 border rounded text-sm"
                            id={`score-${submission._id}`}
                          />
                          <input
                            type="text"
                            placeholder="Feedback"
                            className="flex-1 px-3 py-1 border rounded text-sm"
                            id={`feedback-${submission._id}`}
                          />
                          <button
                            onClick={() => {
                              const score = document.getElementById(`score-${submission._id}`).value;
                              const feedback = document.getElementById(`feedback-${submission._id}`).value;
                              if (score) {
                                handleGradeSubmission(submission._id, score, feedback);
                              } else {
                                alert('Please enter a score');
                              }
                            }}
                            className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                          >
                            Grade
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {loading && assignments.length === 0 ? (
                    <div className="text-center py-8">Loading assignments...</div>
                  ) : assignments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No assignments created yet. Click "Create Assignment" to get started.
                    </div>
                  ) : (
                    assignments.map(assignment => (
                      <div key={assignment._id} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-lg">{assignment.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                          <span>Class: {assignment.classId}</span>
                          <span>Problems: {assignment.problems?.length || 0}</span>
                        </div>
                        <div className="mt-3">
                          <button
                            onClick={() => handleEditAssignment(assignment)}
                            className="text-blue-500 hover:text-blue-700 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => viewAssignmentSubmissions(assignment)}
                            className="text-green-500 hover:text-green-700 mr-3"
                          >
                            View Submissions
                          </button>
                          <button
                            onClick={() => handleDeleteAssignment(assignment._id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}



          {activeTab === 'profile' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Teacher Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="text-gray-900">{user?.name || 'Teacher Name'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-gray-900">{user?.email || 'teacher@example.com'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Department</label>
                      <p className="text-gray-900">Computer Science</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                      <p className="text-gray-900">TCH001</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Teaching Statistics</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Classes Taught</label>
                      <p className="text-gray-900">CS101, CS201, Algorithms</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Students</label>
                      <p className="text-gray-900">67</p>
                    </div>
                  </div>
                </div>
              </div>

              {showEditProfile && (
                <div className="mt-6 bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Edit Profile</h3>
                    <button
                      onClick={() => setShowEditProfile(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  <form onSubmit={handleEditProfile} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Name</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowEditProfile(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
                      >
                        {loading ? 'Updating...' : 'Update Profile'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {showChangePassword && (
                <div className="mt-6 bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Change Password</h3>
                    <button
                      onClick={() => setShowChangePassword(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Current Password</label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">New Password</label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        minLength="6"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        minLength="6"
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowChangePassword(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
                      >
                        {loading ? 'Changing...' : 'Change Password'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="mt-6 bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
                <div className="space-y-4">
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Change Password
                  </button>
                  <button
                    onClick={() => setShowEditProfile(true)}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 ml-4"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;