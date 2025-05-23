if (!customElements.get('suggestion-viewed-products')) {
  customElements.define(
    'suggestion-viewed-products',
    class SuggestionViewedProducts extends HTMLElement {
      observer = undefined;
      constructor() {
        super();
        this.section = this.dataset.sectionId;
        this.loaded = [];
        this.loading = true;
      }
      connectedCallback() {
        this.querySelectorAll('.recommendation-title').forEach((button) => {
          button.addEventListener('click', () => {
            this.querySelectorAll('.recommendation-title').forEach((btn) => {
              btn.classList.remove('active');
            });
            button.classList.add('active');
            const tab = button.dataset.tab;
            if (tab === 'related-products') {
              this.initializeRecommendations(this.dataset.productId);
            } else if (tab === 'viewed-products') {
              this.loadViewedProducts(this.dataset.productId);
            }
          });
        });
      }

      initializeRecommendations(productId) {
        this.observer?.unobserve(this);
        this.observer = new IntersectionObserver(
          (entries, observer) => {
            if (!entries[0].isIntersecting) return;
            observer.unobserve(this);
            this.loadRecommendations(productId);
          },
          { rootMargin: '0px 0px 400px 0px' }
        );
        this.observer.observe(this);
      }

      loadRecommendations(productId) {
        if (this.loaded.includes(`recommendation-${this.productId}`)) {
          return;
        }
        const url = `${this.dataset.urlProductsRecommendation}&product_id=${productId}&section_id=${this.dataset.sectionId}`;
        fetch(url, {
          method: 'GET',
        })
          .then((res) => res.text())
          .then((responseText) => {
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            const newContent = html.getElementById(`related-products-${this.dataset.sectionId}`);

            if (newContent) {
              this.appendChild(newContent);
              newContent.classList.remove('hidden');
            }
            this.loaded.push(`recommendation-${this.productId}`);
            this.loading = false;
          });
      }

      loadViewedProducts(productId) {
        if (this.loaded.includes(`viewed-products-${this.dataset.sectionId}`)) {
          return;
        }
        const query = `handle: sony-wh-1000xm5-premium-noise-cancelling-wireless-over-ear-headphones-silver`;
        const url = `${window.Shopify.routes.root}search?type=product&q=${encodeURIComponent(query)}q=&section_id=${
          this.dataset.sectionId
        }`;
        fetch(url, {
          method: 'GET',
        })
          .then((res) => res.text())
          .then((responseText) => {
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            const newContent = html.getElementById(`related-products-${this.dataset.sectionId}`);

            if (newContent) {
              this.appendChild(newContent);
              newContent.classList.remove('hidden');
            }
            this.loaded.push(`recommendation-${this.productId}`);
            this.loading = false;
          });
      }
    }
  );
}
