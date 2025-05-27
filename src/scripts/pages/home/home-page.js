import "../../../styles/home.css";
import HomePresenter from './home-presenter.js';
import CONFIG from '../../../scripts/config.js';

export default class HomePage {
  constructor() {
    this.presenter = new HomePresenter(this);
    this.map = null;
    this.markers = [];
    this.searchTimeout = null;
    this.pushSubscription = null;
  }

  async render() {
    return `
      <!-- Header -->
      <header class="home-header">
        <div class="header-content">
          <h1 class="welcome-message">
            Selamat datang, <span id="username">User</span>!
          </h1>
          <div class="header-actions">
            <button id="subscribeNotificationBtn" class="btn btn-secondary" title="Berlangganan Notifikasi">
              <span class="icon">🔔</span>
              Berlangganan
            </button>
            <button id="unsubscribeNotificationBtn" class="btn btn-secondary" title="Berhenti Berlangganan Notifikasi" style="display: none;">
              <span class="icon">🔕</span>
              Berhenti Berlangganan
            </button>
            <button id="addStoryBtn" class="btn btn-primary">
              <span class="icon">+</span>
              Tambah Story
            </button>
            <button id="refreshBtn" class="btn btn-secondary">
              <span class="icon">↻</span>
              Refresh
            </button>
            <button id="logoutBtn" class="btn btn-danger">
              <span class="icon">↪</span>
              Logout
            </button>
          </div>
        </div>
      </header>

      <!-- Home Content Area -->
      <section id="main-content" class="home-main-content" tabindex="-1" aria-label="Konten utama halaman home">
        <!-- Search Bar -->
        <section class="search-section">
          <div class="search-container">
            <input 
              type="text" 
              id="searchInput" 
              placeholder="Cari stories berdasarkan nama atau deskripsi..."
              class="search-input"
            />
            <button id="clearSearchBtn" class="clear-search-btn" style="display: none;">×</button>
          </div>
        </section>

        <!-- Loading State -->
        <div id="loadingState" class="loading-state" style="display: none;">
          <div class="loading-spinner"></div>
          <p>Memuat stories...</p>
        </div>

        <!-- Error State -->
        <div id="errorState" class="error-state" style="display: none;">
          <p class="error-message"></p>
          <button id="retryBtn" class="btn btn-primary">Coba Lagi</button>
        </div>

        <!-- Content -->
        <div class="home-content">
          <!-- Stories List -->
          <section class="stories-section">
            <h2 class="section-title">Semua Stories</h2>
            <div id="storiesList" class="stories-list">
              <!-- Stories akan dimuat di sini -->
            </div>
            <div id="emptyState" class="empty-state" style="display: none;">
              <p>Belum ada stories. Mulai dengan menambahkan story pertama Anda!</p>
              <button class="btn btn-primary" onclick="document.getElementById('addStoryBtn').click()">
                Tambah Story
              </button>
            </div>
          </section>
          
          <!-- Map Section -->
          <section class="map-section">
            <h2 class="section-title">Peta Lokasi Stories</h2>
            <div id="map" class="map-container"></div>
          </section>
        </div>
      </section>
    `;
  }

