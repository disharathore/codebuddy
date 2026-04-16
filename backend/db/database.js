import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'codebuddy.db');

let db = null;

function persist() {
  if (!db) return;
  const data = db.export();
  writeFileSync(DB_PATH, Buffer.from(data));
}

export async function initDb() {
  const SQL = await initSqlJs();
  if (existsSync(DB_PATH)) {
    db = new SQL.Database(readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA foreign_keys = ON');
  initSchema();
  setInterval(persist, 10000);
  process.on('exit', persist);
  process.on('SIGINT', () => { persist(); process.exit(0); });
  process.on('SIGTERM', () => { persist(); process.exit(0); });
  console.log('✅ Database ready');
}

export function getDb() {
  if (!db) throw new Error('DB not initialized');
  return db;
}

// Convenience wrappers matching better-sqlite3 API style
export function dbRun(sql, params = []) {
  getDb().run(sql, params);
  persist();
}

export function dbGet(sql, params = []) {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function dbAll(sql, params = []) {
  const results = [];
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

// sql.js returns numbers as integers for INTEGER cols but strings sometimes — normalize booleans
function normRow(row) {
  if (!row) return null;
  const out = {};
  for (const k of Object.keys(row)) {
    out[k] = row[k];
  }
  return out;
}

function initSchema() {
  const d = getDb();
  d.run(`CREATE TABLE IF NOT EXISTS problems (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
    difficulty TEXT NOT NULL, language TEXT NOT NULL, category TEXT NOT NULL,
    description TEXT NOT NULL, starter_code TEXT NOT NULL, solution_code TEXT NOT NULL,
    test_cases TEXT NOT NULL, tags TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  )`);
  d.run(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, problem_id TEXT NOT NULL, user_fingerprint TEXT NOT NULL,
    started_at INTEGER DEFAULT (strftime('%s','now')), completed_at INTEGER,
    solved INTEGER DEFAULT 0, hints_used INTEGER DEFAULT 0,
    max_hint_level INTEGER DEFAULT 0, time_spent_seconds INTEGER DEFAULT 0, final_code TEXT
  )`);
  d.run(`CREATE TABLE IF NOT EXISTS hint_requests (
    id TEXT PRIMARY KEY, session_id TEXT NOT NULL, problem_id TEXT NOT NULL,
    hint_level INTEGER NOT NULL, user_code TEXT NOT NULL, hint_response TEXT NOT NULL,
    requested_at INTEGER DEFAULT (strftime('%s','now')), response_time_ms INTEGER
  )`);
  d.run(`CREATE TABLE IF NOT EXISTS code_runs (
    id TEXT PRIMARY KEY, session_id TEXT NOT NULL, code TEXT NOT NULL,
    output TEXT, error TEXT, passed_tests INTEGER DEFAULT 0,
    total_tests INTEGER DEFAULT 0, run_at INTEGER DEFAULT (strftime('%s','now'))
  )`);
  d.run(`CREATE TABLE IF NOT EXISTS analytics (
    id TEXT PRIMARY KEY, event TEXT NOT NULL, session_id TEXT,
    problem_id TEXT, metadata TEXT, created_at INTEGER DEFAULT (strftime('%s','now'))
  )`);
  seedProblems();
  persist();
}

function seedProblems() {
  const row = dbGet('SELECT COUNT(*) as c FROM problems');
  if (row && Number(row.c) > 0) return;

  const problems = [
    {
      id: 'p001', title: 'Two Sum', slug: 'two-sum',
      difficulty: 'beginner', language: 'python', category: 'Arrays',
      description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers that add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

**Example:**
\`\`\`
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
Explanation: nums[0] + nums[1] = 2 + 7 = 9
\`\`\`

**Constraints:**
- 2 ≤ nums.length ≤ 10⁴
- Each input has exactly one solution
- Aim for O(n) time complexity`,
      starter_code: `def two_sum(nums, target):
    """
    Find two numbers that add up to target.
    
    Args:
        nums: List of integers
        target: Target sum
    
    Returns:
        List of two indices [i, j] where nums[i] + nums[j] == target
    """
    # Your solution here
    pass


# Test your solution
print(two_sum([2, 7, 11, 15], 9))   # Expected: [0, 1]
print(two_sum([3, 2, 4], 6))         # Expected: [1, 2]
print(two_sum([3, 3], 6))            # Expected: [0, 1]`,
      solution_code: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`,
      test_cases: JSON.stringify([
        { input: { nums: [2,7,11,15], target: 9 }, expected: [0,1] },
        { input: { nums: [3,2,4], target: 6 }, expected: [1,2] },
        { input: { nums: [3,3], target: 6 }, expected: [0,1] }
      ]),
      tags: JSON.stringify(['hash-map','arrays','beginner-friendly'])
    },
    {
      id: 'p002', title: 'FizzBuzz', slug: 'fizzbuzz',
      difficulty: 'beginner', language: 'python', category: 'Loops',
      description: `Return a list from 1 to n, but:
- Multiples of 3 → **"Fizz"**
- Multiples of 5 → **"Buzz"**
- Multiples of both → **"FizzBuzz"**
- Otherwise → the number itself

**Example:**
\`\`\`
Input: n = 5
Output: [1, 2, "Fizz", 4, "Buzz"]
\`\`\``,
      starter_code: `def fizzbuzz(n):
    """
    Return FizzBuzz list from 1 to n.
    
    Args:
        n: Upper bound (inclusive)
    
    Returns:
        List of strings/integers
    """
    result = []
    # Your solution here
    return result


print(fizzbuzz(15))`,
      solution_code: `def fizzbuzz(n):
    result = []
    for i in range(1, n + 1):
        if i % 15 == 0:
            result.append("FizzBuzz")
        elif i % 3 == 0:
            result.append("Fizz")
        elif i % 5 == 0:
            result.append("Buzz")
        else:
            result.append(i)
    return result`,
      test_cases: JSON.stringify([
        { input: { n: 5 }, expected: [1,2,"Fizz",4,"Buzz"] },
        { input: { n: 3 }, expected: [1,2,"Fizz"] },
        { input: { n: 15 }, expected: [1,2,"Fizz",4,"Buzz","Fizz",7,8,"Fizz","Buzz",11,"Fizz",13,14,"FizzBuzz"] }
      ]),
      tags: JSON.stringify(['loops','modulo','classic'])
    },
    {
      id: 'p003', title: 'Valid Parentheses', slug: 'valid-parentheses',
      difficulty: 'intermediate', language: 'python', category: 'Stacks',
      description: `Given a string \`s\` containing only \`(\`, \`)\`, \`{\`, \`}\`, \`[\`, \`]\`, determine if it is valid.

**Rules:**
1. Open brackets must be closed by the same type.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket.

**Examples:**
\`\`\`
"()"       → True
"()[]{}"   → True
"(]"       → False
"{[]}"     → True
"([)]"     → False
\`\`\``,
      starter_code: `def is_valid(s):
    """
    Check if bracket string is valid.
    
    Args:
        s: String of bracket characters
    
    Returns:
        Boolean - True if valid, False otherwise
    """
    # Your solution here
    pass


print(is_valid("()"))      # True
print(is_valid("()[]{}"))  # True
print(is_valid("(]"))      # False
print(is_valid("{[]}"))    # True`,
      solution_code: `def is_valid(s):
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack`,
      test_cases: JSON.stringify([
        { input: { s: "()" }, expected: true },
        { input: { s: "()[]{}" }, expected: true },
        { input: { s: "(]" }, expected: false },
        { input: { s: "{[]}" }, expected: true }
      ]),
      tags: JSON.stringify(['stack','string','brackets'])
    },
    {
      id: 'p004', title: 'Binary Search', slug: 'binary-search',
      difficulty: 'beginner', language: 'python', category: 'Searching',
      description: `Given a **sorted** array \`nums\` and a target, return the index if found or \`-1\` if not. Must run in **O(log n)**.

**Example:**
\`\`\`
Input: nums = [-1, 0, 3, 5, 9, 12], target = 9
Output: 4

Input: nums = [-1, 0, 3, 5, 9, 12], target = 2
Output: -1
\`\`\``,
      starter_code: `def binary_search(nums, target):
    """
    Search for target in sorted array — O(log n).
    
    Args:
        nums: Sorted list of integers
        target: Integer to find
    
    Returns:
        Index of target, or -1 if not found
    """
    # Your solution here
    pass


print(binary_search([-1, 0, 3, 5, 9, 12], 9))   # Expected: 4
print(binary_search([-1, 0, 3, 5, 9, 12], 2))   # Expected: -1
print(binary_search([1, 3, 5, 7, 9], 7))          # Expected: 3`,
      solution_code: `def binary_search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`,
      test_cases: JSON.stringify([
        { input: { nums: [-1,0,3,5,9,12], target: 9 }, expected: 4 },
        { input: { nums: [-1,0,3,5,9,12], target: 2 }, expected: -1 },
        { input: { nums: [1,3,5,7,9], target: 7 }, expected: 3 }
      ]),
      tags: JSON.stringify(['binary-search','arrays','divide-and-conquer'])
    },
    {
      id: 'p005', title: 'Maximum Subarray', slug: 'maximum-subarray',
      difficulty: 'intermediate', language: 'python', category: 'Dynamic Programming',
      description: `Find the contiguous subarray with the largest sum. Must be **O(n)** — use Kadane's Algorithm.

**Example:**
\`\`\`
Input:  [-2, 1, -3, 4, -1, 2, 1, -5, 4]
Output: 6
Reason: [4, -1, 2, 1] has sum 6
\`\`\`

**Hint:** At each position, decide: extend the current subarray or start fresh?`,
      starter_code: `def max_subarray(nums):
    """
    Find contiguous subarray with maximum sum (Kadane's Algorithm).
    
    Args:
        nums: List of integers (can be negative)
    
    Returns:
        Maximum sum as integer
    """
    # Your solution here
    pass


print(max_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]))  # Expected: 6
print(max_subarray([1]))                                 # Expected: 1
print(max_subarray([5, 4, -1, 7, 8]))                   # Expected: 23`,
      solution_code: `def max_subarray(nums):
    max_sum = current_sum = nums[0]
    for num in nums[1:]:
        current_sum = max(num, current_sum + num)
        max_sum = max(max_sum, current_sum)
    return max_sum`,
      test_cases: JSON.stringify([
        { input: { nums: [-2,1,-3,4,-1,2,1,-5,4] }, expected: 6 },
        { input: { nums: [1] }, expected: 1 },
        { input: { nums: [5,4,-1,7,8] }, expected: 23 }
      ]),
      tags: JSON.stringify(['dynamic-programming','kadane','arrays'])
    },
    {
      id: 'p006', title: 'Reverse a String', slug: 'reverse-string',
      difficulty: 'beginner', language: 'python', category: 'Strings',
      description: `Reverse a list of characters **in-place** using a two-pointer approach. Do not use Python's built-in reverse.

**Example:**
\`\`\`
Input:  ["h","e","l","l","o"]
Output: ["o","l","l","e","h"]
\`\`\`

Modify the list in place — return nothing.`,
      starter_code: `def reverse_string(s):
    """
    Reverse list of characters in-place using two pointers.
    
    Args:
        s: List of characters (modify in place)
    
    Returns:
        None (modifies s in place)
    """
    # Your solution here — two pointer approach
    pass


s1 = ["h","e","l","l","o"]
reverse_string(s1)
print(s1)  # Expected: ['o', 'l', 'l', 'e', 'h']

s2 = ["H","a","n","n","a","h"]
reverse_string(s2)
print(s2)  # Expected: ['h', 'a', 'n', 'n', 'a', 'H']`,
      solution_code: `def reverse_string(s):
    left, right = 0, len(s) - 1
    while left < right:
        s[left], s[right] = s[right], s[left]
        left += 1
        right -= 1`,
      test_cases: JSON.stringify([
        { input: { s: ["h","e","l","l","o"] }, expected: ["o","l","l","e","h"] },
        { input: { s: ["H","a","n","n","a","h"] }, expected: ["h","a","n","n","a","H"] }
      ]),
      tags: JSON.stringify(['two-pointers','strings','in-place'])
    }
  ];

  for (const p of problems) {
    getDb().run(
      `INSERT OR IGNORE INTO problems (id,title,slug,difficulty,language,category,description,starter_code,solution_code,test_cases,tags)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [p.id,p.title,p.slug,p.difficulty,p.language,p.category,p.description,p.starter_code,p.solution_code,p.test_cases,p.tags]
    );
  }
  console.log(`✅ Seeded ${problems.length} problems`);
}
