import "../../../styles/home.css";
import '../../../styles/bookmark.css';
import BookmarkPresenter from './bookmark-presenter';
import StoryDetailModal from '../home/story-detail-modal';

export default class BookmarkPage {
  constructor() {
    this.presenter = new BookmarkPresenter(this);
    this.map = null;
    this.markers = [];
    this.searchTimeout = null;
    this.storyDetailModal = new StoryDetailModal();
    this.bookmarks = [];
    this.refreshTimeout = null; // For debouncing bookmark-updated
  }

  async render() {
    return `
      <header class="home-header">
        <div class="header-content">
          <h1 class="welcome-message">
            <span class="icon">🔖</span>
            Bookmark Saya
          </h1>
          <button class="hamburger-btn" aria-label="Buka menu navigasi" aria-expanded="false">
            <span class="icon">☰</span>
          </button>
          <div class="header-actions">
            <button id="backHomeBtn" class="btn btn-secondary">
              <span class="icon">🏠</span>
              Beranda
            </button>
            <button id="refreshBookmarkBtn" class="btn btn-secondary" aria-label="Segarkan daftar bookmark">
              <span class="icon">↻</span>
              Refresh
            </button>
            <button id="clearAllBookmarksBtn" class="btn btn-danger" aria-label="Hapus semua bookmark">
              <span class="icon">🗑️</span>
              Hapus Semua
            </button>
          </div>
        </div>
        <nav class="nav-drawer" aria-hidden="true">
          <button class="close-drawer-btn" aria-label="Tutup menu navigasi">
            <span class="icon">✕</span>
          </button>
          <div class="drawer-actions">
            <button id="backHomeBtnDrawer" class="btn btn-secondary">
              <span class="icon">🏠</span>
              Beranda
            </button>
            <button id="refreshBookmarkBtnDrawer" class="btn btn-secondary">
              <span class="icon">↻</span>
              Refresh
            </button>
            <button id="clearAllBookmarksBtnDrawer" class="btn btn-danger">
              <span class="icon">🗑️</span>
              Hapus Semua
            </button>
          </div>
        </nav>
      </header>

      <section id="main-content" class="home-main-content" tabindex="-1" aria-label="Konten utama halaman bookmark">
        <section class="search-section">
          <div class="search-container">
            <input 
              type="text" 
              id="searchBookmarkInput" 
              placeholder="Cari bookmark berdasarkan nama atau deskripsi..."
              class="search-input"
              aria-label="Cari bookmark"
            />
            <button id="clearSearchBookmarkBtn" class="clear-search-btn" style="display: none;" aria-label="Hapus pencarian">×</button>
          </div>
        </section>

        <div id="loadingBookmarkState" class="loading-state" style="display: none;" aria-live="polite">
          <div class="loading-spinner"></div>
          <p>Memuat bookmark...</p>
        </div>

        <div id="errorBookmarkState" class="error-state" style="display: none;" aria-live="assertive">
          <p class="error-message"></p>
          <button id="retryBookmarkBtn" class="btn btn-primary">Coba Lagi</button>
        </div>

        <div class="home-content">
          <section class="stories-section">
            <div class="bookmark-header">
              <h2 class="section-title">Stories yang Disimpan</h2>
              <div class="bookmark-stats">
                <span id="bookmarkCount" class="bookmark-count">0 bookmark</span>
              </div>
            </div>
            <div id="bookmarksList" class="stories-list" role="list">
              <!-- Bookmarks akan dimuat di sini -->
            </div>
            <div id="emptyBookmarkState" class="empty-state" style="display: none;">
              <div class="empty-bookmark-icon">🔖</div>
              <h3>Belum ada bookmark</h3>
              <p>Mulai bookmark stories favorit Anda dari halaman beranda!</p>
              <button class="btn btn-primary" onclick="window.location.hash = '#/home'" aria-label="Kembali ke beranda">
                <span class="icon">🏠</span>
                Ke Beranda
              </button>
            </div>
          </section>
          
          <section class="map-section">
            <h2 class="section-title">Peta Lokasi Bookmark</h2>
            <div id="bookmarkMap" class="map-container"></div>
          </section>
        </div>
      </section>
    `;
  }

