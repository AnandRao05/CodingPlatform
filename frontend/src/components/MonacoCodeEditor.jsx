import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import useAuthStore from '../stores/authStore';
import { ChevronDown, Play, Send, Settings, Check, AlertCircle, Clock } from 'lucide-react';

const MonacoCodeEditor = ({
  onSubmit,
  isSubmitting = false,
  problem,
  initialCode = '',
  initialLanguage = 'javascript',
  readOnly = false
}) => {
  const { getAuthHeaders, API_BASE_URL } = useAuthStore();

  const languages = [
    {
      id: 'javascript',
      name: 'JavaScript',
      monacoId: 'javascript',
      judge0Id: 63,
      defaultCode: `function solution() {\n    // Write your solution here\n}\n\nconsole.log(solution());`,
      icon: '🟨'
    },
    {
      id: 'python',
      name: 'Python',
      monacoId: 'python',
      judge0Id: 71,
      defaultCode: `def solution():\n    # Write your solution here\n    pass\n\nif __name__ == "__main__":\n    print(solution())`,
      icon: '🐍'
    },
    {
      id: 'java',
      name: 'Java',
      monacoId: 'java',
      judge0Id: 62,
      defaultCode: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        System.out.println(sol.solution());\n    }\n\n    public Object solution() {\n        return null;\n    }\n}`,
      icon: '☕'
    },
    {
      id: 'cpp',
      name: 'C++',
      monacoId: 'cpp',
      judge0Id: 54,
      defaultCode: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    void solution() {\n        // Write your solution here\n    }\n};\n\nint main() {\n    Solution sol;\n    sol.solution();\n    return 0;\n}`,
      icon: '🔵'
    },
    {
      id: 'c',
      name: 'C',
      monacoId: 'c',
      judge0Id: 50,
      defaultCode: `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
      icon: '🟦'
    },
    {
      id: 'csharp',
      name: 'C#',
      monacoId: 'csharp',
      judge0Id: 51,
      defaultCode: `using System;\n\nclass Solution {\n    public static void Main(string[] args) {\n        // Write your solution here\n    }\n}`,
      icon: '🟪'
    },
    {
      id: 'go',
      name: 'Go',
      monacoId: 'go',
      judge0Id: 60,
      defaultCode: `package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your solution here\n    fmt.Println("Hello")\n}`,
      icon: '🔷'
    },
    {
      id: 'rust',
      name: 'Rust',
      monacoId: 'rust',
      judge0Id: 73,
      defaultCode: `fn main() {\n    // Write your solution here\n    println!("Hello");\n}`,
      icon: '🦀'
    },
    {
      id: 'ruby',
      name: 'Ruby',
      monacoId: 'ruby',
      judge0Id: 72,
      defaultCode: `def solution\n    # Write your solution here\nend\n\nputs solution`,
      icon: '💎'
    },
    {
      id: 'php',
      name: 'PHP',
      monacoId: 'php',
      judge0Id: 68,
      defaultCode: `<?php\n\nfunction solution() {\n    // Write your solution here\n}\n\necho solution();\n?>`,
      icon: '🐘'
    },
    {
      id: 'typescript',
      name: 'TypeScript',
      monacoId: 'typescript',
      judge0Id: 74,
      defaultCode: `function solution(): void {\n    // Write your solution here\n}\n\nsolution();`,
      icon: '🔷'
    }
  ];

  const [language, setLanguage] = useState(initialLanguage || 'javascript');
  const [code, setCode] = useState(initialCode || '');
  const [customInput, setCustomInput] = useState('');
  const [executionResult, setExecutionResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('input');
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [theme, setTheme] = useState('vs-dark');
  const [testCases, setTestCases] = useState([
    { id: 1, input: '', expectedOutput: '', name: 'Test Case 1', passed: null, actualOutput: '' }
  ]);
  const [activeTestCase, setActiveTestCase] = useState(0);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  // Sync initialCode and initialLanguage if they change
  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    if (initialLanguage) {
      setLanguage(initialLanguage.toLowerCase());
    }
  }, [initialLanguage]);

  // Set default code template when language changes if code is empty or matches previous default
  useEffect(() => {
    if (!code && !initialCode) {
      const selectedLang = languages.find(lang => lang.id === language);
      if (selectedLang) {
        setCode(selectedLang.defaultCode);
      }
    }
  }, [language, code, initialCode]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.editor.defineTheme('customDark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' }
      ],
      colors: {
        'editor.background': '#1e293b',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#334155',
        'editor.selectionBackground': '#264f78',
        'editorCursor.foreground': '#d4d4d4'
      }
    });

    monaco.editor.defineTheme('customLight', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
        { token: 'keyword', foreground: '0000FF' },
        { token: 'string', foreground: 'A31515' },
        { token: 'number', foreground: '098658' }
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#0f172a',
        'editor.lineHighlightBackground': '#f1f5f9',
        'editor.selectionBackground': '#add6ff',
        'editorCursor.foreground': '#0f172a'
      }
    });

    monaco.editor.setTheme(theme === 'vs-dark' ? 'customDark' : 'customLight');

    // Shortcut: Ctrl+Enter or Cmd+Enter to Run Code
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRunCode();
    });
  };

  // Switch Monaco theme when theme state changes
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme === 'vs-dark' ? 'customDark' : 'customLight');
    }
  }, [theme]);

  const getJudge0LanguageId = (lang) => {
    const selected = languages.find(l => l.id === lang);
    return selected ? selected.judge0Id : 63;
  };

  const handleRunCode = async () => {
    if (!code.trim()) {
      alert('Please write some code first');
      return;
    }

    setIsRunning(true);
    setExecutionResult(null);
    setActiveTab('output');

    try {
      const response = await fetch(`${API_BASE_URL}/code/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          source_code: code,
          language_id: getJudge0LanguageId(language),
          stdin: customInput || ''
        })
      });

      const result = await response.json();

      if (result.success) {
        setExecutionResult({
          success: true,
          stdout: result.output || result.stdout || '',
          stderr: result.stderr || '',
          compile_output: result.compile_output || '',
          message: result.message || '',
          time: result.time,
          memory: result.memory
        });
      } else {
        const errorMessage = result.message || result.type || 'Execution failed';
        const isTimeout = result.type === 'Timeout Error' || !!result.timeout;
        setExecutionResult({
          success: false,
          error: errorMessage,
          isTimeout,
          stderr: result.stderr || '',
          compile_output: result.compile_output || '',
          type: result.type
        });
      }
    } catch (error) {
      setExecutionResult({
        success: false,
        error: 'Network error: Failed to execute code. Please check your connection.'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitSolution = () => {
    if (!code.trim()) {
      alert('Please write some code first');
      return;
    }
    if (onSubmit) {
      onSubmit(code, language);
    }
  };

  const handleAddTestCase = () => {
    const newCase = {
      id: Date.now(),
      input: '',
      expectedOutput: '',
      name: `Test Case ${testCases.length + 1}`,
      passed: null,
      actualOutput: ''
    };
    setTestCases(prev => [...prev, newCase]);
    setActiveTestCase(testCases.length);
  };

  const handleRemoveTestCase = (index) => {
    if (testCases.length > 1) {
      setTestCases(prev => prev.filter((_, i) => i !== index));
      if (activeTestCase >= index && activeTestCase > 0) {
        setActiveTestCase(activeTestCase - 1);
      }
    }
  };

  const handleUpdateTestCase = (index, field, value) => {
    setTestCases(prev => prev.map((tc, i) =>
      i === index ? { ...tc, [field]: value } : tc
    ));
  };

  const currentLangObj = languages.find(l => l.id === language) || languages[0];

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={readOnly}
                className="px-3 py-1.5 pl-8 pr-7 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                {languages.map(lang => (
                  <option key={lang.id} value={lang.id}>
                    {lang.icon} {lang.name}
                  </option>
                ))}
              </select>
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
                {currentLangObj.icon}
              </span>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              title="Run Code (Ctrl+Enter)"
            >
              {isRunning ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>Run</span>
                </>
              )}
            </button>

            {/* Submit Button */}
            {!readOnly && onSubmit && (
              <button
                onClick={handleSubmitSolution}
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                title="Submit Solution"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Submit</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
              showSettings
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Editor Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="vs-dark">Dark (VS Dark)</option>
                <option value="vs">Light (VS Light)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Font Size</label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="12">12px</option>
                <option value="14">14px</option>
                <option value="16">16px</option>
                <option value="18">18px</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Editor & I/O Section */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
        {/* Input/Output Panel Header */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('input')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'input'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📥 Input
            </button>
            <button
              onClick={() => setActiveTab('output')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'output'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📤 Output
              {executionResult && (
                <span className={`w-2 h-2 rounded-full ${executionResult.success ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              )}
            </button>
          </div>

          {activeTab === 'input' && customInput && (
            <button
              onClick={() => setCustomInput('')}
              className="text-xs text-slate-500 hover:text-slate-800 transition"
            >
              Clear Input
            </button>
          )}

          {activeTab === 'output' && executionResult && (
            <button
              onClick={() => setExecutionResult(null)}
              className="text-xs text-slate-500 hover:text-slate-800 transition"
            >
              Clear Output
            </button>
          )}
        </div>

        {/* Input Tab */}
        {activeTab === 'input' && (
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Enter custom standard input (stdin) for your program..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono h-20 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none shadow-inner"
              spellCheck="false"
            />
          </div>
        )}

        {/* Output Tab */}
        {activeTab === 'output' && (
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            {executionResult ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    {executionResult.success ? (
                      <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check size={12} /> Execution Successful
                      </span>
                    ) : executionResult.isTimeout ? (
                      <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock size={12} /> Execution Timeout
                      </span>
                    ) : (
                      <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle size={12} /> {executionResult.type || 'Execution Error'}
                      </span>
                    )}
                  </div>
                  {(executionResult.time || executionResult.memory) && (
                    <div className="text-slate-500 flex items-center gap-3">
                      {executionResult.time && <span>Time: {executionResult.time}s</span>}
                      {executionResult.memory && <span>Memory: {executionResult.memory}KB</span>}
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-xs max-h-40 overflow-y-auto">
                  {executionResult.stdout && (
                    <div>
                      <div className="text-slate-400 text-[10px] font-bold uppercase mb-1">Standard Output:</div>
                      <pre className="text-emerald-400 whitespace-pre-wrap">{executionResult.stdout}</pre>
                    </div>
                  )}
                  {executionResult.stderr && (
                    <div className="mt-2">
                      <div className="text-rose-400 text-[10px] font-bold uppercase mb-1">Standard Error:</div>
                      <pre className="text-rose-300 whitespace-pre-wrap">{executionResult.stderr}</pre>
                    </div>
                  )}
                  {executionResult.compile_output && (
                    <div className="mt-2">
                      <div className="text-amber-400 text-[10px] font-bold uppercase mb-1">Compilation Output:</div>
                      <pre className="text-amber-300 whitespace-pre-wrap">{executionResult.compile_output}</pre>
                    </div>
                  )}
                  {executionResult.error && !executionResult.stderr && !executionResult.compile_output && (
                    <pre className="text-rose-400 whitespace-pre-wrap">{executionResult.error}</pre>
                  )}
                  {!executionResult.stdout && !executionResult.stderr && !executionResult.compile_output && !executionResult.error && (
                    <span className="text-slate-500 italic">No output produced</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-500 italic">
                Click "Run" to test your program and see output here.
              </div>
            )}
          </div>
        )}

        {/* Monaco Editor */}
        <div className="min-h-[400px]">
          <Editor
            height="500px"
            language={currentLangObj.monacoId}
            value={code}
            onChange={(val) => setCode(val || '')}
            onMount={handleEditorDidMount}
            theme={theme === 'vs-dark' ? 'customDark' : 'customLight'}
            options={{
              readOnly: readOnly,
              fontSize: fontSize,
              lineNumbers: 'on',
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              tabSize: 2,
              wordWrap: 'on',
              bracketPairColorization: { enabled: true }
            }}
          />
        </div>
      </div>

      {/* Test Cases Panel */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800">Custom Test Cases</h3>
          <button
            onClick={handleAddTestCase}
            className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 font-semibold px-3 py-1 rounded-lg transition"
          >
            + Add Case
          </button>
        </div>

        {/* Test Case Tab Headers */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {testCases.map((tc, index) => (
            <button
              key={tc.id}
              onClick={() => setActiveTestCase(index)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTestCase === index
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              <span>{tc.name}</span>
              {tc.passed === true && <span className="text-emerald-600">✓</span>}
              {tc.passed === false && <span className="text-rose-600">✗</span>}
            </button>
          ))}
        </div>

        {/* Active Test Case Inputs */}
        {testCases[activeTestCase] && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Configuration</span>
              {testCases.length > 1 && (
                <button
                  onClick={() => handleRemoveTestCase(activeTestCase)}
                  className="text-xs text-rose-500 hover:text-rose-700 font-medium"
                >
                  Delete Case
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Input</label>
                <textarea
                  value={testCases[activeTestCase].input}
                  onChange={(e) => handleUpdateTestCase(activeTestCase, 'input', e.target.value)}
                  placeholder="Input arguments..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs h-24 focus:ring-1 focus:ring-indigo-500 resize-none"
                  spellCheck="false"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Output</label>
                <textarea
                  value={testCases[activeTestCase].expectedOutput}
                  onChange={(e) => handleUpdateTestCase(activeTestCase, 'expectedOutput', e.target.value)}
                  placeholder="Expected return or stdout..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs h-24 focus:ring-1 focus:ring-indigo-500 resize-none"
                  spellCheck="false"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sample Problem Test Cases (if available from props) */}
      {problem?.testCases && problem.testCases.length > 0 && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 mb-3">
            Sample Problem Test Cases
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {problem.testCases.filter(tc => !tc.isHidden).slice(0, 4).map((tc, idx) => (
              <div key={idx} className="bg-white border border-indigo-100 rounded-xl p-3 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Sample #{idx + 1}</span>
                  <button
                    onClick={() => {
                      setCustomInput(tc.input);
                      setActiveTab('input');
                    }}
                    className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold px-2 py-0.5 rounded transition"
                  >
                    Copy to Stdin
                  </button>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-500">Input:</div>
                  <pre className="font-mono bg-slate-50 p-1.5 rounded text-xs text-slate-800 break-all">{tc.input || '(empty)'}</pre>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-500">Expected:</div>
                  <pre className="font-mono bg-emerald-50 p-1.5 rounded text-xs text-emerald-800 break-all">{tc.expectedOutput || '(empty)'}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonacoCodeEditor;