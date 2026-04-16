import { Router } from 'express';
import { dbGet, dbAll } from '../db/database.js';

const router = Router();

router.get('/dashboard', (req, res) => {
  try {
    const totalSessions  = Number(dbGet('SELECT COUNT(*) as c FROM sessions')?.c) || 0;
    const solvedSessions = Number(dbGet('SELECT COUNT(*) as c FROM sessions WHERE solved=1')?.c) || 0;
    const noHintSolves   = Number(dbGet('SELECT COUNT(*) as c FROM sessions WHERE solved=1 AND max_hint_level=0')?.c) || 0;
    const totalHints     = Number(dbGet('SELECT COUNT(*) as c FROM hint_requests')?.c) || 0;
    const totalRuns      = Number(dbGet('SELECT COUNT(*) as c FROM code_runs')?.c) || 0;

    const hintDist = dbAll(`
      SELECT hint_level, COUNT(*) as count
      FROM hint_requests GROUP BY hint_level ORDER BY hint_level
    `).map(r => ({ ...r, count: Number(r.count), hint_level: Number(r.hint_level) }));

    const problemStats = dbAll(`
      SELECT p.title, p.slug, p.difficulty, p.category,
             COUNT(DISTINCT s.id) as attempts,
             SUM(CASE WHEN s.solved=1 THEN 1 ELSE 0 END) as solves,
             AVG(s.time_spent_seconds) as avg_time,
             AVG(s.hints_used) as avg_hints
      FROM problems p LEFT JOIN sessions s ON p.id=s.problem_id
      GROUP BY p.id ORDER BY attempts DESC
    `).map(p => ({
      ...p,
      attempts: Number(p.attempts) || 0,
      solves: Number(p.solves) || 0,
      avg_time: p.avg_time ? Math.round(Number(p.avg_time)) : null,
      avg_hints: p.avg_hints ? Math.round(Number(p.avg_hints) * 10) / 10 : null,
      solve_rate: Number(p.attempts) > 0 ? Math.round((Number(p.solves) / Number(p.attempts)) * 100) : 0
    }));

    const hintEfficiency = dbAll(`
      SELECT max_hint_level,
             COUNT(*) as count,
             SUM(CASE WHEN solved=1 THEN 1 ELSE 0 END) as solved
      FROM sessions WHERE hints_used > 0
      GROUP BY max_hint_level
    `).map(r => ({
      max_hint_level: Number(r.max_hint_level),
      count: Number(r.count),
      solved: Number(r.solved),
      solve_rate: Number(r.count) > 0 ? Math.round((Number(r.solved) / Number(r.count)) * 100) : 0
    }));

    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
    const recentActivity = dbAll(`
      SELECT date(started_at, 'unixepoch') as date,
             COUNT(*) as sessions,
             SUM(CASE WHEN solved=1 THEN 1 ELSE 0 END) as solved
      FROM sessions WHERE started_at > ?
      GROUP BY date ORDER BY date
    `, [sevenDaysAgo]).map(r => ({ ...r, sessions: Number(r.sessions), solved: Number(r.solved) }));

    res.json({
      success: true,
      overview: {
        total_sessions: totalSessions,
        solved_sessions: solvedSessions,
        solve_rate: totalSessions > 0 ? Math.round((solvedSessions / totalSessions) * 100) : 0,
        total_hints: totalHints,
        total_runs: totalRuns,
        no_hint_solve_rate: totalSessions > 0 ? Math.round((noHintSolves / totalSessions) * 100) : 0
      },
      hint_distribution: hintDist,
      problem_stats: problemStats,
      hint_efficiency: hintEfficiency,
      recent_activity: recentActivity
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed: ' + err.message });
  }
});

export default router;
