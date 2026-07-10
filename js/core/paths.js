(function(global) {
  'use strict';

  let BASE_PATH = global.PROJECT_BASE || null;

  if (!BASE_PATH) {
    const path = global.location.pathname;
    // Remove o nome do arquivo e o último diretório se for 'pages' ou 'demos'
    let base = path;
    // Remove o nome do arquivo (ex: /pscomercial/pages/solucoes.html -> /pscomercial/pages/)
    base = base.substring(0, base.lastIndexOf('/') + 1);
    // Se o diretório for 'pages/' ou 'demos/', sobe um nível para a raiz do projeto
    if (base.endsWith('pages/') || base.endsWith('demos/')) {
      base = base.substring(0, base.lastIndexOf('/', base.length - 2) + 1);
    }
    // Se ainda estiver vazio, usa '/'
    if (base === '') base = '/';
    // Garante que termina com '/'
    if (!base.endsWith('/')) base += '/';
    BASE_PATH = base;
  }

  if (!BASE_PATH.endsWith('/')) BASE_PATH += '/';

  function resolve(relativePath) {
    if (relativePath.startsWith(BASE_PATH)) return relativePath;
    if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);
    let clean = relativePath.replace(/^\.\//, '').replace(/^\.\.\//, '');
    while (clean.startsWith('../')) clean = clean.replace(/^\.\.\//, '');
    return BASE_PATH + clean;
  }

  function resolveData(dataPath) {
    if (!dataPath.startsWith('data/')) dataPath = 'data/' + dataPath;
    return resolve(dataPath);
  }

  function resolveComponent(componentName) {
    if (!componentName.endsWith('.html')) componentName += '.html';
    if (!componentName.startsWith('components/')) componentName = 'components/' + componentName;
    return resolve(componentName);
  }

  function resolveLink(linkPath) {
    return resolve(linkPath);
  }

  function resolveAsset(assetPath) {
    return resolve(assetPath);
  }

  function resolveDemoUrl(demo) {
    let url = (typeof demo === 'string') ? demo : (demo?.url || '');
    if (!url) return BASE_PATH + 'demos/fallback/index.html';
    if (url.startsWith('http')) return url;
    let clean = url.replace(/^\.\//, '').replace(/^\.\.\//, '');
    if (!clean.startsWith('demos/')) clean = 'demos/' + clean;
    if (!clean.endsWith('.html') && !clean.endsWith('/')) clean += '.html';
    if (clean.endsWith('index.html')) {
      const demoHtml = clean.replace(/index\.html$/, 'demo.html');
      return resolve(demoHtml);
    }
    return resolve(clean);
  }

  function prefetchDemo(demo) {
    const url = resolveDemoUrl(demo);
    if ('prefetch' in document.createElement('link')) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      link.as = 'document';
      document.head.appendChild(link);
    }
  }

  function getBasePath() { return BASE_PATH; }

  function isDebug() {
    return localStorage.getItem('path-debug') === 'true' || new URLSearchParams(window.location.search).get('debug') === 'paths';
  }

  function log(...args) {
    if (isDebug()) console.log('[PathResolver]', ...args);
  }

  global.PathResolver = {
    resolve,
    resolveData,
    resolveComponent,
    resolveLink,
    resolveAsset,
    resolveDemoUrl,
    prefetchDemo,
    getBasePath,
    isDebug,
    log
  };

  global.PathManager = global.PathResolver;

  console.log('[PathResolver] Base definida:', BASE_PATH);
})(window);
