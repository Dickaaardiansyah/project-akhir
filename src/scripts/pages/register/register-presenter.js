// presenters/register-presenter.js
import RegisterModel from './register-model.js'; // Fixed import path

export default class RegisterPresenter {
  constructor(view) {
    this.view = view;
    this.model = new RegisterModel();
  }

  validateInput(name, email, password) {
    if (name.length < 2) return 'Nama harus minimal 2 karakter';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Format email tidak valid';
    if (password.length < 8) return 'Password harus minimal 8 karakter';
    if (!this.isPasswordStrong(password)) {
      return 'Password harus mengandung minimal satu huruf besar, satu huruf kecil, dan satu angka';
    }
    return null;
  }

  isPasswordStrong(password) {
    return /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
  }

  async handleRegister(name, email, password) {
    const validationMessage = this.validateInput(name, email, password);
    if (validationMessage) {
      this.view.onRegisterFailed(validationMessage);
      return;
    }

    this.view.onRegisterLoading(true);

    try {
      const response = await this.model.registerUser(name, email, password);
      if (response.error) {
        this.view.onRegisterFailed(response.message || 'Registrasi gagal!');
      } else {
        this.view.onRegisterSuccess('Registrasi berhasil! Mengalihkan ke halaman login...');
      }
    } catch (err) {
      this.view.onRegisterFailed(err.message || 'Terjadi kesalahan saat registrasi');
    } finally {
      this.view.onRegisterLoading(false);
    }
  }
}