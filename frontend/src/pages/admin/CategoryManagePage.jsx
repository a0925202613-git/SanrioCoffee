import { useState, useEffect } from 'react';
import api from '../../api';

export default function CategoryManagePage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', sort_order: 0 });
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');

  const fetch = () => api.get('/categories').then(r => setCategories(r.data.data || []));
  useEffect(() => { fetch(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, sort_order: Number(form.sort_order) };
      if (editing) { await api.put(`/categories/${editing}`, payload); setMsg('更新成功'); }
      else { await api.post('/categories', payload); setMsg('新增成功'); }
      setForm({ name: '', description: '', sort_order: 0 });
      setEditing(null);
      fetch();
    } catch (e) { setMsg(e.response?.data?.message || '操作失敗'); }
  };

  const del = async (id) => {
    if (!window.confirm('確定刪除？')) return;
    try { await api.delete(`/categories/${id}`); fetch(); }
    catch (e) { setMsg(e.response?.data?.message || '刪除失敗'); }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>分類管理</h2>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, padding: 16, border: '1px solid #e0cfa9', borderRadius: 10 }}>
        <h4 style={{ margin: 0 }}>{editing ? '編輯分類' : '新增分類'}</h4>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="分類名稱" required style={inp} />
        <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="描述" style={inp} />
        <input value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} placeholder="排序（數字小的優先）" type="number" style={inp} />
        {msg && <p style={{ color: msg.includes('失敗') ? 'red' : 'green', margin: 0 }}>{msg}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" style={btnP}>{editing ? '更新' : '新增'}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setForm({ name: '', description: '', sort_order: 0 }); }} style={btnS}>取消</button>}
        </div>
      </form>

      {categories.map(c => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee' }}>
          <span style={{ flex: 1 }}><strong>{c.name}</strong> <span style={{ color: '#888', fontSize: 13 }}>{c.description}</span></span>
          <span style={{ marginRight: 12, color: c.is_active ? 'green' : '#e55', fontSize: 13 }}>{c.is_active ? '啟用' : '停用'}</span>
          <button onClick={() => { setEditing(c.id); setForm({ name: c.name, description: c.description || '', sort_order: c.sort_order }); }} style={{ ...btnS, marginRight: 6 }}>編輯</button>
          <button onClick={() => del(c.id)} style={{ ...btnS, background: '#e55' }}>刪除</button>
        </div>
      ))}
    </div>
  );
}

const inp = { padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14 };
const btnP = { padding: '8px 20px', background: '#8B4513', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' };
const btnS = { padding: '8px 14px', background: '#888', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' };
