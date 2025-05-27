import "../../../styles/add.css";
import AddPresenter from './add-presenter.js';
import AddModel from './add-model.js';

export default class AddPage {
  constructor() {
    this.model = new AddModel();
    this.presenter = new AddPresenter(this, this.model);
    this.currentLocation = null;
    this.videoStream = null;
    this.marker = null;
    this.map = null;
    this.handleBackNavigation = this.handleBackNavigation.bind(this);
    window.addEventListener('popstate', this.handleBackNavigation);
  }

  async render() {
    return `
      <main class="add-story-container">
        <header class="add-story-header">
          <div class="header-content">
            <button id="backBtn" class="btn btn-back">
              <span class="icon">←</span>
              Kembali
            </button>
            <h1 class="page-title">Tambah Story Baru</h1>
          </div>
        </header>

        <div id="loadingState" class="loading-state" style="display: none;">
          <div class="loading-spinner"></div>
          <p>Mengunggah story...</p>
        </div>

        <div id="errorState" class="error-state" style="display: none;">
          <p class="error-message"></p>
          <button id="retryBtn" class="btn btn-primary">Coba Lagi</button>
        </div>

        <div class="add-story-content">
          <form id="addStoryForm" class="story-form">
            <section class="form-section">
              <h2 class="section-title">Foto Story <span class="required">*</span></h2>
              <div class="photo-upload-container">
                <input type="file" id="photoInput" name="photo" accept="image/*" class="photo-input" style="display: none;">
                <div id="photoPreview" class="photo-preview">
                  <div class="photo-placeholder">
                    <span class="photo-icon">📷</span>
                    <p>Klik untuk memilih foto</p>
                    <small>Format: JPG, PNG, GIF | Maksimal: 1MB</small>
                  </div>
                </div>
                <div class="photo-info" id="photoInfo" style="display: none;">
                  <p class="file-name"></p>
                  <p class="file-size"></p>
                </div>
              </div>
              <div class="camera-controls">
                <div class="camera-container">
                  <button type="button" id="cameraBtn" class="btn btn-secondary">
                    <span class="camera-icon">📸</span>
                    <span>Ambil Foto dari Kamera</span>
                  </button>
                  <button type="button" id="captureCameraBtn" style="display: none;" class="btn btn-primary">
                    <span class="camera-icon">📸</span>
                    <span>Ambil Foto</span>
                  </button>
                </div>
                <video id="cameraPreview" autoplay playsinline style="width: 100%; max-height: 240px; display: none;"></video>
              </div>
            </section>

            <section class="form-section">
              <h2 class="section-title">Deskripsi Story <span class="required">*</span></h2>
              <div class="description-container">
                <textarea id="descriptionInput" name="description" placeholder="Ceritakan tentang foto ini..." required class="description-input" rows="6" maxlength="1000"></textarea>
                <div class="input-info">
                  <span id="charCounter" class="char-counter">0/1000 karakter</span>
                </div>
              </div>
            </section>

            <section class="form-section">
              <h2 class="section-title">Lokasi <span class="required">*</span></h2>
              <div class="location-container">
                <label class="location-toggle">
                  <input type="checkbox" id="locationCheckbox" name="useLocation">
                  <span class="toggle-slider"></span>
                  <span class="toggle-label">Gunakan lokasi saat ini (Wajib diisi)</span>
                </label>
                <div id="locationInfo" class="location-info" style="display: none;">
                  <div class="location-status">
                    <span class="location-icon">📍</span>
                    <span class="location-text">Mengambil lokasi...</span>
                  </div>
                  <div class="location-coordinates" style="display: none;">
                    <small class="coordinates-text"></small>
                  </div>
                </div>
                <div id="map" class="map-container" style="height: 300px; margin-top: 1em; border-radius: 8px; overflow: hidden;"></div>
              </div>
            </section>

            <section class="form-section">
              <div class="submit-container">
                <button type="submit" id="submitBtn" class="btn btn-primary btn-submit">
                  <span class="button-icon">✓</span>
                  <span class="button-text">Tambah Story</span>
                </button>
                <button type="button" id="cancelBtn" class="btn btn-secondary">
                  <span class="button-text">Batal</span>
                </button>
              </div>
            </section>
          </form>
        </div>
      </main>
    `;
  }

