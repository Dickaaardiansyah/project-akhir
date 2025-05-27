import { addStory } from '../../data/api.js';

export default class AddModel {
  // New method to get token
  getToken() {
    try {
      const token = localStorage.getItem('token');
      console.log('AddModel: Retrieved token:', token ? 'Token present' : 'No token');
      return token;
    } catch (error) {
      console.error('AddModel: Error retrieving token:', error);
      return null;
    }
  }

  async submitStory(formData) {
    try {
      console.log('AddModel: Submitting story to API...');
      console.log('AddModel: FormData contents:', Array.from(formData.entries()));
      const result = await addStory(formData);
      console.log('AddModel: API response:', result);
      if (result.error === false) {
        console.log('AddModel: Story submitted successfully:', result);
        return {
          success: true,
          message: result.message || 'Story berhasil ditambahkan!'
        };
      } else {
        console.error('AddModel: API returned error:', result);
        return {
          success: false,
          error: result.message || 'Gagal menambahkan story'
        };
      }
    } catch (error) {
      console.error('AddModel: Submit story error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      let errorMessage = 'Terjadi kesalahan saat menambahkan story';
      if (error.message.includes('Network') || error.message.includes('fetch')) {
        errorMessage = 'Periksa koneksi internet Anda';
      } else if (error.message.includes('token') || error.message.includes('auth')) {
        errorMessage = 'Sesi Anda telah berakhir, silakan login kembali';
      } else if (error.message.includes('size') || error.message.includes('large')) {
        errorMessage = 'File terlalu besar untuk diupload';
      } else if (error.message) {
        errorMessage = error.message;
      }
      return { success: false, error: errorMessage };
    }
  }

  async testApi() {
    try {
      const testFormData = new FormData();
      testFormData.append('description', 'Test story');
      testFormData.append('lat', '0');
      testFormData.append('lon', '0');
      console.log('AddModel: Testing API with minimal data...');
      const result = await addStory(testFormData);
      console.log('AddModel: Test API response:', result);
      return result;
    } catch (error) {
      console.error('AddModel: Test API error:', error);
      return { success: false, error: error.message };
    }
  }
}