  async afterRender() {
    try {
      console.log('HomePage: Memulai afterRender');
      await this.registerServiceWorker();
      this.updateUsernameDisplay();
      this.setupSkipToContent();
      this.initializeMap();
      this.setupEventListeners();
      console.log('HomePage: Menginisialisasi presenter...');
      await this.presenter.init();
      console.log('HomePage: Presenter diinisialisasi');
    } catch (error) {
      console.error('HomePage: Kesalahan di afterRender:', error);
      this.showError('Gagal memuat halaman: ' + error.message);
    }
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.bundle.js');
        console.log('Service Worker terdaftar dengan scope:', registration.scope);
        this.pushSubscription = await registration.pushManager.getSubscription();
        this.updateNotificationButtonState();
      } catch (error) {
        console.error('Pendaftaran Service Worker gagal:', error);
        this.showError('Gagal mendaftarkan Service Worker');
      }
    } else {
      console.warn('Service Worker atau Push API tidak didukung');
      this.disableNotificationButtons();
    }
  }

  disableNotificationButtons() {
    const subscribeBtn = document.getElementById('subscribeNotificationBtn');
    const unsubscribeBtn = document.getElementById('unsubscribeNotificationBtn');
    if (subscribeBtn) subscribeBtn.style.display = 'none';
    if (unsubscribeBtn) unsubscribeBtn.style.display = 'none';
    this.showError('Notifikasi push tidak didukung oleh browser ini');
  }

  async subscribeToPushNotifications() {
    try {
      // Show loading indicator
      Swal.fire({
        title: 'Memproses...',
        text: 'Mengaktifkan langganan notifikasi...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Notifikasi push tidak didukung');
      }

      const registration = await navigator.serviceWorker.ready;
      console.log('Service Worker siap untuk berlangganan push');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Izin notifikasi ditolak');
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: 'Izin notifikasi ditolak. Aktifkan izin notifikasi di pengaturan browser Anda.',
          confirmButtonText: 'OK'
        });
        this.announceToScreenReader('Izin notifikasi ditolak');
        return;
      }

      this.pushSubscription = await registration.pushManager.getSubscription();
      if (this.pushSubscription) {
        console.log('Sudah berlangganan notifikasi push');
        Swal.fire({
          icon: 'info',
          title: 'Informasi',
          text: 'Sudah berlangganan notifikasi',
          confirmButtonText: 'OK'
        });
        this.updateNotificationButtonState();
        this.announceToScreenReader('Sudah berlangganan notifikasi');
        return;
      }

      if (!CONFIG.VAPID_PUBLIC_KEY) {
        throw new Error('Kunci VAPID publik tidak ditemukan');
      }

      let applicationServerKey;
      try {
        console.log('Mengonversi kunci VAPID:', CONFIG.VAPID_PUBLIC_KEY);
        applicationServerKey = this.urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY);
        console.log('Kunci VAPID dikonversi menjadi Uint8Array:', applicationServerKey);
      } catch (error) {
        console.error('Gagal mengonversi kunci VAPID:', error);
        throw new Error('Format kunci VAPID tidak valid');
      }

      this.pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      console.log('Langganan push berhasil:', this.pushSubscription);

      await this.presenter.subscribeToPush(this.pushSubscription);
      console.log('Berlangganan push terdaftar di server');
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Langganan push notification telah diaktifkan',
        confirmButtonText: 'OK'
      });
      this.updateNotificationButtonState();
      this.announceToScreenReader('Langganan push notification telah diaktifkan');
    } catch (error) {
      console.error('Berlangganan push gagal:', error);
      let errorMessage = 'Gagal berlangganan notifikasi';
      if (error.message.includes('expirationTime')) {
        errorMessage = 'Kesalahan konfigurasi notifikasi. Silakan coba lagi nanti.';
      } else if (error.message.includes('VAPID')) {
        errorMessage = 'Konfigurasi server tidak valid. Hubungi dukungan.';
      }
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
      this.showError(errorMessage);
      this.updateNotificationButtonState();
      this.announceToScreenReader(errorMessage);
    }
  }

  async unsubscribeFromPushNotifications() {
    try {
      // Show loading indicator
      Swal.fire({
        title: 'Memproses...',
        text: 'Menonaktifkan langganan notifikasi...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      if (!this.pushSubscription) {
        console.log('Tidak ada langganan untuk dibatalkan');
        Swal.fire({
          icon: 'info',
          title: 'Informasi',
          text: 'Tidak ada langganan untuk dibatalkan',
          confirmButtonText: 'OK'
        });
        this.updateNotificationButtonState();
        this.announceToScreenReader('Tidak ada langganan untuk dibatalkan');
        return;
      }

      await this.presenter.unsubscribeFromPush(this.pushSubscription);
      await this.pushSubscription.unsubscribe();
      this.pushSubscription = null;
      console.log('Pembatalan langganan push berhasil');
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Langganan push notification berhasil di nonaktifkan',
        confirmButtonText: 'OK'
      });
      this.updateNotificationButtonState();
      this.announceToScreenReader('Langganan push notification berhasil di nonaktifkan');
    } catch (error) {
      console.error('Pembatalan langganan push gagal:', error);
      const errorMessage = `Gagal berhenti berlangganan notifikasi: ${error.message}`;
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
      this.showError(errorMessage);
      this.updateNotificationButtonState();
      this.announceToScreenReader(errorMessage);
    }
  }

  updateNotificationButtonState() {
    const subscribeBtn = document.getElementById('subscribeNotificationBtn');
    const unsubscribeBtn = document.getElementById('unsubscribeNotificationBtn');
    if (subscribeBtn && unsubscribeBtn) {
      subscribeBtn.style.display = this.pushSubscription ? 'none' : 'inline-block';
      unsubscribeBtn.style.display = this.pushSubscription ? 'inline-block' : 'none';
      console.log('Status tombol notifikasi diperbarui:', {
        berlangganan: !!this.pushSubscription,
        tampilanSubscribeBtn: subscribeBtn.style.display,
        tampilanUnsubscribeBtn: unsubscribeBtn.style.display,
      });
    } else {
      console.warn('Tombol notifikasi tidak ditemukan');
    }
  }

  urlBase64ToUint8Array(base64String) {
    try {
      if (!base64String || typeof base64String !== 'string') {
        throw new Error('Kunci VAPID tidak valid atau kosong');
      }
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      // Validasi panjang kunci (kunci VAPID publik biasanya 65 byte)
      if (outputArray.length !== 65) {
        throw new Error(`Panjang kunci VAPID tidak valid: ${outputArray.length} byte, seharusnya 65 byte`);
      }
      return outputArray;
    } catch (error) {
      console.error('Kesalahan mengonversi kunci VAPID:', error);
      throw new Error('Format kunci VAPID tidak valid: ' + error.message);
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
      console.log('Fungsi lompat ke konten selesai diatur');
    } else {
      console.warn('Tautan lompat ke konten tidak ditemukan. Pastikan ada di template utama.');
    }
  }

  skipToMainContent() {
    const mainContent = document.getElementById('main-content');
    const searchInput = document.getElementById('searchInput');
    if (mainContent && searchInput) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        searchInput.focus();
        console.log('Fokus dipindahkan ke input pencarian setelah lompat ke konten');
      }, 100);
      console.log('Lompat ke konten dijalankan - fokus diatur ke konten utama lalu input pencarian');
      this.announceToScreenReader('Melompat ke konten utama - fokus pada pencarian stories');
    } else {
      console.error('Elemen konten utama atau input pencarian tidak ditemukan');
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
      if (announcement.parentNode) {
        announcement.parentNode.removeChild(announcement);
      }
    }, 1000);
  }

  updateUsernameDisplay() {
    const user = this.presenter.getUserData();
    const usernameElement = document.getElementById('username');
    if (usernameElement) {
      usernameElement.textContent = user.name || 'User';
    }
    console.log('HomePage: Nama pengguna diatur ke', user.name || 'User');
  }

  initializeMap() {
    try {
      const mapElement = document.getElementById('map');
      if (!mapElement) {
        console.error('Elemen peta tidak ditemukan');
        return;
      }
      if (typeof L === 'undefined') {
        console.error('Pustaka Leaflet tidak dimuat');
        return;
      }
      this.map = L.map('map').setView([-2.5489, 118.0149], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);
      console.log('Peta berhasil diinisialisasi');
    } catch (error) {
      console.error('Kesalahan menginisialisasi peta:', error);
    }
  }

  setupEventListeners() {
    try {
      const subscribeBtn = document.getElementById('subscribeNotificationBtn');
      if (subscribeBtn) {
        subscribeBtn.addEventListener('click', () => {
          console.log('Tombol Berlangganan diklik');
          this.subscribeToPushNotifications();
        });
      }

      const unsubscribeBtn = document.getElementById('unsubscribeNotificationBtn');
      if (unsubscribeBtn) {
        unsubscribeBtn.addEventListener('click', () => {
          console.log('Tombol Berhenti Berlangganan diklik');
          this.unsubscribeFromPushNotifications();
        });
      }

      const addStoryBtn = document.getElementById('addStoryBtn');
      if (addStoryBtn) {
        addStoryBtn.addEventListener('click', () => {
          this.presenter.onAddStoryClick();
        });
      }

      const refreshBtn = document.getElementById('refreshBtn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          this.presenter.onRefreshClick();
        });
      }

      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          this.presenter.onLogoutClick();
        });
      }

      const searchInput = document.getElementById('searchInput');
      const clearSearchBtn = document.getElementById('clearSearchBtn');
      if (searchInput && clearSearchBtn) {
        searchInput.addEventListener('input', (e) => {
          const searchText = e.target.value;
          clearSearchBtn.style.display = searchText ? 'block' : 'none';
          if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
          }
          this.searchTimeout = setTimeout(() => {
            this.presenter.onSearchInput(searchText);
          }, 300);
        });
        clearSearchBtn.addEventListener('click', () => {
          searchInput.value = '';
          clearSearchBtn.style.display = 'none';
          if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
          }
          this.presenter.onSearchClear();
        });
      }

      const retryBtn = document.getElementById('retryBtn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.presenter.onRetryClick();
        });
      }

      console.log('Pengaturan event listener selesai');
    } catch (error) {
      console.error('Kesalahan mengatur event listener:', error);
      this.showError('Gagal mengatur event listener');
    }
  }

  displayStories(stories) {
    try {
      console.log('HomePage: displayStories dipanggil dengan', stories);
      const storiesContainer = document.getElementById('storiesList');
      const emptyState = document.getElementById('emptyState');
      if (!storiesContainer) {
        console.error('Kontainer stories tidak ditemukan');
        return;
      }
      if (!stories || stories.length === 0) {
        console.log('Tidak ada stories untuk ditampilkan');
        storiesContainer.innerHTML = '';
        if (emptyState) {
          emptyState.style.display = 'block';
        }
        return;
      }
      console.log(`Menampilkan ${stories.length} stories`);
      if (emptyState) {
        emptyState.style.display = 'none';
      }
      const storiesHTML = stories.map(story => {
        if (!story.id || !story.name || !story.photoUrl) {
          console.warn('Data story tidak valid:', story);
          return '';
        }
        return `
          <article class="story-card" data-story-id="${story.id}">
            <div class="story-image">
              <img src="${story.photoUrl}" alt="${this.escapeHtml(story.name)}" loading="lazy" 
                   onerror="this.src='data:image/svg+xml;charset=UTF-8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"200\\" height=\\"150\\"><rect width=\\"200\\" height=\\"150\\" fill=\\"#f0f0f0\\"/><text x=\\"100\\" y=\\"75\\" text-anchor=\\"middle\\" dy=\\".3em\\" font-family=\\"Arial\\" font-size=\\"12\\" fill=\\"#666\\">No Image</text></svg>'" />
            </div>
            <div class="story-content">
              <h3 class="story-title">${this.escapeHtml(story.name)}</h3>
              <p class="story-description">${this.escapeHtml(this.truncateText(story.description || '', 150))}</p>
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
              </div>
              <div class="story-actions">
                ${story.hasLocation ? `
                  <button class="btn btn-outline view-location-btn" data-lat="${story.lat}" data-lon="${story.lon}">
                    Lihat di Peta
                  </button>
                ` : ''}
              </div>
            </div>
          </article>
        `;
      }).filter(html => html !== '').join('');
      storiesContainer.innerHTML = storiesHTML;
      console.log('HTML stories diperbarui');
      this.setupStoryEventListeners();
      console.log('Event listener story diatur');
    } catch (error) {
      console.error('Kesalahan menampilkan stories:', error);
      this.showError('Gagal menampilkan stories: ' + error.message);
    }
  }

  setupStoryEventListeners() {
    try {
      document.querySelectorAll('.view-location-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const lat = parseFloat(e.target.getAttribute('data-lat'));
          const lon = parseFloat(e.target.getAttribute('data-lon'));
          this.presenter.onLocationButtonClick(lat, lon);
        });
      });
      console.log(`Event listener diatur untuk ${document.querySelectorAll('.story-card').length} kartu story`);
    } catch (error) {
      console.error('Kesalahan mengatur event listener story:', error);
    }
  }

  displayMap(stories) {
    try {
      if (!this.map) {
        console.warn('Peta belum diinisialisasi, melewati tampilan peta');
        return;
      }
      console.log('HomePage: displayMap dipanggil dengan', stories);
      this.markers.forEach(marker => {
        if (this.map) {
          this.map.removeLayer(marker);
        }
      });
      this.markers = [];
      const storiesWithLocation = stories.filter(story =>
        story.lat && story.lon &&
        !isNaN(story.lat) && !isNaN(story.lon)
      );
      console.log(`Ditemukan ${storiesWithLocation.length} stories dengan lokasi valid`);
      if (storiesWithLocation.length === 0) {
        return;
      }
      storiesWithLocation.forEach(story => {
        try {
          const marker = L.marker([story.lat, story.lon]).addTo(this.map);
          const popupContent = `
            <div class="map-popup">
              <img src="${story.photoUrl}" alt="${this.escapeHtml(story.name)}" class="popup-image" 
                   style="width: 200px; height: 150px; object-fit: cover; border-radius: 4px;" 
                   onerror="this.style.display='none'" />
              <h3 class="popup-title" style="margin: 8px 0 4px 0; font-size: 16px;">${this.escapeHtml(story.name)}</h3>
              <p class="popup-description" style="margin: 4px 0; font-size: 14px; color: #666;">${this.escapeHtml(this.truncateText(story.description || '', 100))}</p>
              <p class="popup-date" style="margin: 4px 0; font-size: 12px; color: #888;">${this.formatDate(story.createdAt)}</p>
            </div>
          `;
          marker.bindPopup(popupContent);
          this.markers.push(marker);
          marker.on('popupopen', () => {
            const popupDetailBtn = document.querySelector('.popup-detail-btn');
            if (popupDetailBtn) {
              popupDetailBtn.addEventListener('click', (e) => {
                const storyId = e.target.getAttribute('data-story-id');
                this.presenter.onStoryCardClick(storyId);
              });
            }
          });
        } catch (markerError) {
          console.error('Kesalahan membuat marker untuk story:', story.id, markerError);
        }
      });
      if (this.markers.length > 0) {
        try {
          const group = new L.featureGroup(this.markers);
          this.map.fitBounds(group.getBounds().pad(0.1));
        } catch (boundsError) {
          console.error('Kesalahan menyesuaikan batas peta:', boundsError);
        }
      }
      console.log(`Menambahkan ${this.markers.length} marker ke peta`);
    } catch (error) {
      console.error('Kesalahan menampilkan peta:', error);
    }
  }

  centerMapOnLocation(lat, lon) {
    try {
      if (!this.map) {
        console.warn('Peta belum diinisialisasi');
        return;
      }
      this.map.setView([lat, lon], 15);
      this.markers.forEach(marker => {
        const markerLatLng = marker.getLatLng();
        if (Math.abs(markerLatLng.lat - lat) < 0.001 && Math.abs(markerLatLng.lng - lon) < 0.001) {
          marker.openPopup();
        }
      });
      console.log(`Peta dipusatkan pada lokasi: ${lat}, ${lon}`);
    } catch (error) {
      console.error('Kesalahan memusatkan peta:', error);
    }
  }

  showLoading() {
    const loadingElement = document.getElementById('loadingState');
    const errorElement = document.getElementById('errorState');
    if (loadingElement) {
      loadingElement.style.display = 'block';
    }
    if (errorElement) {
      errorElement.style.display = 'none';
    }
    console.log('Status pemuatan ditampilkan');
  }

  hideLoading() {
    const loadingElement = document.getElementById('loadingState');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
    console.log('Status pemuatan disembunyikan');
  }

  showError(message) {
    const errorElement = document.getElementById('errorState');
    const errorMessageElement = document.querySelector('.error-message');
    const loadingElement = document.getElementById('loadingState');
    if (errorElement) {
      errorElement.style.display = 'block';
    }
    if (errorMessageElement) {
      errorMessageElement.textContent = message;
    }
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
    console.log('Error ditampilkan:', message);
    this.announceToScreenReader(message);
  }

  navigateToLogin() {
    window.location.hash = '#/login';
  }

  navigateToStoryDetail(storyId) {
    window.location.hash = `#/story/${storyId}`;
  }

  navigateToAddStory() {
    window.location.hash = '#/add';
  }

  async handleLogout() {
    if (this.pushSubscription) {
      try {
        await this.presenter.unsubscribeFromPush(this.pushSubscription);
        await this.pushSubscription.unsubscribe();
        this.pushSubscription = null;
        this.updateNotificationButtonState();
      } catch (error) {
        console.error('Kesalahan membatalkan langganan push:', error);
      }
    }
    this.presenter.clearUserSession();
    this.navigateToLogin();
  }

  showLogoutConfirmation() {
    if (confirm('Apakah Anda yakin ingin logout?')) {
      this.presenter.onLogoutConfirmed();
    }
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