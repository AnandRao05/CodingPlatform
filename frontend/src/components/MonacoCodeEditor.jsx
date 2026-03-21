import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import useAuthStore from '../stores/authStore';
import { ChevronDown, Play, Send, Settings, Download, Upload, Copy, RotateCcw } from 'lucide-react';
    
const MonacoCodeEditor = ({ onSubmit, isSubmitting, problem, assignment }) => {
  const { getAuthHeaders, API_BASE_URL } = useAuthStore();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [customInput, setCustomInput] = useState('');
  const [executionResult, setExecutionResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState({ activeTab: 'input' });
  const [fontSize, setFontSize] = useState(14);
  const [theme, setTheme] = useState('vs-dark');
  const [savedTestCases, setSavedTestCases] = useState([]);
  const [currentTestCase, setCurrentTestCase] = useState('');
  const [testCases, setTestCases] = useState([
    { id: 1, input: '', expectedOutput: '', name: 'Test Case 1', passed: null, actualOutput: '' }
  ]);
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [runAllTests, setRunAllTests] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  // Language options with Monaco language IDs and enhanced templates
  const languages = [
    {
      id: 'javascript',
      name: 'JavaScript',
      monacoId: 'javascript',
      judge0Id: 63,
      defaultCode: `function solution() {
    // Write your solution here
    // Example: Two Sum problem
    // Given an array of integers and a target sum,
    // return indices of two numbers that add up to target

    // Your code here

}

// Test the function
console.log(solution());`,
      icon: '🟨'
    },
    {
      id: 'python',
      name: 'Python',
      monacoId: 'python',
      judge0Id: 71,
      defaultCode: `def solution():
    """
    Write your solution here
    Example: Two Sum problem
    Given an array of integers and a target sum,
    return indices of two numbers that add up to target
    """
    # Your code here
    pass

if __name__ == "__main__":
    result = solution()
    print(result)`,
      icon: '🐍'
    },
    {
      id: 'java',
      name: 'Java',
      monacoId: 'java',
      judge0Id: 62,
      defaultCode: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        // Write your solution here
        // Example: Two Sum problem
        // Given an array of integers and a target sum,
        // return indices of two numbers that add up to target

        Solution sol = new Solution();
        // Test your solution
        System.out.println("Solution result: " + sol.solution());
    }

    public Object solution() {
        // Your code here
        return null;
    }
}`,
      icon: '☕'
    },
    {
      id: 'cpp',
      name: 'C++',
      monacoId: 'cpp',
      judge0Id: 54,
      defaultCode: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

class Solution {
public:
    // Write your solution here
    // Example: Two Sum problem
    // Given an array of integers and a target sum,
    // return indices of two numbers that add up to target

    vector<int> solution() {
        // Your code here
        return {};
    }
};

int main() {
    Solution sol;
    vector<int> result = sol.solution();

    cout << "Solution result: [";
    for (size_t i = 0; i < result.size(); ++i) {
        cout << result[i];
        if (i < result.size() - 1) cout << ",";
    }
    cout << "]" << endl;

    return 0;
}`,
      icon: '🔵'
    },
    {
      id: 'c',
      name: 'C',
      monacoId: 'c',
      judge0Id: 50,
      defaultCode: `#include <stdio.h>
#include <stdlib.h>

// Write your solution here
// Example: Two Sum problem
// Given an array of integers and a target sum,
// return indices of two numbers that add up to target

int* solution() {
    // Your code here
    // Note: In C, you need to manage memory carefully
    return NULL;
}

int main() {
    int* result = solution();

    if (result != NULL) {
        printf("Solution found at indices: [%d, %d]\\n", result[0], result[1]);
        free(result);
    } else {
        printf("No solution found\\n");
    }

    return 0;
}`,
      icon: '🟦'
    },
    {
      id: 'csharp',
      name: 'C#',
      monacoId: 'csharp',
      judge0Id: 51,
      defaultCode: `using System;
using System.Collections.Generic;

class Solution {
    public static void Main(string[] args) {
        // Write your solution here
        // Example: Two Sum problem
        // Given an array of integers and a target sum,
        // return indices of two numbers that add up to target

        Solution sol = new Solution();
        var result = sol.TwoSum();

        Console.WriteLine("Solution result: [" + string.Join(",", result) + "]");
    }

    public int[] TwoSum() {
        // Your code here
        return new int[0];
    }
}`,
      icon: '🟪'
    },
    {
      id: 'go',
      name: 'Go',
      monacoId: 'go',
      judge0Id: 60,
      defaultCode: `package main

import (
    "fmt"
)

// Write your solution here
// Example: Two Sum problem
// Given an array of integers and a target sum,
// return indices of two numbers that add up to target

func solution() []int {
    // Your code here
    return []int{}
}

func main() {
    result := solution()
    fmt.Printf("Solution result: %v\\n", result)
}`,
      icon: '🔷'
    },
    {
      id: 'rust',
      name: 'Rust',
      monacoId: 'rust',
      judge0Id: 73,
      defaultCode: `fn main() {
    // Write your solution here
    // Example: Two Sum problem
    // Given an array of integers and a target sum,
    // return indices of two numbers that add up to target

    let result = solution();
    println!("Solution result: {:?}", result);
}

fn solution() -> Vec<i32> {
    // Your code here
    Vec::new()
}`,
      icon: '🦀'
    },
    {
      id: 'ruby',
      name: 'Ruby',
      monacoId: 'ruby',
      judge0Id: 72,
      defaultCode: `def solution
    # Write your solution here
    # Example: Two Sum problem
    # Given an array of integers and a target sum,
    # return indices of two numbers that add up to target

    # Your code here
    []
end

# Test the solution
result = solution
puts "Solution result: #{result.inspect}"`,
      icon: '💎'
    },
    {
      id: 'php',
      name: 'PHP',
      monacoId: 'php',
      judge0Id: 68,
      defaultCode: `<?php

// Write your solution here
// Example: Two Sum problem
// Given an array of integers and a target sum,
// return indices of two numbers that add up to target

function solution() {
    // Your code here
    return [];
}

// Test the solution
$result = solution();
echo "Solution result: " . json_encode($result) . "\\n";

?>`,
      icon: '🐘'
    },
    {
      id: 'typescript',
      name: 'TypeScript',
      monacoId: 'typescript',
      judge0Id: 74,
      defaultCode: `function solution(): number[] {
    // Write your solution here
    // Example: Two Sum problem
    // Given an array of integers and a target sum,
    // return indices of two numbers that add up to target

    // Your code here
    return [];
}

// Test the function
const result = solution();
console.log("Solution result:", result);`,
      icon: '🔷'
    }
  ];

  // Set default code when language changes
  useEffect(() => {
    if (!code) {
      const selectedLang = languages.find(lang => lang.id === language);
      if (selectedLang) {
        setCode(selectedLang.defaultCode);
      }
    }
  }, [language, code]);

  // Editor mount handler
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure Monaco Editor themes
    monaco.editor.defineTheme('customDark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        // Syntax error highlighting
        { token: 'syntax-error', foreground: 'FF0000', fontStyle: 'bold underline' },
      ],
      colors: {
        'editor.background': '#1f2937',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#2d3748',
        'editor.selectionBackground': '#264f78',
        'editorCursor.foreground': '#d4d4d4',
        'editorError.foreground': '#f48771',
        'editorWarning.foreground': '#cca700',
        // Custom syntax error colors
        'editorError.background': '#ff000033',
        'editorError.border': '#ff0000',
      }
    });

    monaco.editor.defineTheme('customLight', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
        { token: 'keyword', foreground: '0000FF' },
        { token: 'string', foreground: 'A31515' },
        { token: 'number', foreground: '098658' },
        // Syntax error highlighting
        { token: 'syntax-error', foreground: 'FF0000', fontStyle: 'bold underline' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#000000',
        'editor.lineHighlightBackground': '#f0f0f0',
        'editor.selectionBackground': '#add6ff',
        'editorCursor.foreground': '#000000',
        'editorError.foreground': '#e45649',
        'editorWarning.foreground': '#cca700',
        // Custom syntax error colors
        'editorError.background': '#ff000033',
        'editorError.border': '#ff0000',
      }
    });

    monaco.editor.setTheme(theme === 'vs-dark' ? 'customDark' : 'customLight');

    // Configure Monaco diagnostics (syntax checking)
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false
    });

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false
    });

    // Enable syntax validation for all supported languages
    const supportedLanguages = ['javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'php', 'ruby'];

    // Configure language-specific validation
    if (language === 'python') {
      monaco.languages.setMonarchTokensProvider('python', {
        tokenizer: {
          root: [
            // Keywords
            [/\b(and|as|assert|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|not|or|pass|raise|return|try|while|with|yield)\b/, 'keyword'],
            // Built-in functions
            [/\b(len|print|input|range|str|int|float|list|dict|set|tuple|open|close|read|write)\b/, 'keyword.control'],
            // Strings
            [/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-terminated string
            [/'([^'\\]|\\.)*$/, 'string.invalid'],  // non-terminated string
            [/"/, 'string', '@string_double'],
            [/'/, 'string', '@string_single'],
            // Comments
            [/#.*$/, 'comment'],
            // Numbers
            [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
            [/\d+[eE][\-+]?\d+/, 'number.float'],
            [/\d+/, 'number'],
            // Identifiers
            [/[a-zA-Z_]\w*/, 'identifier'],
          ],
          string_double: [
            [/[^\\"]+/, 'string'],
            [/\\./, 'string.escape'],
            [/"/, 'string', '@pop']
          ],
          string_single: [
            [/[^\\']+/, 'string'],
            [/\\./, 'string.escape'],
            [/'/, 'string', '@pop']
          ]
        }
      });
    }

    // Add real-time syntax error detection
    const model = editor.getModel();
    if (model) {
      // Listen for content changes to provide real-time feedback
      model.onDidChangeContent(() => {
        const markers = monaco.editor.getModelMarkers({ resource: model.uri });
        const syntaxErrors = markers.filter(marker => marker.severity === monaco.MarkerSeverity.Error);

        // Update editor decorations for syntax errors
        const decorations = syntaxErrors.map(error => ({
          range: new monaco.Range(
            error.startLineNumber,
            error.startColumn,
            error.endLineNumber || error.startLineNumber,
            error.endColumn || error.startColumn + 1
          ),
          options: {
            className: 'syntax-error-decoration',
            hoverMessage: { value: error.message },
            inlineClassName: 'syntax-error-inline'
          }
        }));

        editor.deltaDecorations([], decorations);
      });
    }

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRunCode();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Prevent default save behavior
      event.preventDefault();
    });
  };

  // Get Judge0 language ID
  const getJudge0LanguageId = (lang) => {
    const selectedLang = languages.find(l => l.id === lang);
    return selectedLang ? selectedLang.judge0Id : 63; // Default to JavaScript
  };



  // Submit solution handler
  const handleSubmitSolution = () => {
    if (!code.trim()) {
      alert('Please write some code first');
      return;
    }

    if (onSubmit) {
      onSubmit(code, language);
    }
  };

  // Run all test cases
  const handleRunAllTests = async () => {
    if (!code.trim()) {
      alert('Please write some code first');
      return;
    }

    setIsRunning(true);
    setExecutionResult(null);
    setRunAllTests(true);
    setConsoleLogs([]); // Clear console logs

    const updatedTestCases = [...testCases];
    const logs = [];

    logs.push({
      id: Date.now(),
      type: 'info',
      content: `Running ${testCases.length} test case(s) with ${languages.find(l => l.id === language)?.name}...`,
      timestamp: new Date().toLocaleTimeString()
    });

    for (let i = 0; i < updatedTestCases.length; i++) {
      const testCase = updatedTestCases[i];

      logs.push({
        id: Date.now() + i + 1,
        type: 'info',
        content: `Test Case ${i + 1}: Running...`,
        timestamp: new Date().toLocaleTimeString()
      });

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
            stdin: testCase.input || ''
          })
        });

        const result = await response.json();

        // Backend always returns 200 with structured { success, type, message, output }
        if (result.success) {
          const actualOutput = (result.output || result.stdout || '').trim();
          const expectedOutput = testCase.expectedOutput.trim();
          const passed = actualOutput === expectedOutput;

          updatedTestCases[i] = {
            ...testCase,
            actualOutput,
            passed,
            hasError: false
          };

          logs.push({
            id: Date.now() + i + 200,
            type: passed ? 'success' : 'error',
            content: `Test Case ${i + 1}: ${passed ? '✅ PASSED' : '❌ FAILED'} - Expected: "${expectedOutput}", Got: "${actualOutput}"`,
            timestamp: new Date().toLocaleTimeString()
          });
        } else {
          const errorMsg = result.message || result.type || 'Execution failed';
          updatedTestCases[i] = {
            ...testCase,
            actualOutput: errorMsg,
            passed: false,
            hasError: true
          };

          logs.push({
            id: Date.now() + i + 300,
            type: 'error',
            content: `Test Case ${i + 1}: 🚫 ${result.type || 'ERROR'} - ${errorMsg}`,
            timestamp: new Date().toLocaleTimeString(),
            isExecutionError: true
          });
        }
      } catch (error) {
        updatedTestCases[i] = {
          ...testCase,
          actualOutput: 'Network error',
          passed: false,
          hasError: true
        };

        logs.push({
          id: Date.now() + i + 400,
          type: 'error',
          content: `Test Case ${i + 1}: 🚫 NETWORK ERROR - Failed to execute test case`,
          timestamp: new Date().toLocaleTimeString(),
          isNetworkError: true
        });
      }
    }

    setTestCases(updatedTestCases);
    setConsoleLogs(logs);
    setRunAllTests(false);
    setIsRunning(false);

    // Calculate overall result
    const passedTests = updatedTestCases.filter(tc => tc.passed).length;
    const totalTests = updatedTestCases.length;
    const hasAnyErrors = updatedTestCases.some(tc => tc.hasError);

    if (hasAnyErrors) {
      logs.push({
        id: Date.now() + 1000,
        type: 'error',
        content: `❌ Test execution completed with errors. ${passedTests}/${totalTests} tests passed.`,
        timestamp: new Date().toLocaleTimeString()
      });
    } else {
      logs.push({
        id: Date.now() + 1000,
        type: 'success',
        content: `✅ All tests completed. ${passedTests}/${totalTests} tests passed.`,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    setConsoleLogs(logs);

    setExecutionResult({
      success: passedTests === totalTests && !hasAnyErrors,
      testResults: updatedTestCases,
      passedTests,
      totalTests,
      message: hasAnyErrors
        ? `Tests completed with errors. ${passedTests}/${totalTests} passed.`
        : `All tests passed! ${passedTests}/${totalTests} successful.`
    });
  };


  // Enhanced run code with console logging and input/output testing
  const handleRunCode = async () => {
    if (!code.trim()) {
      alert('Please write some code first');
      return;
    }

    setIsRunning(true);
    setExecutionResult(null);
    setConsoleLogs([]); // Clear previous console logs

    const logs = [];

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

      // Backend always returns 200 with structured { success, type, message, output }
      if (result.success) {
        setExecutionResult({
          success: true,
          stdout: result.output || result.stdout || '',
          stderr: result.stderr || '',
          compile_output: result.compile_output || '',
          message: result.message || '',
          time: result.time,
          memory: result.memory,
          hasSyntaxErrors: false,
          detailedError: '',
          errorLine: null
        });
      } else {
        const errorMessage = result.message || result.type || 'Execution failed';
        const isTimeout = result.type === 'Timeout Error' || result.timeout;

        logs.push({
          id: Date.now(),
          type: 'error',
          content: `${result.type || 'ERROR'}: ${errorMessage}`,
          timestamp: new Date().toLocaleTimeString(),
          isExecutionError: true,
          isTimeout
        });

        setConsoleLogs(logs);
        setExecutionResult({
          success: false,
          error: errorMessage,
          hasSyntaxErrors: ['Compilation Error', 'Syntax Error'].includes(result.type),
          detailedError: errorMessage,
          isTimeout,
          type: result.type
        });

        // Highlight error line in editor if available
        const detailedError = errorMessage;
        const lineMatch = detailedError.match(/line (\d+)/i) || detailedError.match(/:(\d+):/);
        const errorLine = lineMatch ? parseInt(lineMatch[1]) : null;
        const monaco = monacoRef.current;
        if (errorLine && editorRef.current && monaco) {
          const model = editorRef.current.getModel();
          if (model && errorLine <= model.getLineCount()) {
            const lineLen = model.getLineLength(errorLine) || 1;
            editorRef.current.deltaDecorations([], [{
              range: new monaco.Range(errorLine, 1, errorLine, lineLen + 1),
              options: {
                className: 'syntax-error-line',
                hoverMessage: { value: detailedError },
                linesDecorationsClassName: 'syntax-error-line-decoration'
              }
            }]);
          }
        }
      }
    } catch (error) {
      console.error('Code execution error:', error);

      const logs = [{
        id: Date.now(),
        type: 'error',
        content: '🚫 NETWORK ERROR: Failed to execute code. Please check your connection.',
        timestamp: new Date().toLocaleTimeString(),
        isNetworkError: true
      }];

      setConsoleLogs(logs);
      setExecutionResult({
        success: false,
        error: 'Failed to execute code. Please try again.',
        hasSyntaxErrors: true
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Format code
  const handleFormatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      alert('Code copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  // Reset code to default template
  const handleResetCode = () => {
    const selectedLang = languages.find(lang => lang.id === language);
    if (selectedLang && confirm('Reset code to default template?')) {
      setCode(selectedLang.defaultCode);
    }
  };

  // Add new test case
  const handleAddTestCase = () => {
    const newTestCase = {
      id: Date.now(),
      input: '',
      expectedOutput: '',
      name: `Test Case ${testCases.length + 1}`,
      passed: null,
      actualOutput: ''
    };
    setTestCases(prev => [...prev, newTestCase]);
    setActiveTestCase(testCases.length);
  };

  // Remove test case
  const handleRemoveTestCase = (index) => {
    if (testCases.length > 1) {
      setTestCases(prev => prev.filter((_, i) => i !== index));
      if (activeTestCase >= index && activeTestCase > 0) {
        setActiveTestCase(activeTestCase - 1);
      }
    }
  };

  // Update test case
  const handleUpdateTestCase = (index, field, value) => {
    setTestCases(prev => prev.map((tc, i) =>
      i === index ? { ...tc, [field]: value } : tc
    ));
  };

  // Save current test case
  const handleSaveTestCase = () => {
    if (customInput.trim()) {
      const newTestCase = {
        id: Date.now(),
        name: `Test Case ${savedTestCases.length + 1}`,
        input: customInput,
        language: language
      };
      setSavedTestCases(prev => [...prev, newTestCase]);
      setCurrentTestCase(newTestCase.id.toString());
    }
  };

  // Load saved test case
  const handleLoadTestCase = (testCaseId) => {
    const testCase = savedTestCases.find(tc => tc.id.toString() === testCaseId);
    if (testCase) {
      setCustomInput(testCase.input);
      setLanguage(testCase.language);
    }
  };

  // Export code
  const handleExportCode = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${language === 'cpp' ? 'cpp' : language === 'csharp' ? 'cs' : language}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import code
  const handleImportCode = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCode(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Language Selection */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Language:</label>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-1 pl-8 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
              >
                {languages.map(lang => (
                  <option key={lang.id} value={lang.id}>
                    {lang.icon} {lang.name}
                  </option>
                ))}
              </select>
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                {languages.find(lang => lang.id === language)?.icon}
              </div>
              <ChevronDown size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Editor Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:bg-green-300 transition-colors flex items-center space-x-1"
              title="Run Code (Ctrl+Enter)"
            >
              {isRunning ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play size={12} />
                  <span>Run</span>
                </>
              )}
            </button>


            <button
              onClick={handleSubmitSolution}
              disabled={isSubmitting}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-blue-300 transition-colors flex items-center space-x-1"
              title="Submit Solution"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={12} />
                  <span>Submit</span>
                </>
              )}
            </button>
          </div>




          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              showSettings ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Settings size={14} className="inline mr-1" />
            Settings
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Theme</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="vs-dark">Dark</option>
                  <option value="vs">Light</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Font Size</label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="12">12px</option>
                  <option value="14">14px</option>
                  <option value="16">16px</option>
                  <option value="18">18px</option>
                  <option value="20">20px</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Monaco Editor with Input/Output */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        {/* Input/Output Section - Above Editor */}
        <div className="bg-gray-50 border-b border-gray-200 p-3">
          {/* Tabs for Input/Output */}
          <div className="flex space-x-1 mb-3">
            <button
              onClick={() => setShowSettings(prev => ({ ...prev, activeTab: 'input' }))}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                showSettings.activeTab === 'input' || !showSettings.activeTab
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📥 Input
            </button>
            <button
              onClick={() => setShowSettings(prev => ({ ...prev, activeTab: 'output' }))}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                showSettings.activeTab === 'output'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📤 Output
            </button>
          </div>

          {/* Input Tab Content */}
          {(showSettings.activeTab === 'input' || !showSettings.activeTab) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Program Input:</label>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {customInput.length} chars, {customInput.split('\n').length} lines
                  </span>
                  <button
                    onClick={() => setCustomInput('')}
                    className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                    title="Clear Input"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Enter input for your program here...&#10;&#10;Example:&#10;5&#10;1 2 3 4 5"
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono h-16 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                spellCheck="false"
              />
            </div>
          )}

          {/* Output Tab Content */}
          {showSettings.activeTab === 'output' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Program Output:</label>
                <div className="flex items-center space-x-2">
                  {executionResult && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      executionResult.success
                        ? 'bg-green-100 text-green-800'
                        : executionResult.hasSyntaxErrors
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {executionResult.success ? '✅ Success' :
                       executionResult.hasSyntaxErrors ? '🚫 Error' : '⚠️ Warning'}
                    </span>
                  )}
                  <button
                    onClick={() => setExecutionResult(null)}
                    className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                    title="Clear Output"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className={`w-full px-2 py-1 border rounded text-sm font-mono h-16 overflow-y-auto ${
                executionResult
                  ? executionResult.success
                    ? 'border-green-300 bg-green-50 text-green-800'
                    : executionResult.hasSyntaxErrors
                    ? 'border-red-300 bg-red-50 text-red-800'
                    : 'border-yellow-300 bg-yellow-50 text-yellow-800'
                  : 'border-gray-300 bg-white text-gray-800'
              }`}>
                {executionResult ? (
                  <div className="space-y-1">
                    {executionResult.stdout && (
                      <div>
                        <div className="text-xs font-medium text-gray-600">📤 OUTPUT:</div>
                        <pre className="whitespace-pre-wrap text-xs leading-tight">{executionResult.stdout}</pre>
                      </div>
                    )}
                    {executionResult.stderr && (
                      <div>
                        <div className="text-xs font-medium text-red-600">⚠️ ERROR:</div>
                        <pre className="whitespace-pre-wrap text-xs text-red-700 leading-tight">{executionResult.stderr}</pre>
                      </div>
                    )}
                    {executionResult.compile_output && (
                      <div>
                        <div className="text-xs font-medium text-orange-600">🔧 COMPILATION:</div>
                        <pre className="whitespace-pre-wrap text-xs text-orange-700 leading-tight">{executionResult.compile_output}</pre>
                      </div>
                    )}
                    {!executionResult.stdout && !executionResult.stderr && !executionResult.compile_output && (
                      <div className="text-gray-500 italic text-xs">
                        No output generated
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 italic text-xs h-full flex items-center justify-center">
                    Click "Run Code" to see output here
                  </div>
                )}
              </div>
              {executionResult && (executionResult.time || executionResult.memory) && (
                <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                  {executionResult.time && <span>⏱️ {executionResult.time}s</span>}
                  {executionResult.memory && <span>💾 {executionResult.memory}KB</span>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Monaco Editor with Scroll and Touch Support */}
        <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 hover:scrollbar-thumb-gray-500 touch-pan-y">
          <Editor
            height="880px"
            language={languages.find(lang => lang.id === language)?.monacoId || 'javascript'}
            value={code}
            onChange={setCode}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: fontSize,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'off',
              folding: true,
              lineDecorationsWidth: 10,
              lineNumbersMinChars: 3,
              renderWhitespace: 'selection',
              cursorBlinking: 'blink',
              cursorStyle: 'line',
              contextmenu: true,
              mouseWheelZoom: true,
              multiCursorModifier: 'ctrlCmd',
              quickSuggestions: {
                other: true,
                comments: true,
                strings: true
              },
              parameterHints: {
                enabled: true
              },
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: 'on',
              tabCompletion: 'on',
              wordBasedSuggestions: true,
              snippetSuggestions: 'inline',
              bracketPairColorization: {
                enabled: true
              },
              guides: {
                bracketPairs: true,
                indentation: true
              },
              smoothScrolling: true,
              cursorSmoothCaretAnimation: 'on',
              renderLineHighlight: 'line',
              selectionHighlight: true,
              occurrencesHighlight: true,
              codeLens: true,
              colorDecorators: true,
              lightbulb: {
                enabled: 'on'
              },
              hover: {
                enabled: true,
                delay: 300
              },
              links: true,
              unicodeHighlight: {
                ambiguousCharacters: true
              }
            }}
            theme="vs-dark"
          />
        </div>

      </div>


      {/* Test Cases Section */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Test Cases</h3>
          <div className="flex space-x-2">
            <button
              onClick={handleAddTestCase}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
            >
              + Add Test Case
            </button>
          </div>
        </div>

        {/* Test Case Tabs */}
        <div className="flex space-x-1 mb-4 overflow-x-auto">
          {testCases.map((testCase, index) => (
            <button
              key={testCase.id}
              onClick={() => setActiveTestCase(index)}
              className={`px-3 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap ${
                activeTestCase === index
                  ? 'bg-white text-blue-600 border-t border-l border-r border-gray-300'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              } ${
                testCase.passed === true ? 'bg-green-100 text-green-700' :
                testCase.passed === false ? 'bg-red-100 text-red-700' : ''
              }`}
            >
              {testCase.name}
              {testCase.passed === true && <span className="ml-1 text-green-600">✓</span>}
              {testCase.passed === false && <span className="ml-1 text-red-600">✗</span>}
            </button>
          ))}
        </div>

        {/* Active Test Case Content */}
        {testCases[activeTestCase] && (
          <div className="bg-white p-4 rounded-lg border">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Input:</label>
                  {testCases.length > 1 && (
                    <button
                      onClick={() => handleRemoveTestCase(activeTestCase)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title="Remove Test Case"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <textarea
                  value={testCases[activeTestCase].input}
                  onChange={(e) => handleUpdateTestCase(activeTestCase, 'input', e.target.value)}
                  placeholder="Enter input for this test case..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm h-32 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  spellCheck="false"
                />
              </div>

              {/* Expected Output */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Expected Output:</label>
                <textarea
                  value={testCases[activeTestCase].expectedOutput}
                  onChange={(e) => handleUpdateTestCase(activeTestCase, 'expectedOutput', e.target.value)}
                  placeholder="Enter expected output..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm h-32 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  spellCheck="false"
                />
              </div>
            </div>

            {/* Actual Output (shown after running tests) */}
            {testCases[activeTestCase].actualOutput && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Your Output:</label>
                    <textarea
                      value={testCases[activeTestCase].actualOutput}
                      readOnly
                      className={`w-full px-3 py-2 border rounded-lg font-mono text-sm h-24 resize-none ${
                        testCases[activeTestCase].passed === true
                          ? 'border-green-300 bg-green-50 text-green-800'
                          : testCases[activeTestCase].passed === false
                          ? 'border-red-300 bg-red-50 text-red-800'
                          : 'border-gray-300 bg-gray-50 text-gray-800'
                      }`}
                      spellCheck="false"
                    />
                  </div>
                  <div className="flex items-center justify-center">
                    <div className={`text-center p-4 rounded-lg ${
                      testCases[activeTestCase].passed === true
                        ? 'bg-green-100 text-green-800'
                        : testCases[activeTestCase].passed === false
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {testCases[activeTestCase].passed === true && (
                        <div>
                          <div className="text-2xl">✅</div>
                          <div className="font-medium">PASSED</div>
                        </div>
                      )}
                      {testCases[activeTestCase].passed === false && (
                        <div>
                          <div className="text-2xl">❌</div>
                          <div className="font-medium">FAILED</div>
                        </div>
                      )}
                      {testCases[activeTestCase].passed === null && (
                        <div>
                          <div className="text-2xl">⏳</div>
                          <div className="font-medium">NOT RUN</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Test Results Summary */}
        {executionResult?.testResults && (
          <div className="mt-4 p-4 bg-white rounded-lg border">
            <h4 className="font-medium text-gray-800 mb-2">Test Results Summary</h4>
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-green-600">✅ {executionResult.passedTests} Passed</span>
              <span className="text-red-600">❌ {executionResult.totalTests - executionResult.passedTests} Failed</span>
              <span className="text-gray-600">Total: {executionResult.totalTests}</span>
            </div>
          </div>
        )}
      </div>

      {/* Problem Test Cases (if available) */}
      {problem && problem.testCases && problem.testCases.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Sample Test Cases:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {problem.testCases.filter(tc => !tc.isHidden).slice(0, 4).map((testCase, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">Test Case {index + 1}</span>
                  <button
                    onClick={() => setCustomInput(testCase.input)}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    Use Input
                  </button>
                </div>
                <div className="space-y-1">
                  <div className="text-xs">
                    <span className="font-medium text-gray-600">Input:</span>
                    <div className="font-mono bg-gray-100 p-1 rounded text-xs mt-1 break-all">
                      {testCase.input}
                    </div>
                  </div>
                  <div className="text-xs">
                    <span className="font-medium text-gray-600">Expected:</span>
                    <div className="font-mono bg-green-100 p-1 rounded text-xs mt-1 break-all">
                      {testCase.expectedOutput}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Execution Results */}
      {executionResult && (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          {/* Header */}
          <div className={`px-4 py-3 flex items-center justify-between ${
            executionResult.success ? 'bg-green-50 border-b border-green-200' :
            executionResult.isTimeout ? 'bg-orange-50 border-b border-orange-200' :
            executionResult.hasSyntaxErrors ? 'bg-red-50 border-b border-red-200' : 'bg-yellow-50 border-b border-yellow-200'
          }`}>
            <h3 className={`text-lg font-semibold flex items-center space-x-2 ${
              executionResult.success ? 'text-green-800' :
              executionResult.isTimeout ? 'text-orange-800' :
              executionResult.hasSyntaxErrors ? 'text-red-800' : 'text-yellow-800'
            }`}>
              {executionResult.success ? (
                <>
                  <span className="text-green-600">✅</span>
                  <span>Execution Successful</span>
                </>
              ) : executionResult.isTimeout ? (
                <>
                  <span className="text-orange-600">⏰</span>
                  <span>Execution Timeout</span>
                </>
              ) : executionResult.hasSyntaxErrors ? (
                <>
                  <span className="text-red-600">🚫</span>
                  <span>Syntax Error Detected</span>
                </>
              ) : (
                <>
                  <span className="text-yellow-600">⚠️</span>
                  <span>Execution Warning</span>
                </>
              )}
            </h3>
            <button
              onClick={() => setExecutionResult(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-4 bg-white">
            {executionResult.success ? (
              <div className="space-y-4">
                {/* Performance Metrics */}
                {(executionResult.time || executionResult.memory) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {executionResult.time && (
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">{executionResult.time}s</div>
                        <div className="text-xs text-blue-800">Execution Time</div>
                      </div>
                    )}
                    {executionResult.memory && (
                      <div className="bg-purple-50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-purple-600">{executionResult.memory}KB</div>
                        <div className="text-xs text-purple-800">Memory Used</div>
                      </div>
                    )}
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">✓</div>
                      <div className="text-xs text-green-800">Status</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-gray-600">{languages.find(l => l.id === language)?.name}</div>
                      <div className="text-xs text-gray-800">Language</div>
                    </div>
                  </div>
                )}

                {/* Output Sections */}
                <div className="space-y-3">
                  {executionResult.stdout && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-green-600 font-medium">📤 Standard Output</span>
                      </div>
                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto border border-gray-700">
                        <pre className="whitespace-pre-wrap">{executionResult.stdout}</pre>
                      </div>
                    </div>
                  )}

                  {executionResult.stderr && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-red-600 font-medium">⚠️ Standard Error</span>
                      </div>
                      <div className="bg-red-900 text-red-200 p-4 rounded-lg font-mono text-sm overflow-x-auto border border-red-700">
                        <pre className="whitespace-pre-wrap">{executionResult.stderr}</pre>
                      </div>
                    </div>
                  )}

                  {executionResult.compile_output && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-orange-600 font-medium">🔧 Compilation Output</span>
                      </div>
                      <div className="bg-yellow-900 text-yellow-200 p-4 rounded-lg font-mono text-sm overflow-x-auto border border-yellow-700">
                        <pre className="whitespace-pre-wrap">{executionResult.compile_output}</pre>
                      </div>
                    </div>
                  )}

                  {executionResult.message && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-blue-600 font-medium">💬 System Message</span>
                      </div>
                      <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm border border-blue-200">
                        <pre className="whitespace-pre-wrap">{executionResult.message}</pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className={executionResult.isTimeout ? "text-orange-600 font-medium" : "text-red-600 font-medium"}>
                    {executionResult.isTimeout ? "⏰ Timeout Error" : "❌ Execution Error"}
                  </span>
                </div>
                <div className={`p-4 rounded-lg border ${
                  executionResult.isTimeout
                    ? "bg-orange-50 text-orange-800 border-orange-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}>
                  <pre className="whitespace-pre-wrap text-sm">{executionResult.error}</pre>
                </div>

                {/* Syntax Error Details */}
                {executionResult.hasSyntaxErrors && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h4 className="font-medium text-red-800 mb-2">🔍 Syntax Error Analysis:</h4>
                    <div className="space-y-2">
                      {executionResult.compile_output && (
                        <div>
                          <span className="text-sm font-medium text-red-700">Compilation Error:</span>
                          <div className="mt-1 p-2 bg-red-100 rounded text-sm font-mono text-red-800">
                            {executionResult.compile_output}
                          </div>
                        </div>
                      )}
                      {executionResult.stderr && (
                        <div>
                          <span className="text-sm font-medium text-red-700">Runtime Error:</span>
                          <div className="mt-1 p-2 bg-red-100 rounded text-sm font-mono text-red-800">
                            {executionResult.stderr}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Troubleshooting Tips */}
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-medium text-yellow-800 mb-2">💡 Troubleshooting Tips:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {executionResult.hasSyntaxErrors ? (
                      <>
                        <li>• Check for missing semicolons, brackets, or quotes</li>
                        <li>• Verify variable declarations and function syntax</li>
                        <li>• Ensure proper indentation and code structure</li>
                        <li>• Check for undefined variables or functions</li>
                        <li>• Validate language-specific syntax rules</li>
                      </>
                    ) : (
                      <>
                        <li>• Check your code logic and algorithm</li>
                        <li>• Ensure input format matches expected format</li>
                        <li>• Verify language selection is correct</li>
                        <li>• Check for infinite loops or excessive memory usage</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonacoCodeEditor;