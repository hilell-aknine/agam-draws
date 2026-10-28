// שמירה בענן על הפרויקט של "החווה של אגם" (Supabase xgqetnlsesgwiypufodf).
// אותו חשבון כמו בחווה: כניסה במייל של הורה בלבד, דרך הפונקציה farm-email-login (רשימת מורשים בשרת).
// בלי רשת או בלי חשבון הכל ממשיך להישמר בטאבלט כרגיל. המפתח הוא anon ציבורי, מוגן ב-RLS.
window.DrawCloud = (() => {
  const URL_ = 'https://xgqetnlsesgwiypufodf.supabase.co';
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncWV0bmxzZXNnd2l5cHVmb2RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2Mjc5MjQsImV4cCI6MjA5NTIwMzkyNH0.0szenmLzE8nhCr-FdaqnLBCL5TjB1IuTxsWbUND0mU4';
  const LOGIN_FN = `${URL_}/functions/v1/farm-email-login`;
  const AUTH_KEY = 'agam_draws_auth';
  let sb = null, user = null, initP = null;

  function init() {
    if (!initP) initP = (async () => {
      try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        sb = createClient(URL_, ANON, { auth: { persistSession: true, autoRefreshToken: true, storageKey: AUTH_KEY } });
        const { data: { session } } = await sb.auth.getSession();
        user = session ? session.user : null;
      } catch (e) {
        sb = null; initP = null; // אין רשת: ננסה שוב בפעם הבאה
      }
      return !!user;
    })();
    return initP;
  }

  async function login(email) {
    email = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('bad_email');
    await init();
    if (!sb) throw new Error('offline');
    let res;
    try {
      res = await fetch(LOGIN_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ email }),
      });
    } catch { throw new Error('offline'); }
    if (res.status === 403) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error === 'not_allowed' ? 'not_allowed' : 'not_farm_account');
    }
    if (!res.ok) throw new Error('server');
    const j = await res.json();
    const { data, error } = await sb.auth.setSession({ access_token: j.access_token, refresh_token: j.refresh_token });
    if (error || !data.session) throw new Error('server');
    user = data.session.user;
    return user.email;
  }

  async function logout() {
    try { await sb.auth.signOut(); } catch { /* */ }
    try { localStorage.removeItem(AUTH_KEY); } catch { /* */ }
    user = null;
  }

  const email = () => (user ? user.email : null);

  async function pullProgress() {
    const { data, error } = await sb.from('draw_progress').select('data').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return data ? data.data : null;
  }
  async function pushProgress(progress) {
    const { error } = await sb.from('draw_progress')
      .upsert({ user_id: user.id, data: progress, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  async function listDrawings() {
    const { data, error } = await sb.from('drawings').select('id, lesson_id, title, path').order('id');
    if (error) throw error;
    return data;
  }
  async function uploadDrawing(it) {
    const path = `${user.id}/${it.id}.jpg`;
    const blob = await (await fetch(it.img)).blob();
    const up = await sb.storage.from('drawings').upload(path, blob, { contentType: 'image/jpeg' });
    // הקובץ כבר קיים מניסיון קודם: ממשיכים לרשומה
    if (up.error && !/exists|duplicate/i.test(up.error.message || '')) throw up.error;
    const { error } = await sb.from('drawings')
      .upsert({ user_id: user.id, id: it.id, lesson_id: it.lessonId, title: it.title, path }, { ignoreDuplicates: true });
    if (error) throw error;
  }
  async function downloadDrawing(row) {
    const { data, error } = await sb.storage.from('drawings').download(row.path);
    if (error) throw error;
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(data);
    });
  }

  return { init, login, logout, email, pullProgress, pushProgress, listDrawings, uploadDrawing, downloadDrawing };
})();
