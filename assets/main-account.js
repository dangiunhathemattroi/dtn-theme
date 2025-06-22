class MainAccount extends HTMLElement {
  constructor() {
    super();
    this.allowedTabId = ['my-information-tab', 'order-history-tab', 'my-address-tab'];
    this.accountContainer = this.querySelector('.account-container');
    if (this.accountContainer && this.accountContainer.getAttribute('data-first-tab')) {
      this.firstTab = this.accountContainer.getAttribute('data-first-tab').trim();
    }
    this.requiredFields = this.querySelectorAll('.required-field');
    this.showTab();
    this.initShowTab();
  }

  initShowTab() {
    const tabs = this.accountContainer.querySelectorAll('.tab-bar button');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('id');
        this.changeTab(tabId, true);
      });
    });
  }

  showTab() {
    const tabId = new URLSearchParams(window.location.search).get('tab') || this.firstTab;
    this.changeTab(tabId);
  }

  changeTab(tabId, isChange) {
    const url = new URL(window.location.href);

    if (!tabId || !this.allowedTabId.includes(tabId)) {
      tabId = 'my-information-tab';
    }

    url.searchParams.set('tab', tabId);
    if (isChange && url.searchParams.has('limit')) {
      url.searchParams.delete('limit');
      window.history.pushState({}, '', url);
    }
    if (isChange && url.searchParams.has('page')) {
      url.searchParams.delete('page');
      window.history.pushState({}, '', url);
      location.reload();
    } else {
      this.accountContainer.classList = `account-container ${tabId}`;
    }
    window.history.pushState({}, '', url);
    this.requiredFields?.forEach((field) => {
      field.classList = 'required-field';
    });
  }
}

customElements.define('main-account', MainAccount);
