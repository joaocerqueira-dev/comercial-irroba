// Inspetor visual do Studio (hover + clique para editar), injetado só com studioInspector.
export function buildStudioInspectorSnippet(): string {
  return `
  <style id="irb-studio-inspector-css" data-irb-inspector-ui="1">
    body.irb-inspect-mode .overlineModule,
    body.irb-inspect-mode header.irb-header,
    body.irb-inspect-mode .headerContent_logo,
    body.irb-inspect-mode .headerContent_navInline,
    body.irb-inspect-mode .headerContent_categories,
    body.irb-inspect-mode [data-irb-section],
    body.irb-inspect-mode [data-irb-custom-section],
    body.irb-inspect-mode .secondaryBannerSection,
    body.irb-inspect-mode .productList,
    body.irb-inspect-mode article.product,
    body.irb-inspect-mode footer.footer,
    body.irb-inspect-mode .footer-legal-info,
    body.irb-inspect-mode #irb-view-product .pdpGrid {
      cursor: pointer !important;
    }
    #irb-studio-hover-box,
    #irb-studio-active-box {
      position: fixed;
      pointer-events: none;
      border-radius: 6px;
      display: none;
      box-sizing: border-box;
      transition: top 0.06s ease, left 0.06s ease, width 0.06s ease, height 0.06s ease;
    }
    #irb-studio-hover-box {
      z-index: 9998;
      border: 2px solid #EA191F;
      background: rgba(234, 25, 31, 0.055);
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.75) inset;
    }
    #irb-studio-active-box {
      z-index: 9996;
      border: 2px dashed #980101;
      background: rgba(152, 1, 1, 0.03);
    }
    #irb-studio-hover-badge,
    #irb-studio-active-badge {
      position: fixed;
      pointer-events: none;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: none;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      max-width: calc(100vw - 16px);
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 6px 18px rgba(31, 31, 35, 0.24);
    }
    #irb-studio-hover-badge {
      z-index: 10000;
      background: #EA191F;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.01em;
      padding: 4px 10px;
      border-radius: 8px;
    }
    #irb-studio-active-badge {
      z-index: 9997;
      background: #980101;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
    }
  </style>
  <div id="irb-studio-active-box" data-irb-inspector-ui="1"></div>
  <div id="irb-studio-active-badge" data-irb-inspector-ui="1"></div>
  <div id="irb-studio-hover-box" data-irb-inspector-ui="1"></div>
  <div id="irb-studio-hover-badge" data-irb-inspector-ui="1">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
    <span id="irb-studio-hover-title"></span>
    <span style="opacity:0.85;font-weight:500;">· Clique para editar</span>
  </div>
  <script id="irb-studio-inspector-js" data-irb-inspector-ui="1">
    (function () {
      const hoverBox = document.getElementById('irb-studio-hover-box');
      const hoverBadge = document.getElementById('irb-studio-hover-badge');
      const hoverTitle = document.getElementById('irb-studio-hover-title');
      const activeBox = document.getElementById('irb-studio-active-box');
      const activeBadge = document.getElementById('irb-studio-active-badge');

      // O iframe roda em sandbox sem allow-same-origin (origem "null"): fala com o pai só por
      // postMessage e aceita mensagens só de window.parent. O estado que sobrevive à recompilação
      // do srcDoc (rolagem e slide) fica no pai, que o devolve em 'irb-studio:set-state' após o
      // 'irb-studio:ready'. O envio usa targetOrigin '*' porque o pai é quem nos embute e a nossa
      // origem opaca não permite nomear a dele; nada sensível sai por aqui.
      function postToParent(msg) {
        try {
          if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*');
        } catch {
          // ignore
        }
      }

      function writeSavedState(patch) {
        postToParent(Object.assign({ type: 'irb-studio:state' }, patch));
      }

      let inspectMode = true;
      let activeSelection = null;
      let hoveredMatch = null;
      let sidebarHoverTargetId = null;
      let sidebarHoverCustomSectionId = null;

      function syncBodyClass() {
        document.body.classList.toggle('irb-inspect-mode', Boolean(inspectMode));
      }
      syncBodyClass();

      function applySlideIndex(idx) {
        const slides = Array.from(document.querySelectorAll('.heroSlide'));
        const dots = Array.from(document.querySelectorAll('.heroDot'));
        if (slides.length <= 1 || typeof idx !== 'number' || Number.isNaN(idx)) return;
        const norm = ((idx % slides.length) + slides.length) % slides.length;
        slides.forEach((s, i) => s.classList.toggle('active', i === norm));
        dots.forEach((d, i) => d.classList.toggle('active', i === norm));
        writeSavedState({ slideIdx: norm });
      }

      function restoreScroll(y) {
        if (typeof y !== 'number' || !(y > 0)) return;
        window.scrollTo(0, y);
        requestAnimationFrame(() => window.scrollTo(0, y));
      }

      function findElementForSelection(sel) {
        if (!sel || !sel.targetId) return null;
        const t = sel.targetId;
        if (t === 'custom-section' && sel.customSectionId) {
          return document.querySelector('[data-irb-custom-section="' + CSS.escape(sel.customSectionId) + '"]');
        }
        if (t === 'announcement') return document.querySelector('.overlineModule');
        if (t === 'header-logo') return document.querySelector('.headerContent_logo');
        if (t === 'header-nav') return document.querySelector('.headerContent_navInline, .headerContent_categories') || document.querySelector('header.irb-header');
        if (t === 'header') return document.querySelector('header.irb-header');
        if (t === 'hero') return document.querySelector('[data-irb-section="hero"]');
        if (t === 'tarja') return document.querySelector('[data-irb-section="tarja"]');
        if (t === 'editorialGallery') return document.querySelector('[data-irb-section="editorialGallery"]');
        if (t === 'slimBanner') return document.querySelector('[data-irb-section="slimBanner"]');
        if (t === 'product-item' && sel.productId) {
          return document.querySelector('article.product[data-product-id="' + CSS.escape(sel.productId) + '"]') || document.querySelector('[data-irb-section="showcase1"]');
        }
        if (t === 'buy-button') {
          return document.querySelector('.product-btn[data-add-cart]') || document.querySelector('[data-irb-section="showcase1"]');
        }
        if (t === 'showcase1') return document.querySelector('#showcase-1, [data-irb-section="showcase1"]');
        if (t === 'extraShowcases') {
          const scIdx = typeof sel.showcaseIdx === 'number' && sel.showcaseIdx >= 1 ? sel.showcaseIdx + 1 : 2;
          return document.querySelector('#showcase-' + scIdx) || document.querySelector('.productList[id^="showcase-"]:not(#showcase-1)');
        }
        if (t === 'secondaryBanner') return document.querySelector('.secondaryBannerSection');
        if (t === 'editorialLookbook') return document.querySelector('[data-irb-section="editorialLookbook"]');
        if (t === 'testimonials') return document.querySelector('[data-irb-section="testimonials"]');
        if (t === 'newsletter') return document.querySelector('[data-irb-section="newsletter"]');
        if (t === 'footer-legal') return document.querySelector('.footer-legal-info');
        if (t === 'footer') return document.querySelector('.footerContent--top') || document.querySelector('footer.footer');
        if (t === 'pdp') return document.querySelector('#irb-view-product .pdpGrid');
        return document.querySelector('[data-irb-section="' + CSS.escape(t) + '"]');
      }

      function resolveEditableTarget(node) {
        if (!(node instanceof Element)) return null;
        if (node.closest('[data-irb-inspector-ui]')) return null;
        if (node.closest('#irb-account-dropdown, #irb-account-backdrop, #irb-account-modal')) return null;

        const logo = node.closest('.headerContent_logo');
        if (logo) return { targetId: 'header-logo', label: 'Logotipo da Loja', el: logo };

        const nav = node.closest('.headerContent_navInline, .headerContent_categories');
        if (nav) return { targetId: 'header-nav', label: 'Menu de Categorias', el: nav };

        const header = node.closest('header.irb-header');
        if (header) return { targetId: 'header', label: 'Cabeçalho', el: header };

        const overline = node.closest('.overlineModule');
        if (overline) return { targetId: 'announcement', label: 'Barra de Aviso (Overline)', el: overline };

        const pdp = node.closest('#irb-view-product.active .pdpGrid');
        if (pdp) return { targetId: 'pdp', label: 'Página de Produto (PDP)', el: pdp };

        const buyBtn = node.closest('.product-btn[data-add-cart]');
        if (buyBtn) return { targetId: 'buy-button', label: 'Botão Comprar', el: buyBtn };

        const prodCard = node.closest('article.product[data-product-id]');
        if (prodCard) {
          const pid = prodCard.getAttribute('data-product-id') || '';
          const rawTitle = (prodCard.querySelector('.product-title')?.textContent || 'Produto').trim();
          const shortTitle = rawTitle.length > 28 ? rawTitle.slice(0, 28) + '…' : rawTitle;
          const parentSc = prodCard.closest('.productList[id^="showcase-"]');
          const scNum = parentSc ? Number((parentSc.id || '').replace('showcase-', '')) : 1;
          return {
            targetId: 'product-item',
            productId: pid,
            showcaseIdx: scNum > 0 ? scNum - 1 : 0,
            label: 'Produto: ' + shortTitle,
            el: prodCard,
          };
        }

        const hero = node.closest('[data-irb-section="hero"]');
        if (hero) {
          const activeSlide = hero.querySelector('.heroSlide.active');
          const sIdx = activeSlide ? Number(activeSlide.getAttribute('data-slide-idx') || 0) : 0;
          return { targetId: 'hero', subIndex: sIdx, label: 'Banner Principal', el: hero };
        }

        const tarja = node.closest('[data-irb-section="tarja"]');
        if (tarja) return { targetId: 'tarja', label: 'Tarja Informativa', el: tarja };

        const galleryCard = node.closest('[data-irb-section="editorialGallery"] a[data-irb-cat]:not([data-irb-cat="all"])');
        if (galleryCard) {
          const gallerySec = galleryCard.closest('[data-irb-section="editorialGallery"]');
          const allCards = gallerySec ? Array.from(gallerySec.querySelectorAll('a[data-irb-cat]:not([data-irb-cat="all"])')) : [];
          const cIdx = Math.max(0, allCards.indexOf(galleryCard));
          return {
            targetId: 'editorialGallery',
            subIndex: cIdx,
            label: 'Galeria Editorial — Card ' + (cIdx + 1),
            el: galleryCard,
          };
        }

        const gallery = node.closest('[data-irb-section="editorialGallery"]');
        if (gallery) return { targetId: 'editorialGallery', label: 'Galeria Editorial', el: gallery };

        const slim = node.closest('[data-irb-section="slimBanner"]');
        if (slim) return { targetId: 'slimBanner', label: 'Banner Slim Promocional', el: slim };

        const scSection = node.closest('.productList[id^="showcase-"]');
        if (scSection) {
          const num = Number((scSection.id || '').replace('showcase-', '')) || 1;
          const scTitle = (scSection.querySelector('.productList__title')?.textContent || '').trim();
          return {
            targetId: num === 1 ? 'showcase1' : 'extraShowcases',
            showcaseIdx: num - 1,
            label: scTitle ? 'Vitrine: ' + scTitle : (num === 1 ? 'Vitrine Principal' : 'Vitrine #' + num),
            el: scSection,
          };
        }

        const sc1Wrap = node.closest('[data-irb-section="showcase1"]');
        if (sc1Wrap) return { targetId: 'showcase1', showcaseIdx: 0, label: 'Vitrine Principal', el: sc1Wrap };

        const secBanner = node.closest('.secondaryBannerSection');
        if (secBanner) return { targetId: 'secondaryBanner', label: 'Banner Secundário', el: secBanner };

        const lookbook = node.closest('[data-irb-section="editorialLookbook"]');
        if (lookbook) return { targetId: 'editorialLookbook', label: 'Lookbook & Manifesto', el: lookbook };

        const reviewCard = node.closest('[data-irb-section="testimonials"] .reviewCard');
        if (reviewCard) {
          const revSec = reviewCard.closest('[data-irb-section="testimonials"]');
          const cards = revSec ? Array.from(revSec.querySelectorAll('.reviewCard')) : [];
          const rIdx = Math.max(0, cards.indexOf(reviewCard));
          return {
            targetId: 'testimonials',
            subIndex: rIdx,
            label: 'Avaliações — Depoimento ' + (rIdx + 1),
            el: revSec || reviewCard,
          };
        }

        const testimonials = node.closest('[data-irb-section="testimonials"]');
        if (testimonials) return { targetId: 'testimonials', label: 'Avaliações de Clientes', el: testimonials };

        const newsletter = node.closest('[data-irb-section="newsletter"]');
        if (newsletter) return { targetId: 'newsletter', label: 'Newsletter', el: newsletter };

        const customSec = node.closest('[data-irb-custom-section]');
        if (customSec) {
          const csId = customSec.getAttribute('data-irb-custom-section') || '';
          const csTitle = customSec.getAttribute('data-irb-custom-title') || 'Seção Personalizada';
          return { targetId: 'custom-section', customSectionId: csId, label: csTitle, el: customSec };
        }

        const legal = node.closest('.footer-legal-info');
        if (legal) return { targetId: 'footer-legal', label: 'Rodapé — Faixa Legal', el: legal };

        const footer = node.closest('footer.footer');
        if (footer) return { targetId: 'footer', label: 'Rodapé — Informações', el: footer };

        return null;
      }

      function placeOverlay(box, badge, el, badgeText, isHover) {
        if (!el || !box || !badge) {
          if (box) box.style.display = 'none';
          if (badge) badge.style.display = 'none';
          return;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width <= 2 || rect.height <= 2 || rect.bottom <= 0 || rect.top >= window.innerHeight) {
          box.style.display = 'none';
          badge.style.display = 'none';
          return;
        }

        const left = Math.max(2, rect.left);
        const top = Math.max(2, rect.top);
        const right = Math.min(window.innerWidth - 2, rect.right);
        const bottom = Math.min(window.innerHeight - 2, rect.bottom);

        box.style.left = left + 'px';
        box.style.top = top + 'px';
        box.style.width = Math.max(0, right - left) + 'px';
        box.style.height = Math.max(0, bottom - top) + 'px';
        box.style.display = 'block';

        if (isHover && hoverTitle) {
          hoverTitle.textContent = badgeText;
        } else {
          badge.textContent = 'Editando: ' + badgeText;
        }
        badge.style.display = 'inline-flex';

        const badgeTop = rect.top >= 30 ? rect.top - 28 : Math.max(4, rect.top + 4);
        const badgeLeft = isHover
          ? Math.min(Math.max(6, left + 4), Math.max(6, window.innerWidth - 280))
          : Math.max(6, Math.min(right - 180, window.innerWidth - 200));
        badge.style.top = badgeTop + 'px';
        badge.style.left = badgeLeft + 'px';
      }

      function hideHover() {
        if (hoverBox) hoverBox.style.display = 'none';
        if (hoverBadge) hoverBadge.style.display = 'none';
      }

      function refreshOverlays() {
        if (!inspectMode) {
          hideHover();
          if (activeBox) activeBox.style.display = 'none';
          if (activeBadge) activeBadge.style.display = 'none';
          return;
        }

        if (sidebarHoverTargetId) {
          const sideEl = findElementForSelection({
            targetId: sidebarHoverTargetId,
            customSectionId: sidebarHoverCustomSectionId || undefined,
          });
          if (sideEl) {
            const resolved = resolveEditableTarget(sideEl) || { label: sidebarHoverTargetId, el: sideEl };
            placeOverlay(hoverBox, hoverBadge, sideEl, resolved.label, true);
          } else {
            hideHover();
          }
        } else if (hoveredMatch && hoveredMatch.el && document.contains(hoveredMatch.el)) {
          placeOverlay(hoverBox, hoverBadge, hoveredMatch.el, hoveredMatch.label, true);
        } else {
          hideHover();
        }

        if (activeSelection && activeSelection.targetId) {
          const activeEl = findElementForSelection(activeSelection);
          if (activeEl) {
            placeOverlay(
              activeBox,
              activeBadge,
              activeEl,
              activeSelection.label || activeSelection.targetId,
              false
            );
          } else {
            if (activeBox) activeBox.style.display = 'none';
            if (activeBadge) activeBadge.style.display = 'none';
          }
        } else {
          if (activeBox) activeBox.style.display = 'none';
          if (activeBadge) activeBadge.style.display = 'none';
        }
      }

      document.addEventListener(
        'mousemove',
        (e) => {
          if (!inspectMode) return;
          sidebarHoverTargetId = null;
          const match = resolveEditableTarget(e.target);
          const prevEl = hoveredMatch ? hoveredMatch.el : null;
          hoveredMatch = match;
          if ((match ? match.el : null) !== prevEl) {
            postToParent({
              type: 'irb-studio:hover',
              targetId: match ? match.targetId : null,
              label: match ? match.label : null,
            });
          }
          refreshOverlays();
        },
        { passive: true }
      );

      document.addEventListener('mouseleave', () => {
        hoveredMatch = null;
        hideHover();
        postToParent({ type: 'irb-studio:hover', targetId: null, label: null });
      });

      document.addEventListener(
        'click',
        (e) => {
          if (!inspectMode) return;
          const targetNode = e.target instanceof Element ? e.target : null;
          if (!targetNode) return;

          if (targetNode.closest('#irb-account-dropdown, #irb-account-backdrop, #irb-account-modal')) {
            return;
          }
          // Allow hero carousel arrows/dots and account icon dropdown toggle to execute while still selecting
          const isInteractiveControl = Boolean(
            targetNode.closest('.heroNavBtn, .heroDot, #irb-open-account')
          );
          const match = resolveEditableTarget(targetNode);
          if (!match) return;

          if (!isInteractiveControl) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
          }

          setTimeout(() => {
            const updatedSlide =
              match.targetId === 'hero'
                ? Number(document.querySelector('.heroSlide.active')?.getAttribute('data-slide-idx') || 0)
                : match.subIndex;

            const payload = {
              targetId: match.targetId,
              label: match.label,
              productId: match.productId,
              showcaseIdx: match.showcaseIdx,
              subIndex: updatedSlide,
              customSectionId: match.customSectionId,
            };
            activeSelection = payload;
            refreshOverlays();
            postToParent(Object.assign({ type: 'irb-studio:select' }, payload));
          }, isInteractiveControl ? 20 : 0);
        },
        true
      );

      let scrollTick = false;
      window.addEventListener(
        'scroll',
        () => {
          if (!scrollTick) {
            scrollTick = true;
            requestAnimationFrame(() => {
              scrollTick = false;
              writeSavedState({ scrollY: window.scrollY });
              refreshOverlays();
            });
          }
        },
        { passive: true }
      );

      window.addEventListener('resize', refreshOverlays, { passive: true });

      window.addEventListener('message', (e) => {
        if (e.source !== window.parent) return;
        const msg = e.data;
        if (!msg || typeof msg !== 'object') return;

        if (msg.type === 'irb-studio:set-state') {
          if (typeof msg.inspectMode === 'boolean') inspectMode = msg.inspectMode;
          activeSelection = msg.activeSelection || null;
          syncBodyClass();
          if (typeof msg.slideIdx === 'number') applySlideIndex(msg.slideIdx);
          restoreScroll(msg.scrollY);
          refreshOverlays();
        } else if (msg.type === 'irb-studio:set-mode') {
          inspectMode = Boolean(msg.inspectMode);
          syncBodyClass();
          refreshOverlays();
        } else if (msg.type === 'irb-studio:set-active') {
          activeSelection = msg.selection || null;
          if (msg.scrollIntoView && activeSelection) {
            const el = findElementForSelection(activeSelection);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
          refreshOverlays();
        } else if (msg.type === 'irb-studio:hover-target') {
          sidebarHoverTargetId = msg.targetId || null;
          sidebarHoverCustomSectionId = msg.customSectionId || null;
          if (msg.scrollIntoView && sidebarHoverTargetId) {
            const el = findElementForSelection({
              targetId: sidebarHoverTargetId,
              customSectionId: sidebarHoverCustomSectionId || undefined,
            });
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          refreshOverlays();
        } else if (msg.type === 'irb-studio:show-slide') {
          applySlideIndex(Number(msg.slideIdx || 0));
        }
      });

      refreshOverlays();
      postToParent({ type: 'irb-studio:ready' });
    })();
  </script>`;
}
