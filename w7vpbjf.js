import { settings } from './f36qmgd.js';
import { readPalette } from './zvga6p5.js';

let ownTheme = false;

export function applyTheme() {
  const root = document.documentElement;
  if (settings.theme === 'auto') {
    // Leave a theme chosen by a host page (for example inside Claude) alone.
    if (ownTheme) delete root.dataset.theme;
    ownTheme = false;
  } else {
    root.dataset.theme = settings.theme;
    ownTheme = true;
  }
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#15172c' : '#f4f5fb');
  readPalette();
}

matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme());
