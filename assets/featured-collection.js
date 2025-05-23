if (!customElements.get('featured-collection')) {
  customElements.define(
    'featured-collection',
    class FeaturedCollection extends HTMLElement {
      constructor() {
        super();
        this.sectionId = this.getAttribute('data-section-id');
        this.pageParam = this.getAttribute('data-paginate');
        this.currentTab = 1;
        this.loaded = [];
        this.loading = true;
      }

      connectedCallback() {
        this.querySelectorAll('.collection-title').forEach((button) => {
          button.addEventListener('click', () => {
            const index = parseInt(button.getAttribute('data-index'));
            const url = button.getAttribute('data-url');

            this.querySelectorAll('.collection-title').forEach((btn) => {
              btn.classList.remove('active');
            });
            button.classList.add('active');

            const viewAllLink = this.querySelector('.show-view-all');
            if (viewAllLink && url) {
              viewAllLink.setAttribute('href', url);
            }

            this.loadContent(index);
          });
        });
      }

      loadContent(index) {
        this.currentTab = index;
        const skeleton = document.getElementById(`skeleton-${this.sectionId}-${index}`);
        skeleton?.classList.remove('hidden');

        this.querySelectorAll('.fc-tab-content').forEach((tab) => {
          tab.classList.add('hidden');
        });

        const contentId = `fc-${this.sectionId}-${index}`;
        const existingContent = document.getElementById(contentId);

        if (index === 1 && existingContent) {
          skeleton?.classList.add('hidden');
          existingContent.classList.remove('hidden');
          return;
        }

        if (this.loaded.includes(index)) {
          skeleton?.classList.add('hidden');
          existingContent?.classList.remove('hidden');
          return;
        }

        this.loading = true;
        const url = `${window.location.pathname}?section_id=${this.sectionId}&${this.pageParam}=${index}`;
        fetch(url, { method: 'GET' })
          .then((res) => res.text())
          .then((responseText) => {
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            const newContent = html.getElementById(contentId);
            if (newContent) {
              this.appendChild(newContent);
              newContent.classList.remove('hidden');
              this.loaded.push(index);
            }
            skeleton?.classList.add('hidden');
            this.loading = false;
          });
      }
    }
  );
}
