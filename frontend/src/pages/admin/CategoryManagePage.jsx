import { useState, useEffect } from 'react';
import api from '../../api';

export default function CategoryManagePage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', sort_order: 0 });
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');

  const refetch = () => api.get('/categories').then(r => setCategories(r.data.data || []));
  useEffect(() => { refetch(); }, []);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, sort_order: Number(form.sort_order) };
      if (editing) { await api.put(`/categories/${editing}`, payload); setMsg('success:更新成功'); }
      else          { await api.post('/categories', payload);            setMsg('success:新增成功'); }
      setForm({ name: '', description: '', sort_order: 0 });
      setEditing(null);
      refetch();
    } catch (e) { setMsg('err:' + (e.response?.data?.message || '操作失敗')); }
  };

  const del = async (id) => {
    if (!window.confirm('確定刪除？')) return;
    try { await api.delete(`/categories/${id}`); refetch(); }
    catch (e) { setMsg('err:' + (e.response?.data?.message || '刪除失敗')); }
  };

  const isSuccess = msg.startsWith('success:');
  const msgText = msg.replace(/^(success:|err:)/, '');

  return (
    <div className="page-wrap" style={{ maxWidth: 640 }}>
      <h2 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 28 }}>分類管理</h2>

      <div className="card" style={{ marginBottom: 24 }}>
        <h4 style={{ fontWeight: 700, marginBottom: 18, fontSize: '1rem' }}>{editing ? '編輯分類' : '新增分類'}</h4>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="field" value={form.name} onChange={f('name')} placeholder="分類名稱" required />
          <input className="field" value={form.description} onChange={f('description')} placeholder="描述" />
          <input className="field" value={form.sort_order} onChange={f('sort_order')} placeholder="排序數字（小的優先）" type="number" style={{ width: 200 }} />

          {msg && (
            <p style={{ fontSize: '.875rem', color: isSuccess ? 'var(--green)' : 'var(--red)', background: isSuccess ? '#ECFDF5' : '#FEF2F2', padding: '10px 14px', borderRadius: 8 }}>
              {msgText}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">{editing ? '更新' : '新增'}</button>
            {editing && (
              <button type="button" className="btn btn-outline"
                onClick={() => { setEditing(null); setForm({ name: '', description: '', sort_order: 0 }); }}>
                取消
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {categories.length === 0 && <p style={{ padding: '24px', color: 'var(--ink-2)' }}>目前沒有分類</p>}
        {categories.map((c, idx) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 22px', borderBottom: idx < categories.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: '.9375rem' }}>{c.name}</span>
              {c.description && <span style={{ marginLeft: 10, color: 'var(--ink-2)', fontSize: '.875rem' }}>{c.description}</span>}
            </div>
            <span className={`badge ${c.is_active ? 'badge-ready' : 'badge-cancelled'}`} style={{ marginRight: 12 }}>
              {c.is_active ? '啟用' : '停用'}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm"
                onClick={() => { setEditing(c.id); setForm({ name: c.name, description: c.description || '', sort_order: c.sort_order }); }}>
                編輯
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => del(c.id)}>刪除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
