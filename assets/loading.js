if (!customElements.get('loading-state')) {
  customElements.define(
    'loading-state',
    class Loading extends HTMLElement {
      constructor() {
        super();
        this.isLoading = false;
      }

      connectedCallback() {
        document.addEventListener('loading-state', this.handleLoadingState.bind(this));
      }

      disconnectedCallback() {
        document.removeEventListener('loading-state', this.handleLoadingState);
      }

      handleLoadingState(event) {
        if (event.detail && typeof event.detail.loading === 'boolean') {
          this.isLoading = event.detail.loading;
          this.updateLoadingState();
        }
      }

      updateLoadingState() {
        if (this.isLoading) {
          this.classList.add('loading--visible');
          this.setAttribute('aria-hidden', 'false');
        } else {
          this.classList.remove('loading--visible');
          this.setAttribute('aria-hidden', 'true');
        }
      }
    }
  );
}