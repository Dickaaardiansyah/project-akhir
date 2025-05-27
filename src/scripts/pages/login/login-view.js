// src/views/login-view.js
import '../../../styles/login.css';
import LoginPresenter from './login-presenter.js';
import LoginModel from './login-model.js';

export default class LoginView {
  constructor() {
    const model = new LoginModel();
    this.presenter = new LoginPresenter(this, model);
  }

  async render() {
    return `
      <section class="login-container">
        <div class="login-card">
          <h1 class="login-title">Login</h1>
          <form id="loginForm">
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" placeholder="Enter your email" required>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" placeholder="Enter your password" required>
            </div>
            <div class="form-check">
            </div>
            <button type="submit" class="login-button">
              <span id="loginButtonText">Login</span>
              <span id="loginLoader" class="loader" style="display: none;"></span>
            </button>
          </form>
          <div class="login-links">
            <a href="#" id="forgotPassword">Forgot Password?</a>
            <a href="#/register" id="register">Register</a>
          </div>
          <div id="loginMessage" class="login-message"></div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    if (this.presenter.checkSession()) {
      window.location.hash = '#/home';
      return;
    }

    const form = document.querySelector('#loginForm');
    const emailInput = document.querySelector('#email');
    const passwordInput = document.querySelector('#password');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();
      if (!email || !password) {
        this.showError('Email dan password wajib diisi.');
        return;
      }

      await this.presenter.handleLogin(email, password);
    });

    document.querySelector('#forgotPassword').addEventListener('click', (e) => {
      e.preventDefault();
      this.showError('Fitur lupa password belum tersedia.');
    });
  }

  showLoading() {
    document.querySelector('.login-button').disabled = true;
    document.querySelector('#loginButtonText').style.display = 'none';
    document.querySelector('#loginLoader').style.display = 'inline-block';
    this.clearMessage();
  }

  hideLoading() {
    document.querySelector('.login-button').disabled = false;
    document.querySelector('#loginButtonText').style.display = 'inline-block';
    document.querySelector('#loginLoader').style.display = 'none';
  }

  showError(message) {
    const msg = document.querySelector('#loginMessage');
    msg.textContent = message;
    msg.className = 'login-message error';
    msg.style.display = 'block';
  }

  showSuccess(message) {
    const msg = document.querySelector('#loginMessage');
    msg.textContent = message;
    msg.className = 'login-message success';
    msg.style.display = 'block';
  }

  clearMessage() {
    const msg = document.querySelector('#loginMessage');
    msg.textContent = '';
    msg.style.display = 'none';
  }

  onLoginSuccess(message) {
    this.showSuccess(message);
    setTimeout(() => {
      window.location.hash = '#/home';
    }, 1500);
  }

  onLogout() {
    window.location.hash = '#/login';
  }
}
