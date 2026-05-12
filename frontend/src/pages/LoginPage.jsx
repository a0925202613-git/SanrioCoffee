import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '', phone: '', role: 'consumer' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        const res = await api.post('/auth/login', { email: form.email, password: form.password });
        localStorage.setItem('token', res.data.data.token);
        localStorage.setItem('role', res.data.data.user.role);
        navigate('/menu');
      } else {
        await api.post('/auth/register', form);
        setMode('login');
        setError('註冊成功，請登入');
      }
    } catch (e) {
      setError(e.response?.data?.message || '操作失敗');
    }
  };

  return (
    <div style={{ maxWidth: 380, margin: '60px auto' }}>
      <h2 style={{ textAlign: 'center' }}>{mode === 'login' ? '登入' : '註冊'}</h2>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mode === 'register' && (
          <>
            <input placeholder="用戶名" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required style={inputStyle} />
            <input placeholder="電話" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={inputStyle}>
              <option value="consumer">消費者</option>
              <option value="admin">商家管理員</option>
            </select>
          </>
        )}
        <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required style={inputStyle} />
        <input type="password" placeholder="密碼" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required style={inputStyle} />
        {error && <p style={{ color: error.includes('成功') ? 'green' : 'red', margin: 0 }}>{error}</p>}
        <button type="submit" style={btnStyle}>{mode === 'login' ? '登入' : '註冊'}</button>
        <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ ...btnStyle, background: '#888' }}>
          {mode === 'login' ? '沒有帳號？立即註冊' : '已有帳號？登入'}
        </button>
      </form>
    </div>
  );
}

const inputStyle = { padding: '10px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 15 };
const btnStyle = { padding: '10px', background: '#8B4513', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 15 };
