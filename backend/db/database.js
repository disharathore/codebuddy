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
  seedDemoAnalytics();
  persist();
}

function seedProblems() {
  const beforeCount = Number(dbGet('SELECT COUNT(*) as c FROM problems')?.c) || 0;

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
    },
    ...buildExpandedProblemSet()
  ];

  for (const p of problems) {
    getDb().run(
      `INSERT OR IGNORE INTO problems (id,title,slug,difficulty,language,category,description,starter_code,solution_code,test_cases,tags)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [p.id,p.title,p.slug,p.difficulty,p.language,p.category,p.description,p.starter_code,p.solution_code,p.test_cases,p.tags]
    );
  }
  const totalCount = Number(dbGet('SELECT COUNT(*) as c FROM problems')?.c) || problems.length;
  const addedCount = Math.max(0, totalCount - beforeCount);
  console.log(`✅ Problem catalog ready: ${totalCount} total (${addedCount} added this run)`);
}

function buildExpandedProblemSet() {
  const starter = (exampleInput) => `def solve(data):
    # Your solution here
    pass


print(solve(${JSON.stringify(exampleInput)}))`;

  const mk = ({ id, title, slug, difficulty, category, description, tags, exampleInput, solutionCode, tests }) => ({
    id,
    title,
    slug,
    difficulty,
    language: 'python',
    category,
    description,
    starter_code: starter(exampleInput),
    solution_code: solutionCode,
    test_cases: JSON.stringify(tests),
    tags: JSON.stringify(tags)
  });

  return [
    mk({
      id: 'p007', title: 'Palindrome Number', slug: 'palindrome-number', difficulty: 'beginner', category: 'Math',
      description: 'Given an integer n, return true if it reads the same backward.',
      tags: ['math', 'string-conversion'],
      exampleInput: { n: 121 },
      solutionCode: `def solve(data):
    s = str(data['n'])
    return s == s[::-1]`,
      tests: [
        { input: { n: 121 }, expected: true },
        { input: { n: -121 }, expected: false },
        { input: { n: 10 }, expected: false }
      ]
    }),
    mk({
      id: 'p008', title: 'Contains Duplicate', slug: 'contains-duplicate', difficulty: 'beginner', category: 'Hashing',
      description: 'Return true if any value appears at least twice in nums.',
      tags: ['hash-set', 'arrays'],
      exampleInput: { nums: [1, 2, 3, 1] },
      solutionCode: `def solve(data):
    nums = data['nums']
    return len(nums) != len(set(nums))`,
      tests: [
        { input: { nums: [1, 2, 3, 1] }, expected: true },
        { input: { nums: [1, 2, 3, 4] }, expected: false }
      ]
    }),
    mk({
      id: 'p009', title: 'Valid Anagram', slug: 'valid-anagram', difficulty: 'beginner', category: 'Strings',
      description: 'Given strings s and t, return true if t is an anagram of s.',
      tags: ['strings', 'sorting'],
      exampleInput: { s: 'anagram', t: 'nagaram' },
      solutionCode: `def solve(data):
    return sorted(data['s']) == sorted(data['t'])`,
      tests: [
        { input: { s: 'anagram', t: 'nagaram' }, expected: true },
        { input: { s: 'rat', t: 'car' }, expected: false }
      ]
    }),
    mk({
      id: 'p010', title: 'Move Zeroes', slug: 'move-zeroes', difficulty: 'beginner', category: 'Arrays',
      description: 'Move all 0s to the end while preserving the order of non-zero elements.',
      tags: ['two-pointers', 'arrays'],
      exampleInput: { nums: [0, 1, 0, 3, 12] },
      solutionCode: `def solve(data):
    nums = data['nums']
    out = [n for n in nums if n != 0]
    out.extend([0] * (len(nums) - len(out)))
    return out`,
      tests: [
        { input: { nums: [0, 1, 0, 3, 12] }, expected: [1, 3, 12, 0, 0] },
        { input: { nums: [0, 0, 1] }, expected: [1, 0, 0] }
      ]
    }),
    mk({
      id: 'p011', title: 'Missing Number', slug: 'missing-number', difficulty: 'beginner', category: 'Math',
      description: 'Given nums containing n distinct numbers in [0, n], return the missing one.',
      tags: ['math', 'bit-manipulation'],
      exampleInput: { nums: [3, 0, 1] },
      solutionCode: `def solve(data):
    nums = data['nums']
    n = len(nums)
    return n * (n + 1) // 2 - sum(nums)`,
      tests: [
        { input: { nums: [3, 0, 1] }, expected: 2 },
        { input: { nums: [0, 1] }, expected: 2 }
      ]
    }),
    mk({
      id: 'p012', title: 'Best Time to Buy and Sell Stock', slug: 'best-time-buy-sell-stock', difficulty: 'beginner', category: 'Arrays',
      description: 'Find the maximum profit from one buy and one sell.',
      tags: ['greedy', 'arrays'],
      exampleInput: { prices: [7, 1, 5, 3, 6, 4] },
      solutionCode: `def solve(data):
    prices = data['prices']
    min_price = float('inf')
    best = 0
    for p in prices:
      if p < min_price:
        min_price = p
      best = max(best, p - min_price)
    return best`,
      tests: [
        { input: { prices: [7, 1, 5, 3, 6, 4] }, expected: 5 },
        { input: { prices: [7, 6, 4, 3, 1] }, expected: 0 }
      ]
    }),
    mk({
      id: 'p013', title: 'Length of Last Word', slug: 'length-of-last-word', difficulty: 'beginner', category: 'Strings',
      description: 'Return the length of the last word in string s.',
      tags: ['strings'],
      exampleInput: { s: 'Hello World' },
      solutionCode: `def solve(data):
    words = data['s'].strip().split()
    return len(words[-1]) if words else 0`,
      tests: [
        { input: { s: 'Hello World' }, expected: 5 },
        { input: { s: '   fly me   to   the moon  ' }, expected: 4 }
      ]
    }),
    mk({
      id: 'p014', title: 'Roman to Integer', slug: 'roman-to-integer', difficulty: 'beginner', category: 'Strings',
      description: 'Convert a Roman numeral string to an integer.',
      tags: ['hash-map', 'strings'],
      exampleInput: { s: 'MCMXCIV' },
      solutionCode: `def solve(data):
    s = data['s']
    vals = {'I':1,'V':5,'X':10,'L':50,'C':100,'D':500,'M':1000}
    total = 0
    for i, ch in enumerate(s):
      if i + 1 < len(s) and vals[ch] < vals[s[i + 1]]:
        total -= vals[ch]
      else:
        total += vals[ch]
    return total`,
      tests: [
        { input: { s: 'III' }, expected: 3 },
        { input: { s: 'MCMXCIV' }, expected: 1994 }
      ]
    }),
    mk({
      id: 'p015', title: 'Transpose Matrix', slug: 'transpose-matrix', difficulty: 'beginner', category: 'Matrices',
      description: 'Return the transpose of a matrix.',
      tags: ['matrices'],
      exampleInput: { matrix: [[1, 2, 3], [4, 5, 6]] },
      solutionCode: `def solve(data):
    matrix = data['matrix']
    return [list(col) for col in zip(*matrix)]`,
      tests: [
        { input: { matrix: [[1,2,3],[4,5,6]] }, expected: [[1,4],[2,5],[3,6]] },
        { input: { matrix: [[1,2],[3,4],[5,6]] }, expected: [[1,3,5],[2,4,6]] }
      ]
    }),
    mk({
      id: 'p016', title: 'Climbing Stairs', slug: 'climbing-stairs', difficulty: 'beginner', category: 'Dynamic Programming',
      description: 'Given n steps, return number of distinct ways to climb 1 or 2 steps at a time.',
      tags: ['dp', 'fibonacci'],
      exampleInput: { n: 5 },
      solutionCode: `def solve(data):
    n = data['n']
    a, b = 1, 1
    for _ in range(n):
      a, b = b, a + b
    return a`,
      tests: [
        { input: { n: 2 }, expected: 2 },
        { input: { n: 5 }, expected: 8 }
      ]
    }),
    mk({
      id: 'p017', title: 'Product of Array Except Self', slug: 'product-except-self', difficulty: 'intermediate', category: 'Arrays',
      description: 'Return output where output[i] is product of all nums except nums[i] without division.',
      tags: ['prefix', 'arrays'],
      exampleInput: { nums: [1, 2, 3, 4] },
      solutionCode: `def solve(data):
    nums = data['nums']
    out = [1] * len(nums)
    p = 1
    for i in range(len(nums)):
      out[i] = p
      p *= nums[i]
    s = 1
    for i in range(len(nums) - 1, -1, -1):
      out[i] *= s
      s *= nums[i]
    return out`,
      tests: [
        { input: { nums: [1,2,3,4] }, expected: [24,12,8,6] },
        { input: { nums: [-1,1,0,-3,3] }, expected: [0,0,9,0,0] }
      ]
    }),
    mk({
      id: 'p018', title: 'Top K Frequent Elements', slug: 'top-k-frequent-elements', difficulty: 'intermediate', category: 'Hashing',
      description: 'Return the k most frequent elements in nums.',
      tags: ['hash-map', 'heap'],
      exampleInput: { nums: [1, 1, 1, 2, 2, 3], k: 2 },
      solutionCode: `def solve(data):
    nums, k = data['nums'], data['k']
    freq = {}
    for n in nums:
      freq[n] = freq.get(n, 0) + 1
    ranked = sorted(freq.items(), key=lambda x: (-x[1], x[0]))
    return [n for n, _ in ranked[:k]]`,
      tests: [
        { input: { nums: [1,1,1,2,2,3], k: 2 }, expected: [1,2] },
        { input: { nums: [4,4,4,6,6,7,7,7], k: 1 }, expected: [4] }
      ]
    }),
    mk({
      id: 'p019', title: 'Group Anagrams', slug: 'group-anagrams', difficulty: 'intermediate', category: 'Strings',
      description: 'Group words that are anagrams.',
      tags: ['hash-map', 'strings'],
      exampleInput: { strs: ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'] },
      solutionCode: `def solve(data):
    groups = {}
    for word in data['strs']:
      key = ''.join(sorted(word))
      groups.setdefault(key, []).append(word)
    normalized = [sorted(g) for g in groups.values()]
    return sorted(normalized)`,
      tests: [
        { input: { strs: ['eat','tea','tan','ate','nat','bat'] }, expected: [['ate','eat','tea'], ['bat'], ['nat','tan']] },
        { input: { strs: [''] }, expected: [['']] }
      ]
    }),
    mk({
      id: 'p020', title: 'Longest Substring Without Repeating Characters', slug: 'longest-substring-without-repeating', difficulty: 'intermediate', category: 'Sliding Window',
      description: 'Return the length of the longest substring without repeating characters.',
      tags: ['sliding-window', 'strings'],
      exampleInput: { s: 'abcabcbb' },
      solutionCode: `def solve(data):
    s = data['s']
    seen = {}
    left = 0
    best = 0
    for right, ch in enumerate(s):
      if ch in seen and seen[ch] >= left:
        left = seen[ch] + 1
      seen[ch] = right
      best = max(best, right - left + 1)
    return best`,
      tests: [
        { input: { s: 'abcabcbb' }, expected: 3 },
        { input: { s: 'bbbbb' }, expected: 1 },
        { input: { s: 'pwwkew' }, expected: 3 }
      ]
    }),
    mk({
      id: 'p021', title: 'Daily Temperatures', slug: 'daily-temperatures', difficulty: 'intermediate', category: 'Stacks',
      description: 'For each day, return how many days to wait for a warmer temperature.',
      tags: ['monotonic-stack', 'arrays'],
      exampleInput: { temperatures: [73, 74, 75, 71, 69, 72, 76, 73] },
      solutionCode: `def solve(data):
    t = data['temperatures']
    out = [0] * len(t)
    st = []
    for i, val in enumerate(t):
      while st and t[st[-1]] < val:
        j = st.pop()
        out[j] = i - j
      st.append(i)
    return out`,
      tests: [
        { input: { temperatures: [73,74,75,71,69,72,76,73] }, expected: [1,1,4,2,1,1,0,0] },
        { input: { temperatures: [30,40,50,60] }, expected: [1,1,1,0] }
      ]
    }),
    mk({
      id: 'p022', title: 'Evaluate Reverse Polish Notation', slug: 'evaluate-rpn', difficulty: 'intermediate', category: 'Stacks',
      description: 'Evaluate an arithmetic expression in Reverse Polish Notation.',
      tags: ['stack', 'math'],
      exampleInput: { tokens: ['2', '1', '+', '3', '*'] },
      solutionCode: `def solve(data):
    st = []
    for tok in data['tokens']:
      if tok in ['+', '-', '*', '/']:
        b = st.pop()
        a = st.pop()
        if tok == '+': st.append(a + b)
        elif tok == '-': st.append(a - b)
        elif tok == '*': st.append(a * b)
        else: st.append(int(a / b))
      else:
        st.append(int(tok))
    return st[-1]`,
      tests: [
        { input: { tokens: ['2','1','+','3','*'] }, expected: 9 },
        { input: { tokens: ['4','13','5','/','+'] }, expected: 6 }
      ]
    }),
    mk({
      id: 'p023', title: 'Number of Islands', slug: 'number-of-islands', difficulty: 'intermediate', category: 'Graphs',
      description: 'Given a 2D grid of 1s and 0s, return number of islands.',
      tags: ['dfs', 'grid'],
      exampleInput: { grid: [['1','1','0','0'],['1','0','0','1'],['0','0','1','1']] },
      solutionCode: `def solve(data):
    grid = [row[:] for row in data['grid']]
    if not grid:
      return 0
    r, c = len(grid), len(grid[0])
    seen = set()

    def dfs(i, j):
      if i < 0 or i >= r or j < 0 or j >= c or grid[i][j] != '1' or (i, j) in seen:
        return
      seen.add((i, j))
      dfs(i + 1, j)
      dfs(i - 1, j)
      dfs(i, j + 1)
      dfs(i, j - 1)

    islands = 0
    for i in range(r):
      for j in range(c):
        if grid[i][j] == '1' and (i, j) not in seen:
          islands += 1
          dfs(i, j)
    return islands`,
      tests: [
        { input: { grid: [['1','1','0','0','0'],['1','1','0','0','0'],['0','0','1','0','0'],['0','0','0','1','1']] }, expected: 3 },
        { input: { grid: [['1','1','1'],['0','1','0'],['1','1','1']] }, expected: 1 }
      ]
    }),
    mk({
      id: 'p024', title: 'Coin Change', slug: 'coin-change', difficulty: 'intermediate', category: 'Dynamic Programming',
      description: 'Given coins and amount, return minimum number of coins needed, or -1 if impossible.',
      tags: ['dp'],
      exampleInput: { coins: [1, 2, 5], amount: 11 },
      solutionCode: `def solve(data):
    coins, amount = data['coins'], data['amount']
    dp = [amount + 1] * (amount + 1)
    dp[0] = 0
    for a in range(1, amount + 1):
      for coin in coins:
        if coin <= a:
          dp[a] = min(dp[a], dp[a - coin] + 1)
    return dp[amount] if dp[amount] <= amount else -1`,
      tests: [
        { input: { coins: [1,2,5], amount: 11 }, expected: 3 },
        { input: { coins: [2], amount: 3 }, expected: -1 }
      ]
    }),
    mk({
      id: 'p025', title: 'Longest Increasing Subsequence', slug: 'longest-increasing-subsequence', difficulty: 'intermediate', category: 'Dynamic Programming',
      description: 'Return length of the longest strictly increasing subsequence.',
      tags: ['dp', 'binary-search'],
      exampleInput: { nums: [10, 9, 2, 5, 3, 7, 101, 18] },
      solutionCode: `def solve(data):
    nums = data['nums']
    tails = []
    for num in nums:
      left, right = 0, len(tails)
      while left < right:
        mid = (left + right) // 2
        if tails[mid] < num:
          left = mid + 1
        else:
          right = mid
      if left == len(tails):
        tails.append(num)
      else:
        tails[left] = num
    return len(tails)`,
      tests: [
        { input: { nums: [10,9,2,5,3,7,101,18] }, expected: 4 },
        { input: { nums: [7,7,7,7,7] }, expected: 1 }
      ]
    }),
    mk({
      id: 'p026', title: 'Combination Sum', slug: 'combination-sum', difficulty: 'intermediate', category: 'Backtracking',
      description: 'Return all unique combinations of candidates where numbers sum to target.',
      tags: ['backtracking', 'recursion'],
      exampleInput: { candidates: [2, 3, 6, 7], target: 7 },
      solutionCode: `def solve(data):
    candidates = sorted(data['candidates'])
    target = data['target']
    out = []

    def dfs(start, remain, path):
      if remain == 0:
        out.append(path[:])
        return
      for i in range(start, len(candidates)):
        c = candidates[i]
        if c > remain:
          break
        path.append(c)
        dfs(i, remain - c, path)
        path.pop()

    dfs(0, target, [])
    return sorted(out)`,
      tests: [
        { input: { candidates: [2,3,6,7], target: 7 }, expected: [[2,2,3],[7]] },
        { input: { candidates: [2,3,5], target: 8 }, expected: [[2,2,2,2],[2,3,3],[3,5]] }
      ]
    }),
    mk({
      id: 'p027', title: 'Trapping Rain Water', slug: 'trapping-rain-water', difficulty: 'advanced', category: 'Two Pointers',
      description: 'Given elevation map heights, compute total trapped rain water.',
      tags: ['two-pointers', 'arrays'],
      exampleInput: { heights: [0,1,0,2,1,0,1,3,2,1,2,1] },
      solutionCode: `def solve(data):
    h = data['heights']
    left, right = 0, len(h) - 1
    left_max = right_max = 0
    water = 0
    while left < right:
      if h[left] < h[right]:
        left_max = max(left_max, h[left])
        water += left_max - h[left]
        left += 1
      else:
        right_max = max(right_max, h[right])
        water += right_max - h[right]
        right -= 1
    return water`,
      tests: [
        { input: { heights: [0,1,0,2,1,0,1,3,2,1,2,1] }, expected: 6 },
        { input: { heights: [4,2,0,3,2,5] }, expected: 9 }
      ]
    }),
    mk({
      id: 'p028', title: 'Sliding Window Maximum', slug: 'sliding-window-maximum', difficulty: 'advanced', category: 'Sliding Window',
      description: 'Return the maximum value in each window of size k.',
      tags: ['deque', 'sliding-window'],
      exampleInput: { nums: [1,3,-1,-3,5,3,6,7], k: 3 },
      solutionCode: `def solve(data):
    nums, k = data['nums'], data['k']
    from collections import deque
    dq = deque()
    out = []
    for i, n in enumerate(nums):
      while dq and dq[0] <= i - k:
        dq.popleft()
      while dq and nums[dq[-1]] <= n:
        dq.pop()
      dq.append(i)
      if i >= k - 1:
        out.append(nums[dq[0]])
    return out`,
      tests: [
        { input: { nums: [1,3,-1,-3,5,3,6,7], k: 3 }, expected: [3,3,5,5,6,7] },
        { input: { nums: [1], k: 1 }, expected: [1] }
      ]
    }),
    mk({
      id: 'p029', title: 'Word Ladder Length', slug: 'word-ladder-length', difficulty: 'advanced', category: 'Graphs',
      description: 'Return the length of shortest transformation sequence from begin_word to end_word.',
      tags: ['bfs', 'graphs'],
      exampleInput: { begin_word: 'hit', end_word: 'cog', word_list: ['hot','dot','dog','lot','log','cog'] },
      solutionCode: `def solve(data):
    begin = data['begin_word']
    end = data['end_word']
    words = set(data['word_list'])
    if end not in words:
      return 0
    queue = [(begin, 1)]
    seen = {begin}
    while queue:
      word, dist = queue.pop(0)
      if word == end:
        return dist
      for i in range(len(word)):
        for ch in 'abcdefghijklmnopqrstuvwxyz':
          nxt = word[:i] + ch + word[i+1:]
          if nxt in words and nxt not in seen:
            seen.add(nxt)
            queue.append((nxt, dist + 1))
    return 0`,
      tests: [
        { input: { begin_word: 'hit', end_word: 'cog', word_list: ['hot','dot','dog','lot','log','cog'] }, expected: 5 },
        { input: { begin_word: 'hit', end_word: 'cog', word_list: ['hot','dot','dog','lot','log'] }, expected: 0 }
      ]
    }),
    mk({
      id: 'p030', title: 'Median of Two Sorted Arrays', slug: 'median-two-sorted-arrays', difficulty: 'advanced', category: 'Searching',
      description: 'Given two sorted arrays, return their median.',
      tags: ['binary-search', 'arrays'],
      exampleInput: { nums1: [1, 3], nums2: [2] },
      solutionCode: `def solve(data):
    merged = sorted(data['nums1'] + data['nums2'])
    n = len(merged)
    if n % 2 == 1:
      return float(merged[n // 2])
    return (merged[n // 2 - 1] + merged[n // 2]) / 2.0`,
      tests: [
        { input: { nums1: [1,3], nums2: [2] }, expected: 2.0 },
        { input: { nums1: [1,2], nums2: [3,4] }, expected: 2.5 }
      ]
    })
  ];
}

