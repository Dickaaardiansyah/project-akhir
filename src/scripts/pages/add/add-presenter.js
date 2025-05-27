export default class AddPresenter {
  constructor(view, model) {
    this.view = view;
    this.model = model;
    this.isSubmitting = false;
  }

  async init() {
    try {
      const token = this.model.getToken();
      console.log('AddPresenter: Initializing with token:', token ? 'Token present' : 'No token');
      if (!token) {
        console.warn('AddPresenter: No authentication token found');
        this.view.navigateToLogin();
        return false;
      }
      console.log('AddPresenter: Initialization complete');
      return true;
    } catch (error) {
      console.error('AddPresenter: Error during initialization:', error);
      throw error;
    }
  }

  async handlePhotoSelection(file) {
    try {
      console.log('AddPresenter: Handling photo selection:', file ? file.name : 'No file');
      const validationErrors = this.validatePhoto(file);
      if (validationErrors.length > 0) {
        console.warn('AddPresenter: Photo validation failed:', validationErrors);
        return {
          success: false,
          error: validationErrors.join(', ')
        };
      }
      return { success: true };
    } catch (error) {
      console.error('AddPresenter: Error handling photo selection:', error);
      return {
        success: false,
        error: 'Terjadi kesalahan saat memproses foto'
      };
    }
  }

  async submitStory(formData) {
    if (this.isSubmitting) {
      console.warn('AddPresenter: Submit already in progress');
      return { success: false, error: 'Proses upload sedang berlangsung...' };
    }
    try {
      this.isSubmitting = true;
      console.log('AddPresenter: Submitting story...');
      const validationErrors = await this.validateFormData(formData);
      if (validationErrors.length > 0) {
        console.warn('AddPresenter: Form validation failed:', validationErrors);
        return {
          success: false,
          error: validationErrors.join(', ')
        };
      }
      console.log('AddPresenter: Form data validated successfully');
      this.logFormData(formData);
      const result = await this.model.submitStory(formData);
      if (!result.success && result.error.includes('Sesi Anda telah berakhir')) {
        console.warn('AddPresenter: Session expired, redirecting to login');
        this.view.navigateToLogin();
      }
      return result;
    } catch (error) {
      console.error('AddPresenter: Submit story error:', error);
      return {
        success: false,
        error: 'Terjadi kesalahan saat menambahkan story'
      };
    } finally {
      this.isSubmitting = false;
      console.log('AddPresenter: Submit process completed');
    }
  }

  validatePhoto(file) {
    const errors = [];
    if (!file) {
      errors.push('File foto tidak ditemukan');
      return errors;
    }
    const maxSize = 1048576; // 1MB
    if (file.size > maxSize) {
      errors.push(`Ukuran file terlalu besar. Maksimal ${this.formatFileSize(maxSize)}`);
    }
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      errors.push('Format file tidak didukung. Gunakan JPG, PNG, atau GIF');
    }
    if (file.name.length > 255) {
      errors.push('Nama file terlalu panjang');
    }
    return errors;
  }

  async validateFormData(formData) {
    const errors = [];
    try {
      const photo = formData.get('photo');
      if (!photo || !(photo instanceof File)) {
        errors.push('Foto story wajib dipilih');
      } else {
        const photoErrors = this.validatePhoto(photo);
        errors.push(...photoErrors);
      }
      const description = formData.get('description');
      if (!description || description.trim().length === 0) {
        errors.push('Deskripsi story wajib diisi');
      } else {
        const trimmedDesc = description.trim();
        if (trimmedDesc.length < 1) {
          errors.push('Deskripsi minimal 1 karakter');
        } else if (trimmedDesc.length > 1000) {
          errors.push('Deskripsi maksimal 1000 karakter');
        }
      }
      const lat = formData.get('lat');
      const lon = formData.get('lon');
      if (!lat || !lon) {
        errors.push('Koordinat lokasi wajib diisi');
      } else {
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        if (isNaN(latNum) || latNum < -90 || latNum > 90) {
          errors.push('Latitude tidak valid (harus antara -90 dan 90)');
        }
        if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
          errors.push('Longitude tidak valid (harus antara -180 dan 180)');
        }
      }
    } catch (error) {
      console.error('AddPresenter: Error validating form data:', error);
      errors.push('Terjadi kesalahan saat validasi data');
    }
    return errors;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  logFormData(formData) {
    try {
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }
    } catch (error) {
      console.warn('AddPresenter: Could not log form data:', error);
    }
  }
}