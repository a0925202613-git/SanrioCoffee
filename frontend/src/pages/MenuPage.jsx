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
    <>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
          <div className="fade-up">
            <span className="hero-eyebrow">Our Menu</span>
            <h1 className="hero-title">
              精選飲品<br />
              <span style={{ fontWeight: 300, opacity: .55, letterSpacing: '.01em' }}>Crafted for you.</span>
            </h1>
            <p className="hero-sub">每一杯都是職人的用心，新鮮現煮，只為那一口剛好的溫度。</p>
          </div>
          <div className="hero-icon" aria-hidden>☕</div>
        </div>
      </section>

      {/* ── Catalogue ── */}
      <div className="container" style={{ paddingBottom: 80 }}>
        {/* Category pills */}
        <div className="pill-row">
          <button
            className={`pill${selectedCat === 0 ? ' active' : ''}`}
            onClick={() => setSelectedCat(0)}
          >全部</button>
          {categories.filter(c => c.is_active).map(c => (
            <button
              key={c.id}
              className={`pill${selectedCat === c.id ? ' active' : ''}`}
              onClick={() => setSelectedCat(c.id)}
            >{c.name}</button>
          ))}
        </div>

        {/* Product grid */}
        {products.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 80 }}>
            <div className="empty-state-icon">☕</div>
            <p className="empty-state-text">目前沒有商品</p>
          </div>
        ) : (
          <div className="product-grid">
            {products.map(p => (
              <article
                key={p.id}
                className="product-card"
                onClick={() => navigate(`/products/${p.id}`)}
              >
                {p.image_url
                  ? <img src={p.image_url} alt={p.name} className="product-img" />
                  : <div className="product-img-placeholder">☕</div>
                }
                <div className="product-body">
                  <p className="product-name">{p.name}</p>
                  <p className="product-desc">{p.description || '—'}</p>
                  <p className="product-price">NT$ {p.price}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
