import Database from '../../data/database';

export default class BookmarkPresenter {
  constructor(view) {
    this.view = view;
  }

  async init() {
    try {
      this.view.showLoading();
      await this.loadBookmarks();
    } catch (error) {
      console.error('BookmarkPresenter: Error in init:', error);
      this.view.showError('Gagal memuat bookmark: ' + error.message);
    } finally {
      this.view.hideLoading();
    }
  }

  async loadBookmarks() {
    try {
      const bookmarks = await Database.getBookmarks();
      const bookmarkData = bookmarks.map(bookmark => ({
        ...bookmark,
        hasLocation: this.validateBookmarkLocation(bookmark)
      }));
      console.log('BookmarkPresenter: Loaded bookmarks:', bookmarkData);
      this.view.displayBookmarks(bookmarkData);
      this.view.displayMap(bookmarkData);
    } catch (error) {
      console.error('BookmarkPresenter: Error loading bookmarks:', error);
      throw error;
    }
  }

  validateBookmarkLocation(bookmark) {
    return (
      bookmark &&
      bookmark.lat &&
      bookmark.lon &&
      !isNaN(bookmark.lat) &&
      !isNaN(bookmark.lon) &&
      bookmark.lat >= -90 &&
      bookmark.lat <= 90 &&
      bookmark.lon >= -180 &&
      bookmark.lon <= 180
    );
  }

  onRefreshClick() {
    this.loadBookmarks();
  }

  async onRemoveBookmark(storyId) {
    try {
      await Database.deleteBookmark(storyId);
      await this.loadBookmarks();
      this.view.showSuccessMessage('Bookmark berhasil dihapus');
    } catch (error) {
      console.error('BookmarkPresenter: Error removing bookmark:', error);
      this.view.showError('Gagal menghapus bookmark: ' + error.message);
    }
  }

  async onClearAllBookmarks() {
    try {
      await Database.clearBookmarks();
      await this.loadBookmarks();
      this.view.showSuccessMessage('Semua bookmark berhasil dihapus');
    } catch (error) {
      console.error('BookmarkPresenter: Error clearing bookmarks:', error);
      this.view.showError('Gagal menghapus semua bookmark: ' + error.message);
    }
  }

  onSearchInput(searchText) {
    this.loadBookmarks().then(() => {
      const bookmarks = this.view.bookmarks || [];
      const filteredBookmarks = bookmarks.filter(bookmark => {
        const name = bookmark.name ? bookmark.name.toLowerCase() : '';
        const description = bookmark.description ? bookmark.description.toLowerCase() : '';
        return name.includes(searchText.toLowerCase()) || description.includes(searchText.toLowerCase());
      });
      this.view.displayBookmarks(filteredBookmarks);
      this.view.displayMap(filteredBookmarks);
    });
  }

  onSearchClear() {
    this.loadBookmarks();
  }

  onRetryClick() {
    this.loadBookmarks();
  }

  onLocationButtonClick(lat, lon) {
    if (isNaN(lat) || isNaN(lon)) {
      this.view.showError('Koordinat lokasi tidak valid');
      return;
    }
    this.view.centerMapOnLocation(lat, lon);
  }

  onStoryCardClick(storyId) {
    this.view.navigateToStoryDetail(storyId);
  }
}