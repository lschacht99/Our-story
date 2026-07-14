(() => {
  'use strict';

  const VERSION = '20260714-v4';
  const sources = {
    leah: [
      'assets/sprite-data/leah-00.b64',
      'assets/sprite-data/leah-01.b64',
      'assets/sprite-data/leah-02.b64'
    ],
    moshe: [
      'assets/sprite-data/moshe-00.b64',
      'assets/sprite-data/moshe-01.b64',
      'assets/sprite-data/moshe-02.b64',
      'assets/sprite-data/moshe-03.b64',
      'assets/sprite-data/moshe-04.b64',
      'assets/sprite-data/moshe-05.b64'
    ]
  };

  async function loadAtlas(paths) {
    const chunks = await Promise.all(paths.map(async (path) => {
      const response = await fetch(`${path}?v=${VERSION}`, { cache: 'reload' });
      if (!response.ok) throw new Error(`Unable to load ${path}: ${response.status}`);
      return (await response.text()).replace(/\s+/g, '');
    }));

    const binary = atob(chunks.join(''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
  }

  window.characterAssetsReady = Promise.all([
    loadAtlas(sources.leah),
    loadAtlas(sources.moshe)
  ]).then(([leah, moshe]) => {
    const root = document.documentElement;
    root.style.setProperty('--leah-atlas', `url("${leah}")`);
    root.style.setProperty('--moshe-atlas', `url("${moshe}")`);
    root.classList.add('character-assets-ready');
    return { leah, moshe };
  }).catch((error) => {
    console.error('Character atlas loading failed:', error);
    document.documentElement.classList.add('character-assets-error');
    return null;
  });
})();
