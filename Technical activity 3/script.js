const API_BASE = 'https://dummyjson.com';
let allProducts = [];
let selectedId = null;

function setStatus(msg) {
  const $s = $('#status');
  if (!msg) {
    $s.text('').hide();
  } else {
    $s.text(msg).show();
  }
}

function money(n) {
  if (typeof n !== 'number') return String(n);
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function stars(rating) {
  const r = Number(rating);
  if (Number.isNaN(r)) return '';
  const full = Math.max(0, Math.min(5, Math.round(r)));
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}


function safeImg(src, alt) {
  const placeholder = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="240">
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0" stop-color="%232a2f45"/>
          <stop offset="1" stop-color="%2315172a"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(%23g)"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23c7cbe3" font-family="ui-monospace,Menlo,Consolas" font-size="16">image unavailable</text>
    </svg>`);

  const img = $('<img>').attr('src', src || placeholder).attr('alt', alt || 'image');
  img.on('error', () => img.attr('src', placeholder));
  return img;
}

function renderAny(value) {
  if (value === null) return $('<span>').text('null').addClass('mono');
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') {
    return $('<span>').text(String(value));
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return $('<span>').text('[]');

    const allPrimitive = value.every(v => v === null || ['string','number','boolean'].includes(typeof v));
    if (allPrimitive) {
      const wrap = $('<div class="kv">');
      value.forEach(v => wrap.append($('<span class="tag">').text(String(v))));
      return wrap;
    }

    const ul = $('<ul>');
    value.forEach((item, idx) => {
      const li = $('<li>');
      li.append($('<div class="small mono">').text(`#${idx}`));
      li.append(renderAny(item));
      ul.append(li);
    });
    return ul;
  }

  const table = $('<table class="table">');
  const keys = Object.keys(value);
  if (keys.length === 0) {
    table.append($('<tr>').append($('<th>').text('(empty object)')).append($('<td>').text('{}')));
    return table;
  }
  keys.forEach(k => {
    const tr = $('<tr>');

    const niceKey = k.charAt(0).toUpperCase() + k.slice(1);
    tr.append($('<th>').text(niceKey));
    const td = $('<td>');
    td.append(renderAny(value[k]));
    tr.append(td);
    table.append(tr);
  });
  return table;
}

