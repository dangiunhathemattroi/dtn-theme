class DynamicMenu extends HTMLElement {
  constructor() {
    super();
    // this.attachShadow({ mode: 'open' }); // Không cần nếu không dựng DOM riêng
    this.menuItems = [];
    this.tabItems = [];
    this.onHover = this.onHover.bind(this);
  }

  connectedCallback() {
    this.menuItems = this.querySelectorAll('.dynamic-menu_item');
    this.tabItems = this.querySelectorAll('.menu_tab_item');

    if (this.menuItems.length && this.tabItems.length) {
      this.activateTab(0);
      this.menuItems.forEach((item, index) => {
        item.addEventListener('mouseenter', (e) => this.onHover(index));
      });
    }
  }

  disconnectedCallback() {
    this.menuItems.forEach((item, index) => {
      item.removeEventListener('mouseenter', (e) => this.onHover(index));
    });
  }

  onHover(index) {
    this.activateTab(index);
  }

  activateTab(index) {
    this.menuItems.forEach((item) => item.classList.remove('menu-active'));
    this.tabItems.forEach((item) => item.classList.remove('menu-active'));

    if (this.menuItems[index] && this.tabItems[index]) {
      this.menuItems[index].classList.add('menu-active');
      this.tabItems[index].classList.add('menu-active');
    }
  }
}

customElements.define('dynamic-menu', DynamicMenu);
