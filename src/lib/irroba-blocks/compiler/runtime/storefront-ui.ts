import { STOREFRONT_GRAYS as G } from "@/lib/layout-patterns";

/** Fim do runtime da vitrine: navegação, busca, carrinho, drawers, conta e rolagem sincronizada. */
export function storefrontRuntimeUi(): string {
  return `      // Navigation bindings
      function goHome() {
        activeCategory = 'all';
        searchQuery = '';
        rawSearchQuery = '';
        minPriceFilter = null;
        maxPriceFilter = null;
        promoOnlyFilter = false;
        const sInput = document.getElementById('irb-search-input');
        if (sInput) sInput.value = '';
        document.querySelectorAll('.categoryLink').forEach((c) => c.classList.remove('active'));
        const mobileDrawer = document.getElementById('irb-mobile-drawer');
        if (mobileDrawer) mobileDrawer.classList.remove('open');
        setCatDrawerOpen(false);
        switchView('home');
      }

      document.querySelectorAll('[data-go-home]').forEach((el) => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          goHome();
        });
      });

      document.getElementById('irb-go-home-logo').addEventListener('click', (e) => {
        e.preventDefault();
        goHome();
      });

      document.querySelectorAll('[data-filter-cat], [data-irb-cat]').forEach((el) => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          const cat = el.getAttribute('data-filter-cat') || el.getAttribute('data-irb-cat') || 'all';
          openCategoryPage(cat, '', { keepFilters: false });
        });
      });

      document.querySelectorAll('[data-sidebar-cat]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const cat = btn.getAttribute('data-sidebar-cat') || 'all';
          openCategoryPage(cat, rawSearchQuery, { keepFilters: true });
        });
      });

      document.querySelectorAll('#irb-price-presets .filterPresetBtn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const minRaw = btn.getAttribute('data-price-min') || '';
          const maxRaw = btn.getAttribute('data-price-max') || '';
          const nextMin = minRaw ? Number(minRaw) : null;
          const nextMax = maxRaw ? Number(maxRaw) : null;
          if (minPriceFilter === nextMin && maxPriceFilter === nextMax) {
            minPriceFilter = null;
            maxPriceFilter = null;
          } else {
            minPriceFilter = nextMin;
            maxPriceFilter = nextMax;
          }
          const minIn = document.getElementById('min-price-input');
          const maxIn = document.getElementById('max-price-input');
          if (minIn) minIn.value = minPriceFilter !== null ? String(minPriceFilter) : '';
          if (maxIn) maxIn.value = maxPriceFilter !== null ? String(maxPriceFilter) : '';
          openCategoryPage(activeCategory, rawSearchQuery, { keepFilters: true });
        });
      });

      const applyFiltersBtn = document.getElementById('irb-apply-filters-btn');
      if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
          const minIn = document.getElementById('min-price-input');
          const maxIn = document.getElementById('max-price-input');
          const promoCb = document.getElementById('irb-filter-promo-only');
          const minVal = minIn && minIn.value.trim() !== '' ? Number(minIn.value) : null;
          const maxVal = maxIn && maxIn.value.trim() !== '' ? Number(maxIn.value) : null;
          minPriceFilter = minVal !== null && Number.isFinite(minVal) && minVal >= 0 ? minVal : null;
          maxPriceFilter = maxVal !== null && Number.isFinite(maxVal) && maxVal >= 0 ? maxVal : null;
          promoOnlyFilter = Boolean(promoCb && promoCb.checked);
          openCategoryPage(activeCategory, rawSearchQuery, { keepFilters: true });
        });
      }

      const promoCheckbox = document.getElementById('irb-filter-promo-only');
      if (promoCheckbox) {
        promoCheckbox.addEventListener('change', () => {
          promoOnlyFilter = Boolean(promoCheckbox.checked);
          openCategoryPage(activeCategory, rawSearchQuery, { keepFilters: true });
        });
      }

      const clearFiltersBtn = document.getElementById('irb-clear-filters-btn');
      if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
          openCategoryPage('all', '', { keepFilters: false });
        });
      }

      document.querySelectorAll('.js-changeGrid').forEach((btn) => {
        btn.addEventListener('click', () => {
          const cols = Number(btn.getAttribute('data-grid-cols') || 3);
          catGridCols = cols === 4 ? 4 : 3;
          document.querySelectorAll('.js-changeGrid').forEach((b) => {
            b.classList.toggle('active', Number(b.getAttribute('data-grid-cols')) === catGridCols);
          });
          const grid = document.getElementById('irb-cat-grid');
          if (grid) grid.classList.toggle('grid-cols-4', catGridCols === 4);
        });
      });

      const openCatFiltersBtn = document.getElementById('irb-open-cat-filters');
      const closeCatFiltersBtn = document.getElementById('irb-cat-filter-close');
      const catFilterBackdrop = document.getElementById('irb-cat-filter-backdrop');
      if (openCatFiltersBtn) openCatFiltersBtn.addEventListener('click', () => setCatDrawerOpen(true));
      if (closeCatFiltersBtn) closeCatFiltersBtn.addEventListener('click', () => setCatDrawerOpen(false));
      if (catFilterBackdrop) catFilterBackdrop.addEventListener('click', () => setCatDrawerOpen(false));

      document.getElementById('irb-cat-sort').addEventListener('change', () => {
        openCategoryPage(activeCategory, rawSearchQuery, { keepFilters: true });
      });

      const searchModal = document.getElementById('irb-search-modal');
      const searchToggleBtn = document.getElementById('irb-toggle-search');
      const searchCloseBtn = document.getElementById('irb-close-search');
      const searchInput = document.getElementById('irb-search-input');
      const searchLiveTitle = document.getElementById('irb-search-live-title');
      const searchLiveResults = document.getElementById('irb-search-live-results');

      function renderLiveSearchSuggestions(rawTerm) {
        if (!searchLiveResults) return;
        const term = (rawTerm || '').trim().toLowerCase();
        const matches = term
          ? PRODUCTS.filter(
              (p) =>
                (p.title || '').toLowerCase().includes(term) ||
                (p.category || '').toLowerCase().includes(term)
            )
          : PRODUCTS;

        if (searchLiveTitle) {
          searchLiveTitle.textContent = term
            ? matches.length + ' resultado(s) para "' + rawTerm.trim() + '"'
            : 'Sugestões em destaque';
        }

        searchLiveResults.innerHTML = '';
        if (matches.length === 0) {
          const empty = document.createElement('div');
          empty.style.cssText = 'font-size:13px;color:${G.gray500};padding:12px 4px;';
          empty.textContent = 'Nenhum produto encontrado. Tente outro termo.';
          searchLiveResults.appendChild(empty);
          return;
        }

        matches.slice(0, 5).forEach((p) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'irb-search-item';

          const img = document.createElement('img');
          img.src = p.imageUrl || '';
          img.alt = p.title || '';

          const meta = document.createElement('div');
          meta.style.cssText = 'flex:1;min-width:0;';

          const t = document.createElement('div');
          t.style.cssText = 'font-size:13px;font-weight:600;color:${G.gray900};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
          t.textContent = p.title;

          const sub = document.createElement('div');
          sub.style.cssText = 'font-size:12px;color:${G.gray600};';
          sub.textContent = (p.category || '') + ' · ' + formatCurrency(p.price);

          meta.appendChild(t);
          meta.appendChild(sub);
          btn.appendChild(img);
          btn.appendChild(meta);
          btn.addEventListener('click', () => {
            setSearchOpen(false);
            openProductPage(p.id);
          });
          searchLiveResults.appendChild(btn);
        });
      }

      function setSearchOpen(open) {
        if (!searchModal) return;
        searchModal.classList.toggle('open', open);
        searchModal.setAttribute('aria-hidden', open ? 'false' : 'true');
        if (searchToggleBtn) searchToggleBtn.classList.toggle('is-active', open);
        if (open) {
          renderLiveSearchSuggestions(searchInput ? searchInput.value : '');
          if (searchInput) setTimeout(() => searchInput.focus(), 40);
        }
      }

      if (searchToggleBtn) {
        searchToggleBtn.addEventListener('click', () => {
          const isOpen = searchModal && searchModal.classList.contains('open');
          setSearchOpen(!isOpen);
        });
      }
      if (searchCloseBtn) {
        searchCloseBtn.addEventListener('click', () => setSearchOpen(false));
      }
      if (searchModal) {
        searchModal.addEventListener('click', (e) => {
          if (e.target === searchModal) setSearchOpen(false);
        });
        searchModal.querySelectorAll('[data-filter-cat]').forEach((chip) => {
          chip.addEventListener('click', () => setSearchOpen(false));
        });
      }
      if (searchInput) {
        searchInput.addEventListener('input', () => renderLiveSearchSuggestions(searchInput.value));
      }
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          setSearchOpen(false);
          setAccountDropdownOpen(false);
          const accountModal = document.getElementById('irb-account-modal');
          const cartDrawer = document.getElementById('irb-cart-drawer');
          const mobileDrawer = document.getElementById('irb-mobile-drawer');
          if (accountModal) accountModal.classList.remove('open');
          if (cartDrawer) cartDrawer.classList.remove('open');
          if (mobileDrawer) mobileDrawer.classList.remove('open');
          setCatDrawerOpen(false);
        }
      });

      document.getElementById('irb-search-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const q = (searchInput && searchInput.value) || '';
        setSearchOpen(false);
        openCategoryPage('all', q);
      });

      // Home product card click bindings
      document.querySelectorAll('[data-open-pdp]').forEach((el) => {
        el.addEventListener('click', () => openProductPage(el.getAttribute('data-open-pdp')));
      });

      document.querySelectorAll('[data-add-cart]').forEach((btn) => {
        btn.addEventListener('click', () => addToCart(btn.getAttribute('data-add-cart'), 1));
      });

      // PDP controls
      document.querySelectorAll('[data-size-opt]').forEach((btn) => {
        btn.addEventListener('click', () => {
          activeSize = btn.getAttribute('data-size-opt') || 'Padrão';
          document.querySelectorAll('[data-size-opt]').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
      document.getElementById('irb-pdp-qty-dec').addEventListener('click', () => {
        pdpQty = Math.max(1, pdpQty - 1);
        document.getElementById('irb-pdp-qty').textContent = String(pdpQty);
      });
      document.getElementById('irb-pdp-qty-inc').addEventListener('click', () => {
        pdpQty = Math.min(20, pdpQty + 1);
        document.getElementById('irb-pdp-qty').textContent = String(pdpQty);
      });
      document.getElementById('irb-pdp-add').addEventListener('click', () => {
        if (activePdpProduct) addToCart(activePdpProduct.id, pdpQty, activeSize);
      });
      document.getElementById('irb-cep-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const cep = (document.getElementById('irb-cep-input').value || '').trim();
        const out = document.getElementById('irb-cep-result');
        out.style.display = 'block';
        out.textContent =
          'Frete para CEP ' +
          (cep || 'informado') +
          ': Econômico R$ 19,90 (4 a 6 dias úteis) • Expresso R$ 32,90 (1 a 2 dias úteis)';
      });

      // Cart logic
      function renderCart() {
        const countEl = document.getElementById('irb-cart-count');
        const itemsEl = document.getElementById('irb-cart-items');
        const totalEl = document.getElementById('irb-cart-total');

        const totalQty = cart.reduce((acc, item) => acc + item.qty, 0);
        const totalAmt = cart.reduce((acc, item) => acc + item.product.price * item.qty, 0);
        countEl.textContent = String(totalQty);
        totalEl.textContent = formatCurrency(totalAmt);

        if (cart.length === 0) {
          itemsEl.innerHTML = '<p style="color:${G.gray500};font-size:14px;text-align:center;margin-top:40px;">Sua sacola está vazia. Clique em comprar em qualquer produto para testar!</p>';
          return;
        }

        itemsEl.innerHTML = '';
        cart.forEach((item, idx) => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;gap:12px;align-items:center;border-bottom:1px solid ${G.gray100};padding-bottom:10px;';

          const img = document.createElement('img');
          img.src = item.product.imageUrl || '';
          img.alt = item.product.title || '';
          img.style.cssText = 'width:56px;height:56px;object-fit:cover;border-radius:6px;';

          const info = document.createElement('div');
          info.style.cssText = 'flex:1;min-width:0;';

          const titleEl = document.createElement('div');
          titleEl.style.cssText = 'font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
          titleEl.textContent = item.product.title + (item.size ? ' (' + item.size + ')' : '');

          const priceEl = document.createElement('div');
          priceEl.style.cssText = 'font-size:13px;color:${G.gray600};';
          priceEl.textContent = item.qty + 'x ' + formatCurrency(item.product.price);

          info.appendChild(titleEl);
          info.appendChild(priceEl);

          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.style.cssText = 'border:none;background:none;color:#ef4444;cursor:pointer;font-size:12px;font-weight:700;';
          removeBtn.textContent = 'Remover';
          removeBtn.addEventListener('click', () => {
            cart.splice(idx, 1);
            renderCart();
          });

          row.appendChild(img);
          row.appendChild(info);
          row.appendChild(removeBtn);
          itemsEl.appendChild(row);
        });
      }

      function addToCart(productId, qty, size) {
        const product = PRODUCTS.find((p) => p.id === productId);
        if (!product) return;
        const chosenSize = size || '';
        const existing = cart.find((c) => c.product.id === productId && c.size === chosenSize);
        if (existing) existing.qty += qty || 1;
        else cart.push({ product, qty: qty || 1, size: chosenSize });
        renderCart();
        document.getElementById('irb-cart-drawer').classList.add('open');
      }

      // Modals & Drawers
      document.getElementById('irb-open-cart').addEventListener('click', () => {
        renderCart();
        document.getElementById('irb-cart-drawer').classList.add('open');
      });
      document.getElementById('irb-cart-close').addEventListener('click', () => {
        document.getElementById('irb-cart-drawer').classList.remove('open');
      });
      document.getElementById('irb-open-mobile-menu').addEventListener('click', () => {
        document.getElementById('irb-mobile-drawer').classList.add('open');
      });
      document.getElementById('irb-mobile-close').addEventListener('click', () => {
        document.getElementById('irb-mobile-drawer').classList.remove('open');
      });
      const accountModalEl = document.getElementById('irb-account-modal');
      const accountDropdownEl = document.getElementById('irb-account-dropdown');
      const accountBackdropEl = document.getElementById('irb-account-backdrop');
      const accountToggleBtn = document.getElementById('irb-open-account');
      const accountWrapEl = document.getElementById('irb-account-wrap');

      function setAccountDropdownOpen(open) {
        if (accountDropdownEl) accountDropdownEl.classList.toggle('open', open);
        if (accountBackdropEl) {
          accountBackdropEl.classList.toggle('open', open);
          accountBackdropEl.setAttribute('aria-hidden', open ? 'false' : 'true');
        }
        if (accountToggleBtn) {
          accountToggleBtn.classList.toggle('is-active', open);
          accountToggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
      }

      function openAccountModalInMode(mode) {
        setAccountDropdownOpen(false);
        if (!accountModalEl) return;
        const titleEl = document.getElementById('irb-account-modal-title');
        const descEl = document.getElementById('irb-account-modal-desc');
        const nameField = document.getElementById('irb-account-name-field');
        const submitBtn = document.getElementById('irb-account-submit-btn');
        const msgEl = document.getElementById('irb-account-msg');
        if (msgEl) msgEl.style.display = 'none';
        if (mode === 'register') {
          if (titleEl) titleEl.textContent = 'Criar conta';
          if (descEl) descEl.textContent = 'Cadastre-se rapidamente para acompanhar pedidos e aproveitar ofertas exclusivas.';
          if (nameField) {
            nameField.style.display = 'block';
            nameField.required = true;
          }
          if (submitBtn) submitBtn.textContent = 'Criar Minha Conta (Demo)';
        } else {
          if (titleEl) titleEl.textContent = 'Entrar na sua conta';
          if (descEl) descEl.textContent = 'Acesse seus pedidos, favoritos e dados cadastrais no ambiente seguro da Irroba.';
          if (nameField) {
            nameField.style.display = 'none';
            nameField.required = false;
          }
          if (submitBtn) submitBtn.textContent = 'Entrar na Conta (Demo)';
        }
        accountModalEl.classList.add('open');
      }

      if (accountToggleBtn) {
        accountToggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = accountDropdownEl && accountDropdownEl.classList.contains('open');
          setAccountDropdownOpen(!isOpen);
        });
      }
      if (accountBackdropEl) {
        accountBackdropEl.addEventListener('click', () => setAccountDropdownOpen(false));
      }
      document.addEventListener('click', (e) => {
        if (
          accountDropdownEl &&
          accountDropdownEl.classList.contains('open') &&
          accountWrapEl &&
          !accountWrapEl.contains(e.target)
        ) {
          setAccountDropdownOpen(false);
        }
      });
      document.querySelectorAll('[data-account-action]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          openAccountModalInMode(btn.getAttribute('data-account-action') || 'login');
        });
      });
      document.getElementById('irb-account-close').addEventListener('click', () => {
        if (accountModalEl) accountModalEl.classList.remove('open');
      });
      if (accountModalEl) {
        accountModalEl.addEventListener('click', (e) => {
          if (e.target === accountModalEl) accountModalEl.classList.remove('open');
        });
      }

      // Rolagem sincronizada com o pai (comparativo). O iframe roda em sandbox sem
      // allow-same-origin, então o pai não lê o documento: o runtime informa a fração rolada
      // ('irroba-scroll') e obedece 'irroba-scroll-to' vindo só de window.parent.
      if (window.parent && window.parent !== window) {
        const scrollMax = () =>
          Math.max(0, (document.documentElement.scrollHeight || document.body.scrollHeight || 0) - window.innerHeight);
        let scrollRaf = false;
        window.addEventListener('scroll', () => {
          if (scrollRaf) return;
          scrollRaf = true;
          requestAnimationFrame(() => {
            scrollRaf = false;
            const max = scrollMax();
            if (max <= 0) return;
            try {
              window.parent.postMessage({ type: 'irroba-scroll', ratio: Math.min(1, Math.max(0, window.scrollY / max)) }, '*');
            } catch {
              // ignore
            }
          });
        }, { passive: true });
        window.addEventListener('message', (e) => {
          if (e.source !== window.parent) return;
          const msg = e.data;
          if (!msg || typeof msg !== 'object' || msg.type !== 'irroba-scroll-to') return;
          const ratio = Number(msg.ratio);
          if (!Number.isFinite(ratio)) return;
          const top = Math.round(Math.min(1, Math.max(0, ratio)) * scrollMax());
          window.scrollTo({ top, behavior: msg.smooth ? 'smooth' : 'auto' });
        });
      }
    })();`;
}