  async afterRender() {
    try {
      console.log('BookmarkPage: Starting afterRender');
      this.setupSkipToContent();
      this.initializeMap();
      this.storyDetailModal.setOnLocationButtonClick((lat, lon) => {
        this.centerMapOnLocation(lat, lon);
      });
      this.setupEventListeners();
      console.log('BookmarkPage: Adding bookmark-updated event listener');
      document.addEventListener('bookmark-updated', () => {
        if (this.refreshTimeout) {
          clearTimeout(this.refreshTimeout);
        }
        this.refreshTimeout = setTimeout(() => {
          console.log('BookmarkPage: bookmark-updated event received, refreshing bookmarks');
          this.presenter.onRefreshClick();
        }, 300); // Debounce for 300ms
      });
      console.log('BookmarkPage: Initializing presenter...');
      await this.presenter.init();
      console.log('BookmarkPage: Presenter initialized');
    } catch (error) {
      console.error('BookmarkPage: Error in afterRender:', error);
      this.showError(`Gagal memuat halaman bookmark: ${error.message}`);
    }
  }

  setupSkipToContent() {
    const skipLink = document.querySelector('.skip-link, [href="#main-content"], [data-skip-content]');
    if (skipLink) {
      const newSkipLink = skipLink.cloneNode(true);
      skipLink.parentNode.replaceChild(newSkipLink, skipLink);
      newSkipLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.skipToMainContent();
      });
      newSkipLink.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.skipToMainContent();
        }
      });
      console.log('Fungsi lompat ke konten bookmark selesai diatur');
    }
  }

  skipToMainContent() {
    const mainContent = document.getElementById('main-content');
    const searchInput = document.getElementById('searchBookmarkInput');
    if (mainContent && searchInput) {
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        searchInput.focus();
        console.log('Fokus dipindahkan ke input pencarian bookmark');
      }, 100);
      this.announceToScreenReader('Melompat ke konten utama - fokus pada pencarian bookmark');
    }
  }

  announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => {
      announcement.remove();
    }, 1000);
  }

  initializeMap() {
    try {
      const mapElement = document.getElementById('bookmarkMap');
      if (!mapElement) {
        console.error('Elemen peta bookmark tidak ditemukan');
        return;
      }
      if (typeof L === 'undefined') {
        console.error('Pustaka Leaflet tidak dimuat');
        return;
      }
      this.map = L.map('bookmarkMap').setView([-2.5489, 118.0149], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);
      console.log('Peta bookmark berhasil diinisialisasi');
    } catch (error) {
      console.error('Kesalahan menginisialisasi peta bookmark:', error);
    }
  }

  setupEventListeners() {
    try {
      // Navigation buttons
      const backHomeBtn = document.getElementById('backHomeBtn');
      if (backHomeBtn) {
        backHomeBtn.addEventListener('click', () => {
          window.location.hash = '#/home';
        });
      }

      const backHomeBtnDrawer = document.getElementById('backHomeBtnDrawer');
      if (backHomeBtnDrawer) {
        backHomeBtnDrawer.addEventListener('click', () => {
          window.location.hash = '#/home';
          this.toggleDrawer();
        });
      }

      // Refresh buttons
      const refreshBookmarkBtn = document.getElementById('refreshBookmarkBtn');
      if (refreshBookmarkBtn) {
        refreshBookmarkBtn.addEventListener('click', () => {
          this.presenter.onRefreshClick();
          this.announceToScreenReader('Menyegarkan daftar bookmark');
        });
      }

      const refreshBookmarkBtnDrawer = document.getElementById('refreshBookmarkBtnDrawer');
      if (refreshBookmarkBtnDrawer) {
        refreshBookmarkBtnDrawer.addEventListener('click', () => {
          this.presenter.onRefreshClick();
          this.toggleDrawer();
          this.announceToScreenReader('Menyegarkan daftar bookmark');
        });
      }

      // Clear all bookmarks
      const clearAllBookmarksBtn = document.getElementById('clearAllBookmarksBtn');
      if (clearAllBookmarksBtn) {
        clearAllBookmarksBtn.addEventListener('click', () => {
          this.showClearAllConfirmation();
        });
      }

      const clearAllBookmarksBtnDrawer = document.getElementById('clearAllBookmarksBtnDrawer');
      if (clearAllBookmarksBtnDrawer) {
        clearAllBookmarksBtnDrawer.addEventListener('click', () => {
          this.showClearAllConfirmation();
          this.toggleDrawer();
        });
      }

      // Drawer controls
      const hamburgerBtn = document.querySelector('.hamburger-btn');
      if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
          this.toggleDrawer();
        });
      }

      const closeDrawerBtn = document.querySelector('.close-drawer-btn');
      if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', () => {
          this.toggleDrawer();
        });
      }

      // Search functionality
      const searchInput = document.getElementById('searchBookmarkInput');
      const clearSearchBtn = document.getElementById('clearSearchBookmarkBtn');
      if (searchInput && clearSearchBtn) {
        searchInput.addEventListener('input', (e) => {
          const searchText = e.target.value;
          clearSearchBtn.style.display = searchText ? 'block' : 'none';
          if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
          }
          this.searchTimeout = setTimeout(() => {
            this.presenter.onSearchInput(searchText);
            this.announceToScreenReader(`Mencari bookmark dengan kata kunci: ${searchText || 'kosong'}`);
          }, 300);
        });
        clearSearchBtn.addEventListener('click', () => {
          searchInput.value = '';
          clearSearchBtn.style.display = 'none';
          if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
          }
          this.presenter.onSearchClear();
          this.announceToScreenReader('Pencarian bookmark dihapus');
        });
      }

      // Retry button
      const retryBtn = document.getElementById('retryBookmarkBtn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.presenter.onRetryClick();
          this.announceToScreenReader('Mencoba memuat ulang bookmark');
        });
      }

      console.log('Pengaturan event listener bookmark selesai');
    } catch (error) {
      console.error('Kesalahan mengatur event listener bookmark:', error);
      this.showError('Gagal mengatur event listener');
    }
  }

  toggleDrawer() {
    const navDrawer = document.querySelector('.nav-drawer');
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    if (navDrawer && hamburgerBtn) {
      const isOpen = navDrawer.getAttribute('aria-hidden') === 'false';
      navDrawer.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
      hamburgerBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      hamburgerBtn.querySelector('.icon').textContent = isOpen ? '☰' : '✕';
      this.announceToScreenReader(isOpen ? 'Menu navigasi ditutup' : 'Menu navigasi dibuka');
    }
  }

  displayBookmarks(bookmarks) {
    try {
      console.log('BookmarkPage: displayBookmarks called with', bookmarks);
      this.bookmarks = bookmarks || [];
      const bookmarksContainer = document.getElementById('bookmarksList');
      const emptyState = document.getElementById('emptyBookmarkState');
      const bookmarkCount = document.getElementById('bookmarkCount');

      if (!bookmarksContainer) {
        console.error('Kontainer bookmark tidak ditemukan');
        return;
      }

      // Update bookmark count
      const count = this.bookmarks.length;
      if (bookmarkCount) {
        bookmarkCount.textContent = `${count} bookmark${count !== 1 ? 's' : ''}`;
        bookmarkCount.setAttribute('aria-label', `${count} bookmark ditemukan`);
      }

      if (count === 0) {
        console.log('Tidak ada bookmark untuk ditampilkan');
        bookmarksContainer.innerHTML = '';
        if (emptyState) {
          emptyState.style.display = 'block';
        }
        this.announceToScreenReader('Tidak ada bookmark ditemukan');
        return;
      }

      console.log(`Menampilkan ${count} bookmark`);
      if (emptyState) {
        emptyState.style.display = 'none';
      }

      const searchText = document.getElementById('searchBookmarkInput')?.value.toLowerCase() || '';
      const bookmarksHTML = this.bookmarks.map(story => {
        if (!story.id || !story.name || !story.photoUrl) {
          console.warn('Data bookmark tidak valid:', story);
          return '';
        }
        const highlightedName = this.highlightText(story.name, searchText);
        const highlightedDescription = this.highlightText(this.truncateText(story.description || '', 150), searchText);
        return `
          <article class="story-card bookmark-card" data-story-id="${story.id}" role="listitem" tabindex="0" aria-label="Bookmark: ${this.escapeHtml(story.name)}">
            <div class="story-image">
              <img src="${story.photoUrl}" alt="${this.escapeHtml(story.name)}" loading="lazy" 
                   onerror="this.src='data:image/svg+xml;charset=UTF-8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"200\\" height=\\"150\\"><rect width=\\"200\\" height=\\"150\\" fill=\\"#f0f0f0\\"/><text x=\\"100\\" y=\\"75\\" text-anchor=\\"middle\\" dy=\\".3em\\" font-family=\\"Arial\\" font-size=\\"12\\" fill=\\"#666\\">No Image</text></svg>'" />
              <div class="bookmark-badge">
                <span class="icon">🔖</span>
              </div>
            </div>
            <div class="story-content">
              <h3 class="story-title">${highlightedName}</h3>
              <p class="story-description">${highlightedDescription}</p>
              <div class="story-meta">
                <span class="story-date">
                  <span class="icon">📅</span>
                  ${this.formatDate(story.createdAt)}
                </span>
                ${story.hasLocation ? `
                  <span class="story-location">
                    <span class="icon">📍</span>
                    ${story.lat.toFixed(3)}, ${story.lon.toFixed(3)}
                  </span>
                ` : ''}
                <span class="bookmark-date">
                  <span class="icon">🔖</span>
                  Disimpan ${this.formatDate(story.bookmarkedAt)}
                </span>
              </div>
              <div class="story-actions">
                ${story.hasLocation ? `
                  <button class="btn btn-outline view-location-btn" data-lat="${story.lat}" data-lon="${story.lon}" aria-label="Lihat lokasi ${this.escapeHtml(story.name)} di peta">
                    Lihat di Peta
                  </button>
                ` : ''}
                <button class="btn btn-danger remove-bookmark-btn" data-story-id="${story.id}" aria-label="Hapus bookmark ${this.escapeHtml(story.name)}">
                  <span class="icon">🗑️</span>
                  Hapus
                </button>
              </div>
            </div>
          </article>
        `;
      }).filter(html => html !== '').join('');
      
      bookmarksContainer.innerHTML = bookmarksHTML;
      console.log('HTML bookmark diperbarui');
      this.setupBookmarkEventListeners();
      this.announceToScreenReader(`Menampilkan ${count} bookmark`);
    } catch (error) {
      console.error('Kesalahan menampilkan bookmark:', error);
      this.showError(`Gagal menampilkan bookmark: ${error.message}`);
    }
  }

  highlightText(text, searchText) {
    if (!searchText || !text) return this.escapeHtml(text);
    const regex = new RegExp(`(${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return this.escapeHtml(text).replace(regex, '<mark>$1</mark>');
  }

  setupBookmarkEventListeners() {
    try {
      document.querySelectorAll('.view-location-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const lat = parseFloat(btn.getAttribute('data-lat'));
          const lon = parseFloat(btn.getAttribute('data-lon'));
          this.presenter.onLocationButtonClick(lat, lon);
        });
      });

      document.querySelectorAll('.remove-bookmark-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const storyId = btn.getAttribute('data-story-id');
          this.showRemoveBookmarkConfirmation(storyId);
        });
      });

      document.querySelectorAll('.bookmark-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.story-actions')) return;
          const storyId = card.getAttribute('data-story-id');
          this.presenter.onStoryCardClick(storyId);
        });

        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const storyId = card.getAttribute('data-story-id');
            this.presenter.onStoryCardClick(storyId);
          }
        });
      });

      console.log(`Event listener diatur untuk ${document.querySelectorAll('.bookmark-card').length} kartu bookmark`);
    } catch (error) {
      console.error('Kesalahan mengatur event listener bookmark:', error);
    }
  }

  displayMap(bookmarks) {
    try {
      if (!this.map) {
        console.warn('Peta bookmark belum diinisialisasi, melewati tampilan peta');
        return;
      }

      console.log('BookmarkPage: displayMap called with', bookmarks);

      // Clear existing markers
      this.markers.forEach(marker => this.map.removeLayer(marker));
      this.markers = [];

      const bookmarksWithLocation = (bookmarks || []).filter(story =>
        story.lat && story.lon && !isNaN(story.lat) && !isNaN(story.lon)
      );

      console.log(`Ditemukan ${bookmarksWithLocation.length} bookmark dengan lokasi valid`);

      if (bookmarksWithLocation.length === 0) {
        return;
      }

      bookmarksWithLocation.forEach(story => {
        try {
          const marker = L.marker([story.lat, story.lon]).addTo(this.map);
          const popupContent = `
            <div class="map-popup bookmark-popup">
              <div class="bookmark-popup-badge">🔖</div>
              <img src="${story.photoUrl}" alt="${this.escapeHtml(story.name)}" class="popup-image" 
                   style="width: 200px; height: 150px; object-fit: cover; border-radius: 4px;" 
                   onerror="this.style.display='none'" />
              <h3 class="popup-title" style="margin: 8px 0 4px 0; font-size: 16px;">${this.escapeHtml(story.name)}</h3>
              <p class="popup-description" style="margin: 4px 0; font-size: 14px; color: #666;">${this.escapeHtml(this.truncateText(story.description || '', 100))}</p>
              <p class="popup-date" style="margin: 4px 0; font-size: 12px; color: #888;">${this.formatDate(story.createdAt)}</p>
              <p class="popup-bookmark-date" style="margin: 4px 0; font-size: 12px; color: #007bff;">🔖 Disimpan ${this.formatDate(story.bookmarkedAt)}</p>
            </div>
          `;
          marker.bindPopup(popupContent);
          this.markers.push(marker);
        } catch (markerError) {
          console.error('Kesalahan membuat marker untuk bookmark:', story.id, markerError);
        }
      });

      if (this.markers.length > 0) {
        try {
          const group = new L.featureGroup(this.markers);
          this.map.fitBounds(group.getBounds().pad(0.1));
        } catch (boundsError) {
          console.error('Kesalahan menyesuaikan batas peta bookmark:', boundsError);
        }
      }

      console.log(`Menambahkan ${this.markers.length} marker ke peta bookmark`);
    } catch (error) {
      console.error('Kesalahan menampilkan peta bookmark:', error);
    }
  }

  centerMapOnLocation(lat, lon) {
    try {
      if (!this.map) {
        console.warn('Peta bookmark belum diinisialisasi');
        return;
      }
      this.map.setView([lat, lon], 15);
      this.markers.forEach(marker => {
        const markerLatLng = marker.getLatLng();
        if (Math.abs(markerLatLng.lat - lat) < 0.001 && Math.abs(markerLatLng.lng - lon) < 0.001) {
          marker.openPopup();
        }
      });
      console.log(`Peta bookmark dipusatkan pada lokasi: ${lat}, ${lon}`);
      this.announceToScreenReader(`Peta dipusatkan pada lokasi bookmark`);
    } catch (error) {
      console.error('Kesalahan memusatkan peta bookmark:', error);
    }
  }

  showRemoveBookmarkConfirmation(storyId) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: 'Hapus Bookmark',
        text: 'Apakah Anda yakin ingin menghapus bookmark ini?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Hapus',
        cancelButtonText: 'Batal'
      }).then(result => {
        if (result.isConfirmed) {
          this.presenter.onRemoveBookmark(storyId);
        }
      });
    } else {
      if (confirm('Apakah Anda yakin ingin menghapus bookmark ini?')) {
        this.presenter.onRemoveBookmark(storyId);
      }
    }
  }

  showClearAllConfirmation() {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: 'Hapus Semua Bookmark',
        text: 'Apakah Anda yakin ingin menghapus semua bookmark? Tindakan ini tidak dapat dibatalkan.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Hapus Semua',
        cancelButtonText: 'Batal'
      }).then(result => {
        if (result.isConfirmed) {
          this.presenter.onClearAllBookmarks();
        }
      });
    } else {
      if (confirm('Apakah Anda yakin ingin menghapus semua bookmark? Tindakan ini tidak dapat dibatalkan.')) {
        this.presenter.onClearAllBookmarks();
      }
    }
  }

  showLoading() {
    const loadingElement = document.getElementById('loadingBookmarkState');
    const errorElement = document.getElementById('errorBookmarkState');
    if (loadingElement) {
      loadingElement.style.display = 'block';
      loadingElement.setAttribute('aria-hidden', 'false');
    }
    if (errorElement) {
      errorElement.style.display = 'none';
      errorElement.setAttribute('aria-hidden', 'true');
    }
    console.log('Status pemuatan bookmark ditampilkan');
  }

  hideLoading() {
    const loadingElement = document.getElementById('loadingBookmarkState');
    if (loadingElement) {
      loadingElement.style.display = 'none';
      loadingElement.setAttribute('aria-hidden', 'true');
    }
    console.log('Status pemuatan bookmark disembunyikan');
  }

  showError(message) {
    const errorElement = document.getElementById('errorBookmarkState');
    const errorMessageElement = document.querySelector('#errorBookmarkState .error-message');
    const loadingElement = document.getElementById('loadingBookmarkState');

    if (errorElement) {
      errorElement.style.display = 'block';
      errorElement.setAttribute('aria-hidden', 'false');
    }
    if (errorMessageElement) {
      errorMessageElement.textContent = message;
    }
    if (loadingElement) {
      loadingElement.style.display = 'none';
      loadingElement.setAttribute('aria-hidden', 'true');
    }
    console.log('Error bookmark ditampilkan:', message);
    this.announceToScreenReader(`Kesalahan: ${message}`);
  }

  navigateToStoryDetail(storyId) {
    this.storyDetailModal.show(storyId);
  }

  showSuccessMessage(message) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: message,
        confirmButtonText: 'OK'
      });
    } else {
      alert(message);
    }
    this.announceToScreenReader(message);
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  }

  formatDate(dateString) {
    try {
      if (!dateString) return 'Tanggal tidak tersedia';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Tanggal tidak valid';
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Kesalahan memformat tanggal:', error);
      return 'Tanggal tidak valid';
    }
  }
}