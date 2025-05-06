if (!customElements.get('mega-menu-drawer')) {
  customElements.define(
    'mega-menu-drawer',
    class MegaMenuDrawer extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.initMenuToggle();
      }

      calculateTotalHeight(submenu) {
        let totalHeight = 0;
        const children = Array.from(submenu.children);

        children.forEach((child) => {
          totalHeight += child.offsetHeight;

          const childSubmenu = child.querySelector(':scope > .menu_submenu');
          if (childSubmenu && child.classList.contains('menu_item_active')) {
            totalHeight += this.calculateTotalHeight(childSubmenu);
          }
        });

        return totalHeight;
      }

      initMenuToggle() {
        this.addEventListener('click', (event) => {
          const indicator = event.target.closest('.menu_indicator');
          if (!indicator) return;

          const menuItem = indicator.closest('li.menu_item');
          const submenu = menuItem?.querySelector(':scope > .menu_submenu');
          if (!menuItem || !submenu) return;

          const isActive = menuItem.classList.contains('menu_item_active');

          const siblingItems = Array.from(menuItem.parentElement.children).filter(
            (el) => el !== menuItem && el.classList.contains('menu_item')
          );

          siblingItems.forEach((sibling) => {
            const siblingSubmenu = sibling.querySelector(':scope > .menu_submenu');
            if (siblingSubmenu) {
              siblingSubmenu.style.maxHeight = siblingSubmenu.scrollHeight + 'px';
              requestAnimationFrame(() => {
                siblingSubmenu.style.maxHeight = '0';
              });
            }
            sibling.classList.remove('menu_item_active');
          });

          if (isActive) {
            submenu.style.maxHeight = submenu.scrollHeight + 'px';
            requestAnimationFrame(() => {
              submenu.style.maxHeight = '0';
            });
            menuItem.classList.remove('menu_item_active');
          } else {
            menuItem.classList.add('menu_item_active');
            const totalHeight = this.calculateTotalHeight(submenu);
            submenu.style.maxHeight = totalHeight + 'px';

            let parent = menuItem.parentElement.closest('li.menu_item.menu_item_active');
            while (parent) {
              const parentSubmenu = parent.querySelector(':scope > .menu_submenu');
              if (parentSubmenu) {
                const parentTotalHeight = this.calculateTotalHeight(parentSubmenu);
                parentSubmenu.style.maxHeight = parentTotalHeight + 'px';
              }
              parent = parent.parentElement.closest('li.menu_item.menu_item_active');
            }
          }

          event.preventDefault();
        });
      }
    }
  );
}
