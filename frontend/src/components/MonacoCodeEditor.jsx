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
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [theme, setTheme] = useState('vs-dark');
  const [showMinimap, setShowMinimap] = useState(true);
  const [wordWrap, setWordWrap] = useState('on');
  const [savedTestCases, setSavedTestCases] = useState([]);
  const [currentTestCase, setCurrentTestCase] = useState('');
  const editorRef = useRef(null);

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

    // Configure Monaco Editor themes
    monaco.editor.defineTheme('customDark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
      ],
      colors: {
        'editor.background': '#1f2937',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#2d3748',
        'editor.selectionBackground': '#264f78',
        'editorCursor.foreground': '#d4d4d4',
        'editorError.foreground': '#f48771',
        'editorWarning.foreground': '#cca700',
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
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#000000',
        'editor.lineHighlightBackground': '#f0f0f0',
        'editor.selectionBackground': '#add6ff',
        'editorCursor.foreground': '#000000',
        'editorError.foreground': '#e45649',
        'editorWarning.foreground': '#cca700',
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

    // Enable syntax validation for supported languages
    const supportedLanguages = ['javascript', 'typescript'];
    if (supportedLanguages.includes(language)) {
      // Monaco provides built-in syntax checking for JS/TS
      // For other languages, syntax errors will be shown after execution
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

  // Run code handler with syntax error detection
  const handleRunCode = async () => {
    if (!code.trim()) {
      alert('Please write some code first');
      return;
    }

    setIsRunning(true);
    setExecutionResult(null);

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

      if (response.ok) {
        // Check for syntax/compilation errors with detailed analysis
        const hasSyntaxErrors = result.compile_output ||
                               (result.stderr && (
                                 result.stderr.toLowerCase().includes('syntax') ||
                                 result.stderr.toLowerCase().includes('error') ||
                                 result.stderr.toLowerCase().includes('undefined') ||
                                 result.stderr.toLowerCase().includes('expected') ||
                                 result.stderr.toLowerCase().includes('unexpected')
                               ));

        // Extract detailed error information
        let detailedError = '';
        if (result.compile_output) {
          detailedError = result.compile_output;
        } else if (result.stderr) {
          detailedError = result.stderr;
        } else if (result.message && result.message.toLowerCase().includes('error')) {
          detailedError = result.message;
        }

        setExecutionResult({
          success: !hasSyntaxErrors,
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          compile_output: result.compile_output || '',
          message: result.message || '',
          time: result.time,
          memory: result.memory,
          hasSyntaxErrors: hasSyntaxErrors,
          detailedError: detailedError
        });
      } else {
        // Handle API errors with more detail
        const errorMessage = result.error || result.message || `Request failed with status code ${response.status}`;
        setExecutionResult({
          success: false,
          error: errorMessage,
          hasSyntaxErrors: true,
          detailedError: errorMessage
        });
      }
    } catch (error) {
      console.error('Code execution error:', error);
      setExecutionResult({
        success: false,
        error: 'Failed to execute code. Please try again.',
        hasSyntaxErrors: true
      });
    } finally {
      setIsRunning(false);
    }
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

          {/* File Operations */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCode}
              className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
              title="Export Code"
            >
              <Download size={14} className="inline mr-1" />
              Export
            </button>

            <label className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 transition-colors cursor-pointer">
              <Upload size={14} className="inline mr-1" />
              Import
              <input
                type="file"
                accept=".js,.py,.java,.cpp,.c,.cs,.go,.rs,.rb,.php,.ts,.txt"
                onChange={handleImportCode}
                className="hidden"
              />
            </label>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Minimap</label>
                <select
                  value={showMinimap.toString()}
                  onChange={(e) => setShowMinimap(e.target.value === 'true')}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="true">Show</option>
                  <option value="false">Hide</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Word Wrap</label>
                <select
                  value={wordWrap}
                  onChange={(e) => setWordWrap(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="on">On</option>
                  <option value="off">Off</option>
                  <option value="wordWrapColumn">Column</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Monaco Editor */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <Editor
          height="400px"
          language={languages.find(lang => lang.id === language)?.monacoId || 'javascript'}
          value={code}
          onChange={setCode}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: showMinimap },
            fontSize: fontSize,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: wordWrap,
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

      {/* Input/Output Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Custom Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Input:
            </label>
            <div className="flex space-x-2">
              <button
                onClick={handleSaveTestCase}
                disabled={!customInput.trim()}
                className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:bg-green-300 transition-colors"
                title="Save Test Case"
              >
                Save
              </button>
              <select
                value={currentTestCase}
                onChange={(e) => handleLoadTestCase(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Load Test Case</option>
                {savedTestCases.filter(tc => tc.language === language).map(tc => (
                  <option key={tc.id} value={tc.id}>
                    {tc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <textarea
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder={`Enter input for your ${languages.find(l => l.id === language)?.name} code...`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm h-32 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            spellCheck="false"
          />
          <div className="text-xs text-gray-500">
            {savedTestCases.filter(tc => tc.language === language).length} saved test cases for {languages.find(l => l.id === language)?.name}
          </div>
        </div>

        {/* Expected Output */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Output:
          </label>
          <textarea
            value={
              executionResult?.hasSyntaxErrors
                ? (executionResult.detailedError || executionResult.compile_output || executionResult.stderr || executionResult.error || 'Syntax error detected')
                : (executionResult?.stdout || '')
            }
            readOnly
            placeholder="Run your code to see output here..."
            className={`w-full px-3 py-2 border rounded-lg font-mono text-sm h-32 focus:outline-none resize-none ${
              executionResult?.hasSyntaxErrors
                ? 'border-red-300 bg-red-50 text-red-800'
                : 'border-gray-300 bg-gray-50 text-gray-800'
            }`}
            spellCheck="false"
          />
          {executionResult && (
            <div className={`text-xs ${
              executionResult.hasSyntaxErrors ? 'text-red-600' : 'text-gray-500'
            }`}>
              {executionResult.hasSyntaxErrors ? 'Syntax error - check details below' : 'Output from last execution'}
            </div>
          )}
        </div>
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

      {/* Action Buttons */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-green-300 transition-colors flex items-center space-x-2 font-medium"
            >
              {isRunning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Run Code</span>
                </>
              )}
            </button>

            <button
              onClick={handleSubmitSolution}
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors flex items-center space-x-2 font-medium"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Submit Solution</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Enter</kbd>
              <span>= Run Code</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Shift</kbd>
              <span>+</span>
              <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Alt</kbd>
              <span>+</span>
              <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">F</kbd>
              <span>= Format</span>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Results */}
      {executionResult && (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          {/* Header */}
          <div className={`px-4 py-3 flex items-center justify-between ${
            executionResult.success ? 'bg-green-50 border-b border-green-200' :
            executionResult.hasSyntaxErrors ? 'bg-red-50 border-b border-red-200' : 'bg-yellow-50 border-b border-yellow-200'
          }`}>
            <h3 className={`text-lg font-semibold flex items-center space-x-2 ${
              executionResult.success ? 'text-green-800' :
              executionResult.hasSyntaxErrors ? 'text-red-800' : 'text-yellow-800'
            }`}>
              {executionResult.success ? (
                <>
                  <span className="text-green-600">✅</span>
                  <span>Execution Successful</span>
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
                  <span className="text-red-600 font-medium">❌ Execution Error</span>
                </div>
                <div className="bg-red-50 text-red-800 p-4 rounded-lg border border-red-200">
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