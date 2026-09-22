import { createOptimizedPicture } from '../../scripts/aem.js';
import { createTag } from '../../scripts/shared.js';

/**
 * Product Carousel block.
 *
 * Horizontally-scrolling product cards with image, name, price (with optional
 * struck "was" price), star rating, and prev/next arrows. Matches the evo.com
 * "Best of Bike Sale" product row.
 *
 * Authoring — one row per product:
 *   | product-carousel                                                |
 *   | <picture> | **[Product Name](/url)** | $29.99 $90.00 | 4.5 (20) |
 *
 * Within a product row, cells are interpreted by content, not position:
 *   - a cell with a picture           → product image
 *   - a cell with bold text / a link  → product name (linked if a link is present)
 *   - a cell containing "$"           → price (first number = current, rest = struck "was")
 *   - a cell like "4.5 (20)"          → rating (stars + review count)
 * Missing cells are tolerated.
 */

/** Build the star rating element from a numeric rating and optional count. */
function buildRating(ratingText) {
  const match = ratingText.match(/([\d.]+)\s*(?:\((\d+)\))?/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;
  const count = match[2] || '';

  const wrap = createTag('p', { class: 'product-carousel-rating' });
  const stars = createTag('span', {
    class: 'product-carousel-stars',
    role: 'img',
    'aria-label': `Rated ${value} out of 5`,
  });
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  for (let i = 0; i < 5; i += 1) {
    let cls = 'star-empty';
    if (i < full) cls = 'star-full';
    else if (i === full && half) cls = 'star-half';
    stars.append(createTag('span', { class: `product-carousel-star ${cls}`, 'aria-hidden': 'true' }, '★'));
  }
  wrap.append(stars);
  if (count) wrap.append(createTag('span', { class: 'product-carousel-review-count' }, `(${count})`));
  return wrap;
}

/** Build the price element; first $ amount is current, any others are struck "was" prices. */
function buildPrice(priceText) {
  const amounts = priceText.match(/\$[\d,]+(?:\.\d{2})?(?:\s*-\s*\$[\d,]+(?:\.\d{2})?)?/g);
  if (!amounts) return null;
  const wrap = createTag('p', { class: 'product-carousel-price' });
  amounts.forEach((amt, i) => {
    const cls = i === 0 ? 'product-carousel-price-now' : 'product-carousel-price-was';
    wrap.append(createTag('span', { class: cls }, amt.trim()));
  });
  return wrap;
}

/** Classify a raw cell and append the resulting element to the card. */
function appendCell(card, cell) {
  const picture = cell.querySelector('picture');
  if (picture) {
    const img = picture.querySelector('img');
    const optimized = img
      ? createOptimizedPicture(img.src, img.alt || '', false, [{ width: '400' }, { media: '(min-width: 900px)', width: '600' }])
      : picture;
    card.append(createTag('div', { class: 'product-carousel-image' }, optimized));
    return;
  }

  const text = cell.textContent.trim();
  if (!text) return;

  const link = cell.querySelector('a[href]');
  const hasBold = cell.querySelector('strong, b');

  // Rating: a bare "4.5 (20)" or a value with a star, no $.
  if (!text.includes('$') && /^\s*[★]?\s*[\d.]+\s*(\(\d+\))?\s*$/.test(text)) {
    const rating = buildRating(text);
    if (rating) { card.append(rating); return; }
  }

  // Price: contains a $.
  if (text.includes('$')) {
    const price = buildPrice(text);
    if (price) { card.append(price); return; }
  }

  // Name: bold and/or link.
  if (hasBold || link) {
    const nameEl = createTag('p', { class: 'product-carousel-name' });
    if (link) {
      nameEl.append(createTag('a', { href: link.getAttribute('href') }, text));
    } else {
      nameEl.textContent = text;
    }
    card.append(nameEl);
    return;
  }

  // Fallback: swatch row or misc text.
  card.append(createTag('p', { class: 'product-carousel-meta' }, text));
}

export default function decorate(block) {
  const track = createTag('ul', { class: 'product-carousel-track' });

  [...block.children].forEach((row) => {
    const li = createTag('li', { class: 'product-carousel-item' });
    const card = createTag('div', { class: 'product-carousel-card' });
    [...row.children].forEach((cell) => appendCell(card, cell));

    // Wrap the whole card in the product link when the name is linked.
    const nameLink = card.querySelector('.product-carousel-name a[href]');
    if (nameLink) {
      const link = createTag('a', { href: nameLink.getAttribute('href'), class: 'product-carousel-link', 'aria-label': nameLink.textContent });
      while (card.firstChild) link.append(card.firstChild);
      card.append(link);
    }
    li.append(card);
    track.append(li);
  });

  const viewport = createTag('div', { class: 'product-carousel-viewport' }, track);

  const mkArrow = (dir) => createTag('button', {
    type: 'button',
    class: `product-carousel-arrow product-carousel-arrow-${dir}`,
    'aria-label': dir === 'prev' ? 'Previous products' : 'Next products',
  }, dir === 'prev' ? '‹' : '›');
  const prev = mkArrow('prev');
  const next = mkArrow('next');

  const scrollByCards = (sign) => {
    const first = track.querySelector('.product-carousel-item');
    const step = first ? first.getBoundingClientRect().width + 24 : 300;
    viewport.scrollBy({ left: sign * step * Math.max(1, Math.floor(viewport.clientWidth / step)), behavior: 'smooth' });
  };
  prev.addEventListener('click', () => scrollByCards(-1));
  next.addEventListener('click', () => scrollByCards(1));

  const controls = createTag('div', { class: 'product-carousel-controls' }, [prev, next]);

  block.replaceChildren(viewport, controls);
}
