import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '', phone: '', role: 'consumer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.post('/auth/login', { email: form.email, password: form.password });
        localStorage.setItem('token', res.data.data.token);
        localStorage.setItem('role', res.data.data.user.role);
        navigate('/menu');
      } else {
        await api.post('/auth/register', form);
        setMode('login');
        setError('__success__');
      }
    } catch (e) {
      setError(e.response?.data?.message || '操作失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 62px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>☕</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 4 }}>
            SANRIO COFFEE
          </h1>
          <p style={{ fontSize: '.875rem', color: 'var(--ink-2)' }}>
            {mode === 'login' ? '歡迎回來' : '建立你的帳號'}
          </p>
        </div>

        <div className="card" style={{ padding: '32px 28px' }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label className="form-label">用戶名</label>
                  <input className="field" placeholder="your_name" value={form.username} onChange={f('username')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">電話</label>
                  <input className="field" placeholder="0912-345-678" value={form.phone} onChange={f('phone')} />
                </div>
                <div className="form-group">
                  <label className="form-label">身份</label>
                  <select className="field" value={form.role} onChange={f('role')}>
                    <option value="consumer">消費者</option>
                    <option value="admin">商家管理員</option>
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="field" type="email" placeholder="hello@example.com" value={form.email} onChange={f('email')} required />
            </div>

            <div className="form-group">
              <label className="form-label">密碼</label>
              <input className="field" type="password" placeholder="••••••••" value={form.password} onChange={f('password')} required />
            </div>

            {error === '__success__' && (
              <p style={{ fontSize: '.875rem', color: 'var(--green)', background: '#ECFDF5', padding: '10px 14px', borderRadius: 8 }}>
                註冊成功！請登入。
              </p>
            )}
            {error && error !== '__success__' && (
              <p style={{ fontSize: '.875rem', color: 'var(--red)', background: '#FEF2F2', padding: '10px 14px', borderRadius: 8 }}>
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 4 }} disabled={loading}>
              {loading ? '處理中...' : (mode === 'login' ? '登入' : '建立帳號')}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '.875rem', color: 'var(--ink-2)' }}>
          {mode === 'login' ? '還沒有帳號？' : '已有帳號？'}{' '}
          <button
            onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--amber)', fontWeight: 600, cursor: 'pointer', fontSize: '.875rem', padding: 0 }}
          >
            {mode === 'login' ? '立即註冊' : '回到登入'}
          </button>
        </p>

      </div>
    </div>
  );
}
