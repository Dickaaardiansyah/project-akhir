import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #mainHeader = null;
  #currentPage = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;
    this.#mainHeader = document.querySelector('header[role="banner"]');

    if (this.#mainHeader) {
      this.#mainHeader.style.display = 'block';
      this.#mainHeader.style.visibility = 'visible';
      console.log('Constructor: Header visibility set to visible');
    } else {
      console.error('Constructor: Header element not found!');
    }

    this._setupDrawer();
    this._setupViewTransitions();
    
    // Setup initial auth form toggles and skip link
    window.addEventListener('DOMContentLoaded', () => {
      this._setupAuthFormToggles();
      this._setupSkipLink();
    });
  }

  _setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      this.#navigationDrawer.classList.toggle('open');
    });

    document.body.addEventListener('click', (event) => {
      if (!this.#navigationDrawer.contains(event.target) && !this.#drawerButton.contains(event.target)) {
        this.#navigationDrawer.classList.remove('open');
      }

      this.#navigationDrawer.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
        }
      });
    });
  }

  _setupViewTransitions() {
    // Check if View Transitions API is supported by the browser
    if (!document.startViewTransition) {
      console.warn('View Transitions API is not supported in this browser. Falling back to standard navigation.');
      return;
    }

    // Create global storage for active media streams if not exists
    if (!window.activeStreams) {
      window.activeStreams = [];
    }

    // Add navigation event listeners to handle page transitions
    document.addEventListener('click', (event) => {
      // Check if the clicked element is a navigation link
      const link = event.target.closest('a');
      if (!link || !link.getAttribute('href') === null || link.target === '_blank' || link.getAttribute('data-no-transition') === 'true') {
        return;
      }

      // Special handling for login/register links that might not have full URLs
      const href = link.getAttribute('href');
      if (href.startsWith('#')) {
        // Allow default behavior for anchor links
        return;
      }
      
      // Prevent default navigation
      event.preventDefault();

      // Get the URL from the link, handling both relative and absolute URLs
      let url;
      try {
        url = new URL(link.href).pathname;
      } catch (e) {
        // For relative URLs that might cause URL constructor to fail
        url = href;
      }

      // Perform transition navigation
      this._navigateWithTransition(url);
    });

    // Special handler for auth form toggles (login/register)
    document.addEventListener('DOMContentLoaded', () => {
      this._setupAuthFormToggles();
      this._setupSkipLink();
    });
    
    // Setup auth form toggles and skip link after each page render
    if (this.#content) {
      const observer = new MutationObserver(() => {
        this._setupAuthFormToggles();
        this._setupSkipLink();
      });
      observer.observe(this.#content, { childList: true });
    }

    // Handle browser back/forward navigation with transitions
    window.addEventListener('popstate', () => {
      // Force camera cleanup when using browser back/forward buttons
      this._ensureCameraCleanup();
      this._handlePageTransition();
    });
  }
  
  _setupAuthFormToggles() {
    // Find login/register toggle links
    const authToggles = document.querySelectorAll('.auth-toggle, .login-link, .register-link, [data-auth-toggle]');
    
    authToggles.forEach(toggle => {
      // Remove old listeners to prevent duplicates
      const newToggle = toggle.cloneNode(true);
      toggle.parentNode.replaceChild(newToggle, toggle);
      
      newToggle.addEventListener('click', (event) => {
        event.preventDefault();
        
        const targetPage = newToggle.getAttribute('href') || 
                          newToggle.dataset.target || 
                          (newToggle.classList.contains('login-link') ? '/login' : '/register');
        
        console.log('Auth toggle clicked, navigating to:', targetPage);
        
        // Use the transition navigation
        this._navigateWithTransition(targetPage);
      });
    });
  }

  _setupSkipLink() {
    const skipLink = document.querySelector('.skip-link');
    const mainContent = document.querySelector('#main-content');

    if (skipLink && mainContent) {
      // Remove old listeners to prevent duplicates
      const newSkipLink = skipLink.cloneNode(true);
      skipLink.parentNode.replaceChild(newSkipLink, skipLink);
      
      newSkipLink.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default anchor jump
        newSkipLink.blur();     // Remove focus from skip link
        mainContent.focus();    // Move focus to main content
        mainContent.scrollIntoView({ behavior: 'smooth' }); // Smooth scroll

        // Check if on home page and move focus to search input after a delay
        const url = getActiveRoute();
        const isHomePage = url === '/home' || url.includes('/home');
        if (isHomePage) {
          const searchInput = mainContent.querySelector('#searchInput');
          if (searchInput) {
            // Use a slight delay to ensure focus is set after scroll
            setTimeout(() => {
              searchInput.focus();
            }, 100);
          } else {
            console.warn('Search input not found on home page');
          }
        }
      });
    } else {
      console.warn('Skip link or main content not found');
    }
  }

  async _navigateWithTransition(url) {
    try {
      // Force camera cleanup before navigation
      this._ensureCameraCleanup();
      
      // Update the URL in the address bar without reloading the page
      window.history.pushState({}, '', url);
      
      // Perform the page transition
      await this._handlePageTransition();
    } catch (error) {
      console.error('Navigation transition failed:', error);
      
      // Make sure to clean up camera resources even in case of error
      this._ensureCameraCleanup();
      
      // Fallback to normal navigation in case of error
      window.location.href = url;
    }
  }

  async _handlePageTransition() {
    if (!document.startViewTransition) {
      // Fallback if View Transitions API is not available
      return this.renderPage();
    }

    try {
      // Ensure camera cleanup happens before transition starts
      if (this.#currentPage && typeof this.#currentPage.cleanup === 'function') {
        await this.#currentPage.cleanup();
      }
      
      // Force cleanup of any camera resources that might still be active
      this._ensureCameraCleanup();
      
      // Start the view transition
      const transition = document.startViewTransition(async () => {
        // Apply transition specific styles
        document.documentElement.classList.add('view-transition-active');
        
        // Wait for the actual page render to complete
        await this.renderPage();
        
        // Remove transition styles after completion
        document.documentElement.classList.remove('view-transition-active');
      });

      // Return the transition promise
      return transition.finished;
    } catch (error) {
      console.error('View transition error:', error);
      // Fallback to normal rendering without transition
      return this.renderPage();
    }
  }

  async renderPage() {
    // Ensure proper cleanup of previous page, especially for camera resources
    if (this.#currentPage && typeof this.#currentPage.cleanup === 'function') {
      // Make sure camera and other resources are properly released
      await this.#currentPage.cleanup();
      
      // Additional cleanup for camera if present
      this._ensureCameraCleanup();
    }

    const url = getActiveRoute();
    const page = routes[url];
    this.#currentPage = page;

    const isAddPage = url === '/add' || url.includes('/add');
    const isHomePage = url === '/home' || url.includes('/home');

    this._manageHeaderVisibility({ isAddPage, isHomePage, url });

    // Add view transition name to the content for better transition targeting
    this.#content.setAttribute('view-transition-name', 'page-content');
    
    // Render the page content
    this.#content.innerHTML = await page.render();
    await page.afterRender();
    
    // Setup auth toggles and skip link after rendering the page
    this._setupAuthFormToggles();
    this._setupSkipLink();
  }
  
  _ensureCameraCleanup() {
    // Find any active video elements and stop them
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
      if (video.srcObject) {
        // Stop all tracks on the stream
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => {
          track.stop();
          console.log('Camera track stopped:', track.kind);
        });
        
        // Clear the srcObject
        video.srcObject = null;
      }
    });
    
    // Check for any MediaStream objects that might be stored elsewhere
    if (window.activeStreams && Array.isArray(window.activeStreams)) {
      window.activeStreams.forEach(stream => {
        if (stream && typeof stream.getTracks === 'function') {
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('Additional camera track stopped:', track.kind);
          });
        }
      });
      window.activeStreams = [];
    }
  }

  _manageHeaderVisibility({ isAddPage, isHomePage, url }) {
    console.log('Managing header visibility for page:', url);

    // Reset custom body classes
    document.body.classList.remove('home-page-active', 'add-page-active');

    if (isAddPage) document.body.classList.add('add-page-active');
    if (isHomePage) document.body.classList.add('home-page-active');

    const shouldHideHeader = isAddPage || isHomePage;

    if (this.#mainHeader) {
      // Add view transition name to header for smooth transitions
      this.#mainHeader.setAttribute('view-transition-name', 'main-header');
      
      if (shouldHideHeader) {
        this.#mainHeader.style.display = 'none';
        this.#mainHeader.classList.add('hidden');
        console.log(`Header hidden for page: ${url}`);
      } else {
        this.#mainHeader.style.display = 'block';
        this.#mainHeader.style.visibility = 'visible';
        this.#mainHeader.classList.remove('hidden');
        console.log(`Header visible for page: ${url}`);
      }
    } else {
      console.error('Header element not found in _manageHeaderVisibility!');
    }

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      // Add view transition name to main content
      mainContent.setAttribute('view-transition-name', 'main-content');
      
      if (shouldHideHeader) {
        mainContent.classList.add('no-header');
        console.log('Added no-header class to main content');
      } else {
        mainContent.classList.remove('no-header');
        console.log('Removed no-header class from main content');
      }
    }
  }

  toggleHeaderVisibility(show = true) {
    if (this.#mainHeader) {
      this.#mainHeader.style.display = show ? 'block' : 'none';
      this.#mainHeader.style.visibility = show ? 'visible' : 'hidden';

      if (show) {
        this.#mainHeader.classList.remove('hidden');
        console.log('Header visibility toggled: SHOW');
      } else {
        this.#mainHeader.classList.add('hidden');
        console.log('Header visibility toggled: HIDE');
      }
    } else {
      console.error('Header element not found in toggleHeaderVisibility!');
    }
  }

  get currentPage() {
    return this.#currentPage;
  }
}

export default App;