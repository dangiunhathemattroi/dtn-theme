if (!customElements.get('announcement-modal')) {
  customElements.define(
    'announcement-modal',
    class AnnouncementModal extends HTMLElement {
      constructor() {
        super();
        const sectionId = this.getAttribute('data-section-id');
        this.setAccessibility(sectionId);
        this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
        this.querySelector(`#AnnouncementModal-${sectionId}-Overlay`).addEventListener('click', this.close.bind(this));
      }
      setAccessibility(sectionId) {
        const triggers = document.querySelectorAll(`.announcement-${sectionId}`);
        if (!triggers) return;

        triggers.forEach((trigger) => {
          trigger.setAttribute('role', 'button');
          trigger.setAttribute('aria-haspopup', 'dialog');

          trigger.addEventListener('click', (event) => {
            event.preventDefault();
            this.open(trigger, sectionId);
          });

          trigger.addEventListener('keydown', (event) => {
            if (event.code.toUpperCase() === 'SPACE') {
              event.preventDefault();
              this.open(trigger, sectionId);
            }
          });
        });
      }

      open(triggeredBy, sectionId) {
        if (triggeredBy) this.setActiveElement(triggeredBy);
        setTimeout(() => {
          this.classList.add('animate', 'active');
        });

        this.addEventListener(
          'transitionend',
          () => {
            const containerToTrapFocusOn = document.getElementById(`AnnouncementModal-${sectionId}`);
            const focusElement =
              this.querySelector(`.${sectionId}-modal__inner`) || this.querySelector(`.${sectionId}-modal__close`);

            trapFocus(containerToTrapFocusOn, focusElement);
          },
          { once: true }
        );

        document.body.classList.add('overflow-hidden');
      }

      close() {
        this.classList.remove('active');
        removeTrapFocus(this.activeElement);
        document.body.classList.remove('overflow-hidden');
      }

      setActiveElement(element) {
        this.activeElement = element;
      }
    }
  );
}
