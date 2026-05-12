import { useState, useEffect } from 'react';
import api from '../../api';

export default function ProductManagePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ category_id: '', name: '', description: '', price: '', image_url: '' });
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');

  const fetch = () => {
    api.get('/products').then(r => setProducts(r.data.data || []));
    api.get('/categories').then(r => setCategories(r.data.data || []));
  };
  useEffect(() => { fetch(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const payload = { ...form, category_id: Number(form.category_id), price: Number(form.price) };
      if (editing) {
        await api.put(`/products/${editing}`, payload);
        setMsg('更新成功');
      } else {
        await api.post('/products', payload);
        setMsg('新增成功');
      }
      setForm({ category_id: '', name: '', description: '', price: '', image_url: '' });
      setEditing(null);
      fetch();
    } catch (e) {
      setMsg(e.response?.data?.message || '操作失敗');
    }
  };

  const startEdit = (p) => {
    setEditing(p.id);
    setForm({ category_id: p.category_id, name: p.name, description: p.description || '', price: p.price, image_url: p.image_url || '' });
  };

  const toggleAvail = async (p) => {
    await api.patch(`/products/${p.id}/availability`, { is_available: !p.is_available });
    fetch();
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('確定刪除？')) return;
    await api.delete(`/products/${id}`);
    fetch();
  };

  return (
    <div>
      <h2>商品管理</h2>
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24, padding: 16, border: '1px solid #e0cfa9', borderRadius: 10 }}>
        <h3 style={{ gridColumn: '1/-1', margin: 0 }}>{editing ? '編輯商品' : '新增商品'}</h3>
        <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} required style={inp}>
          <option value="">選擇分類</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="商品名稱" required style={inp} />
        <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="價格" type="number" min="0" required style={inp} />
        <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="圖片 URL（可選）" style={inp} />
        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="描述" rows={2} style={{ ...inp, gridColumn: '1/-1', resize: 'none' }} />
        {msg && <p style={{ gridColumn: '1/-1', color: msg.includes('失敗') ? 'red' : 'green', margin: 0 }}>{msg}</p>}
        <button type="submit" style={btnPrimary}>{editing ? '更新' : '新增'}</button>
        {editing && <button type="button" onClick={() => { setEditing(null); setForm({ category_id: '', name: '', description: '', price: '', image_url: '' }); }} style={btnSecondary}>取消</button>}
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: '#f5deb3' }}>
          {['ID', '名稱', '分類', '價格', '狀態', '操作'].map(h => <th key={h} style={{ padding: 8, textAlign: 'left', border: '1px solid #e0cfa9' }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={td}>{p.id}</td>
              <td style={td}>{p.name}</td>
              <td style={td}>{categories.find(c => c.id === p.category_id)?.name || '-'}</td>
              <td style={td}>NT$ {p.price}</td>
              <td style={td}>
                <span style={{ background: p.is_available ? '#e8f5e9' : '#fce4e4', color: p.is_available ? 'green' : 'red', padding: '2px 8px', borderRadius: 8, fontSize: 13 }}>
                  {p.is_available ? '上架' : '下架'}
                </span>
              </td>
              <td style={td}>
                <button onClick={() => startEdit(p)} style={{ ...btnSmall, marginRight: 6 }}>編輯</button>
                <button onClick={() => toggleAvail(p)} style={{ ...btnSmall, background: p.is_available ? '#e55' : '#2e7d32' }}>{p.is_available ? '下架' : '上架'}</button>
                <button onClick={() => deleteProduct(p.id)} style={{ ...btnSmall, background: '#999', marginLeft: 6 }}>刪除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const inp = { padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14 };
const btnPrimary = { padding: '8px 20px', background: '#8B4513', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' };
const btnSecondary = { padding: '8px 20px', background: '#888', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' };
const btnSmall = { padding: '4px 10px', background: '#8B4513', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const td = { padding: '10px 8px', border: '1px solid #eee', fontSize: 14 };
