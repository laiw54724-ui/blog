type ReaderSize = 'small' | 'medium' | 'large';

const STORAGE_KEY = 'blog-reader-size';

const READER_SIZES: Record<ReaderSize, { fontSize: string; lineHeight: string }> = {
  small: { fontSize: '0.96rem', lineHeight: '1.78' },
  medium: { fontSize: '1.08rem', lineHeight: '1.9' },
  large: { fontSize: '1.22rem', lineHeight: '2.02' },
};

function parseSize(value: string | null | undefined): ReaderSize {
  return value === 'small' || value === 'medium' || value === 'large' ? value : 'medium';
}

function applySize(size: ReaderSize, target: HTMLElement, root: HTMLElement) {
  const preset = READER_SIZES[size];
  target.style.fontSize = preset.fontSize;
  target.style.lineHeight = preset.lineHeight;

  root.querySelectorAll('.reader-size-btn').forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    button.classList.toggle('is-active', button.dataset.size === size);
  });
}

function saveSize(size: ReaderSize) {
  localStorage.setItem(STORAGE_KEY, size);
}

function getSavedSize(): ReaderSize {
  return parseSize(localStorage.getItem(STORAGE_KEY));
}

function initReaderControls() {
  const root = document.querySelector('[data-reader-controls]');
  if (!(root instanceof HTMLElement)) return;

  const target = document.querySelector('.post-text, .markdown-content');
  if (!(target instanceof HTMLElement)) return;

  const saved = getSavedSize();
  applySize(saved, target, root);

  root.querySelectorAll('.reader-size-btn').forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    button.addEventListener('click', () => {
      const size = parseSize(button.dataset.size);
      applySize(size, target, root);
      saveSize(size);
    });
  });

  if (root.dataset.scrollBound !== '1') {
    let lastScrollY = window.scrollY;
    window.addEventListener(
      'scroll',
      () => {
        const currentScrollY = window.scrollY;
        const shouldHide = currentScrollY > lastScrollY && currentScrollY > 120;
        root.classList.toggle('is-hidden', shouldHide);
        lastScrollY = currentScrollY;
      },
      { passive: true }
    );
    root.dataset.scrollBound = '1';
  }
}

if (document.querySelector('.post-text, .markdown-content')) {
  initReaderControls();
}
