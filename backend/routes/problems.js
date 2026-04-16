import { Router } from 'express';
import { dbGet, dbAll } from '../db/database.js';

const router = Router();

router.get('/meta/categories', (req, res) => {
  try {
    const cats  = dbAll('SELECT DISTINCT category FROM problems ORDER BY category');
    const diffs = dbAll('SELECT DISTINCT difficulty FROM problems');
    res.json({ success: true, categories: cats.map(c => c.category), difficulties: diffs.map(d => d.difficulty) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

router.get('/', (req, res) => {
  try {
    const { difficulty, category } = req.query;
    let sql = `
      SELECT p.id, p.title, p.slug, p.difficulty, p.language, p.category, p.tags, p.created_at,
             COUNT(DISTINCT s.id) as attempt_count,
             SUM(CASE WHEN s.solved=1 THEN 1 ELSE 0 END) as solve_count,
             AVG(s.time_spent_seconds) as avg_time_seconds
      FROM problems p LEFT JOIN sessions s ON p.id = s.problem_id WHERE 1=1`;
    const params = [];
    if (difficulty) { sql += ` AND p.difficulty=?`; params.push(difficulty); }
    if (category)   { sql += ` AND p.category=?`;   params.push(category);   }
    sql += ` GROUP BY p.id ORDER BY CASE p.difficulty WHEN 'beginner' THEN 1 WHEN 'intermediate' THEN 2 ELSE 3 END, p.title`;

    const rows = dbAll(sql, params);
    res.json({
      success: true,
      problems: rows.map(p => ({
        ...p,
        tags: JSON.parse(p.tags || '[]'),
        attempt_count: Number(p.attempt_count) || 0,
        solve_count: Number(p.solve_count) || 0,
        solve_rate: Number(p.attempt_count) > 0 ? Math.round((Number(p.solve_count) / Number(p.attempt_count)) * 100) : 0,
        avg_time_seconds: p.avg_time_seconds ? Math.round(Number(p.avg_time_seconds)) : null
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch problems' });
  }
});

router.get('/:slug', (req, res) => {
  try {
    const problem = dbGet('SELECT * FROM problems WHERE slug=?', [req.params.slug]);
    if (!problem) return res.status(404).json({ success: false, error: 'Not found' });
    const { solution_code, ...safe } = problem;
    res.json({ success: true, problem: { ...safe, tags: JSON.parse(safe.tags||'[]'), test_cases: JSON.parse(safe.test_cases||'[]') } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

export default router;
