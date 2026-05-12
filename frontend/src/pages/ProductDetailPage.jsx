import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [msg, setMsg] = useState('');
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    api.get(`/products/${id}`).then(r => setProduct(r.data.data));
  }, [id]);

  if (!product) return <p>載入中...</p>;

  // Group customizations by option_type
  const groups = {};
  (product.customizations || []).forEach(c => {
    if (!groups[c.option_type]) groups[c.option_type] = [];
    groups[c.option_type].push(c);
  });

  const typeLabel = { size: '杯型', ice: '冰量', sugar: '甜度', addon: '加料' };

  const selectOption = (type, option) => {
    setSelectedOptions(prev => {
      if (type === 'addon') {
        const current = prev[type] || [];
        const exists = current.find(o => o.name === option.name);
        return { ...prev, [type]: exists ? current.filter(o => o.name !== option.name) : [...current, option] };
      }
      return { ...prev, [type]: option };
    });
  };

  const isSelected = (type, option) => {
    if (type === 'addon') return (selectedOptions[type] || []).some(o => o.name === option.name);
    return selectedOptions[type]?.name === option.name;
  };

  const totalExtra = Object.entries(selectedOptions).reduce((sum, [type, val]) => {
    if (type === 'addon') return sum + val.reduce((s, o) => s + o.price_delta, 0);
    return sum + (val?.price_delta || 0);
  }, 0);
  const unitPrice = product.price + totalExtra;

  const addToCart = async () => {
    if (!token || role !== 'consumer') { navigate('/login'); return; }
    const customizations = [];
    Object.entries(selectedOptions).forEach(([type, val]) => {
      if (type === 'addon') val.forEach(o => customizations.push({ option_type: type, name: o.name, price_delta: o.price_delta }));
      else if (val) customizations.push({ option_type: type, name: val.name, price_delta: val.price_delta });
    });
    try {
      await api.post('/cart/items', { product_id: product.id, quantity, customizations });
      setMsg('已加入購物車！');
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg(e.response?.data?.message || '加入失敗');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {product.image_url
        ? <img src={`${product.image_url}`} alt={product.name} style={{ width: '100%', height: 260, objectFit: 'cover', borderRadius: 12 }} />
        : <div style={{ height: 200, background: '#f5deb3', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60 }}>☕</div>
      }
      <h2>{product.name}</h2>
      <p style={{ color: '#555' }}>{product.description}</p>
      <p style={{ fontSize: 18, color: '#8B4513' }}>基本價格: NT$ {product.price}</p>

      {Object.entries(groups).map(([type, options]) => (
        <div key={type} style={{ marginBottom: 16 }}>
          <strong>{typeLabel[type] || type}</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {options.map(o => (
              <button key={o.id} onClick={() => selectOption(type, o)}
                style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid #8B4513', cursor: 'pointer',
                  background: isSelected(type, o) ? '#8B4513' : '#fff', color: isSelected(type, o) ? '#fff' : '#333' }}>
                {o.name}{o.price_delta > 0 ? ` +${o.price_delta}` : ''}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
        <strong>數量:</strong>
        <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={qBtn}>-</button>
        <span style={{ fontSize: 18 }}>{quantity}</span>
        <button onClick={() => setQuantity(q => q + 1)} style={qBtn}>+</button>
      </div>

      <p style={{ fontWeight: 'bold', fontSize: 20 }}>小計: NT$ {(unitPrice * quantity).toFixed(0)}</p>

      {msg && <p style={{ color: msg.includes('失敗') ? 'red' : 'green' }}>{msg}</p>}
      <button onClick={addToCart} style={{ width: '100%', padding: 12, background: '#8B4513', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer' }}>
        加入購物車
      </button>
    </div>
  );
}

const qBtn = { width: 32, height: 32, borderRadius: '50%', border: '1px solid #8B4513', background: '#fff', cursor: 'pointer', fontSize: 18 };