  async afterRender() {
    try {
      console.log('AddPage: Checking dependencies...');
      console.log('AddPage: SweetAlert2 status:', typeof Swal, Swal);
      if (!window.Swal) {
        console.warn('AddPage: SweetAlert2 is not loaded');
        alert('SweetAlert2 tidak tersedia. Menggunakan fallback UI.');
      }
      if (!window.L) {
        console.warn('AddPage: Leaflet library is not loaded');
        this.showError('Peta tidak dapat dimuat. Silakan periksa koneksi atau coba lagi.');
      }
      const initSuccess = await this.presenter.init();
      if (!initSuccess) return;
      this.setupEventListeners();
      this.animatePage();
      this.initMap();
    } catch (error) {
      console.error('AddPage: Error in afterRender:', error);
      this.showError('Gagal memuat halaman: ' + error.message);
    }
  }

  async generateImagePreview(file) {
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            success: true,
            dataUrl: e.target.result,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          });
        };
        reader.onerror = () => {
          reject(new Error('Gagal membaca file foto'));
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('AddPage: Error generating preview:', error);
      return {
        success: false,
        error: error.message || 'Gagal membuat preview foto'
      };
    }
  }

  async getCurrentLocation() {
    try {
      console.log('AddPage: Getting current location...');
      if (!navigator.geolocation) {
        throw new Error('Geolocation tidak didukung oleh browser Anda');
      }
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          if (permission.state === 'denied') {
            throw new Error('Akses lokasi ditolak. Aktifkan di pengaturan browser');
          }
        } catch (permError) {
          console.warn('AddPage: Could not check geolocation permission:', permError);
        }
      }
      return new Promise((resolve, reject) => {
        const options = {
          enableHighAccuracy: true,
          timeout: 15000, // 15 seconds
          maximumAge: 300000 // 5 minutes
        };
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lon: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            };
            console.log('AddPage: Location obtained:', location);
            resolve(location);
          },
          (error) => {
            let errorMessage = 'Gagal mendapatkan lokasi';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Akses lokasi ditolak oleh pengguna';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Informasi lokasi tidak tersedia';
                break;
              case error.TIMEOUT:
                errorMessage = 'Waktu habis saat mendapatkan lokasi';
                break;
              default:
                errorMessage = `Error mendapatkan lokasi: ${error.message}`;
                break;
            }
            console.error('AddPage: Geolocation error:', errorMessage);
            reject(new Error(errorMessage));
          },
          options
        );
      });
    } catch (error) {
      console.error('AddPage: Error getting location:', error);
      throw error;
    }
  }

  navigateBack() {
    this.destroy();
    window.location.hash = '#/home';
  }

  navigateToLogin() {
    this.destroy();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.hash = '#/login';
  }

  animatePage() {
    const page = document.querySelector('.add-story-container');
    if (page) {
      requestAnimationFrame(() => page.classList.add('show'));
    }
  }

  initMap() {
    if (!window.L) {
      console.warn('AddPage: Leaflet library not available');
      this.showError('Peta tidak dapat dimuat. Silakan periksa koneksi atau coba lagi.');
      return;
    }
    this.map = L.map('map').setView([-6.2, 106.8], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
    this.map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      this.currentLocation = { lat, lon: lng };
      this.updateMapMarker(lat, lng);
      const locationInfo = document.getElementById('locationInfo');
      if (locationInfo) {
        locationInfo.style.display = 'block';
        locationInfo.querySelector('.location-text').textContent = 'Koordinat dari peta';
        const coordinatesEl = locationInfo.querySelector('.location-coordinates');
        const coordinatesText = locationInfo.querySelector('.coordinates-text');
        if (coordinatesEl && coordinatesText) {
          coordinatesText.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          coordinatesEl.style.display = 'block';
        }
      }
      const locationCheckbox = document.getElementById('locationCheckbox');
      if (locationCheckbox && !locationCheckbox.checked) {
        locationCheckbox.checked = true;
      }
    });
  }

  updateMapMarker(lat, lng) {
    if (this.marker) {
      this.map.removeLayer(this.marker);
    }
    this.marker = L.marker([lat, lng]).addTo(this.map);
    this.map.panTo([lat, lng]);
  }

  stopCamera() {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
      const captureCameraBtn = document.getElementById('captureCameraBtn');
      if (captureCameraBtn) {
        captureCameraBtn.style.display = 'none';
      }
      const cameraBtn = document.getElementById('cameraBtn');
      if (cameraBtn) {
        cameraBtn.innerHTML = '<span class="camera-icon">📸</span><span>Ambil Foto dari Kamera</span>';
      }
      const video = document.getElementById('cameraPreview');
      if (video) {
        video.style.display = 'none';
      }
    }
  }

  setupEventListeners() {
    try {
      console.log('AddPage: Setting up event listeners...');
      const backBtn = document.getElementById('backBtn');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          this.navigateBack();
        });
      }
      const cancelBtn = document.getElementById('cancelBtn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          if (this.hasUnsavedChanges()) {
            if (confirm('Apakah Anda yakin ingin membatalkan? Perubahan akan hilang.')) {
              this.navigateBack();
            }
          } else {
            this.navigateBack();
          }
        });
      }
      const photoInput = document.getElementById('photoInput');
      const photoPreview = document.getElementById('photoPreview');
      if (photoInput && photoPreview) {
        photoInput.addEventListener('change', (e) => {
          console.log('AddPage: Photo input changed');
          this.handlePhotoChange(e);
        });
        photoPreview.addEventListener('click', () => {
          photoInput.click();
        });
      }
      const descriptionInput = document.getElementById('descriptionInput');
      if (descriptionInput) {
        descriptionInput.addEventListener('input', (e) => {
          this.updateCharCounter(e.target.value);
        });
      }
      const locationCheckbox = document.getElementById('locationCheckbox');
      if (locationCheckbox) {
        locationCheckbox.addEventListener('change', (e) => {
          console.log('AddPage: Location checkbox changed:', e.target.checked);
          this.handleLocationToggle(e.target.checked);
        });
      }
      const form = document.getElementById('addStoryForm');
      if (form) {
        form.addEventListener('submit', (e) => {
          console.log('AddPage: Form submit triggered');
          this.handleFormSubmit(e);
        });
      } else {
        console.error('AddPage: Form element not found');
        this.showError('Formulir tidak ditemukan');
      }
      const retryBtn = document.getElementById('retryBtn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.hideError();
        });
      }
      const cameraBtn = document.getElementById('cameraBtn');
      const video = document.getElementById('cameraPreview');
      const captureCameraBtn = document.getElementById('captureCameraBtn');
      if (cameraBtn && video && captureCameraBtn) {
        cameraBtn.addEventListener('click', async () => {
          if (this.videoStream) {
            this.stopCamera();
          } else {
            try {
              this.videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
              video.srcObject = this.videoStream;
              video.style.display = 'block';
              captureCameraBtn.style.display = 'block';
              cameraBtn.innerHTML = '<span class="camera-icon">❌</span><span>Tutup Kamera</span>';
            } catch (error) {
              this.showError('Tidak dapat mengakses kamera: ' + error.message);
            }
          }
        });
        captureCameraBtn.addEventListener('click', () => {
          if (!this.videoStream) return;
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0);
          canvas.toBlob((blob) => {
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            const photoInput = document.getElementById('photoInput');
            photoInput.files = dataTransfer.files;
            this.handlePhotoChange({ target: { files: [file] } });
            this.stopCamera();
          }, 'image/jpeg');
        });
      }
      console.log('AddPage: Event listeners setup completed');
    } catch (error) {
      console.error('AddPage: Error setting up event listeners:', error);
      this.showError('Gagal mengatur event listeners: ' + error.message);
    }
  }

  validateRequiredFields() {
    const errors = [];
    
    const photoInput = document.getElementById('photoInput');
    if (!photoInput || !photoInput.files || photoInput.files.length === 0) {
      errors.push('Foto story wajib diisi');
    }
    
    const descriptionInput = document.getElementById('descriptionInput');
    if (!descriptionInput || !descriptionInput.value.trim()) {
      errors.push('Deskripsi story wajib diisi');
    }
    
    const locationCheckbox = document.getElementById('locationCheckbox');
    if (!locationCheckbox || !locationCheckbox.checked || !this.currentLocation) {
      errors.push('Lokasi wajib diisi');
    }
    
    return errors;
  }

  async handlePhotoChange(event) {
    try {
      const file = event.target.files[0];
      if (!file) {
        this.resetPhotoPreview();
        return;
      }
      console.log('AddPage: Photo selected:', file.name, file.size, file.type);
      const result = await this.presenter.handlePhotoSelection(file);
      if (result.success) {
        const previewResult = await this.generateImagePreview(file);
        if (previewResult.success) {
          this.displayPhotoPreview(previewResult.dataUrl, file);
        } else {
          this.showPhotoError(previewResult.error);
          event.target.value = '';
        }
      } else {
        this.showPhotoError(result.error);
        event.target.value = '';
      }
    } catch (error) {
      console.error('AddPage: Error handling photo change:', error);
      this.showPhotoError('Gagal memproses foto');
      event.target.value = '';
    }
  }

  displayPhotoPreview(dataUrl, file) {
    try {
      const photoPreview = document.getElementById('photoPreview');
      const photoInfo = document.getElementById('photoInfo');
      if (photoPreview) {
        photoPreview.innerHTML = `
          <div class="photo-preview-wrapper">
            <img src="${dataUrl}" alt="Preview" class="preview-image" />
            <div class="photo-overlay">
              <button type="button" class="btn btn-small change-photo-btn">
                <span class="icon">🔄</span>
                Ubah Foto
              </button>
            </div>
          </div>
        `;
        const changePhotoBtn = photoPreview.querySelector('.change-photo-btn');
        if (changePhotoBtn) {
          changePhotoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('photoInput').click();
          });
        }
      }
      if (photoInfo) {
        photoInfo.style.display = 'block';
        photoInfo.querySelector('.file-name').textContent = file.name;
        photoInfo.querySelector('.file-size').textContent = this.presenter.formatFileSize(file.size);
      }
      console.log('AddPage: Photo preview displayed');
    } catch (error) {
      console.error('AddPage: Error displaying photo preview:', error);
      this.showPhotoError('Gagal menampilkan preview foto');
    }
  }

  resetPhotoPreview() {
    const photoPreview = document.getElementById('photoPreview');
    const photoInfo = document.getElementById('photoInfo');
    if (photoPreview) {
      photoPreview.innerHTML = `
        <div class="photo-placeholder">
          <span class="photo-icon">📷</span>
          <p>Klik untuk memilih foto</p>
          <small>Format: JPG, PNG, GIF | Maksimal: 1MB</small>
        </div>
      `;
    }
    if (photoInfo) {
      photoInfo.style.display = 'none';
    }
  }

  showPhotoError(message) {
    this.showError(message);
  }

  updateCharCounter(text) {
    const charCounter = document.getElementById('charCounter');
    if (charCounter) {
      const length = text.length;
      const maxLength = 1000;
      charCounter.textContent = `${length}/${maxLength} karakter`;
      if (length > maxLength * 0.9) {
        charCounter.classList.add('warning');
      } else {
        charCounter.classList.remove('warning');
      }
    }
  }

  async handleLocationToggle(useLocation) {
    const locationInfo = document.getElementById('locationInfo');
    if (useLocation) {
      if (locationInfo) {
        locationInfo.style.display = 'block';
        locationInfo.querySelector('.location-text').textContent = 'Mengambil lokasi...';
      }
      try {
        const location = await this.getCurrentLocation();
        this.currentLocation = location;
        if (this.map && location) {
          this.updateMapMarker(location.lat, location.lon);
        }
        if (locationInfo) {
          locationInfo.querySelector('.location-text').textContent = 'Lokasi berhasil ditemukan';
          const coordinatesEl = document.querySelector('.location-coordinates');
          const coordinatesText = document.querySelector('.coordinates-text');
          if (coordinatesEl && coordinatesText) {
            coordinatesText.textContent = `${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`;
            coordinatesEl.style.display = 'block';
          }
        }
        console.log('AddPage: Location obtained:', location);
      } catch (error) {
        console.error('AddPage: Error getting location:', error);
        if (locationInfo) {
          locationInfo.querySelector('.location-text').textContent = `Gagal mendapatkan lokasi: ${error.message}`;
        }
        const locationCheckbox = document.getElementById('locationCheckbox');
        if (locationCheckbox) {
          locationCheckbox.checked = false;
        }
        this.currentLocation = null;
        this.showError(error.message);
      }
    } else {
      if (locationInfo) {
        locationInfo.style.display = 'none';
      }
      if (this.marker && this.map) {
        this.map.removeLayer(this.marker);
        this.marker = null;
      }
      this.currentLocation = null;
    }
  }

  async handleFormSubmit(event) {
    event.preventDefault();
    
    try {
      console.log('AddPage: Validating form...');
      const validationErrors = this.validateRequiredFields();
      if (validationErrors.length > 0) {
        console.log('AddPage: Validation errors:', validationErrors);
        this.showError(validationErrors.join(', '));
        return;
      }
  
      const formData = new FormData();
      const photo = document.getElementById('photoInput').files[0];
      const description = document.getElementById('descriptionInput').value.trim();
  
      if (!photo || !description || !this.currentLocation) {
        console.log('AddPage: Missing required fields');
        this.showError('Semua field wajib diisi');
        return;
      }
  
      formData.append('photo', photo);
      formData.append('description', description);
      formData.append('lat', this.currentLocation.lat.toString());
      formData.append('lon', this.currentLocation.lon.toString());
  
      console.log('AddPage: Showing loading state');
      try {
        // await Swal.fire({
        //   title: 'Mengunggah Story...',
        //   text: 'Mohon tunggu sebentar.',
        //   allowOutsideClick: true,
        //   didOpen: () => {
        //     Swal.showLoading();
        //   }
        // });
      } catch (error) {
        console.warn('AddPage: SweetAlert2 loading error:', error);
        this.showLoading();
      }
  
      console.log('AddPage: Submitting form data');
      const result = await this.presenter.submitStory(formData);
      
      try {
        Swal.close();
      } catch (error) {
        console.warn('AddPage: SweetAlert2 close error:', error);
        this.hideLoading();
      }
  
      if (result.success) {
        console.log('AddPage: Submission successful');
        this.showSuccess(result.message);
        this.resetForm();
        setTimeout(() => {
          this.navigateBack();
        }, 2000);
      } else {
        console.log('AddPage: Submission failed:', result.error);
        this.showError(result.error);
      }
  
    } catch (error) {
      console.error('AddPage: Error in handleFormSubmit:', error);
      try {
        Swal.close();
      } catch (swalError) {
        console.warn('AddPage: SweetAlert2 close error:', swalError);
        this.hideLoading();
      }
      this.showError(error.message || 'Gagal menambahkan story');
    }
  }

  resetForm() {
    const form = document.getElementById('addStoryForm');
    if (form) {
      form.reset();
    }
    this.resetPhotoPreview();
    this.updateCharCounter('');
    const locationCheckbox = document.getElementById('locationCheckbox');
    const locationInfo = document.getElementById('locationInfo');
    if (locationCheckbox) {
      locationCheckbox.checked = false;
    }
    if (locationInfo) {
      locationInfo.style.display = 'none';
    }
    if (this.marker && this.map) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }
    this.currentLocation = null;
    console.log('AddPage: Form reset completed');
  }

  hasUnsavedChanges() {
    const photoInput = document.getElementById('photoInput');
    const descriptionInput = document.getElementById('descriptionInput');
    const locationCheckbox = document.getElementById('locationCheckbox');
    return (
      (photoInput && photoInput.files.length > 0) ||
      (descriptionInput && descriptionInput.value.trim().length > 0) ||
      (locationCheckbox && locationCheckbox.checked && this.currentLocation)
    );
  }

  showLoading() {
    const loadingElement = document.getElementById('loadingState');
    const errorElement = document.getElementById('errorState');
    const content = document.querySelector('.add-story-content');
    if (loadingElement) {
      loadingElement.style.display = 'flex';
    }
    if (errorElement) {
      errorElement.style.display = 'none';
    }
    if (content) {
      content.style.opacity = '0.5';
      content.style.pointerEvents = 'none';
    }
    console.log('AddPage: Loading state shown');
  }

  hideLoading() {
    const loadingElement = document.getElementById('loadingState');
    const content = document.querySelector('.add-story-content');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
    if (content) {
      content.style.opacity = '1';
      content.style.pointerEvents = 'auto';
    }
    console.log('AddPage: Loading state hidden');
  }

  showError(message) {
    const escapedMessage = this.escapeHtml(message);
    console.log('AddPage: Attempting to show error:', escapedMessage);
    try {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: escapedMessage,
        confirmButtonText: 'Mengerti',
        confirmButtonColor: '#d33'
      });
    } catch (error) {
      console.error('AddPage: SweetAlert2 error:', error);
      const errorElement = document.getElementById('errorState');
      const errorMessageElement = document.querySelector('.error-message');
      const loadingElement = document.getElementById('loadingState');
      const content = document.querySelector('.add-story-content');
      
      if (errorElement && errorMessageElement) {
        console.log('AddPage: Showing error state with message:', escapedMessage);
        errorMessageElement.textContent = escapedMessage;
        errorElement.style.display = 'block';
      } else {
        console.error('AddPage: Error state elements not found');
        alert('Error: ' + escapedMessage); // Fallback to native alert
      }
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }
      if (content) {
        content.style.opacity = '1';
        content.style.pointerEvents = 'auto';
      }
    }
  }

  hideError() {
    const errorElement = document.getElementById('errorState');
    if (errorElement) {
      errorElement.style.display = 'none';
    }
    const content = document.querySelector('.add-story-content');
    if (content) {
      content.style.opacity = '1';
      content.style.pointerEvents = 'auto';
    }
    console.log('AddPage: Error hidden');
  }

  showSuccess(message) {
    const escapedMessage = this.escapeHtml(message);
    console.log('AddPage: Attempting to show success:', escapedMessage);
    try {
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: escapedMessage,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('AddPage: SweetAlert2 error:', error);
      alert('Berhasil: ' + escapedMessage); // Fallback to native alert
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  handleBackNavigation() {
    console.log('AddPage: Handling back navigation');
    this.stopCamera();
  }

  destroy() {
    console.log('AddPage: Destroying page resources');
    this.stopCamera();
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.removeEventListener('click', this.handleBackNavigation);
    }
    window.removeEventListener('popstate', this.handleBackNavigation);
  }
}