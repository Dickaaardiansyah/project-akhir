// models/register-model.js
import { register } from '../../data/api.js';

export default class RegisterModel {
  async registerUser(name, email, password) {
    return await register(name, email, password);
  }
}
