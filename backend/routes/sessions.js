import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbAll, dbRun } from '../db/database.js';

const router = Router();

router.post('/', (req, res) => {
  try {
    const { problem_id, user_fingerprint } = req.body;
    if (!problem_id || !user_fingerprint)
      return res.status(400).json({ success: false, error: 'problem_id and user_fingerprint required' });
    const problem = dbGet('SELECT id FROM problems WHERE id=?', [problem_id]);
    if (!problem) return res.status(404).json({ success: false, error: 'Problem not found' });

    const id = uuidv4();
    dbRun('INSERT INTO sessions (id, problem_id, user_fingerprint) VALUES (?,?,?)', [id, problem_id, user_fingerprint]);
    dbRun('INSERT INTO analytics (id, event, session_id, problem_id) VALUES (?,?,?,?)',
      [uuidv4(), 'session_start', id, problem_id]);
    res.json({ success: true, session_id: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
});

router.patch('/:id', (req, res) => {
  try {
    const { solved, time_spent_seconds, final_code } = req.body;
    const session = dbGet('SELECT * FROM sessions WHERE id=?', [req.params.id]);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    if (time_spent_seconds !== undefined)
      dbRun('UPDATE sessions SET time_spent_seconds=? WHERE id=?', [time_spent_seconds, req.params.id]);
    if (final_code !== undefined)
      dbRun('UPDATE sessions SET final_code=? WHERE id=?', [final_code, req.params.id]);
    if (solved !== undefined) {
      dbRun('UPDATE sessions SET solved=?, completed_at=? WHERE id=?',
        [solved ? 1 : 0, solved ? Math.floor(Date.now() / 1000) : null, req.params.id]);
      if (solved) {
        dbRun('INSERT INTO analytics (id, event, session_id, problem_id, metadata) VALUES (?,?,?,?,?)',
          [uuidv4(), 'problem_solved', req.params.id, session.problem_id,
           JSON.stringify({ hints_used: session.hints_used })]);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update' });
  }
});

router.get('/user/:fingerprint', (req, res) => {
  try {
    const sessions = dbAll(`
      SELECT s.*, p.title, p.slug, p.difficulty, p.category
      FROM sessions s JOIN problems p ON s.problem_id=p.id
      WHERE s.user_fingerprint=? ORDER BY s.started_at DESC LIMIT 50
    `, [req.params.fingerprint]);
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const session = dbGet('SELECT * FROM sessions WHERE id=?', [req.params.id]);
    if (!session) return res.status(404).json({ success: false, error: 'Not found' });
    const hints = dbAll('SELECT hint_level, requested_at FROM hint_requests WHERE session_id=? ORDER BY requested_at', [req.params.id]);
    const runs  = dbAll('SELECT passed_tests, total_tests, run_at FROM code_runs WHERE session_id=? ORDER BY run_at', [req.params.id]);
    res.json({ success: true, session, hints, runs });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

export default router;
