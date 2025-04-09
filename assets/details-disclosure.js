class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelector('details');
    this.summary = this.mainDetailsToggle.querySelector('summary');
    this.content = this.summary.nextElementSibling;
    this.header = document.querySelector('header');

    this.leaveTimeout = null;

    this.summary.addEventListener('mouseenter', () => this.delayedOpen());
    this.header.addEventListener('mouseleave', (e) => {
      if (!this.header.contains(e.relatedTarget)) {
        this.delayedClose();
      }
    });
    this.header.addEventListener('mouseenter', () => this.cancelClose());
  }

  delayedOpen() {
    clearTimeout(this.leaveTimeout);
    this.open();
  }

  delayedClose() {
    this.leaveTimeout = setTimeout(() => this.close(), 200);
  }

  cancelClose() {
    clearTimeout(this.leaveTimeout);
  }

  open() {
    if (!this.mainDetailsToggle.hasAttribute('open')) {
      this.mainDetailsToggle.setAttribute('open', '');
      this.summary.setAttribute('aria-expanded', true);
    }
  }

  close() {
    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.mainDetailsToggle.removeAttribute('open');
      this.summary.setAttribute('aria-expanded', false);
    }
  }
}

customElements.define('details-disclosure', DetailsDisclosure);
class HeaderMenu extends DetailsDisclosure {
  constructor() {
    super();
    this.header = document.querySelector('.header-wrapper');
  }

  onToggle() {
    if (!this.header) return;
    this.header.preventHide = this.mainDetailsToggle.open;

    if (document.documentElement.style.getPropertyValue('--header-bottom-position-desktop') !== '') return;
    document.documentElement.style.setProperty(
      '--header-bottom-position-desktop',
      `${Math.floor(this.header.getBoundingClientRect().bottom)}px`
    );
  }
}

customElements.define('header-menu', HeaderMenu);
