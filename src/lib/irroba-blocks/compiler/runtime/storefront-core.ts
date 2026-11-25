import { safeJsonForScript } from "../../sanitize";
import { STOREFRONT_GRAYS as G } from "@/lib/layout-patterns";
import type { StoreBlueprint } from "@/lib/types/blueprint";
import type { StorefrontContext } from "../context";

/** Início do runtime da vitrine: estado, ticker, carrossel hero, categoria e PDP. */
export function storefrontRuntimeCore(bp: StoreBlueprint, ctx: StorefrontContext): string {
  const { variationSizes, safeProductsJson, safeCategoriesJson } = ctx;
  return `    (function () {
      const PRODUCTS = ${safeProductsJson};
      const CATEGORIES = ${safeCategoriesJson};
      const BUY_BTN_TEXT = ${safeJsonForScript(bp.visualOverrides.pageProduct.buyButtonText)};
      const cart = [];
      let activeCategory = 'all';
      let searchQuery = '';
      let activePdpProduct = null;
      let activeSize = ${safeJsonForScript(variationSizes[0] ?? "Padrão")};
      let pdpQty = 1;

      const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

      function syncHeaderHeight() {
        const hdr = document.querySelector('header.irb-header');
        if (hdr) {
          document.documentElement.style.setProperty('--irb-header-height', hdr.offsetHeight + 'px');
        }
      }
      syncHeaderHeight();
      if (typeof ResizeObserver !== 'undefined') {
        const hdr = document.querySelector('header.irb-header');
        if (hdr) new ResizeObserver(syncHeaderHeight).observe(hdr);
      }
      window.addEventListener('resize', syncHeaderHeight, { passive: true });

      // Barra de Aviso Superior — Rolagem automática mensagem por mensagem
      const overlineTicker = document.getElementById('irb-overline-ticker');
      if (overlineTicker) {
        const overlineSlides = Array.from(overlineTicker.querySelectorAll('.overlineModule__slide'));
        const intervalMs = Math.max(1000, Number(overlineTicker.getAttribute('data-interval-ms')) || 4000);
        let overlineIdx = 0;
        let overlinePaused = false;
        overlineTicker.addEventListener('mouseenter', () => { overlinePaused = true; });
        overlineTicker.addEventListener('mouseleave', () => { overlinePaused = false; });

        if (overlineSlides.length > 1) {
          setInterval(() => {
            if (overlinePaused) return;
            const prevSlide = overlineSlides[overlineIdx];
            overlineIdx = (overlineIdx + 1) % overlineSlides.length;
            const nextSlide = overlineSlides[overlineIdx];

            if (prevSlide && prevSlide !== nextSlide) {
              prevSlide.classList.remove('is-active');
              prevSlide.classList.add('is-leaving');
              setTimeout(() => {
                prevSlide.classList.remove('is-leaving');
              }, 520);
            }
            if (nextSlide) {
              nextSlide.classList.remove('is-leaving');
              nextSlide.classList.add('is-active');
            }
          }, intervalMs);
        }
      }

      function switchView(viewName) {
        document.getElementById('irb-view-home').classList.toggle('active', viewName === 'home');
        document.getElementById('irb-view-category').classList.toggle('active', viewName === 'category');
        document.getElementById('irb-view-product').classList.toggle('active', viewName === 'product');
        document.body.classList.toggle('irb-subview-active', viewName !== 'home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // Hero Carousel
      const slides = Array.from(document.querySelectorAll('.heroSlide'));
      const dots = Array.from(document.querySelectorAll('.heroDot'));
      let slideIdx = 0;
      function showSlide(nextIdx) {
        if (slides.length <= 1) return;
        slideIdx = (nextIdx + slides.length) % slides.length;
        slides.forEach((s, i) => s.classList.toggle('active', i === slideIdx));
        dots.forEach((d, i) => d.classList.toggle('active', i === slideIdx));
      }
      const prevBtn = document.getElementById('irb-hero-prev');
      const nextBtn = document.getElementById('irb-hero-next');
      if (prevBtn) prevBtn.addEventListener('click', () => showSlide(slideIdx - 1));
      if (nextBtn) nextBtn.addEventListener('click', () => showSlide(slideIdx + 1));
      dots.forEach((dot) => {
        dot.addEventListener('click', () => showSlide(Number(dot.getAttribute('data-hero-dot') || 0)));
      });
      if (slides.length > 1) {
        setInterval(() => showSlide(slideIdx + 1), 6000);
      }

      function createProductCardNode(p) {
        const card = document.createElement('article');
        card.className = 'product product-grid';

        const imgWrap = document.createElement('div');
        imgWrap.className = 'product-image-wrap';
        imgWrap.addEventListener('click', () => openProductPage(p.id));

        if (p.compareAtPrice && p.compareAtPrice > p.price) {
          const pct = Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100);
          if (pct > 0) {
            const badge = document.createElement('span');
            badge.className = 'product-badge';
            badge.textContent = '-' + pct + '%';
            imgWrap.appendChild(badge);
          }
        }

        const img = document.createElement('img');
        img.src = p.imageUrl;
        img.alt = p.title;
        img.loading = 'lazy';
        imgWrap.appendChild(img);

        const info = document.createElement('div');
        info.className = 'product-info';

        const catEl = document.createElement('span');
        catEl.className = 'product-cat';
        catEl.textContent = p.category || 'Destaques';
        info.appendChild(catEl);

        const titleEl = document.createElement('h3');
        titleEl.className = 'product-title';
        titleEl.textContent = p.title;
        titleEl.addEventListener('click', () => openProductPage(p.id));
        info.appendChild(titleEl);

        const priceWrap = document.createElement('div');
        priceWrap.className = 'product-price-wrap';
        if (p.compareAtPrice && p.compareAtPrice > p.price) {
          const oldEl = document.createElement('span');
          oldEl.className = 'product-price-old';
          oldEl.textContent = formatCurrency(p.compareAtPrice);
          priceWrap.appendChild(oldEl);
        }
        const priceEl = document.createElement('span');
        priceEl.className = 'product-price';
        priceEl.textContent = formatCurrency(p.price);
        priceWrap.appendChild(priceEl);
        info.appendChild(priceWrap);

        if (p.installmentsText) {
          const instEl = document.createElement('div');
          instEl.className = 'product-installments';
          instEl.textContent = p.installmentsText;
          info.appendChild(instEl);
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'product-btn';
        btn.textContent = BUY_BTN_TEXT;
        btn.addEventListener('click', () => addToCart(p.id, 1));
        info.appendChild(btn);

        card.appendChild(imgWrap);
        card.appendChild(info);
        return card;
      }

      function matchesCategory(product, catLabel) {
        if (catLabel === 'all') return true;
        const norm = catLabel.toLowerCase();
        const stem = norm.replace(/s$/, '');
        const cats = (product.categories || [product.category || '']).map((c) => c.toLowerCase());
        return (
          cats.some((c) => c.includes(norm) || norm.includes(c)) ||
          (product.title || '').toLowerCase().includes(stem)
        );
      }

      function openCategoryPage(catLabel, query) {
        activeCategory = catLabel || 'all';
        searchQuery = (query || '').trim().toLowerCase();

        document.querySelectorAll('.categoryLink').forEach((c) => {
          const attr = (c.getAttribute('data-filter-cat') || '').toLowerCase();
          c.classList.toggle('active', attr === activeCategory.toLowerCase());
        });
        document.querySelectorAll('.catFilterChip').forEach((chip) => {
          const attr = (chip.getAttribute('data-filter-cat') || '').toLowerCase();
          chip.classList.toggle('active', attr === activeCategory.toLowerCase());
        });

        let filtered = PRODUCTS.filter((p) => {
          const okCat = matchesCategory(p, activeCategory);
          const okSearch =
            !searchQuery ||
            (p.title || '').toLowerCase().includes(searchQuery) ||
            (p.category || '').toLowerCase().includes(searchQuery);
          return okCat && okSearch;
        });

        // If a scraped category has zero exact matches without search, show full catalog fallback clearly
        let titleText = activeCategory === 'all' ? 'Todos os Produtos' : activeCategory;
        if (searchQuery) {
          titleText = 'Resultados para "' + query + '"';
        } else if (filtered.length === 0 && activeCategory !== 'all') {
          filtered = PRODUCTS.slice(0, 12);
        }

        const sortVal = document.getElementById('irb-cat-sort').value;
        if (sortVal === 'price-asc') filtered.sort((a, b) => a.price - b.price);
        else if (sortVal === 'price-desc') filtered.sort((a, b) => b.price - a.price);
        else if (sortVal === 'name-asc') filtered.sort((a, b) => a.title.localeCompare(b.title));

        document.getElementById('irb-cat-breadcrumb').textContent = titleText;
        document.getElementById('irb-cat-title').textContent = titleText;
        document.getElementById('irb-cat-count').textContent = filtered.length + ' produto(s) disponível(is)';

        const grid = document.getElementById('irb-cat-grid');
        grid.innerHTML = '';
        if (filtered.length === 0) {
          grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px 0;color:${G.gray500};">Nenhum produto encontrado para essa busca. Tente outro termo ou volte para Início.</p>';
        } else {
          filtered.forEach((p) => grid.appendChild(createProductCardNode(p)));
        }

        document.getElementById('irb-mobile-drawer').classList.remove('open');
        switchView('category');
      }

      function openProductPage(productId) {
        const product = PRODUCTS.find((p) => p.id === productId);
        if (!product) return;
        activePdpProduct = product;
        pdpQty = 1;
        document.getElementById('irb-pdp-qty').textContent = '1';
        const sizeBtns = Array.from(document.querySelectorAll('.pdpSizeBtn'));
        sizeBtns.forEach((b, idx) => b.classList.toggle('active', idx === 0));
        activeSize = sizeBtns[0] ? (sizeBtns[0].getAttribute('data-size-opt') || 'Padrão') : 'Padrão';

        const images = (product.images && product.images.length > 0 ? product.images : [product.imageUrl]).filter(Boolean);
        const mainImg = document.getElementById('irb-pdp-img');
        mainImg.src = images[0] || product.imageUrl;

        const thumbsEl = document.getElementById('irb-pdp-thumbs');
        thumbsEl.innerHTML = '';
        images.forEach((imgUrl, idx) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'pdpThumb' + (idx === 0 ? ' active' : '');
          const tImg = document.createElement('img');
          tImg.src = imgUrl;
          tImg.alt = product.title;
          btn.appendChild(tImg);
          btn.addEventListener('click', () => {
            mainImg.src = imgUrl;
            thumbsEl.querySelectorAll('.pdpThumb').forEach((t) => t.classList.remove('active'));
            btn.classList.add('active');
          });
          thumbsEl.appendChild(btn);
        });

        const catLabel = product.category || 'Destaques';
        document.getElementById('irb-pdp-cat-link').textContent = catLabel;
        document.getElementById('irb-pdp-cat-link').onclick = () => openCategoryPage(catLabel, '');
        document.getElementById('irb-pdp-breadcrumb-title').textContent = product.title;
        document.getElementById('irb-pdp-cat').textContent = catLabel;
        document.getElementById('irb-pdp-title').textContent = product.title;
        document.getElementById('irb-pdp-price').textContent = formatCurrency(product.price);
        document.getElementById('irb-pdp-pix-badge').textContent = formatCurrency(product.price * 0.95) + ' no PIX (-5%)';
        document.getElementById('irb-pdp-old').textContent =
          product.compareAtPrice && product.compareAtPrice > product.price
            ? formatCurrency(product.compareAtPrice)
            : '';
        document.getElementById('irb-pdp-installments').textContent = product.installmentsText || '';
        document.getElementById('irb-pdp-desc').textContent = product.description || '';
        const cepInput = document.getElementById('irb-cep-input');
        if (cepInput) cepInput.value = '';
        document.getElementById('irb-cep-result').style.display = 'none';

        const relatedGrid = document.getElementById('irb-pdp-related');
        relatedGrid.innerHTML = '';
        PRODUCTS.filter((p) => p.id !== product.id)
          .slice(0, 4)
          .forEach((rel) => relatedGrid.appendChild(createProductCardNode(rel)));

        switchView('product');
      }
`;
}
