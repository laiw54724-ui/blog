class ReaderControls {
  baseSize = 1.1; // rem
  currentSize = 1.1;
  storageKey = 'blog-font-size';
  minSize = 0.9;
  maxSize = 1.4;

  constructor() {
    this.loadSavedSize();
    this.init();
  }

  init() {
    const buttons = document.querySelectorAll('.font-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => this.handleFontChange(e));
    });

    this.applyFontSize();
  }

  handleFontChange(e) {
    const action = e.target.closest('[data-action]')?.dataset.action;

    switch (action) {
      case 'increase':
        this.currentSize = Math.min(this.maxSize, this.currentSize + 0.05);
        break;
      case 'decrease':
        this.currentSize = Math.max(this.minSize, this.currentSize - 0.05);
        break;
      case 'reset':
        this.currentSize = this.baseSize;
        break;
    }

    this.applyFontSize();
    this.saveFontSize();
  }

  applyFontSize() {
    const article = document.querySelector('article');
    if (!article) return;

    article.style.fontSize = this.currentSize + 'rem';
    // style.lineHeight is a string in TS DOM typings; set explicit string
    article.style.lineHeight = String(1.8 + (this.currentSize - 1.1) * 0.2);
  }

  saveFontSize() {
    localStorage.setItem(this.storageKey, this.currentSize.toFixed(2));
  }

  loadSavedSize() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      this.currentSize = parseFloat(saved);
    }
  }
}

if (document.querySelector('article')) {
  new ReaderControls();
}
