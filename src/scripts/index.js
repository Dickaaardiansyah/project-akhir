// CSS imports
import '../styles/styles.css';
import App from './pages/app';

document.addEventListener('DOMContentLoaded', async () => {
  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });

  await app.renderPage();

  // ✅ SPA Routing Handling
  window.addEventListener('hashchange', async () => {
    // Prevent routing logic when skip link is used
    if (window.location.hash !== '#main-content') {
      await app.renderPage();
    }
  });

  // ✅ Skip to Content functionality
  const skipLink = document.querySelector('.skip-link');
  const mainContent = document.querySelector('#main-content');
  const mainHeading = mainContent.querySelector('h1');

  if (skipLink && mainContent) {
    skipLink.addEventListener('click', (event) => {
      event.preventDefault(); // Prevent default anchor jump
      skipLink.blur();        // Remove focus from skip link
      mainContent.focus();    // Move focus to main content
      mainContent.scrollIntoView({ behavior: 'smooth' }); // Smooth scroll
    });
  } else {
    console.warn('Skip link or main content not found');
  }

  // ✅ Navigation Drawer toggle
  const drawerButton = document.querySelector('#drawer-button');
  const navigationDrawer = document.querySelector('#navigation-drawer');

  if (drawerButton && navigationDrawer) {
    drawerButton.addEventListener('click', () => {
      const isOpen = drawerButton.getAttribute('aria-expanded') === 'true';
      drawerButton.setAttribute('aria-expanded', !isOpen);
      navigationDrawer.style.display = isOpen ? 'none' : 'block';
    });
  }

  // ✅ Ensure header is visible (optional in SPA)
  const header = document.querySelector('header[role="banner"]');
  if (header && !header.classList.contains('hidden')) {
    header.style.display = 'block';
  }
});

