import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCat, setSelectedCat] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data.data || []));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ available: 'true' });
    if (selectedCat) params.set('category_id', selectedCat);
    api.get('/products?' + params).then(r => setProducts(r.data.data || []));
  }, [selectedCat]);

  return (
    <div>
      {/* Sanrio-themed hero banner */}
      <div style={{
        background: 'linear-gradient(135deg, #fce4ec 0%, #fce4ec 40%, #f8bbd9 100%)',
        borderRadius: 20, padding: '28px 32px', marginBottom: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 4px 16px rgba(200,60,110,0.12)',
        border: '1px solid #f8bbd9', overflow: 'hidden', position: 'relative',
      }}>
        <div style={{ position: 'absolute', right: 20, top: 8, fontSize: 70, opacity: 0.18, userSelect: 'none' }}>🎀</div>
        <div style={{ position: 'absolute', right: 100, bottom: 4, fontSize: 50, opacity: 0.14, userSelect: 'none' }}>⭐</div>
        <div style={{ position: 'absolute', right: 60, top: -10, fontSize: 45, opacity: 0.12, userSelect: 'none' }}>🌸</div>
        <div>
          <h1 style={{ color: '#c94070', fontSize: 26, marginBottom: 6 }}>🎀 SanrioCoffee 菜單</h1>
          <p style={{ color: '#e05585', fontSize: 14, margin: 0 }}>每一杯都充滿 Sanrio 的甜蜜 ☕🌸</p>
        </div>
        <span style={{ fontSize: 52, lineHeight: 1 }}>☕</span>
      </div>

      <h2 style={{ color: '#c94070', marginBottom: 16, fontSize: 18 }}>🌸 選擇分類</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setSelectedCat(0)} style={tabStyle(selectedCat === 0)}>全部</button>
        {categories.filter(c => c.is_active).map(c => (
          <button key={c.id} onClick={() => setSelectedCat(c.id)} style={tabStyle(selectedCat === c.id)}>{c.name}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
        {(products || []).map(p => (
          <div key={p.id} onClick={() => navigate(`/products/${p.id}`)} style={cardStyle}>
            {p.image_url
              ? <img src={`${p.image_url}`} alt={p.name} style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8 }} />
              : <div style={{ height: 150, background: '#f5deb3', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>☕</div>
            }
            <h3 style={{ margin: '12px 0 4px' }}>{p.name}</h3>
            <p style={{ color: '#666', fontSize: 13, margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</p>
            <strong style={{ color: '#8B4513', fontSize: 16 }}>NT$ {p.price}</strong>
          </div>
        ))}
        {(!products || products.length === 0) && <p style={{ color: '#888' }}>目前沒有商品</p>}
      </div>
    </div>
  );
}

const tabStyle = (active) => ({
  padding: '6px 16px', borderRadius: 20,
  border: active ? '1.5px solid #c94070' : '1.5px solid #f0b8cc',
  background: active ? 'linear-gradient(90deg, #c94070, #e05585)' : '#fff',
  color: active ? '#fff' : '#c94070',
  cursor: 'pointer', fontWeight: active ? 'bold' : 'normal',
  boxShadow: active ? '0 2px 8px rgba(200,60,110,0.25)' : 'none',
  transition: 'all .15s',
});

const cardStyle = {
  border: '1px solid #e0cfa9', borderRadius: 12, padding: 16, cursor: 'pointer',
  transition: 'box-shadow .2s', boxShadow: '0 1px 4px rgba(0,0,0,.08)',
  ':hover': { boxShadow: '0 4px 12px rgba(0,0,0,.15)' }
};
