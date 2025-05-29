if (!customElements.get('suggestion-viewed-products')) {
  customElements.define(
    'suggestion-viewed-products',
    class SuggestionViewedProducts extends HTMLElement {
      observer = undefined;
      constructor() {
        super();
        this.section = this.dataset.sectionId;
        this.productId = this.dataset.productId;
        this.productsToShowMax = parseInt(this.dataset.maxToShow, 10) || 10;

        this.relatedBtn = null;
        this.viewedBtn = null;
        this.relatedTab = null;
        this.viewedTab = null;
      }

      connectedCallback() {
        this.relatedBtn = document.getElementById(`btn-related-products-${this.section}`);
        this.viewedBtn = document.getElementById(`btn-viewed-products-${this.section}`);
        this.relatedTab = this.querySelector(`related-products#related-products-${this.section}`);
        this.viewedTab = this.querySelector(`viewed-products#viewed-products-${this.section}`);

        this._setupTabListeners();
      }

      _setupTabListeners() {
        if (!this.relatedBtn || !this.viewedBtn) return;

        this.relatedBtn.addEventListener('click', async () => {
          this._activateButton(this.relatedBtn);
          await this._showTab('related-products');
        });

        this.viewedBtn.addEventListener('click', async () => {
          this._activateButton(this.viewedBtn);
          await this._showTab('viewed-products');
        });
      }

      _activateButton(activeBtn) {
        [this.relatedBtn, this.viewedBtn].forEach((btn) => {
          if (btn === activeBtn) btn.classList.add('active');
          else btn.classList.remove('active');
        });
      }

      async _showTab(tabName) {
        this._hideAllTabs();

        if (tabName === 'related-products') {
          if (!this.relatedTab) return;
          this.relatedTab.classList.remove('hidden');
        } else if (tabName === 'viewed-products') {
          if (!this.viewedTab) return;
          this.viewedTab.classList.remove('hidden');
        }
      }

      _hideAllTabs() {
        [this.relatedTab, this.viewedTab].forEach((tab) => {
          tab?.classList.add('hidden');
        });
      }
    }
  );
}

if (!customElements.get('viewed-products')) {
  customElements.define(
    'viewed-products',
    class ViewedProducts extends HTMLElement {
      observer = undefined;
      loaded = false;

      constructor() {
        super();
        this.section = this.dataset.sectionId;
        this.productsToShowMax = parseInt(this.dataset.maxToShow, 10) || 10;
      }

      connectedCallback() {
        this.setProduct(this.dataset.productId);
        this.initializeViewedProducts(this.dataset.productId);
      }

      initializeViewedProducts(productId) {
        this.observer?.unobserve(this);
        this.observer = new IntersectionObserver(
          (entries, observer) => {
            if (!entries[0].isIntersecting) return;
            observer.unobserve(this);
            this.loadViewedProducts(productId);
          },
          { rootMargin: '0px 0px 400px 0px' }
        );
        this.observer.observe(this);
      }

      setProduct(productViewed) {
        let productList = [];

        if (localStorage.getItem('recently-viewed')?.length) {
          productList = JSON.parse(localStorage.getItem('recently-viewed'));
          productList = productList.filter((p) => p !== productViewed).slice(0, this.productsToShowMax);
          const newData = [productViewed, ...productList];
          localStorage.setItem('recently-viewed', JSON.stringify(newData));
        } else {
          localStorage.setItem('recently-viewed', JSON.stringify([productViewed]));
        }
      }

      async loadViewedProducts(productId) {
        if (this.loaded) return;

        let products = [];
        if (localStorage.getItem('recently-viewed')?.length) {
          products = JSON.parse(localStorage.getItem('recently-viewed'));
          products = productId ? products.filter((p) => p !== productId) : products;
          products = products.slice(0, this.productsToShowMax);
        }

        if (!products.length) return;

        const query = products.map((value) => `id:${value}`).join(' OR ');
        const searchUrl = `${Shopify.routes.root}search?section_id=${this.section}&type=product&q=${encodeURIComponent(
          query
        )}`;

        try {
          const response = await fetch(searchUrl);
          const text = await response.text();
          const html = document.createElement('div');
          html.innerHTML = text;
          const newContent = html.querySelector(`#viewed-products-${this.section}`);

          if (newContent?.innerHTML.trim().length) {
            this.innerHTML = newContent.innerHTML;
            this.classList.remove('hidden');
          } else {
            const suggestProductsContent = html.querySelector(`#suggest-products-${this.section}`);
            this.innerHTML = suggestProductsContent.innerHTML;
            this.classList.remove('hidden');
          }
          this.loaded = true;
        } catch (e) {
          console.error(e);
        }
      }
    }
  );
}

if (!customElements.get('related-products')) {
  customElements.define(
    'related-products',
    class RelatedProducts extends HTMLElement {
      observer = undefined;
      loaded = false;

      constructor() {
        super();
        this.section = this.dataset.sectionId;
        this.productsToShowMax = parseInt(this.dataset.maxToShow, 10) || 10;
      }

      connectedCallback() {
        this.initializeRelatedProducts(this.dataset.productId);
      }

      initializeRelatedProducts(productId) {
        this.observer?.unobserve(this);
        this.observer = new IntersectionObserver(
          (entries, observer) => {
            if (!entries[0].isIntersecting) return;
            observer.unobserve(this);
            this.loadRelatedProducts(productId);
          },
          { rootMargin: '0px 0px 400px 0px' }
        );
        this.observer.observe(this);
      }

      async loadRelatedProducts(productId) {
        if (this.loaded) return;

        const url = `${window.routes.product_recommendation_url}?limit=${this.productsToShowMax}&product_id=${productId}&section_id=${this.section}`;

        try {
          const response = await fetch(url);
          const text = await response.text();
          const html = document.createElement('div');
          html.innerHTML = text;
          const newContent = html.querySelector(`#related-products-${this.section}`);

          if (newContent?.innerHTML.trim().length) {
            this.innerHTML = newContent.innerHTML;
            this.classList.remove('hidden');
          } else {
            const suggestProductsContent = html.querySelector(`#suggest-products-${this.section}`);
            this.innerHTML = suggestProductsContent.innerHTML;
            this.classList.remove('hidden');
          }
          this.loaded = true;
        } catch (e) {
          console.error(e);
        }
      }
    }
  );
}