function seedDemoAnalytics() {
  const row = dbGet('SELECT COUNT(*) as c FROM analytics');
  if (row && Number(row.c) > 0) return;

  const problemIds = dbAll('SELECT id FROM problems ORDER BY id').map(problem => problem.id);
  if (problemIds.length === 0) return;

  const now = Math.floor(Date.now() / 1000);
  const sessions = [];

  for (let index = 0; index < 50; index += 1) {
    const problemId = problemIds[index % problemIds.length];
    const startedAt = now - ((49 - index) * 6 * 3600) - ((index % 6) * 900);

    let hintsUsed = 0;
    let maxHintLevel = 0;
    let solved = false;

    if (index < 20) {
      hintsUsed = 0;
      maxHintLevel = 0;
      solved = index < 12;
    } else if (index < 35) {
      hintsUsed = 1;
      maxHintLevel = 1;
      solved = index < 31;
    } else if (index < 45) {
      hintsUsed = 2;
      maxHintLevel = 2;
      solved = index < 43;
    } else {
      hintsUsed = 3;
      maxHintLevel = 3;
      solved = index < 48;
    }

    const timeSpentSeconds = solved
      ? 180 + (index % 5) * 35 + hintsUsed * 20
      : 420 + (index % 4) * 45 + hintsUsed * 25;
    const completedAt = startedAt + timeSpentSeconds;
    const sessionId = `demo-session-${String(index + 1).padStart(2, '0')}`;
    const finalCode = solved ? `# demo solution ${index + 1}` : null;
    const solvedFlag = solved ? 1 : 0;

    dbRun(`INSERT INTO sessions (id, problem_id, user_fingerprint, started_at, completed_at, solved, hints_used, max_hint_level, time_spent_seconds, final_code)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [sessionId, problemId, `demo-user-${(index % 12) + 1}`, startedAt, solved ? completedAt : null, solvedFlag, hintsUsed, maxHintLevel, timeSpentSeconds, finalCode]);

    dbRun(`INSERT INTO analytics (id, event, session_id, problem_id, metadata, created_at)
           VALUES (?,?,?,?,?,?)`,
      [`demo-analytics-${String(index + 1).padStart(2, '0')}-start`, 'session_started', sessionId, problemId, JSON.stringify({ demo: true }), startedAt]);

    if (hintsUsed > 0) {
      for (let level = 1; level <= hintsUsed; level += 1) {
        const hintId = `demo-hint-${String(index + 1).padStart(2, '0')}-${level}`;
        const hintResponse = `Demo ${level === 1 ? 'conceptual' : level === 2 ? 'pseudocode' : 'near-code'} hint for ${problemId}`;
        const responseTimeMs = 320 + level * 45 + (index % 5) * 18;
        dbRun(`INSERT INTO hint_requests (id, session_id, problem_id, hint_level, user_code, hint_response, response_time_ms)
               VALUES (?,?,?,?,?,?,?)`,
          [hintId, sessionId, problemId, level, `# demo code ${index + 1}`, hintResponse, responseTimeMs]);

        dbRun(`INSERT INTO analytics (id, event, session_id, problem_id, metadata, created_at)
               VALUES (?,?,?,?,?,?)`,
          [`demo-analytics-${String(index + 1).padStart(2, '0')}-hint-${level}`, 'hint_requested', sessionId, problemId, JSON.stringify({ hint_level: level, demo: true }), startedAt + level * 120]);
      }
    }

    dbRun(`INSERT INTO code_runs (id, session_id, code, output, error, passed_tests, total_tests, run_at)
           VALUES (?,?,?,?,?,?,?,?)`,
      [`demo-run-${String(index + 1).padStart(2, '0')}`, sessionId, `# demo submission ${index + 1}`, solved ? 'All tests passed' : '1 test failed', solved ? null : 'AssertionError', solved ? 3 : 2, 3, startedAt + timeSpentSeconds - 90]);

    dbRun(`INSERT INTO analytics (id, event, session_id, problem_id, metadata, created_at)
           VALUES (?,?,?,?,?,?)`,
      [`demo-analytics-${String(index + 1).padStart(2, '0')}-run`, 'code_run', sessionId, problemId, JSON.stringify({ demo: true, passed_tests: solved ? 3 : 2, total_tests: 3 }), startedAt + timeSpentSeconds - 90]);

    dbRun(`INSERT INTO analytics (id, event, session_id, problem_id, metadata, created_at)
           VALUES (?,?,?,?,?,?)`,
      [`demo-analytics-${String(index + 1).padStart(2, '0')}-completed`, solved ? 'session_completed' : 'session_incomplete', sessionId, problemId, JSON.stringify({ solved: solvedFlag, hints_used: hintsUsed, time_spent_seconds: timeSpentSeconds, demo: true }), completedAt]);
  }

  console.log('✅ Seeded 50 demo analytics sessions');
}
