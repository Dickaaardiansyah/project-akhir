const DB_NAME = 'StoryAppDB';
const DB_VERSION = 1;
const BOOKMARK_STORE = 'bookmarks';

export default class Database {
  static openDB() {
    return new Promise((resolve, reject) => {
      console.log('Opening IndexedDB:', DB_NAME, 'version:', DB_VERSION);
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        console.log('Upgrading IndexedDB schema');
        const db = event.target.result;
        if (!db.objectStoreNames.contains(BOOKMARK_STORE)) {
          console.log('Creating bookmarks object store');
          db.createObjectStore(BOOKMARK_STORE, { keyPath: 'id' });
        } else {
          console.log('Bookmarks store already exists');
        }
      };

      request.onsuccess = (event) => {
        console.log('IndexedDB opened successfully');
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.error('Failed to open IndexedDB:', event.target.error);
        reject(new Error(`Failed to open database: ${event.target.error}`));
      };

      request.onblocked = () => {
        console.error('IndexedDB open blocked');
        reject(new Error('Database open blocked'));
      };
    });
  }

  static async putBookmark(bookmark) {
    try {
      console.log('Saving bookmark to IndexedDB:', bookmark);
      if (!bookmark.id) {
        throw new Error('Bookmark missing ID');
      }
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([BOOKMARK_STORE], 'readwrite');
        const store = transaction.objectStore(BOOKMARK_STORE);
        const request = store.put(bookmark);

        request.onsuccess = () => {
          console.log('Bookmark saved successfully:', bookmark.id);
          resolve();
        };

        request.onerror = (event) => {
          console.error('Failed to save bookmark:', event.target.error);
          reject(new Error(`Failed to save bookmark: ${event.target.error}`));
        };

        transaction.oncomplete = () => {
          console.log('Bookmark transaction completed');
        };

        transaction.onerror = (event) => {
          console.error('Bookmark transaction failed:', event.target.error);
          reject(new Error(`Transaction failed: ${event.target.error}`));
        };
      });
    } catch (error) {
      console.error('Error in putBookmark:', error);
      throw error;
    }
  }

  static async deleteBookmark(storyId) {
    try {
      console.log('Deleting bookmark:', storyId);
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([BOOKMARK_STORE], 'readwrite');
        const store = transaction.objectStore(BOOKMARK_STORE);
        const request = store.delete(storyId);

        request.onsuccess = () => {
          console.log('Bookmark deleted:', storyId);
          resolve();
        };

        request.onerror = (event) => {
          console.error('Failed to delete bookmark:', event.target.error);
          reject(new Error(`Failed to delete bookmark: ${event.target.error}`));
        };
      });
    } catch (error) {
      console.error('Error in deleteBookmark:', error);
      throw error;
    }
  }

  static async getBookmarks() {
    try {
      console.log('Fetching all bookmarks');
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([BOOKMARK_STORE], 'readonly');
        const store = transaction.objectStore(BOOKMARK_STORE);
        const request = store.getAll();

        request.onsuccess = (event) => {
          console.log('Bookmarks fetched:', event.target.result);
          resolve(event.target.result);
        };

        request.onerror = (event) => {
          console.error('Failed to fetch bookmarks:', event.target.error);
          reject(new Error(`Failed to fetch bookmarks: ${event.target.error}`));
        };
      });
    } catch (error) {
      console.error('Error in getBookmarks:', error);
      throw error;
    }
  }

  static async getBookmarkById(storyId) {
    try {
      console.log('Fetching bookmark by ID:', storyId);
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([BOOKMARK_STORE], 'readonly');
        const store = transaction.objectStore(BOOKMARK_STORE);
        const request = store.get(storyId);

        request.onsuccess = (event) => {
          console.log('Bookmark fetch result:', event.target.result);
          resolve(event.target.result);
        };

        request.onerror = (event) => {
          console.error('Failed to fetch bookmark:', event.target.error);
          reject(new Error(`Failed to fetch bookmark: ${event.target.error}`));
        };
      });
    } catch (error) {
      console.error('Error in getBookmarkById:', error);
      throw error;
    }
  }
}