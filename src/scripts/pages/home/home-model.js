import { getStories, getStoriesWithLocation } from '../../data/api.js';

export default class HomeModel {
  constructor() {
    this.stories = [];
    this.filteredStories = [];
    this.isLoading = false;
    this.error = null;
    this.searchQuery = '';
  }

  // Data Management Methods
  async fetchStories() {
    try {
      this.setLoading(true);
      this.clearError();

      const storiesData = await getStoriesWithLocation();


      if (storiesData && storiesData.error === false) {
        this.stories = storiesData.listStory || [];
        this.filteredStories = [...this.stories];
        return this.stories;
      } else {
        const errorMessage = storiesData?.message || 'Gagal memuat stories';
        throw new Error(errorMessage);
      }
    } catch (error) {
      this.setError(error);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  // Story Data Access
  getAllStories() {
    return [...this.stories];
  }

  getFilteredStories() {
    return [...this.filteredStories];
  }

  getStoriesWithLocation() {
    return this.stories.filter(story => 
      story.lat && story.lon && 
      !isNaN(story.lat) && !isNaN(story.lon)
    );
  }

  getStoryById(storyId) {
    if (!storyId) return null;
    return this.stories.find(story => story.id === storyId) || null;
  }

  getStoriesCount() {
    return this.stories.length;
  }

  getFilteredStoriesCount() {
    return this.filteredStories.length;
  }

  // Search and Filter Methods
  searchStories(searchText) {
    this.searchQuery = searchText || '';
    
    if (!this.searchQuery.trim()) {
      this.filteredStories = [...this.stories];
      return this.filteredStories;
    }

    const searchTerm = this.searchQuery.toLowerCase().trim();
    this.filteredStories = this.stories.filter(story => {
      const name = story.name ? story.name.toLowerCase() : '';
      const description = story.description ? story.description.toLowerCase() : '';

      return name.includes(searchTerm) || description.includes(searchTerm);
    });

    return this.filteredStories;
  }

  clearSearch() {
    this.searchQuery = '';
    this.filteredStories = [...this.stories];
    return this.filteredStories;
  }

  getCurrentSearchQuery() {
    return this.searchQuery;
  }

  // Data Validation Methods
  isValidStory(story) {
    return (
      story &&
      story.id &&
      story.name &&
      story.photoUrl &&
      typeof story.name === 'string' &&
      typeof story.photoUrl === 'string'
    );
  }

  validateStoryLocation(story) {
    return (
      story &&
      story.lat &&
      story.lon &&
      !isNaN(story.lat) &&
      !isNaN(story.lon) &&
      story.lat >= -90 &&
      story.lat <= 90 &&
      story.lon >= -180 &&
      story.lon <= 180
    );
  }

  // Authentication State Management
  getUserData() {
    return {
      userId: localStorage.getItem('userId'),
      name: localStorage.getItem('userName'),
      token: localStorage.getItem('token')
    };
  }

  isUserAuthenticated() {
    const userData = this.getUserData();
    
    if (!userData.token || !userData.userId) {
      return false;
    }

    try {
      return userData.token.trim().length > 0;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  clearUserSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
  }

  // State Management Methods
  setLoading(loading) {
    this.isLoading = loading;
  }

  getLoadingState() {
    return this.isLoading;
  }

  setError(error) {
    this.error = error;
  }

  getError() {
    return this.error;
  }

  clearError() {
    this.error = null;
  }

  hasError() {
    return this.error !== null;
  }

  // Data Processing Methods
  processStoryData(rawStory) {
    if (!this.isValidStory(rawStory)) {
      console.warn('Invalid story data:', rawStory);
      return null;
    }

    return {
      id: rawStory.id,
      name: rawStory.name.trim(),
      description: rawStory.description ? rawStory.description.trim() : '',
      photoUrl: rawStory.photoUrl,
      createdAt: rawStory.createdAt,
      lat: rawStory.lat ? parseFloat(rawStory.lat) : null,
      lon: rawStory.lon ? parseFloat(rawStory.lon) : null
    };
  }

  // Utility Methods
  sortStoriesByDate(ascending = false) {
    const sortedStories = [...this.filteredStories].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      
      return ascending ? dateA - dateB : dateB - dateA;
    });

    this.filteredStories = sortedStories;
    return this.filteredStories;
  }

  getStoriesByDateRange(startDate, endDate) {
    if (!startDate || !endDate) return this.filteredStories;

    return this.filteredStories.filter(story => {
      const storyDate = new Date(story.createdAt);
      return storyDate >= startDate && storyDate <= endDate;
    });
  }

  // Cache Management
  refreshData() {
    return this.fetchStories();
  }

  clearCache() {
    this.stories = [];
    this.filteredStories = [];
    this.searchQuery = '';
    this.clearError();
  }

  // Statistics Methods
  getStatistics() {
    const storiesWithLocation = this.getStoriesWithLocation();
    
    return {
      totalStories: this.stories.length,
      filteredStories: this.filteredStories.length,
      storiesWithLocation: storiesWithLocation.length,
      storiesWithoutLocation: this.stories.length - storiesWithLocation.length,
      searchQuery: this.searchQuery
    };
  }

  // Event Data Methods (for presenter communication)
  prepareStoryListData() {
    return this.filteredStories.map(story => ({
      ...story,
      hasLocation: this.validateStoryLocation(story)
    }));
  }

  prepareMapData() {
    return this.getStoriesWithLocation().map(story => ({
      id: story.id,
      name: story.name,
      description: story.description,
      photoUrl: story.photoUrl,
      createdAt: story.createdAt,
      lat: story.lat,
      lon: story.lon
    }));
  }
}