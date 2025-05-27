// views/register-view.js
import "../../../styles/register.css";
import RegisterPresenter from './register-presenter.js';

export default class RegisterView {
  constructor() {
    // Create the presenter and pass this view to it
    this.presenter = new RegisterPresenter(this);
  }

  async render() {
    return `
      <section class="register-container">
        <div class="register-card">
          <h1 class="register-title">Register</h1>
          <form id="registerForm">
            <div class="form-group">
              <label for="name">Name</label>
              <input type="text" id="name" name="name" required />
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" required />
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" required />
              <small class="password-hint">Password harus minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka</small>
            </div>
            <button type="submit" class="register-button">
              <span id="registerButtonText">Register</span>
              <span id="registerLoader" class="loader" style="display: none;"></span>
            </button>
          </form>
          <div class="register-links">
            <a href="#/login">Already have an account? Login</a>
          </div>
          <div id="registerMessage" class="register-message"></div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    if (localStorage.getItem('token')) {
      window.location.hash = '#/home';
      return;
    }

    const form = document.querySelector('#registerForm');
    const passwordInput = document.querySelector('#password');

    passwordInput.addEventListener('input', () => {
      this.validatePasswordRealTime(passwordInput.value);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value.trim();
      this.presenter.handleRegister(name, email, password);
    });
  }

  onRegisterLoading(isLoading) {
    const button = document.querySelector('.register-button');
    const buttonText = document.querySelector('#registerButtonText');
    const loader = document.querySelector('#registerLoader');

    button.disabled = isLoading;
    buttonText.style.display = isLoading ? 'none' : 'inline-block';
    loader.style.display = isLoading ? 'inline-block' : 'none';
    this.clearMessage();
  }

  onRegisterFailed(message) {
    const msg = document.querySelector('#registerMessage');
    msg.textContent = message;
    msg.className = 'register-message error';
    msg.style.display = 'block';
  }

  onRegisterSuccess(message) {
    const msg = document.querySelector('#registerMessage');
    msg.textContent = message;
    msg.className = 'register-message success';
    msg.style.display = 'block';

    setTimeout(() => {
      window.location.hash = '#/login';
    }, 2000);
  }

  clearMessage() {
    const msg = document.querySelector('#registerMessage');
    msg.textContent = '';
    msg.style.display = 'none';
  }

  validatePasswordRealTime(password) {
    const hint = document.querySelector('.password-hint');
    if (!password) {
      hint.className = 'password-hint';
      hint.textContent = 'Password harus minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka';
      return;
    }

    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (hasMinLength && hasUpperCase && hasLowerCase && hasNumber) {
      hint.className = 'password-hint valid';
      hint.textContent = '✓ Password kuat';
    } else {
      hint.className = 'password-hint invalid';
      const missing = [];
      if (!hasMinLength) missing.push('minimal 8 karakter');
      if (!hasUpperCase) missing.push('huruf besar');
      if (!hasLowerCase) missing.push('huruf kecil');
      if (!hasNumber) missing.push('angka');
      hint.textContent = `Diperlukan: ${missing.join(', ')}`;
    }
  }
}