// js/spm.js - Showcase Presentation Mode Engine
// Versão 2.6 - Corrige loop usando demo.html

(function(global) {
  'use strict';

  class SPMEngine {
    constructor() {
      this.demos = [];
      this.currentIndex = 0;
      this.isActive = false;
      this.scrollPosition = 0;
      this.initialized = false;
      this.wrapper = null;
      this.iframe = null;
      this.overlay = null;
      this.expandBtn = null;
      this.controlsWrapper = null;
      this.isTransitioning = false;

      const pm = global.PathManager || {
        resolveDemoUrl: (url) => url,
        prefetchDemo: () => {},
        log: () => {},
        resolveLink: (url) => url
      };
      if (typeof pm.log !== 'function') {
        pm.log = console.log.bind(console);
      }
      this.pathManager = pm;
    }

    async init() {
      if (this.initialized) return;

      try {
        const { loadDemos } = await import('./core/data-loader.js');
        let data = await loadDemos();
        if (data && data.length) {
          const urlParams = new URLSearchParams(window.location.search);
          const categoryId = urlParams.get('cat');
          if (categoryId) {
            data = data.filter(d => d.categoryId === categoryId);
            this.pathManager.log('[SPM] Filtrado por categoria:', categoryId, '->', data.length, 'demos');
          }
          if (data.length === 0) {
            throw new Error('Nenhuma demo encontrada para esta categoria');
          }
          this.demos = data;
        } else {
          throw new Error('Nenhuma demo encontrada');
        }
      } catch (e) {
        console.warn('[SPM] Falha ao carregar demos.json, usando fallback.', e);
        // Fallback: usa a demo atual (a que está sendo exibida)
        const iframeEl = document.querySelector('.demo-showcase iframe');
        let currentUrl = iframeEl ? iframeEl.src : window.location.href;
        let demoId = document.body.dataset.demoId || 'fallback';
        let demoTitle = document.querySelector('.demo-header h1')?.textContent || 'Demonstração Padrão';

        // Tenta extrair ID da URL atual
        if (currentUrl.includes('/demos/')) {
          const match = currentUrl.match(/\/demos\/([^\/]+)\//);
          if (match && match[1]) {
            demoId = match[1];
          }
        }

        // Constrói a URL para demo.html ou fallback
        let fallbackUrl = this.pathManager.resolveLink(`demos/${demoId}/demo.html`);
        // Se não existir, usa index.html
        try {
          const headResp = await fetch(fallbackUrl, { method: 'HEAD' });
          if (!headResp.ok) {
            fallbackUrl = this.pathManager.resolveLink(`demos/${demoId}/index.html`);
          }
        } catch (e) {
          fallbackUrl = this.pathManager.resolveLink(`demos/${demoId}/index.html`);
        }

        this.demos = [{
          id: demoId,
          title: demoTitle,
          url: fallbackUrl
        }];
      }

      // Identificar demo atual
      const demoId = document.body.dataset.demoId;
      if (demoId && this.demos.length) {
        const idx = this.demos.findIndex(d => d.id === demoId);
        if (idx !== -1) this.currentIndex = idx;
      }

      // Referências DOM
      this.wrapper = document.querySelector('.demo-showcase-wrapper');
      this.iframe = document.querySelector('.demo-showcase iframe');
      if (!this.wrapper || !this.iframe) {
        console.warn('[SPM] Elementos do showcase não encontrados.');
        return;
      }

      this.overlay = document.getElementById('spm-overlay');
      if (!this.overlay) {
        this.overlay = document.createElement('div');
        this.overlay.id = 'spm-overlay';
        this.overlay.style.display = 'none';
        document.body.appendChild(this.overlay);
      }

      this.expandBtn = document.querySelector('.spm-expand-btn');
      if (!this.expandBtn) {
        this.expandBtn = document.createElement('button');
        this.expandBtn.className = 'btn btn-secondary spm-expand-btn';
        this.expandBtn.textContent = '⛶ Expandir';
        this.expandBtn.setAttribute('aria-label', 'Expandir demonstração');
        const header = document.querySelector('.demo-header');
        if (header) header.appendChild(this.expandBtn);
      }

      this.buildControls();
      this.expandBtn.addEventListener('click', () => this.enter());
      document.addEventListener('keydown', (e) => this.handleKeydown(e));
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.exit();
      });

      this.loadDemo(this.currentIndex);
      this.initialized = true;
      this.pathManager.log('[SPM] Inicializado com', this.demos.length, 'demos.');
    }

    buildControls() {
      this.controlsWrapper = document.createElement('div');
      this.controlsWrapper.className = 'spm-controls-wrapper';
      this.controlsWrapper.style.display = 'none';
      document.body.appendChild(this.controlsWrapper);

      this.controlsWrapper.innerHTML = `
        <div class="spm-controls" role="dialog" aria-label="Controles da apresentação">
          <div class="spm-top-bar">
            <button class="spm-exit-btn" aria-label="Sair do modo apresentação">✕ Sair</button>
            <div class="spm-title" id="spm-title">${this.getCurrentDemo()?.title || ''}</div>
            <div class="spm-counter" id="spm-counter">${this.currentIndex + 1} de ${this.demos.length}</div>
          </div>
          <div class="spm-nav">
            <button class="spm-prev-btn" aria-label="Anterior">← Anterior</button>
            <button class="spm-next-btn" aria-label="Próximo">Próximo →</button>
          </div>
          <div class="spm-indicator"></div>
        </div>
      `;

      const indicator = this.controlsWrapper.querySelector('.spm-indicator');
      if (indicator) {
        indicator.innerHTML = this.demos.map((_, i) => 
          `<span class="spm-dot" data-index="${i}" aria-label="Ir para demo ${i+1}"></span>`
        ).join('');
        indicator.querySelectorAll('.spm-dot').forEach(dot => {
          dot.addEventListener('click', () => {
            const idx = parseInt(dot.dataset.index);
            this.goTo(idx);
          });
        });
      }

      this.controlsWrapper.querySelector('.spm-exit-btn').addEventListener('click', () => this.exit());
      this.controlsWrapper.querySelector('.spm-prev-btn').addEventListener('click', () => this.prev());
      this.controlsWrapper.querySelector('.spm-next-btn').addEventListener('click', () => this.next());

      this.updateControls();
    }

    updateControls() {
      const demo = this.getCurrentDemo();
      const titleEl = this.controlsWrapper.querySelector('#spm-title');
      const counterEl = this.controlsWrapper.querySelector('#spm-counter');
      if (titleEl) titleEl.textContent = demo?.title || '';
      if (counterEl) counterEl.textContent = `${this.currentIndex + 1} de ${this.demos.length}`;

      const prevBtn = this.controlsWrapper.querySelector('.spm-prev-btn');
      const nextBtn = this.controlsWrapper.querySelector('.spm-next-btn');
      if (prevBtn) prevBtn.disabled = this.currentIndex === 0;
      if (nextBtn) nextBtn.disabled = this.currentIndex === this.demos.length - 1;

      const dots = this.controlsWrapper.querySelectorAll('.spm-dot');
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === this.currentIndex);
      });
    }

    loadDemo(index) {
      if (index < 0 || index >= this.demos.length) return;
      const demo = this.demos[index];
      if (!demo) return;

      let url = this.pathManager.resolveDemoUrl(demo);
      const currentUrl = window.location.href;

      // Verifica se a URL é a mesma da página atual (loop) ou inválida
      if (!url || url === currentUrl || url.includes('undefined') || url.includes('[object') || url === window.location.pathname) {
        console.warn('[SPM] URL inválida ou loop detectado para', demo.id, '. Tentando fallback...');
        // Tenta construir a URL usando demo.html
        if (demo.id && demo.id !== 'fallback') {
          const testUrl = this.pathManager.resolveLink(`demos/${demo.id}/demo.html`);
          // Tenta verificar se o arquivo existe
          try {
            const headResp = fetch(testUrl, { method: 'HEAD' });
            headResp.then(resp => {
              if (resp.ok) {
                url = testUrl;
                // Recarrega com a nova URL
                this.iframe.src = url;
                return;
              } else {
                url = this.pathManager.resolveLink(`demos/${demo.id}/index.html`);
                this.iframe.src = url;
              }
            }).catch(() => {
              url = this.pathManager.resolveLink('demos/fallback/index.html');
              this.iframe.src = url;
            });
          } catch (e) {
            url = this.pathManager.resolveLink('demos/fallback/index.html');
            this.iframe.src = url;
          }
        } else {
          url = this.pathManager.resolveLink('demos/fallback/index.html');
          this.iframe.src = url;
        }
        // Se ainda for igual à página atual, usa fallback genérico
        if (url === currentUrl) {
          url = this.pathManager.resolveLink('demos/fallback/index.html');
          this.iframe.src = url;
        }
        return;
      }

      this.pathManager.log('Carregando demo:', demo.title, 'URL:', url);

      this.iframe.style.opacity = '0';
      setTimeout(() => {
        this.iframe.src = url;
        this.iframe.loading = 'eager';
        this.iframe.onload = () => {
          this.iframe.style.opacity = '1';
          this.iframe.onload = null;
        };
        setTimeout(() => {
          if (this.iframe.style.opacity === '0') {
            this.iframe.style.opacity = '1';
          }
        }, 1000);
      }, 200);

      if (index + 1 < this.demos.length) {
        this.pathManager.prefetchDemo(this.demos[index + 1]);
      }

      this.updateControls();
      if (history.pushState && demo.id && demo.id !== 'fallback') {
        const newUrl = this.pathManager.resolveLink(`demos/${demo.id}/index.html`);
        if (newUrl !== window.location.href) {
          history.pushState({ demoId: demo.id }, demo.title, newUrl);
        }
      }
    }

    goTo(index) {
      if (this.isTransitioning) return;
      if (index < 0 || index >= this.demos.length) return;
      if (index === this.currentIndex) return;
      this.isTransitioning = true;
      this.currentIndex = index;
      this.loadDemo(index);
      setTimeout(() => {
        this.isTransitioning = false;
      }, 400);
    }

    next() {
      if (this.currentIndex < this.demos.length - 1) {
        this.goTo(this.currentIndex + 1);
      }
    }

    prev() {
      if (this.currentIndex > 0) {
        this.goTo(this.currentIndex - 1);
      }
    }

    first() {
      this.goTo(0);
    }

    last() {
      this.goTo(this.demos.length - 1);
    }

    enter() {
      if (this.isActive || !this.demos.length) return;
      this.isActive = true;
      this.scrollPosition = window.scrollY;

      this.wrapper.classList.add('spm-expanded');
      document.body.classList.add('spm-active');
      this.wrapper.offsetHeight;
      this.wrapper.style.opacity = '1';
      this.wrapper.style.transform = 'scale(1)';

      this.overlay.style.display = 'flex';
      this.overlay.style.opacity = '0';
      this.controlsWrapper.style.display = 'block';
      requestAnimationFrame(() => {
        this.overlay.style.opacity = '1';
      });

      this.loadDemo(this.currentIndex);
      this.overlay.focus();
    }

    exit() {
      if (!this.isActive) return;
      this.isActive = false;

      this.overlay.style.opacity = '0';
      this.controlsWrapper.style.display = 'none';
      setTimeout(() => {
        this.overlay.style.display = 'none';
        this.wrapper.classList.remove('spm-expanded');
        document.body.classList.remove('spm-active');
      }, 300);

      window.scrollTo({ top: this.scrollPosition, behavior: 'instant' });
      this.expandBtn.focus();
    }

    handleKeydown(e) {
      if (!this.isActive) {
        if (e.key === 'f' || e.key === 'F') {
          const hasShowcase = document.querySelector('.demo-showcase-wrapper');
          if (hasShowcase) {
            e.preventDefault();
            this.enter();
          }
        }
        return;
      }
      switch (e.key) {
        case 'Escape': e.preventDefault(); this.exit(); break;
        case 'ArrowLeft': e.preventDefault(); this.prev(); break;
        case 'ArrowRight': e.preventDefault(); this.next(); break;
        case 'Home': e.preventDefault(); this.first(); break;
        case 'End': e.preventDefault(); this.last(); break;
        case 'f': case 'F': e.preventDefault(); this.exit(); break;
        default: break;
      }
    }

    getCurrentDemo() {
      return this.demos[this.currentIndex] || null;
    }

    isDebug() {
      return this.pathManager.isDebug ? this.pathManager.isDebug() : false;
    }
  }

  let spmInstance = null;

  function getInstance() {
    if (!spmInstance) {
      spmInstance = new SPMEngine();
      spmInstance.init().catch(err => console.error('[SPM] Falha na inicialização:', err));
    }
    return spmInstance;
  }

  const SPM = {
    init: () => getInstance(),
    enter: () => getInstance().enter(),
    exit: () => getInstance().exit(),
    next: () => getInstance().next(),
    prev: () => getInstance().prev(),
    goTo: (index) => getInstance().goTo(index),
    getCurrentIndex: () => getInstance().currentIndex,
    getDemos: () => getInstance().demos,
    isActive: () => getInstance().isActive
  };

  global.SPM = SPM;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SPM.init());
  } else {
    SPM.init();
  }

  console.log('[SPM] Engine carregada. Use window.SPM para controle.');
})(window);