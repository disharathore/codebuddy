import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { dbGet, dbRun } from '../db/database.js';

const router = Router();

function runPython(code, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const tmpFile = join(tmpdir(), `cb_${uuidv4()}.py`);
    try {
      writeFileSync(tmpFile, code, 'utf8');
      exec(`python3 "${tmpFile}"`, { timeout: timeoutMs }, (error, stdout, stderr) => {
        try { unlinkSync(tmpFile); } catch {}
        if (error?.killed) {
          resolve({ stdout: '', stderr: 'Execution timed out (5s limit). Check for infinite loops.', timedOut: true });
        } else {
          resolve({ stdout: (stdout || '').trim(), stderr: (stderr || '').trim(), timedOut: false });
        }
      });
    } catch (err) {
      try { unlinkSync(tmpFile); } catch {}
      resolve({ stdout: '', stderr: err.message, timedOut: false });
    }
  });
}

// Build test-runner Python code per problem
function buildTestRunner(slug, userCode, testCasesJson) {
  const testCases = JSON.parse(testCasesJson);

  // Determine how to call the function based on slug
  const callMap = {
    'two-sum':          `two_sum(inp['nums'], inp['target'])`,
    'fizzbuzz':         `fizzbuzz(inp['n'])`,
    'valid-parentheses':`is_valid(inp['s'])`,
    'binary-search':    `binary_search(inp['nums'], inp['target'])`,
    'maximum-subarray': `max_subarray(inp['nums'])`,
    'reverse-string':   `_reverse_str_run(inp['s'][:])`, // copy so original untouched
  };

  const call = callMap[slug] || `solve(inp)`;

  // Special wrapper for in-place reverse
  const reverseHelper = slug === 'reverse-string' ? `
def _reverse_str_run(s):
    reverse_string(s)
    return s
` : '';

  return `
import json, sys

${userCode}

${reverseHelper}

test_cases = json.loads('''${JSON.stringify(testCases)}''')
passed = 0
total = len(test_cases)
results = []

for i, tc in enumerate(test_cases):
    inp = tc['input']
    expected = tc['expected']
    try:
        result = ${call}
        ok = result == expected
        if ok: passed += 1
        results.append({'test': i+1, 'passed': ok, 'result': str(result), 'expected': str(expected)})
    except Exception as e:
        results.append({'test': i+1, 'passed': False, 'error': str(e), 'expected': str(expected)})

print(json.dumps({'passed': passed, 'total': total, 'results': results}))
`;
}

const BLOCKED = ['import os', 'import sys', 'import subprocess', '__import__', 'open(', 'exec(', 'eval(', 'compile(', 'importlib'];

router.post('/', async (req, res) => {
  try {
    const { session_id, code, run_tests } = req.body;
    if (!session_id || !code)
      return res.status(400).json({ success: false, error: 'session_id and code required' });

    const session = dbGet('SELECT * FROM sessions WHERE id=?', [session_id]);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    // Security check
    const lower = code.toLowerCase();
    for (const b of BLOCKED) {
      if (lower.includes(b.toLowerCase()))
        return res.status(400).json({ success: false, error: `Blocked: "${b}" is not permitted.` });
    }

    let output = null, error = null, passedTests = 0, totalTests = 0, testResults = null;

    if (run_tests) {
      const problem = dbGet('SELECT slug, test_cases FROM problems WHERE id=?', [session.problem_id]);
      const testCode = buildTestRunner(problem.slug, code, problem.test_cases);
      const { stdout, stderr, timedOut } = await runPython(testCode);

      if (timedOut) {
        error = stderr;
      } else if (stderr && !stdout) {
        error = stderr;
      } else {
        try {
          const parsed = JSON.parse(stdout);
          passedTests = parsed.passed;
          totalTests  = parsed.total;
          testResults = parsed.results;
          output = `${passedTests}/${totalTests} tests passed`;
          if (stderr) error = stderr;
        } catch {
          error = stderr || 'Could not parse test output';
          output = stdout;
        }
      }
    } else {
      const { stdout, stderr, timedOut } = await runPython(code);
      output = stdout || null;
      error  = timedOut ? stderr : (stderr || null);
    }

    const solved = !!(run_tests && passedTests > 0 && passedTests === totalTests);

    // Persist run
    const runId = uuidv4();
    dbRun(`INSERT INTO code_runs (id, session_id, code, output, error, passed_tests, total_tests) VALUES (?,?,?,?,?,?,?)`,
      [runId, session_id, code, output, error, passedTests, totalTests]);

    if (solved) {
      dbRun('UPDATE sessions SET solved=1, completed_at=?, final_code=? WHERE id=?',
        [Math.floor(Date.now() / 1000), code, session_id]);
    }

    res.json({ success: true, run_id: runId, output, error, passed_tests: passedTests, total_tests: totalTests, test_results: testResults, solved });

  } catch (err) {
    console.error('Execute error:', err);
    res.status(500).json({ success: false, error: 'Execution failed: ' + err.message });
  }
});

export default router;