function renderProductDetails(p) {
  if (!p) {
    $('#productDetails').html('<div class="small">Select a product…</div>');
    $('#rawJson').attr('hidden', true).text('');
    return;
  }

  // Hero
  const hero = $('<div class="hero">');
  const thumb = p.thumbnail || (Array.isArray(p.images) ? p.images[0] : '') || '';
  hero.append(safeImg(thumb, p.title || 'Product thumbnail'));

  const heroRight = $('<div>');
  heroRight.append($('<h3>').text(`${p.title ?? ''}`));

  const priceLine = $('<div class="price-line">');
  if (typeof p.price === 'number') {
    priceLine.append($('<span class="price">').text(money(p.price)));
  }
  if (p.discountPercentage !== undefined) {
    priceLine.append($('<span class="badge">').text(`Discount: ${p.discountPercentage}%`));
  }
  if (p.rating !== undefined) {
    priceLine.append($('<span class="badge">').text(`Rating: ${p.rating} (${stars(p.rating)})`));
  }
  if (p.stock !== undefined) {
    priceLine.append($('<span class="badge">').text(`Stock: ${p.stock}`));
  }
  heroRight.append(priceLine);

  const badges = $('<div class="badges">');
  const LABELS = {
    category: 'Category',
    brand: 'Brand',
    sku: 'SKU',
    availabilityStatus: 'Availability',
    warrantyInformation: 'Warranty',
    shippingInformation: 'Shipping',
    returnPolicy: 'Return policy'
  };

  ['category','brand','sku','availabilityStatus','warrantyInformation','shippingInformation','returnPolicy'].forEach(k => {
    const raw = p[k];
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
      if (k === 'returnPolicy') {
        badges.append($('<span class="badge">').text(String(raw)));
      } else {
        const label = LABELS[k] || k;
        badges.append($('<span class="badge">').text(`${label}: ${raw}`));
      }
    }
  });
  heroRight.append(badges);

  if (p.description) heroRight.append($('<p class="small">').text(p.description));
  hero.append(heroRight);

  // images gallery
  const images = Array.isArray(p.images) ? p.images : [];
  const gallery = $('<div class="section">');
  gallery.append($('<h4>').text('Images'));
  if (images.length) {
    const g = $('<div class="gallery">');
    images.forEach((src, i) => {
      const a = $('<a>').attr('href', src).attr('target', '_blank').attr('rel', 'noopener');
      a.append(safeImg(src, `${p.title || 'Product'} image ${i+1}`));
      g.append(a);
    });
    gallery.append(g);
  } else {
    gallery.append($('<div class="small">').text('No images.'));
  }

  // for da product reviews :)
  const reviews = Array.isArray(p.reviews) ? p.reviews : [];
  const reviewsSec = $('<div class="section">');
  reviewsSec.append($('<h4>').text('Reviews'));
  if (reviews.length) {
    const wrap = $('<div style="display:grid; gap:10px;">');
    reviews.forEach(r => {
      const card = $('<div class="review">');
      const top = $('<div class="top">');
      top.append($('<div class="stars">').text(`${r.rating ?? ''} ${stars(r.rating ?? 0)}`));
      top.append($('<div class="who">').text(`${r.reviewerName ?? ''} • ${r.reviewerEmail ?? ''}`));
      card.append(top);
      if (r.date) card.append($('<div class="who">').text(`Date: ${new Date(r.date).toLocaleString()}`));
      if (r.comment) card.append($('<div class="comment">').text(r.comment));

    
      const extra = { ...r };
      delete extra.rating; delete extra.reviewerName; delete extra.reviewerEmail; delete extra.date; delete extra.comment;
      if (Object.keys(extra).length) {
        card.append($('<div class="small" style="margin-top:10px;">').text('Extra review fields:'));
        card.append(renderAny(extra));
      }
      wrap.append(card);
    });
    reviewsSec.append(wrap);
  } else {
    reviewsSec.append($('<div class="small">').text('No reviews array returned for this product.'));
  }

  // specifications section
  const specsSec = $('<div class="section">');
  specsSec.append($('<h4>').text('Specifications'));
  const specsTable = $('<table class="table">');
  if (p.weight !== undefined) {
    specsTable.append($('<tr>').append($('<th>').text('Weight')).append($('<td>').text(`${p.weight} ${p.weight > 100 ? 'kg' : 'g'}`)));
  }
  if (p.dimensions) {
    const dims = p.dimensions;
    const dimStr = `${dims.width || 0} × ${dims.height || 0} × ${dims.depth || 0} cm`;
    specsTable.append($('<tr>').append($('<th>').text('Dimensions')).append($('<td>').text(dimStr)));
  }
  if (p.minimumOrderQuantity !== undefined) {
    specsTable.append($('<tr>').append($('<th>').text('Min. Order Qty')).append($('<td>').text(p.minimumOrderQuantity)));
  }
  if (specsTable.find('tr').length) specsSec.append(specsTable);
  else specsSec.append($('<div class="small">').text('No specifications available.'));

  // tags section 
  const tags = Array.isArray(p.tags) ? p.tags : [];
  const tagsSec = $('<div class="section">');
  tagsSec.append($('<h4>').text('Tags'));
  if (tags.length) {
    const tagWrap = $('<div class="kv">');
    tags.forEach(t => tagWrap.append($('<span class="tag">').text(t)));
    tagsSec.append(tagWrap);
  } else {
    tagsSec.append($('<div class="small">').text('No tags.'));
  }

  // Metadata section
  const meta = $('<div class="section">');
  meta.append($('<h4>').text('Metadata'));
  const metaTable = $('<table class="table">');
  if (p.meta) {
    if (p.meta.createdAt) {
      metaTable.append($('<tr>').append($('<th>').text('Created')).append($('<td>').text(new Date(p.meta.createdAt).toLocaleString())));
    }
    if (p.meta.updatedAt) {
      metaTable.append($('<tr>').append($('<th>').text('Updated')).append($('<td>').text(new Date(p.meta.updatedAt).toLocaleString())));
    }
    if (p.meta.barcode) {
      metaTable.append($('<tr>').append($('<th>').text('Barcode')).append($('<td>').text(p.meta.barcode)));
    }
    if (Array.isArray(p.images) && p.images.length > 0) {
      const qrCell = $('<td>');
      const productImageUrl = p.images[0];
      // QR code generation 
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(productImageUrl)}`;
      const qrImg = $('<img>').attr('src', qrCodeUrl).attr('alt', 'QR Code').css({width: '100px', height: '100px', borderRadius: '4px'});
      qrCell.append(qrImg);
      metaTable.append($('<tr>').append($('<th>').text('QR Code')).append(qrCell));
    }
  }
  if (metaTable.find('tr').length) meta.append(metaTable);
  else meta.append($('<div class="small">').text('No metadata.'));

  const root = $('<div>');
  root.append(hero);
  root.append(gallery);
  root.append(specsSec);
  root.append(tagsSec);
  root.append(reviewsSec);
  root.append(meta);

  $('#productDetails').empty().append(root);

  $('#rawJson').text(JSON.stringify(p, null, 2));
  $('#rawJson').attr('hidden', !showingRaw);
}

function renderList(products) {
  const ul = $('#productList').empty();
  $('#countPill').text(products.length);

  products.forEach(p => {
    const li = $('<li>').attr('data-id', p.id);
    if (p.id === selectedId) li.addClass('active');

    const imgSrc = p.thumbnail || (Array.isArray(p.images) ? p.images[0] : '') || '';
    li.append(safeImg(imgSrc, p.title || 'thumbnail'));

    const meta = $('<div class="meta">');
    meta.append($('<div class="title">').text(p.title || `(id ${p.id})`));
    meta.append($('<div class="sub">').text(`${p.brand || '—'} • ${p.category || '—'} • ${money(p.price)}`));
    li.append(meta);

    li.on('click', () => selectProduct(p.id));
    ul.append(li);
  });
}

function rebuildSelect(products) {
  const sel = $('#productSelect').empty();
  products.forEach(p => {
    sel.append($('<option>').attr('value', p.id).text(`#${p.id} — ${p.title}`));
  });
  if (selectedId == null && products.length) selectedId = products[0].id;
  sel.val(String(selectedId));
}

