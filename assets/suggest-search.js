if (!customElements.get('suggest-search')) {
  customElements.define(
    'suggest-search',
    class SuggestSearch extends HTMLElement {
      observer = undefined;
      loaded = false;
      constructor() {
        super();
        this.sectionId = this.dataset.sectionId;
        this.searchEmpty = this.dataset.searchEmpty;
        this.keySearch = this.dataset.searchNoResults;
      }

      connectedCallback() {        
        if (this.searchEmpty == "true") {          
          this.initializeSearchNoResults(this.keySearch);
        }
      }

      initializeSearchNoResults(keySearch) {
        this.observer?.unobserve(this);
        this.observer = new IntersectionObserver(
          (entries, observer) => {
            if (!entries[0].isIntersecting) return;
            observer.unobserve(this);
            this.searchNoResults(keySearch);
          },
          { rootMargin: '0px 0px 400px 0px' }
        );
        this.observer.observe(this);
      }

      searchNoResults(keySearch) {
        if (this.loaded) return;

        const url = `${Shopify.routes.root}search?section_id=${this.sectionId}&q=${keySearch}`;
        fetch(url, { method: 'GET' })
          .then((res) => res.text())
          .then((responseText) => {
            const html = document.createElement('div');
            html.innerHTML = responseText;
            const newContent = html.querySelector(`#suggest-search-${this.sectionId} main-search-results`);
            if (newContent?.innerHTML.trim().length) {
              this.querySelector(`#suggest-search-${this.sectionId} main-search-results`).innerHTML =
                newContent.innerHTML;
            }
            this.loaded = true;
          });
      }
    }
  );
}
