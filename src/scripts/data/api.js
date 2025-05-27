import CONFIG from '../config.js';

const ENDPOINTS = {
  LOGIN: `${CONFIG.BASE_URL}/login`,
  REGISTER: `${CONFIG.BASE_URL}/register`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
  STORIES_DETAIL: (id) => `${CONFIG.BASE_URL}/stories/${id}`,
  ADD_STORY: `${CONFIG.BASE_URL}/stories`,
  SUBSCRIBE_NOTIFICATION: `${CONFIG.BASE_URL}/notifications/subscribe`,
};

// Helper function untuk membuat request dengan header
const createRequest = (method, data = null, token = null) => {
  const config = {
    method,
    headers: {},
  };

  // Hanya tambahkan Content-Type untuk request dengan body JSON
  if (data && !(data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (data) {
    if (data instanceof FormData) {
      config.body = data; // FormData untuk file upload
    } else {
      config.body = JSON.stringify(data); // JSON untuk data biasa
    }
  }

  return config;
};

// Helper function untuk handle response
const handleResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  
  return data;
};

// Login API
export async function login(email, password) {
  const requestConfig = createRequest('POST', { email, password });
  
  try {
    const response = await fetch(ENDPOINTS.LOGIN, requestConfig);
    return await handleResponse(response);
  } catch (error) {
    throw new Error(error.message || 'Login failed');
  }
}

// Register API
export async function register(name, email, password) {
  const requestConfig = createRequest('POST', { name, email, password });
  
  try {
    const response = await fetch(ENDPOINTS.REGISTER, requestConfig);
    return await handleResponse(response);
  } catch (error) {
    throw new Error(error.message || 'Registration failed');
  }
}

// Get Stories API - DIPERBAIKI
export async function getStories(options = {}) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  // Destructure options dengan default values
  const {
    page = 1,
    size = 10,
    location = 1 // Default 1 untuk mendapatkan stories dengan lokasi
  } = options;

  // Build query parameters
  const queryParams = new URLSearchParams();
  
  if (page) queryParams.append('page', page.toString());
  if (size) queryParams.append('size', size.toString());
  if (location !== undefined) queryParams.append('location', location.toString());

  const url = `${ENDPOINTS.STORIES}?${queryParams.toString()}`;
  
  const requestConfig = createRequest('GET', null, token);
  
  try {
    const response = await fetch(url, requestConfig);
    const data = await handleResponse(response);
    
    // Pastikan response memiliki struktur yang benar
    if (data.error === false && Array.isArray(data.listStory)) {
      return {
        error: false,
        message: data.message,
        listStory: data.listStory
      };
    } else {
      throw new Error(data.message || 'Invalid response format');
    }
  } catch (error) {
    console.error('Get stories error:', error);
    throw new Error(error.message || 'Failed to get stories');
  }
}

// Alternative function untuk backward compatibility
export async function getStoriesWithLocation() {
  return getStories({ location: 0 }); //opsional, jika satu maka hanya mengambil data yang mempunyai nilai peta
}

export async function getStoriesWithoutLocation() {
  return getStories({ location: 0 });
}

// Get Story Detail API
export async function getStoryDetail(id) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const requestConfig = createRequest('GET', null, token);
  
  try {
    const response = await fetch(ENDPOINTS.STORIES_DETAIL(id), requestConfig);
    return await handleResponse(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to get story detail');
  }
}

// Add Story API
export async function addStory(formData) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  try {
    const response = await fetch(ENDPOINTS.ADD_STORY, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Jangan set Content-Type untuk FormData, biarkan browser yang set dengan boundary
      },
      body: formData, // FormData untuk multipart/form-data
    });
    
    return await handleResponse(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to add story');
  }
}

// Get current user info from API (optional)
export async function getCurrentUser() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const requestConfig = createRequest('GET', null, token);
  
  try {
    // Asumsi ada endpoint untuk get user profile
    const response = await fetch(`${CONFIG.BASE_URL}/user`, requestConfig);
    return await handleResponse(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to get user info');
  }
}

// Check if token is valid
export async function validateToken() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return false;
  }
  
  const requestConfig = createRequest('GET', null, token);
  
  try {
    // Test endpoint untuk validasi token (menggunakan endpoint stories)
    const response = await fetch(ENDPOINTS.STORIES, requestConfig);
    return response.ok;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

export async function subscribeToPushNotifications(subscription) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  // Sanitize the subscription object to remove expirationTime
  const sanitizedSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.getKey('p256dh') ? btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))) : null,
      auth: subscription.getKey('auth') ? btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')))) : null,
    },
  };

  const requestConfig = createRequest('POST', sanitizedSubscription, token);
  try {
    const response = await fetch(ENDPOINTS.SUBSCRIBE_NOTIFICATION, requestConfig);
    return await handleResponse(response);
  } catch (error) {
    console.error('Subscribe to push notification error:', error);
    throw new Error(error.message || 'Failed to subscribe to push notifications');
  }
}

export async function unsubscribeFromPushNotifications(endpoint) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  const requestConfig = createRequest('DELETE', { endpoint }, token);
  try {
    const response = await fetch(ENDPOINTS.SUBSCRIBE_NOTIFICATION, requestConfig);
    return await handleResponse(response);
  } catch (error) {
    console.error('Unsubscribe from push notification error:', error);
    throw new Error(error.message || 'Failed to unsubscribe from push notifications');
  }
}