function applyFilter() {
  const q = ($('#productSearch').val() || '').trim().toLowerCase();
  if (!q) return allProducts;
  return allProducts.filter(p => {
    const hay = `${p.title ?? ''} ${p.brand ?? ''} ${p.category ?? ''} ${(p.tags || []).join(' ')}`.toLowerCase();
    return hay.includes(q);
  });
}

function selectProduct(id) {
  selectedId = Number(id);

  $('#productSelect').val(String(selectedId));
  $('#productList li').removeClass('active');
  $(`#productList li[data-id="${selectedId}"]`).addClass('active');

  const product = allProducts.find(p => Number(p.id) === selectedId);
  renderProductDetails(product);
}

const SAMPLE_PRODUCTS = [
  {
    "id": 1,
    "title": "Essence Mascara Lash Princess",
    "description": "The Essence Mascara Lash Princess is a popular mascara known for its volumizing and lengthening effects. Achieve dramatic lashes with this long-lasting and cruelty-free formula.",
    "category": "beauty",
    "price": 9.99,
    "discountPercentage": 10.48,
    "rating": 2.56,
    "stock": 99,
    "tags": ["beauty","mascara"],
    "brand": "Essence",
    "sku": "BEA-ESS-ESS-001",
    "weight": 4,
    "dimensions": {"width": 15.14, "height": 13.08, "depth": 22.99},
    "warrantyInformation": "1 week warranty",
    "shippingInformation": "Ships in 3-5 business days",
    "availabilityStatus": "In Stock",
    "reviews": [
      {"rating": 3, "comment": "Would not recommend!", "date": "2025-04-30T09:41:02.053Z", "reviewerName": "Eleanor Collins", "reviewerEmail": "eleanor.collins.dummyjson.com"},
      {"rating": 4, "comment": "Very satisfied!", "date": "2025-04-30T09:41:02.053Z", "reviewerName": "Lucas Gordon", "reviewerEmail": "lucas.gordon.dummyjson.com"},
      {"rating": 5, "comment": "Highly impressed!", "date": "2025-04-30T09:41:02.053Z", "reviewerName": "Eleanor Collins", "reviewerEmail": "eleanor.collins.dummyjson.com"}
    ],
    "returnPolicy": "No return policy",
    "minimumOrderQuantity": 48,
    "meta": {
      "createdAt": "2025-04-30T09:41:02.053Z",
      "updatedAt": "2025-04-30T09:41:02.053Z",
      "barcode": "5784719087687",
      "qrCode": "https://cdn.dummyjson.com/public/qr-code.png"
    },
    "images": [
      "https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/1.webp"
    ],
    "thumbnail": "https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp"
  }
];

function loadProducts() {
  setStatus("Loading products…");

  // always request all 194 productss
  return $.ajax({
    url: `${API_BASE}/products`,
    method: 'GET',
    dataType: 'json',
    data: { limit: 194, skip: 0 },
    timeout: 15000
  }).done(res => {

    allProducts = Array.isArray(res.products) ? res.products : [];
   
    if (res.total !== undefined && allProducts.length !== res.total) {
      setStatus(`Loaded ${allProducts.length} of ${res.total} products; some items may be missing. Please refresh the page.`);
    } else {
      setStatus('');
    }

    const filtered = applyFilter();
    rebuildSelect(filtered);
    renderList(filtered);

    if (!filtered.some(p => p.id === selectedId) && filtered.length) {
      selectedId = filtered[0].id;
    }
    selectProduct(selectedId);

  }).fail((xhr, status, err) => {
    console.warn('Using offline SAMPLE_PRODUCTS due to request failure:', status, err);

    allProducts = SAMPLE_PRODUCTS;
    setStatus('Could not reach the online API. Showing OFFLINE sample data instead (your submission should work online).');

    const filtered = applyFilter();
    rebuildSelect(filtered);
    renderList(filtered);

    selectedId = filtered.length ? filtered[0].id : null;
    renderProductDetails(filtered[0]);

    $('#productDetails').prepend(
      $('<div class="small" style="margin-bottom:10px;">')
        .text('Note: AJAX request failed (often because you opened file:// or have no internet). Run via a local web server (e.g., VS Code Live Server) to load the real API data.')
    );
  });
}

function wireEvents() {
  $('#productSelect').on('change', function() { selectProduct($(this).val()); });
  $('#reloadBtn').on('click', function() {
    selectedId = null;
    loadProducts();
  });
  $('#productSearch').on('input', function() {
    const filtered = applyFilter();
    rebuildSelect(filtered);
    renderList(filtered);
    if (filtered.length) selectProduct($('#productSelect').val());
    else {
      $('#productDetails').html('<div class="small">No products match your search.</div>');
      $('#rawJson').attr('hidden', true).text('');
    }
  });
}

$(function() {
  wireEvents();
  loadProducts();
});