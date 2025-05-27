// src/models/login-model.js
import { login } from '../../data/api.js';

export default class LoginModel {
  async loginUser(email, password) {
    return await login(email, password);
  }

  saveSession({ token, userId, name }) {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    localStorage.setItem('userName', name);
  }

  clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
  }

  isUserLoggedIn() {
    return localStorage.getItem('token') !== null;
  }

  getCurrentUser() {
    return {
      userId: localStorage.getItem('userId'),
      name: localStorage.getItem('userName'),
      token: localStorage.getItem('token'),
    };
  }
}
