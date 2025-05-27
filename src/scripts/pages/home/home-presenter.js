import HomeModel from './home-model.js';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '../../data/api.js';

export default class HomePresenter {
  constructor(view) {
    this.view = view;
    this.model = new HomeModel();
  }

  async init() {
    try {
      if (!this.model.isUserAuthenticated()) {
        this.view.navigateToLogin();
        return;
      }
      await this.loadStories();
    } catch (error) {
      console.error('Init error:', error);
      this.view.showError('Gagal memuat halaman');
    }
  }

  async loadStories() {
    try {
      this.view.showLoading();
      await this.model.fetchStories();
      const stories = this.model.prepareStoryListData();
      const mapData = this.model.prepareMapData();
      console.log('Stories loaded:', stories.length);
      this.view.displayStories(stories);
      this.view.displayMap(mapData);
    } catch (error) {
      console.error('Load stories error:', error);
      let errorMessage = this.determineErrorMessage(error);
      if (error.message.includes('token') || error.message.includes('authentication')) {
        this.view.handleSessionExpiry();
      }
      this.view.showError(errorMessage);
    } finally {
      this.view.hideLoading();
    }
  }

  determineErrorMessage(error) {
    if (error.message.includes('token') || error.message.includes('authentication')) {
      return 'Sesi Anda telah berakhir. Silakan login kembali.';
    } else if (error.message.includes('Network') || error.message.includes('fetch')) {
      return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
    } else {
      return error.message || 'Terjadi kesalahan yang tidak diketahui';
    }
  }

  async subscribeToPush(subscription) {
    try {
      await subscribeToPushNotifications(subscription);
      console.log('Successfully subscribed to push notifications');
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      this.view.showError('Gagal berlangganan notifikasi');
      throw error;
    }
  }

  async unsubscribeFromPush(subscription) {
    try {
      await unsubscribeFromPushNotifications(subscription.endpoint);
      console.log('Successfully unsubscribed from push notifications');
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      this.view.showError('Gagal berhenti berlangganan notifikasi');
      throw error;
    }
  }

  async refreshStories() {
    await this.loadStories();
  }

  clearUserSession() {
    this.model.clearUserSession();
  }

  logout() {
    this.model.clearCache();
    this.model.clearUserSession();
    this.view.handleLogout();
  }

  filterStories(searchText) {
    const filteredStories = this.model.searchStories(searchText);
    const mapData = this.model.prepareMapData();
    console.log(`Filtered ${filteredStories.length} stories from ${this.model.getStoriesCount()} total`);
    this.view.displayStories(filteredStories);
    this.view.displayMap(mapData);
  }

  clearSearch() {
    const allStories = this.model.clearSearch();
    const mapData = this.model.prepareMapData();
    this.view.displayStories(allStories);
    this.view.displayMap(mapData);
  }

  navigateToStoryDetail(storyId) {
    if (!storyId) {
      console.error('Story ID is required');
      return;
    }
    const story = this.model.getStoryById(storyId);
    if (!story) {
      this.view.showError('Story tidak ditemukan');
      return;
    }
    this.view.navigateToStoryDetail(storyId);
  }

  navigateToAddStory() {
    this.view.navigateToAddStory();
  }

  getStoriesCount() {
    return this.model.getStoriesCount();
  }

  getStoriesWithLocation() {
    return this.model.getStoriesWithLocation();
  }

  getStatistics() {
    return this.model.getStatistics();
  }

  async silentRefresh() {
    try {
      await this.model.refreshData();
      const stories = this.model.prepareStoryListData();
      const mapData = this.model.prepareMapData();
      this.view.displayStories(stories);
      this.view.displayMap(mapData);
      return true;
    } catch (error) {
      console.error('Silent refresh error:', error);
      return false;
    }
  }

  sortStoriesByDate(ascending = false) {
    const sortedStories = this.model.sortStoriesByDate(ascending);
    const mapData = this.model.prepareMapData();
    this.view.displayStories(sortedStories);
    this.view.displayMap(mapData);
  }

  onStoryCardClick(storyId) {
    this.navigateToStoryDetail(storyId);
  }

  onLocationButtonClick(lat, lon) {
    if (isNaN(lat) || isNaN(lon)) {
      this.view.showError('Koordinat lokasi tidak valid');
      return;
    }
    this.view.centerMapOnLocation(lat, lon);
  }

  onAddStoryClick() {
    this.navigateToAddStory();
  }

  onRefreshClick() {
    this.refreshStories();
  }

  onLogoutClick() {
    this.view.showLogoutConfirmation();
  }

  onLogoutConfirmed() {
    this.logout();
  }

  onSearchInput(searchText) {
    this.filterStories(searchText);
  }

  onSearchClear() {
    this.clearSearch();
  }

  onRetryClick() {
    this.refreshStories();
  }

  onSortClick(ascending = false) {
    this.sortStoriesByDate(ascending);
  }

  getCurrentSearchQuery() {
    return this.model.getCurrentSearchQuery();
  }

  isLoading() {
    return this.model.getLoadingState();
  }

  hasError() {
    return this.model.hasError();
  }

  getError() {
    return this.model.getError();
  }

  getUserData() {
    return this.model.getUserData();
  }
}