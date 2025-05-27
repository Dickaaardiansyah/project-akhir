// src/presenters/login-presenter.js
export default class LoginPresenter {
  constructor(view, model) {
    this.view = view;
    this.model = model;
  }

  async handleLogin(email, password) {
    try {
      this.view.showLoading();

      const response = await this.model.loginUser(email, password);
      if (!response.error) {
        this.model.saveSession(response.loginResult);
        this.view.onLoginSuccess('Login berhasil! Mengalihkan...');
      } else {
        this.view.showError(response.message || 'Login gagal.');
      }
    } catch (err) {
      this.view.showError(err.message || 'Terjadi kesalahan saat login.');
    } finally {
      this.view.hideLoading();
    }
  }

  checkSession() {
    return this.model.isUserLoggedIn();
  }

  logout() {
    this.model.clearSession();
    this.view.onLogout();
  }

  getCurrentUser() {
    return this.model.getCurrentUser();
  }
}
