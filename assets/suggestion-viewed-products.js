if (!customElements.get('suggestion-viewed-products')) {
  customElements.define(
    'suggestion-viewed-products',
    class SuggestionViewedProducts extends HTMLElement {
      constructor() {
        super();
        this.section = this.dataset.sectionId;
        this.loaded = [];
        this.loading = true;
        this.productsToShowMax = parseInt(this.dataset.maxToShow, 10) || 10;
        this.hasProductRecommendation = false;
        this.show = false;
      }

      async connectedCallback() {
        this.setProduct(this.dataset.productId);

        await this.loadRecommendations(this.dataset.productId);

        if (this.hasProductRecommendation) {
          this._setActiveTab('related-products');
          this._showTabContent('related-products');
          this._showHeading();
        } else {
          await this.loadViewedProducts(this.dataset.productId);
          if (this.show) {
            const btnViewed = this.querySelector(`#btn-viewed-products-${this.section}`);
            btnViewed?.classList.remove('hidden');
            this._setActiveTab('viewed-products');
            this._showTabContent('viewed-products');
            this._showHeading();
          }
        }

        this._setupTabListeners();
      }

      /**
       * Update viewed products list in localStorage
       * @param {string} productViewed
       */
      setProduct(productViewed) {
        let productList = [];

        if (localStorage.getItem('recently-viewed')?.length) {
          productList = JSON.parse(localStorage.getItem('recently-viewed'));
          productList = productList.filter((p) => p !== productViewed).slice(0, this.productsToShowMax);
          this.show = productList.length > 0;
          const newData = [productViewed, ...productList];
          localStorage.setItem('recently-viewed', JSON.stringify(newData));
        } else {
          this.show = false;
          localStorage.setItem('recently-viewed', JSON.stringify([productViewed]));
        }
      }

      /**
       * Load suggested product list based on productId
       * @param {string} productId
       */
      async loadRecommendations(productId) {
        const existingContent = this.querySelector(`#related-products-${this.section}`);
        const btnRecommend = this.querySelector(`#btn-related-products-${this.section}`);

        if (existingContent) {
          existingContent.classList.remove('hidden');
          btnRecommend?.classList.remove('hidden');
          this.hasProductRecommendation = true;
          return;
        }

        if (this.loaded.includes(`related-products-${productId}`)) {
          existingContent?.classList.remove('hidden');
          btnRecommend?.classList.remove('hidden');
          this.hasProductRecommendation = true;
          return;
        }

        const url = `${Shopify.routes.root}recommendations/product?limit=${this.productsToShowMax}&product_id=${productId}&section_id=${this.section}`;

        try {
          const res = await fetch(url);
          const responseText = await res.text();

          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const newContent = html.getElementById(`related-products-${this.section}`);

          if (newContent) {
            const existing = this.querySelector(`#${newContent.id}`);
            if (existing) existing.remove();r
            this.hasProductRecommendation = true;
            this.appendChild(newContent);
            newContent.classList.remove('hidden');
            btnRecommend?.classList.remove('hidden');
            this.loaded.push(`related-products-${productId}`);
          } else {
            this.hasProductRecommendation = false;
          }
        } catch (error) {
          console.error('Failed to load recommendations:', error);
          this.hasProductRecommendation = false;
        }
      }

      /**
       * Load the list of viewed products based on localStorage and current productId
       * @param {string} productId
       */
      async loadViewedProducts(productId) {
        const existingContent = this.querySelector(`#viewed-products-${this.section}`);

        if (existingContent) {
          existingContent?.classList.remove('hidden');
          return;
        }

        let products = [];
        if (localStorage.getItem('recently-viewed')?.length) {
          products = JSON.parse(localStorage.getItem('recently-viewed'));
          products = productId ? products.filter((p) => p !== productId) : products;
          products = products.slice(0, this.productsToShowMax);
        }

        if (this.loaded.includes(`viewed-products-${productId}`)) {
          existingContent?.classList.remove('hidden');
          return;
        }

        if (!products.length) return;

        const query = products.map((value) => `id:${value}`).join(' OR ');
        const searchUrl = `${Shopify.routes.root}search?section_id=${this.section}&type=product&q=${encodeURIComponent(
          query
        )}`;

        try {
          const response = await fetch(searchUrl);

          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

          const responseText = await response.text();
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const newContent = html.getElementById(`viewed-products-${this.section}`);

          if (newContent) {
            const existing = this.querySelector(`#${newContent.id}`);
            if (existing) existing.remove();
            this.appendChild(newContent);
            newContent.classList.remove('hidden');
            this.classList.remove('hidden');
            this.loaded.push(`viewed-products-${productId}`);
          }
        } catch (error) {
          console.error('Failed to load viewed products:', error);
        }
      }

      /**
       * Hide all content tabs
       */
      _hideAllTabs() {
        this.querySelectorAll('.tab-content').forEach((tab) => {
          tab.classList.add('hidden');
        });
      }

      _setActiveTab(tabName) {
        this.querySelectorAll('.recommendation-title').forEach((btn) => {
          btn.classList.remove('active');
        });

        const activeBtn = this.querySelector(`#btn-${tabName}-${this.section}`);
        if (activeBtn) activeBtn.classList.add('active');
      }

      _showTabContent(tabName) {
        this._hideAllTabs();
        const tab = this.querySelector(`#${tabName}-${this.section}`);
        if (tab) tab.classList.remove('hidden');
      }

      /**
       * Set click events for tabs
       */
      _setupTabListeners() {
        this.querySelectorAll('.btn-title').forEach((button) => {
          button.addEventListener('click', async () => {
            this.querySelectorAll('.btn-title').forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');
            const tab = button.dataset.tab;
            if (tab === 'related-products') {
              await this.loadRecommendations(this.dataset.productId);
              this._showTabContent('related-products');
            } else if (tab === 'viewed-products') {
              await this.loadViewedProducts(this.dataset.productId);
              this._showTabContent('viewed-products');
            }
          });
        });
      }

      _showHeading() {
        const heading = this.querySelector(`#heading-${this.section}`);
        if (heading && heading.classList.contains('hidden')) {
          heading.classList.remove('hidden');
        }
      }
    }
  );
}
