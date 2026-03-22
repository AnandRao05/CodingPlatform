import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, Send, ChevronLeft, Terminal, CheckCircle, XCircle, Clock, Check, 
  ChevronUp, ChevronDown, Maximize2, Minimize2, BookOpen, Code2, 
  AlertCircle, Info, RefreshCw, Activity, X, Cpu, Zap, Layout,
  Layers, Eye, Edit3, TrendingUp, Bug, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../stores/authStore';

const LeetCodeWorkspace = ({ problem, assignment, onSubmit, onBack, onProblemChange }) => {
  const { getAuthHeaders, API_BASE_URL } = useAuthStore();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [leftTab, setLeftTab] = useState('description'); 
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleTab, setConsoleTab] = useState('testcases'); 
  const [isMaximized, setIsMaximized] = useState(false); 
  const [leftWidth, setLeftWidth] = useState(50);
  const [consoleHeight, setConsoleHeight] = useState(35); 
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingHeight, setIsDraggingHeight] = useState(false);
  const [fontSize, setFontSize] = useState(15);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  
  const [activeTestCaseIdx, setActiveTestCaseIdx] = useState(0);
  const [testCases, setTestCases] = useState([]);
  const [submissionHistory, setSubmissionHistory] = useState(null);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [expandedSubId, setExpandedSubId] = useState(null); 
  const editorRef = useRef(null);
  const executionId = useRef(0);

  const fetchSubmissions = async () => {
    if (!problem) return;
    setIsLoadingSubmissions(true);
    try {
      const endpoint = assignment 
        ? `${API_BASE_URL}/assignments/${assignment.assignment._id}/problems/${problem._id}/submissions`
        : `${API_BASE_URL}/code/practice/${problem._id}/submissions`;
        
      const res = await fetch(endpoint, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAllSubmissions(data);
      }
    } catch (e) {
      console.error('Fetch submissions error:', e);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (leftTab === 'submissions') {
      fetchSubmissions();
    }
  }, [leftTab, problem, assignment]);

  useEffect(() => {
    if (assignment && problem) {
       const subs = assignment.submissions || [];
       const existing = subs.find(s => {
         const pid = s.problemId?._id || s.problemId;
         return pid === problem._id;
       });
       setSubmissionHistory(existing || null);
    } else {
       setSubmissionHistory(null);
    }
  }, [assignment, problem]);

  const languages = [
    { id: 'javascript', name: 'JavaScript', monacoId: 'javascript', judge0Id: 63, defaultCode: '' },
    { id: 'python', name: 'Python', monacoId: 'python', judge0Id: 71, defaultCode: '' },
    { id: 'java', name: 'Java', monacoId: 'java', judge0Id: 62, defaultCode: '' },
    { id: 'cpp', name: 'C++', monacoId: 'cpp', judge0Id: 54, defaultCode: '' },
    { id: 'c', name: 'C', monacoId: 'c', judge0Id: 50, defaultCode: '' }
  ];

  useEffect(() => {
    if (problem) {
      const visibleCases = problem.testCases?.filter(tc => !tc.isHidden) || [];
      setTestCases(visibleCases.map(tc => ({ ...tc, actualOutput: '', passed: null })));
      const drafts = assignment?.drafts || [];
      const subs = assignment?.submissions || [];
      const draft = drafts.find(d => {
        const pid = d.problemId?._id || d.problemId;
        return pid === problem._id;
      });
      const submission = subs.find(s => {
        const pid = s.problemId?._id || s.problemId;
        return pid === problem._id;
      });

      if (draft && draft.code) {
        setCode(draft.code);
        if (draft.language && languages.some(l => l.id === draft.language)) setLanguage(draft.language);
      } else if (submission && submission.code) {
        setCode(submission.code);
        if (submission.language && languages.some(l => l.id === submission.language)) setLanguage(submission.language);
      } else {
        const defaultLang = languages.find(l => l.id === language);
        setCode(defaultLang?.defaultCode || '');
      }
      
      setExecutionResult(null);
      setConsoleOpen(false);
    }
  }, [problem]);

  useEffect(() => {
    const selectedLang = languages.find(lang => lang.id === language);
    setCode(selectedLang?.defaultCode || '');
  }, [language]);

  // Auto-save debounce
  useEffect(() => {
    if (!problem || !assignment || !code) return;
    const defaultLangCode = languages.find(l => l.id === language)?.defaultCode || '';
    if (code === defaultLangCode) return; // Ignore initial boilerplate

    const timeoutId = setTimeout(async () => {
      try {
        await fetch(`${API_BASE_URL}/assignments/${assignment.assignment._id}/problems/${problem._id}/draft`, {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language })
        });
      } catch (e) {
        console.error('Draft save error:', e);
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [code, language, problem, assignment, API_BASE_URL]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.editor.defineTheme('premiumDark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c678dd' },
        { token: 'string', foreground: '98c379' },
        { token: 'number', foreground: 'd19a66' },
        { token: 'type', foreground: 'e5c07b' },
      ],
      colors: {
        'editor.background': '#13151a',
        'editor.foreground': '#abb2bf',
        'editor.lineHighlightBackground': '#1c1f26',
        'editorCursor.foreground': '#528bff',
        'editor.selectionBackground': '#3e4451',
        'editorIndentGuide.background': '#282c34',
        'editorIndentGuide.activeBackground': '#4b5263'
      }
    });
    monaco.editor.setTheme('premiumDark');
  };

  const getJudge0LangId = (langId) => languages.find(l => l.id === langId)?.judge0Id || 63;
  const removeTestCase = (idx) => {
    if (testCases.length <= 1) return;
    const newTestCases = testCases.filter((_, i) => i !== idx);
    setTestCases(newTestCases);
    if (activeTestCaseIdx === idx) {
      setActiveTestCaseIdx(Math.max(0, idx - 1));
    } else if (activeTestCaseIdx > idx) {
      setActiveTestCaseIdx(activeTestCaseIdx - 1);
    }
  };

  const handleAnalysis = async (subId = null) => {
    setConsoleOpen(true);
    setConsoleTab('result');
    setIsAnalyzing(true);
    setAiAnalysisResult(null); 
    setExecutionResult({ 
      isAnalysis: true, 
      status: 'Analyzing...', 
      message: 'Gemini AI is examining your code for complexity, logic, and potential enhancements.' 
    });
    
    try {
      let endpoint;
      let body = null;
      
      
      
      if (subId) {
        endpoint = `${API_BASE_URL}/submissions/${subId}/analyze-ai`;
      } else {
        endpoint = `${API_BASE_URL}/code/analyze-draft`;
        body = JSON.stringify({ code, language });
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        ...(body && { body })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Analysis failed');
      
      const finalAnalysis = data.aiAnalysis || data;
      
      if (!finalAnalysis || !finalAnalysis.timeComplexity) {
        throw new Error('AI returned an invalid analysis structure.');
      }

      setAiAnalysisResult(finalAnalysis);
      setExecutionResult({
        isAnalysis: true,
        status: 'Analysis Complete',
        success: true
      });
    } catch (error) {
      console.error('Frontend Analysis Error:', error);
      setExecutionResult({
        isAnalysis: true,
        status: 'Analysis Failed',
        success: false,
        message: error.message || 'Could not complete AI analysis. Please try again later.'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRun = async () => {
    if (!code.trim() || testCases.length === 0) return;
    
    
    const currentExecutionId = ++executionId.current;
    
    setIsRunning(true);
    setConsoleOpen(true);
    setConsoleTab('result');
    setExecutionResult({ status: 'Evaluating...', type: 'loading' });
    
    
    setTestCases(prev => prev.map(tc => ({ ...tc, actualOutput: '', passed: null, error: false })));

    // Explicitly save draft on run
    if (assignment && problem) {
      fetch(`${API_BASE_URL}/assignments/${assignment.assignment._id}/problems/${problem._id}/draft`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language })
      }).catch(() => {});
    }

    try {
      
      const res = await fetch(`${API_BASE_URL}/code/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ 
          source_code: code, 
          language_id: getJudge0LangId(language), 
          testCases: testCases.map(tc => ({ input: tc.input || '' }))
        })
      });
      
      const data = await res.json();
      
      // Ignore if this is a stale request
      if (currentExecutionId !== executionId.current) return;

      if (!res.ok || (data.success === false && !data.results)) {
        throw new Error(data.message || 'Execution failed');
      }

      const results = data.results || [data]; 
      const updatedCases = [...testCases];
      let passedCount = 0;

      for (let i = 0; i < results.length; i++) {
        if (!updatedCases[i]) continue;
        const result = results[i];
        const tc = updatedCases[i];

        if (result.success) {
          const actual = (result.output || result.stdout || '').trim();
          const expected = (tc.expectedOutput || '').trim();
          tc.passed = actual === expected;
          tc.actualOutput = actual;
          if (tc.passed) passedCount++;
        } else {
          tc.actualOutput = result.message || result.type || 'Execution error';
          tc.passed = false;
          tc.error = true;
          tc.errorType = result.type;
        }
      }
      
      setTestCases(updatedCases);
      const firstError = updatedCases.find(tc => tc.error);
      
      if (firstError) {
        const errorLabel = firstError.errorType || 'Runtime Error';
        setExecutionResult({ 
          status: errorLabel, 
          type: 'error', 
          passed: passedCount, 
          total: updatedCases.length,
          errorType: errorLabel.toLowerCase().includes('compilation') || errorLabel.toLowerCase().includes('syntax') ? 'compilation' : 'runtime',
          body: firstError.actualOutput || 'No detailed error message available.'
        });
      } else if (passedCount === updatedCases.length) {
        setExecutionResult({ status: 'Accepted', type: 'success', passed: passedCount, total: updatedCases.length });
      } else {
        setExecutionResult({ status: 'Wrong Answer', type: 'error', passed: passedCount, total: updatedCases.length });
      }
    } catch (e) {
      if (currentExecutionId === executionId.current) {
        setExecutionResult({ status: 'Network Error', body: e.message, type: 'error' });
      }
    } finally {
      if (currentExecutionId === executionId.current) {
        setIsRunning(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) return;
    
    
    const currentExecutionId = ++executionId.current;
    
    setIsSubmitting(true);
    setConsoleOpen(true);
    setConsoleTab('result');
    setExecutionResult({ status: 'Judging...', type: 'loading' });
    
    
    setTestCases(prev => prev.map(tc => ({ ...tc, actualOutput: '', passed: null, error: false })));

    try {
      if (assignment) {
        const res = await fetch(`${API_BASE_URL}/assignments/${assignment.assignment._id}/problems/${problem._id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ code, language })
        });
        const data = await res.json();
        
        
        if (currentExecutionId !== executionId.current) return;

        if (!res.ok) throw new Error(data.message);
        
        const backendTests = data.submission.testResults || [];
        const mappedTestCases = backendTests.map(tr => ({
          input: tr.testCase?.input || 'Hidden',
          expectedOutput: tr.testCase?.expectedOutput || 'Hidden',
          actualOutput: tr.actualOutput || '',
          passed: tr.passed,
          errorType: tr.errorType
        }));
        setTestCases(mappedTestCases);
        setActiveTestCaseIdx(0);

        const passedCount = mappedTestCases.filter(t => t.passed).length;
        const totalCount = mappedTestCases.length;
        const failedTestCase = mappedTestCases.find(t => !t.passed);
        let overallStatus = 'Wrong Answer';
        let body = '';
        
        if (data.submission.status === 'accepted') {
          overallStatus = 'Accepted';
        } else if (mappedTestCases.some(t => t.errorType === 'compilation')) {
          overallStatus = 'Compilation Error';
          body = mappedTestCases.find(t => t.errorType === 'compilation')?.actualOutput || '';
        } else if (mappedTestCases.some(t => t.errorType === 'runtime')) {
          overallStatus = 'Runtime Error';
          body = mappedTestCases.find(t => t.errorType === 'runtime')?.actualOutput || '';
        } else if (failedTestCase) {
           // Check if it's a silent runtime error
           if (failedTestCase.actualOutput?.toLowerCase().includes('error') || failedTestCase.actualOutput?.toLowerCase().includes('exception')) {
              overallStatus = 'Runtime Error';
              body = failedTestCase.actualOutput;
           }
        }
        
        setExecutionResult({ 
          status: overallStatus, 
          type: overallStatus === 'Accepted' ? 'success' : 'error',
          passed: data.submission.passedTestCases || passedCount,
          total: data.submission.totalTestCases || totalCount,
          score: data.submission.score,
          isSubmission: true,
          executionTime: data.submission.executionTime,
          memoryUsed: data.submission.memoryUsed,
          body: data.submission.errorMessage || body || (overallStatus === 'Wrong Answer' ? '' : 'No detailed error available.')
        });
        setSubmissionHistory(data.submission);
        fetchSubmissions(); // Refresh history list
        onSubmit && onSubmit(); 
      } else if (problem) {
        // Practice mode submission
        const res = await fetch(`${API_BASE_URL}/code/practice/${problem._id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ code, language })
        });
        const data = await res.json();

        if (currentExecutionId !== executionId.current) return;
        if (!res.ok) throw new Error(data.message);

        const backendTests = data.submission.testResults || [];
        const mappedTestCases = backendTests.map(tr => ({
          input: tr.testCase?.input || 'Hidden',
          expectedOutput: tr.testCase?.expectedOutput || 'Hidden',
          actualOutput: tr.actualOutput || '',
          passed: tr.passed,
          errorType: tr.errorType
        }));
        setTestCases(mappedTestCases);
        setActiveTestCaseIdx(0);

        const passedCount = mappedTestCases.filter(t => t.passed).length;
        const totalCount = mappedTestCases.length;
        const failedTestCase = mappedTestCases.find(t => !t.passed);
        let overallStatus = 'Wrong Answer';
        let body = '';

        if (data.submission.status === 'accepted') {
          overallStatus = 'Accepted';
        } else if (mappedTestCases.some(t => t.errorType === 'compilation')) {
          overallStatus = 'Compilation Error';
          body = mappedTestCases.find(t => t.errorType === 'compilation')?.actualOutput || '';
        } else if (mappedTestCases.some(t => t.errorType === 'runtime')) {
          overallStatus = 'Runtime Error';
          body = mappedTestCases.find(t => t.errorType === 'runtime')?.actualOutput || '';
        } else if (failedTestCase) {
          if (failedTestCase.actualOutput?.toLowerCase().includes('error') || failedTestCase.actualOutput?.toLowerCase().includes('exception')) {
            overallStatus = 'Runtime Error';
            body = failedTestCase.actualOutput;
          }
        }

        setExecutionResult({
          status: overallStatus,
          type: overallStatus === 'Accepted' ? 'success' : 'error',
          passed: data.submission.passedTestCases || passedCount,
          total: data.submission.totalTestCases || totalCount,
          score: data.submission.score, 
          isSubmission: true,
          isPractice: true,
          executionTime: data.submission.executionTime,
          memoryUsed: data.submission.memoryUsed,
          body: data.submission.errorMessage || body
        });
        setSubmissionHistory(data.submission);
        fetchSubmissions();
        onSubmit && onSubmit();
      } else {
        await handleRun();
        if (currentExecutionId === executionId.current) {
          setExecutionResult(prev => ({ ...prev, isSubmission: true }));
        }
      }
    } catch (e) {
      if (currentExecutionId === executionId.current) {
        setExecutionResult({ status: 'Submission Failed', body: e.message, type: 'error' });
      }
    } finally {
      if (currentExecutionId === executionId.current) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0a0a] text-slate-300 font-sans absolute top-0 left-0 z-50">
      
      {}
      <div 
        className="flex flex-1 min-h-0 container mx-auto max-w-[1800px] p-2 gap-2 relative"
        onMouseMove={(e) => {
          if (isDragging) {
            const containerWidth = window.innerWidth;
            const newWidth = (e.clientX / containerWidth) * 100;
            if (newWidth > 20 && newWidth < 80) setLeftWidth(newWidth);
          } else if (isDraggingHeight) {
            const containerHeight = window.innerHeight;
            
            const newHeight = ((containerHeight - e.clientY) / containerHeight) * 100;
            if (newHeight > 10 && newHeight < 70) setConsoleHeight(newHeight);
          }
        }}
        onMouseUp={() => { setIsDragging(false); setIsDraggingHeight(false); }}
        onMouseLeave={() => { setIsDragging(false); setIsDraggingHeight(false); }}
      >
        
        {}
        <div 
          style={{ width: isMaximized ? '0%' : `${leftWidth}%` }}
          className={`transition-all duration-75 ease-in-out ${isMaximized ? 'opacity-0 overflow-hidden' : 'flex flex-col'} bg-[#1a1c23] rounded-xl border border-[#2a2d35] overflow-hidden shrink-0`}
        >
          <div className="flex bg-[#14151a] px-4 pt-4 border-b border-[#2a2d35] gap-4 items-center">
            <button onClick={onBack} className="mr-2 text-slate-400 hover:text-white transition flex items-center pb-3" title="Back to Problem Set">
               <ChevronLeft className="w-5 h-5 hover:-translate-x-1 transition-transform" /> 
            </button>
            <button onClick={() => setLeftTab('description')} className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors relative ${leftTab === 'description' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
               <BookOpen className={`w-4 h-4 ${leftTab === 'description' ? 'text-blue-400' : ''}`}/> 
               Description
               {leftTab === 'description' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500 rounded-t-full"></span>}
            </button>
            <button onClick={() => setLeftTab('submissions')} className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors relative ${leftTab === 'submissions' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
               <Clock className={`w-4 h-4 ${leftTab === 'submissions' ? 'text-emerald-400' : ''}`}/> 
               Submissions
               {leftTab === 'submissions' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-500 rounded-t-full"></span>}
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-[#444] scrollbar-track-transparent">
             {leftTab === 'description' && (
               <div className="animate-in fade-in duration-300">
                 {}
                 {assignment && assignment.assignment?.problems?.length > 1 && (
                   <div className="mb-6 flex gap-2 overflow-x-auto pb-3 scrollbar-none border-b border-[#2a2d35]">
                     {assignment.assignment.problems.map((p, idx) => {
                       const isCurrent = p.problemId._id === problem._id;
                       const subs = assignment.submissions || [];
                       const isSolved = subs.some(s => (s.problemId?._id === p.problemId._id || s.problemId === p.problemId._id) && s.status === 'accepted');
                       return (
                         <button 
                           key={p.problemId._id}
                           onClick={() => onProblemChange && onProblemChange(p.problemId)}
                           className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 border ${
                             isCurrent 
                             ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20 scale-105' 
                             : 'bg-[#14151a] text-slate-500 border-[#2a2d35] hover:border-slate-500 hover:text-slate-300'
                           }`}
                         >
                           {isSolved ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <div className="w-3 h-3 rounded-full border border-slate-700"></div>}
                           P{idx + 1}
                         </button>
                       );
                     })}
                   </div>
                 )}

                 <h1 className="text-3xl font-extrabold text-white tracking-tight mb-4 flex items-center flex-wrap gap-4">
                    <span className="bg-gradient-to-r from-blue-100 to-indigo-100 bg-clip-text text-transparent">{problem.title}</span>
                    {submissionHistory && submissionHistory.status === 'accepted' && (
                       <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-sm font-black rounded-lg uppercase tracking-wider shadow-[0_0_15px_rgba(52,211,153,0.15)] border border-emerald-500/20 animate-in zoom-in duration-300">
                         <CheckCircle className="w-5 h-5"/> Solved
                       </span>
                    )}
                 </h1>
                 
                 <div className="flex flex-wrap items-center gap-3 mb-8">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-widest ${problem.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.1)]' : problem.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.1)]' : 'bg-red-500/10 text-red-400 shadow-[0_0_10px_rgba(248,113,113,0.1)]'}`}>
                      {problem.difficulty}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-[#2a2d35] text-slate-300">
                      {problem.category}
                    </span>
                 </div>
                 
                 <div className="prose prose-invert prose-slate max-w-none text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                   {problem.description}
                 </div>

                 {problem.sampleInput && (
                   <div className="mt-10 space-y-6">
                     <div className="group">
                       <p className="font-bold text-white mb-3 text-sm flex items-center gap-2">Example 1</p>
                       <div className="bg-[#14151a] p-5 rounded-xl font-mono text-sm border border-[#2a2d35] shadow-inner relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50"></div>
                          <span className="text-slate-500 font-semibold block mb-1">Input:</span>
                          <span className="text-[#a5b4fc] block mb-4">{problem.sampleInput}</span>
                          <span className="text-slate-500 font-semibold block mb-1">Output:</span>
                          <span className="text-[#6ee7b7] block">{problem.sampleOutput}</span>
                       </div>
                     </div>
                   </div>
                 )}

                 {problem.constraints && (
                   <div className="mt-10">
                     <p className="font-bold text-white mb-3 text-sm flex items-center gap-2">Constraints</p>
                     <div className="bg-[#14151a] p-5 rounded-xl border border-[#2a2d35] shadow-inner">
                       <ul className="list-disc list-inside space-y-2 text-sm text-[#cbd5e1] font-mono whitespace-pre-line">
                         <li>{problem.constraints}</li>
                       </ul>
                     </div>
                   </div>
                 )}
               </div>
             )}
             {leftTab === 'submissions' && (
               <div className="animate-in fade-in duration-300 h-full">
                 {allSubmissions && allSubmissions.length > 0 ? (
                   <div className="space-y-4 pb-10">
                      {allSubmissions.map((sub, idx) => {
                        const isExpanded = expandedSubId === sub._id;
                        return (
                          <div key={sub._id || idx} className={`bg-[#14151a] border ${isExpanded ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'border-[#2a2d35]'} rounded-xl overflow-hidden hover:border-[#3e4451] transition-all group`}>
                            <div 
                              className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1a1c23] cursor-pointer"
                              onClick={() => setExpandedSubId(isExpanded ? null : sub._id)}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${sub.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                  {sub.status === 'accepted' ? <CheckCircle className="w-5 h-5"/> : <XCircle className="w-5 h-5"/>}
                                </div>
                                <div>
                                  <p className={`text-lg font-bold tracking-tight ${sub.status === 'accepted' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {(sub.status || 'unknown').replace('_', ' ').toUpperCase()}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-0.5">Submitted on {new Date(sub.submittedAt).toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-6 self-end md:self-auto">
                                <div className="text-right">
                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Language</p>
                                  <p className="text-sm text-slate-300 font-mono bg-[#2a2d35] px-2 py-0.5 rounded text-center inline-block">{sub.language || 'N/A'}</p>
                                </div>
                                <div className="text-right border-l border-[#2a2d35] pl-6 min-w-[80px]">
                                   <p className="text-2xl font-black text-white leading-none">
                                     {sub.score !== undefined ? sub.score : '--'}
                                   </p>
                                   <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">
                                     Score
                                   </p>
                                </div>
                                <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-[#2a2d35]"
                                >
                                  <div className="p-6 bg-[#0d0e12] space-y-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div className="bg-[#1a1c23] p-3 rounded-xl border border-white/5">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Passed Cases</p>
                                        <p className="text-sm font-bold text-white">{sub.passedTestCases || 0} / {sub.totalTestCases || 0}</p>
                                      </div>
                                      <div className="bg-[#1a1c23] p-3 rounded-xl border border-white/5">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Runtime</p>
                                        <p className="text-sm font-bold text-white">{sub.executionTime || 0} ms</p>
                                      </div>
                                      <div className="bg-[#1a1c23] p-3 rounded-xl border border-white/5">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Memory</p>
                                        <p className="text-sm font-bold text-white">{(sub.memoryUsed || 0).toFixed(2)} KB</p>
                                      </div>
                                      <div className="bg-[#1a1c23] p-3 rounded-xl border border-white/5">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                                        <p className={`text-sm font-black uppercase ${sub.status === 'accepted' ? 'text-emerald-400' : 'text-red-400'}`}>{sub.status}</p>
                                      </div>
                                    </div>

                                    {sub.errorMessage && (
                                      <div className="space-y-2">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Error Details</p>
                                        <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl font-mono text-xs text-red-300 whitespace-pre-wrap">
                                          {sub.errorMessage}
                                        </div>
                                      </div>
                                    )}

                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Submitted Code</p>
                                        <button 
                                          onClick={() => setCode(sub.code)}
                                          className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1"
                                        >
                                          <Code2 className="w-3 h-3"/> Load to Editor
                                        </button>
                                      </div>
                                      <div className="bg-[#1a1c23] p-4 rounded-xl border border-white/5 font-mono text-sm text-slate-300 overflow-x-auto max-h-[300px]">
                                        <pre>{sub.code}</pre>
                                      </div>
                                    </div>

                                    <div className="flex gap-3">
                                      <button 
                                        onClick={() => {
                                          handleAnalysis(sub._id || sub.id);
                                        }}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                                      >
                                        <Cpu className="w-4 h-4"/> {sub.aiAnalysis && sub.aiAnalysis.timeComplexity ? 'View AI Analysis' : 'Analyze Code with Gemini'}
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm space-y-4">
                     <Clock className="w-12 h-12 opacity-20" />
                     <p>Submit code to see history!</p>
                   </div>
                 )}
               </div>
             )}
          </div>

        </div>

        {}
        {!isMaximized && (
          <div 
            className="w-1.5 cursor-col-resize hover:bg-indigo-500 rounded transition-colors shrink-0 flex items-center justify-center group z-10"
            onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
          >
            <div className={`h-12 w-0.5 rounded-full transition-colors ${isDragging ? 'bg-indigo-400' : 'bg-[#333] group-hover:bg-white'}`} />
          </div>
        )}

        {}
        <div 
          style={{ width: isMaximized ? '100%' : `calc(${100 - leftWidth}% - 14px)` }}
          className={`transition-all duration-75 ease-in-out flex flex-col gap-2 min-h-0 shrink-0`}
        >
          
          <div 
            className="flex flex-col bg-[#1a1c23] rounded-xl border border-[#2a2d35] overflow-hidden min-h-0 relative"
            style={{ height: consoleOpen ? `${100 - consoleHeight}%` : 'calc(100% - 3.5rem - 0.5rem)' }}
          >
             {}
             <div className="h-12 bg-[#14151a] border-b border-[#2a2d35] flex items-center justify-between px-4 shrink-0">
               <div className="flex items-center gap-3">
                 <div className="flex px-3 py-1.5 bg-[#20232a] border border-[#333] rounded-lg items-center gap-2 group hover:border-[#444] transition-colors">
                    <Code2 className="w-4 h-4 text-indigo-400" />
                    <select 
                      value={language} 
                      onChange={(e) => setLanguage(e.target.value)}
                      className="bg-transparent text-slate-200 text-sm font-semibold outline-none cursor-pointer appearance-none pr-4"
                    >
                      {languages.map(l => <option key={l.id} value={l.id} className="bg-[#1a1c23]">{l.name}</option>)}
                    </select>
                 </div>
                 
                 <div className="h-4 w-px bg-[#333] mx-1"></div>
                 
                 <div className="flex px-2 py-1.5 bg-[#20232a] border border-[#333] rounded-lg items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Size</span>
                    <select 
                      value={fontSize} 
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="bg-transparent text-slate-200 text-sm font-semibold outline-none cursor-pointer appearance-none px-1"
                    >
                      {[12, 14, 15, 16, 18, 20, 24].map(size => <option key={size} value={size} className="bg-[#1a1c23]">{size}px</option>)}
                    </select>
                 </div>
                 
                 <button 
                   onClick={() => {
                     if (confirm('Are you sure you want to revert your code to the default boilerplate? This will discard your current draft!')) {
                       const defaultLangCode = languages.find(l => l.id === language)?.defaultCode || '';
                       setCode(defaultLangCode);
                     }
                   }}
                   className="p-1.5 hover:bg-red-500/10 hover:text-red-400 text-slate-400 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                   title="Reset Code"
                 >
                   <RefreshCw className="w-4 h-4" />
                 </button>
               </div>

               <div className="flex items-center gap-3 text-slate-400">
                 <button 
                   onClick={() => setIsMaximized(!isMaximized)} 
                   className="p-1.5 hover:bg-[#2a2d35] hover:text-white rounded-lg transition-colors group"
                   title={isMaximized ? "Restore Layout" : "Maximize Editor"}
                 >
                   {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                 </button>
               </div>
             </div>
             
             {/* Monaco Editor Canvas */}
             <div className="flex-1 min-h-0 bg-[#13151a]">
               <Editor
                 language={languages.find(l => l.id === language)?.monacoId || 'javascript'}
                 value={code}
                 onChange={setCode}
                 onMount={handleEditorDidMount}
                 options={{
                   minimap: { enabled: false },
                   fontSize: fontSize,
                   fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                   wordWrap: 'on',
                   scrollBeyondLastLine: false,
                   automaticLayout: true,
                   padding: { top: 20 },
                   lineHeight: 26,
                   fontLigatures: true,
                 }}
               />
             </div>
          </div>

          {}
          {}
          {consoleOpen && (
            <div 
              className="h-1.5 cursor-row-resize hover:bg-white/10 transition-colors shrink-0 flex items-center justify-center group z-10"
              onMouseDown={(e) => { e.preventDefault(); setIsDraggingHeight(true); }}
            >
              <div className={`w-12 h-0.5 rounded-full transition-colors ${isDraggingHeight ? 'bg-indigo-400' : 'bg-[#333] group-hover:bg-indigo-400'}`} />
            </div>
          )}

          <div 
            className={`flex flex-col bg-[#1a1c23] rounded-xl border border-[#2a2d35] overflow-hidden transition-all duration-75 ease-in-out ${consoleOpen ? '' : 'h-14'}`}
            style={consoleOpen ? { height: `${consoleHeight}%` } : {}}
          >
             
             {}
             <div className="h-14 bg-[#14151a] border-b border-[#2a2d35] flex items-center justify-between px-4 shrink-0 select-none">
                <div className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[#20232a] rounded-lg transition-colors" onClick={() => setConsoleOpen(!consoleOpen)}>
                  <span className={`text-sm font-bold flex items-center gap-2 ${consoleOpen ? 'text-white' : 'text-slate-400'}`}>
                    <Terminal className="w-4 h-4"/> Console
                  </span>
                  {consoleOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronUp className="w-4 h-4 text-slate-500" />}
                </div>
                
                {}
                <div className="flex items-center gap-3">
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleAnalysis(); }} 
                     disabled={isRunning || isSubmitting || isAnalyzing}
                     className={`px-4 py-2 ${!submissionHistory && !code.trim() ? 'bg-[#2a2d35] text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-500/30 hover:to-indigo-500/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.1)]'} rounded-lg text-sm font-bold transition flex items-center gap-2 border border-indigo-500/20`}
                     title={!submissionHistory && !code.trim() ? "Write some code first to analyze" : "AI Code Analysis"}
                   >
                     {isAnalyzing ? <Clock className="w-4 h-4 animate-spin"/> : <Cpu className="w-4 h-4" />} Analyze
                   </button>
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleRun(); }} 
                     disabled={isRunning || isSubmitting || isAnalyzing}
                     className="px-5 py-2 bg-[#2a2d35] hover:bg-[#323640] text-slate-200 rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-sm border border-[#3e4451]"
                   >
                     {isRunning ? <Clock className="w-4 h-4 animate-spin text-indigo-400"/> : <Play className="w-4 h-4 text-slate-300" />} Run
                   </button>
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleSubmit(); }} 
                     disabled={isRunning || isSubmitting || isAnalyzing}
                     className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                   >
                     {isSubmitting ? <Clock className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />} Submit
                   </button>
                </div>
             </div>
             
             {consoleOpen && (
               <div className="flex-1 min-h-0 flex flex-col bg-[#13151a]">
                  <div className="flex bg-[#181a20] px-3 pt-2 border-b border-[#2a2d35]">
                    <button onClick={() => setConsoleTab('testcases')} className={`pb-2 px-3 text-xs font-bold uppercase tracking-wider relative transition-colors ${consoleTab === 'testcases' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                      Test Cases
                      {consoleTab === 'testcases' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-slate-400"></span>}
                    </button>
                    <button onClick={() => setConsoleTab('result')} className={`pb-2 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 relative transition-colors ${consoleTab === 'result' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                      Test Result 
                      {executionResult && (executionResult.type === 'success' ? <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></span> : executionResult.type === 'error' ? <span className="w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50"></span> : null)}
                      {consoleTab === 'result' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-indigo-500"></span>}
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-[#444] scrollbar-track-transparent">
                     
                     {consoleTab === 'testcases' && testCases.length > 0 && (
                       <div className="space-y-6 animate-in fade-in">
                         <div className="flex gap-3 mb-2 flex-wrap items-center">
                            {testCases.map((tc, idx) => (
                              <button key={idx} onClick={() => setActiveTestCaseIdx(idx)} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTestCaseIdx === idx ? 'bg-[#2a2d35] text-white shadow-sm' : 'bg-[#181a20] border border-[#2a2d35] text-slate-400 hover:bg-[#20232a]'}`}>
                                Case {idx + 1}
                              </button>
                            ))}
                            <button onClick={() => {
                               setTestCases([...testCases, { input: '', expectedOutput: '', isCustom: true, passed: null }]);
                               setActiveTestCaseIdx(testCases.length);
                            }} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 transition-colors">
                              + Add Case
                            </button>
                            <button 
                               onClick={() => {
                                 if (confirm('Reset to standard test cases? Custom cases will be removed.')) {
                                   const visibleCases = problem.testCases?.filter(tc => !tc.isHidden) || [];
                                   setTestCases(visibleCases.map(tc => ({ ...tc, actualOutput: '', passed: null })));
                                   setActiveTestCaseIdx(0);
                                 }
                               }} 
                               className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-slate-400 hover:text-white hover:bg-[#2a2d35] transition-colors border border-transparent hover:border-[#3e4451]"
                               title="Reset Cases"
                             >
                               <RefreshCw className="w-3 h-3" /> Reset
                             </button>
                         </div>
                         <div>
                            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Input</p>
                            <textarea
                               value={testCases[activeTestCaseIdx]?.input || ''} 
                               onChange={(e) => {
                                 const newTc = [...testCases];
                                 newTc[activeTestCaseIdx].input = e.target.value;
                                 setTestCases(newTc);
                               }}
                               className="w-full bg-[#181a20] p-4 rounded-xl border border-[#2a2d35] font-mono text-sm text-[#cbd5e1] shadow-inner focus:outline-none focus:border-indigo-500/50 resize-y min-h-[80px]"
                               placeholder="Enter input values..."
                            />
                         </div>
                         <div className="mt-4">
                            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Expected Output</p>
                            <textarea
                               value={testCases[activeTestCaseIdx]?.expectedOutput || ''} 
                               onChange={(e) => {
                                 const newTc = [...testCases];
                                 newTc[activeTestCaseIdx].expectedOutput = e.target.value;
                                 setTestCases(newTc);
                               }}
                               className="w-full bg-[#181a20] p-4 rounded-xl border border-[#2a2d35] font-mono text-sm text-[#cbd5e1] shadow-inner focus:outline-none focus:border-indigo-500/50 resize-y min-h-[80px]"
                               placeholder="Expected response..."
                            />
                         </div>
                       </div>
                     )}

                     {consoleTab === 'result' && (
                       <div className="animate-in fade-in h-full overflow-y-auto">
                         <AnimatePresence mode="wait">
                           {!executionResult ? (
                             <motion.div 
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               exit={{ opacity: 0, y: -10 }}
                               className="flex h-full items-center justify-center text-slate-500 text-sm font-medium flex-col gap-4 py-20"
                             >
                               <div className="w-16 h-16 rounded-full bg-[#1a1c23] border border-[#2a2d35] flex items-center justify-center">
                                 <Play className="w-6 h-6 text-slate-600 opacity-50" />
                               </div>
                               <p>Run or Submit your code to evaluate against test cases.</p>
                             </motion.div>
                           ) : executionResult.type === 'loading' || executionResult.isAnalysis && !executionResult.success ? (
                             <motion.div 
                               key="loading"
                               initial={{ opacity: 0 }}
                               animate={{ opacity: 1 }}
                               exit={{ opacity: 0 }}
                               className="flex flex-col items-center justify-center h-full text-slate-400 py-20"
                             >
                               <div className="relative">
                                 <RefreshCw className="w-12 h-12 animate-spin text-indigo-500 mb-6" />
                                 <div className="absolute inset-0 bg-indigo-500/20 blur-xl animate-pulse rounded-full"></div>
                               </div>
                               <p className="text-sm font-black uppercase tracking-[0.2em] text-indigo-400 animate-pulse">{executionResult.status}</p>
                               {executionResult.message && <p className="text-sm text-slate-500 mt-2 text-center max-w-md">{executionResult.message}</p>}
                             </motion.div>
                           ) : (
                             <motion.div 
                               key="result"
                               initial={{ opacity: 0, scale: 0.98 }}
                               animate={{ opacity: 1, scale: 1 }}
                               className="space-y-8 pb-10"
                             >
                               <div className="flex items-center justify-between flex-wrap gap-6 border-b border-[#2a2d35] pb-6">
                                  <div className="space-y-1">
                                    <h3 className={`text-3xl font-black tracking-tight flex items-center gap-3 ${executionResult.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                                       {executionResult.status}
                                       {executionResult.type === 'success' ? <CheckCircle className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                                    </h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Execution Verdict</p>
                                  </div>

                                  {executionResult.isSubmission && (
                                    <div className="flex items-center gap-4">
                                       <div className="text-right">
                                          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Final Score</p>
                                          <div className="text-4xl font-black text-white bg-[#1a1c23] px-4 py-2 rounded-2xl border border-[#2a2d35] shadow-lg">
                                            {executionResult.score !== undefined ? executionResult.score : '--'}
                                          </div>
                                       </div>
                                    </div>
                                  )}
                               </div>

                                {executionResult.total > 0 && (
                                 <div className="flex gap-4 flex-wrap mb-6">
                                    <div className="bg-[#181a20] border border-emerald-500/20 px-6 py-4 rounded-2xl flex flex-col gap-1 shadow-lg ring-1 ring-emerald-500/10">
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Test Cases Passed</span>
                                      <span className={`text-2xl font-black ${executionResult.passed === executionResult.total ? "text-emerald-400" : "text-amber-400"}`}>
                                        {executionResult.passed} <span className="text-slate-600 font-medium">/</span> {executionResult.total}
                                      </span>
                                    </div>
                                    {(executionResult.executionTime !== undefined || executionResult.memoryUsed !== undefined) && (
                                      <>
                                        <div className="bg-[#181a20] border border-[#2a2d35] px-6 py-4 rounded-2xl flex flex-col gap-1 shadow-sm">
                                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Runtime</span>
                                          <span className="text-xl font-black text-indigo-400">{executionResult.executionTime || 0} ms</span>
                                        </div>
                                        <div className="bg-[#181a20] border border-[#2a2d35] px-6 py-4 rounded-2xl flex flex-col gap-1 shadow-sm">
                                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Memory</span>
                                          <span className="text-xl font-black text-indigo-400">{(executionResult.memoryUsed || 0).toFixed(2)} KB</span>
                                        </div>
                                      </>
                                    )}
                                    <div className="bg-[#181a20] border border-[#2a2d35] px-6 py-4 rounded-2xl flex flex-col gap-1 shadow-sm">
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mode</span>
                                      <span className="text-xl font-black text-indigo-400 uppercase tracking-wider text-xs flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${executionResult.isSubmission ? 'bg-indigo-500 animate-pulse' : 'bg-slate-500'}`}></div>
                                        {executionResult.isSubmission ? (executionResult.isPractice ? 'Practice' : 'Official') : 'Trial'}
                                      </span>
                                    </div>
                                 </div>
                                )}
                               
                               {!executionResult.isAnalysis && executionResult.type === 'error' && (executionResult.status.includes('Error') || executionResult.status === 'Wrong Answer') && (
                                 <motion.div 
                                   initial={{ y: 20, opacity: 0 }} 
                                   animate={{ y: 0, opacity: 1 }} 
                                   className={`${executionResult.status === 'Wrong Answer' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'} border rounded-2xl p-6 mb-8 relative overflow-hidden group`}
                                 >
                                    <div className={`absolute top-0 left-0 w-1.5 h-full ${executionResult.status === 'Wrong Answer' ? 'bg-amber-500/50' : 'bg-red-500/50'}`}></div>
                                    <div className="flex items-start gap-4">
                                      <div className={`w-12 h-12 rounded-2xl ${executionResult.status === 'Wrong Answer' ? 'bg-amber-500/20' : 'bg-red-500/20'} flex items-center justify-center shrink-0`}>
                                        {executionResult.status === 'Wrong Answer' ? <Activity className="w-6 h-6 text-amber-500" /> : <XCircle className="w-6 h-6 text-red-500" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className={`text-lg font-black ${executionResult.status === 'Wrong Answer' ? 'text-amber-400' : 'text-red-400'} mb-1 uppercase tracking-tight flex items-center gap-2`}>
                                          {executionResult.status}
                                          <span className={`text-[10px] ${executionResult.status === 'Wrong Answer' ? 'bg-amber-500' : 'bg-red-500'} text-white px-2 py-0.5 rounded-full font-black`}>
                                            {executionResult.status === 'Wrong Answer' ? 'INCORRECT' : 'ERROR'}
                                          </span>
                                        </h4>
                                        <p className="text-sm text-slate-400 font-medium mb-4 leading-relaxed">
                                          {executionResult.status === 'Wrong Answer' 
                                            ? "Your program executed successfully, but it didn't produce the expected output for all test cases." 
                                            : executionResult.status === 'Timeout Error'
                                            ? "Your program exceeded the execution time limit. Consider optimizing your algorithm."
                                            : `Your program encountered an issue during ${['Compilation Error', 'Syntax Error'].includes(executionResult.status) ? 'compilation' : 'execution'}. Review the compiler/runtime output below.`}
                                        </p>
                                        
                                        {executionResult.status === 'Wrong Answer' && !testCases[activeTestCaseIdx]?.isHidden ? (
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Expected</p>
                                              <div className="bg-[#12141a] rounded-xl border border-white/5 p-3 font-mono text-xs text-emerald-400 shadow-inner overflow-x-auto whitespace-pre">
                                                {testCases[activeTestCaseIdx]?.expectedOutput || 'N/A'}
                                              </div>
                                            </div>
                                            <div className="space-y-2">
                                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Received</p>
                                              <div className="bg-[#12141a] rounded-xl border border-white/5 p-3 font-mono text-xs text-red-400 shadow-inner overflow-x-auto whitespace-pre">
                                                {testCases[activeTestCaseIdx]?.actualOutput || 'N/A'}
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="space-y-2">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Compiler / Runtime Output</p>
                                            <div className={`bg-[#12141a] rounded-xl border ${executionResult.status === 'Wrong Answer' ? 'border-amber-500/10 text-amber-300' : 'border-red-500/10 text-red-300'} p-4 font-mono text-xs overflow-x-auto whitespace-pre-wrap selection:bg-red-500/30 ring-1 ring-inset ring-white/5 shadow-inner leading-relaxed`}>
                                              {testCases[activeTestCaseIdx]?.actualOutput || executionResult.body || 'No detailed message available.'}
                                            </div>
                                          </div>
                                        )}
                                        
                                        <button 
                                          onClick={() => {
                                            const content = executionResult.status === 'Wrong Answer' 
                                              ? `Expected: ${testCases[activeTestCaseIdx]?.expectedOutput}\nActual: ${testCases[activeTestCaseIdx]?.actualOutput}`
                                              : (testCases[activeTestCaseIdx]?.actualOutput || executionResult.body || '');
                                            navigator.clipboard.writeText(content);
                                          }}
                                          className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                                        >
                                          <RefreshCw className="w-3 h-3" /> Copy Details for Debugging
                                        </button>
                                      </div>
                                    </div>
                                 </motion.div>
                               )}

                               {executionResult.isSubmission && executionResult.type === 'success' && (
                                 <motion.div 
                                   initial={{ y: 20, opacity: 0 }} 
                                   animate={{ y: 0, opacity: 1 }} 
                                   className="flex items-center gap-3 text-indigo-400 font-bold bg-indigo-500/10 px-6 py-4 rounded-2xl border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.1)] mb-6"
                                 >
                                   <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></div>
                                   <span>Excellent work! Submission accepted and recorded.</span>
                                 </motion.div>
                               )}

                               {executionResult.isAnalysis && (
                                 <motion.div 
                                   initial={{ y: 20, opacity: 0 }} 
                                   animate={{ y: 0, opacity: 1 }} 
                                   className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 mb-8 relative overflow-hidden"
                                 >
                                   <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500/50"></div>
                                   <h4 className="text-lg font-black text-indigo-400 mb-6 uppercase tracking-tight flex items-center gap-2">
                                     <Cpu className="w-5 h-5"/> Gemini AI Assessment
                                   </h4>
                                   
                                   {isAnalyzing ? (
                                     <div className="flex flex-col items-center justify-center py-10 gap-4">
                                       <Clock className="w-12 h-12 text-indigo-400 animate-spin opacity-50" />
                                       <p className="text-slate-400 font-medium animate-pulse text-center">
                                         {executionResult.status === 'Analyzing...' ? 'Gemini is examining your code for complexity, logic, and potential enhancements...' : executionResult.status}
                                       </p>
                                     </div>
                                   ) : aiAnalysisResult ? (
                                     <>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                         <div className="bg-[#12141a] p-5 rounded-xl border border-indigo-500/10 shadow-inner">
                                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Clock className="w-3 h-3 text-emerald-400"/> Time Complexity</p>
                                           <p className="text-sm text-slate-300 font-mono leading-relaxed">{aiAnalysisResult.timeComplexity}</p>
                                         </div>
                                         <div className="bg-[#12141a] p-5 rounded-xl border border-indigo-500/10 shadow-inner">
                                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Cpu className="w-3 h-3 text-cyan-400"/> Space Complexity</p>
                                           <p className="text-sm text-slate-300 font-mono leading-relaxed">{aiAnalysisResult.spaceComplexity}</p>
                                         </div>
                                       </div>
                                       
                                       <div className="space-y-4">
                                         {[
                                          { label: 'Time Complexity', value: aiAnalysisResult.timeComplexity, icon: Clock, color: 'text-blue-400' },
                                          { label: 'Space Complexity', value: aiAnalysisResult.spaceComplexity, icon: Layers, color: 'text-purple-400' },
                                          { label: 'Readability', value: aiAnalysisResult.readability, icon: Eye, color: 'text-emerald-400' },
                                          { label: 'Naming Suggestions', value: aiAnalysisResult.naming, icon: Edit3, color: 'text-rose-400' },
                                          { label: 'Optimization', value: aiAnalysisResult.optimization, icon: TrendingUp, color: 'text-cyan-400' },
                                          { label: 'Possible Bugs', value: aiAnalysisResult.bugs, icon: Bug, color: 'text-orange-400' },
                                          { label: 'Best Practices', value: aiAnalysisResult.bestPractices, icon: ShieldCheck, color: 'text-indigo-400' }
                                         ].map((item, id) => item.value && (
                                           <div key={id} className="bg-[#12141a] p-5 rounded-xl border border-white/5 shadow-inner">
                                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">{item.icon && <item.icon className={`w-4 h-4 ${item.color}`}/>} {item.label}</p>
                                             <p className="text-sm text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">{item.value}</p>
                                           </div>
                                         ))}
                                       </div>
                                     </>
                                   ) : (
                                     <div className="p-10 bg-red-500/5 border border-red-500/10 rounded-2xl flex flex-col items-center justify-center gap-4 text-center">
                                       <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                                         <AlertCircle className="w-8 h-8 text-red-500" />
                                       </div>
                                       <div>
                                         <h5 className="text-red-400 font-bold mb-1">Analysis Failed</h5>
                                         <p className="text-slate-500 text-sm max-w-sm">
                                           {executionResult.message || 'Could not complete AI analysis at this time. Please check your connection and try again.'}
                                         </p>
                                       </div>
                                       <button 
                                         onClick={handleAnalysis}
                                         className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
                                       >
                                         Try Again
                                       </button>
                                     </div>
                                   )}
                                 </motion.div>
                               )}

                               {!executionResult.isAnalysis && (
                                 <div className="space-y-4">
                                   <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Detailed Breakdown</p>
                                   <div className="flex gap-2.5 flex-wrap">
                                      {testCases.map((tc, idx) => (
                                        <button 
                                          key={idx} 
                                          onClick={() => setActiveTestCaseIdx(idx)} 
                                          className={`px-5 py-2.5 flex items-center gap-3 text-xs font-black rounded-xl transition-all border-2 ${
                                            activeTestCaseIdx === idx 
                                            ? (tc.passed ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.1)]' : 'bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_20px_rgba(248,113,113,0.1)]') 
                                            : 'bg-[#181a20] border-[#2a2d35] text-slate-500 hover:border-slate-500 hover:text-slate-300'
                                          }`}
                                        >
                                          <div className={`w-2 h-2 rounded-full ${tc.passed ? 'bg-emerald-500' : 'bg-red-500'} ${activeTestCaseIdx === idx ? 'animate-pulse' : ''}`}></div>
                                          Case {idx + 1}
                                          {tc.isHidden && <span className="text-[8px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded ml-1 uppercase">Hidden</span>}
                                        </button>
                                       ))}
                                   </div>
                                 </div>
                               )}

                                   <div className="grid grid-cols-1 gap-6 mt-8">
                                      {testCases[activeTestCaseIdx]?.isHidden ? (
                                        <div className="bg-[#14151a] p-10 rounded-2xl border border-[#2a2d35] flex flex-col items-center justify-center gap-4 text-center">
                                          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                                            <AlertCircle className="w-6 h-6 text-slate-500" />
                                          </div>
                                          <div>
                                            <p className="text-white font-bold">Details are hidden for this test case</p>
                                            <p className="text-slate-500 text-xs mt-1">This test case is evaluating your solution against private benchmarks.</p>
                                          </div>
                                          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${testCases[activeTestCaseIdx]?.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                            Status: {testCases[activeTestCaseIdx]?.passed ? 'Passed' : 'Failed'}
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="space-y-3">
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                              <Terminal className="w-3.5 h-3.5" /> Input
                                            </p>
                                            <div className="bg-[#14151a] p-5 rounded-2xl border border-[#2a2d35] font-mono text-sm text-[#a5b4fc] shadow-inner min-h-[60px] whitespace-pre overflow-x-auto">
                                              {testCases[activeTestCaseIdx]?.input || <span className="italic opacity-50 text-xs">No input data</span>}
                                            </div>
                                          </div>

                                          <div className="space-y-3">
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                              <Code2 className="w-3.5 h-3.5" /> Actual Output
                                            </p>
                                            <div className={`p-5 rounded-2xl border font-mono text-sm shadow-inner min-h-[100px] leading-relaxed transition-colors whitespace-pre overflow-x-auto ${testCases[activeTestCaseIdx]?.passed ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' : 'bg-red-500/5 border-red-500/20 text-red-300 whitespace-pre-wrap'}`}>
                                              {testCases[activeTestCaseIdx]?.actualOutput || (testCases[activeTestCaseIdx]?.error ? testCases[activeTestCaseIdx]?.errorType : <span className="italic opacity-50 text-xs text-slate-500">No output captured</span>)}
                                            </div>
                                          </div>

                                          <div className="space-y-3">
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                              <Check className="w-3.5 h-3.5" /> Expected Output
                                            </p>
                                            <div className="bg-[#14151a] p-5 rounded-2xl border border-[#2a2d35] font-mono text-sm text-[#6ee7b7] shadow-inner min-h-[60px] whitespace-pre overflow-x-auto">
                                              {testCases[activeTestCaseIdx]?.expectedOutput || <span className="italic opacity-50 text-xs">No output specified</span>}
                                            </div>
                                          </div>
                                        </>
                                      )}
                                   </div>

                             </motion.div>
                           )}
                         </AnimatePresence>
                       </div>
                     )}

                  </div>
               </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default LeetCodeWorkspace;
