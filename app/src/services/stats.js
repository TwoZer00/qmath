import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export const fetchStats = async (uid) => {
  try {
    const q = query(
      collection(db, 'events'),
      where('uid', '==', uid),
      where('type', '==', 'answer'),
      orderBy('timestamp', 'desc'),
      limit(200)
    );
    const snap = await getDocs(q);
    const events = snap.docs.map((d) => d.data());

    const total = events.length;
    if (total === 0) return null;

    const correct = events.filter((e) => e.correct).length;
    const timeouts = events.filter((e) => e.timeout).length;
    const responseTimes = events.filter((e) => e.responseTimeMs != null).map((e) => e.responseTimeMs);
    const avgResponseMs = responseTimes.length
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;

    const byOp = {};
    for (const e of events) {
      if (!byOp[e.op]) byOp[e.op] = { correct: 0, total: 0 };
      byOp[e.op].total++;
      if (e.correct) byOp[e.op].correct++;
    }
    const weakestOp = Object.entries(byOp)
      .map(([op, s]) => ({ op, rate: s.correct / s.total, total: s.total }))
      .filter((x) => x.total >= 3)
      .sort((a, b) => a.rate - b.rate)[0] ?? null;

    // Only query wins if user has completed games (saves Firestore reads on Spark tier)
    let wins = 0;
    if (events.some((e) => e.sessionId)) {
      const winsQ = query(
        collection(db, 'events'),
        where('uid', '==', uid),
        where('type', '==', 'game_over'),
        where('winner', '==', true),
        limit(50)
      );
      const winsSnap = await getDocs(winsQ);
      wins = winsSnap.size;
    }

    return { total, correct, timeouts, accuracy: Math.round((correct / total) * 100), avgResponseMs, byOp, weakestOp, wins };
  } catch (e) {
    if (__DEV__) console.warn('[stats] fetchStats failed:', e?.code, e?.message);
    return null;
  }
};
