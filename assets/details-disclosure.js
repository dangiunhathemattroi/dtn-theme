class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelector('details');
    this.summary = this.mainDetailsToggle.querySelector('summary');
    this.content = this.summary.nextElementSibling;
    this.header = document.querySelector('header');

    this.leaveTimeout = null;

    this.summary.addEventListener('mouseenter', () => this.delayedOpen());

    this.mainDetailsToggle.addEventListener('mouseleave', (e) => {
      if (!this.mainDetailsToggle.contains(e.relatedTarget)) {
        this.delayedClose();
      }
    });

    this.mainDetailsToggle.addEventListener('mouseenter', () => this.cancelClose());
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
    const allMenus = document.querySelectorAll('details');
    allMenus.forEach((menu) => {
      if (menu !== this.mainDetailsToggle) {
        menu.removeAttribute('open');
        menu.querySelector('summary')?.setAttribute('aria-expanded', false);
      }
    });

    if (!this.mainDetailsToggle.hasAttribute('open')) {
      this.summary.setAttribute('aria-expanded', true);
      this.mainDetailsToggle.setAttribute('open', '');
    }
  }

  close() {
    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.mainDetailsToggle.removeAttribute('open');
      this.summary.setAttribute('aria-expanded', false);
    }
  }
}
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
