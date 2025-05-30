import { getStoryDetail } from '../../data/api.js';
import Database from '../../data/database';

export default class StoryDetailModal {
  constructor() {
    this.modal = null;
    this.currentStory = null;
    this.isBookmarked = false;
  }

  async show(storyId) {
    try {
      const response = await getStoryDetail(storyId);
      if (response.error === false && response.story) {
        this.currentStory = response.story;
        this.isBookmarked = await this.isStoryBookmarked(storyId);
        this.render(response.story);
        this.setupEventListeners();
      } else {
        throw new Error(response.message || 'Failed to fetch story details');
      }
    } catch (error) {
      console.error('Error fetching story:', error);
      this.showError('Gagal memuat detail story. Silakan coba lagi.');
    }
  }

  render(story) {
    if (!this.modal) {
      this.modal = document.createElement('div');
      this.modal.className = 'story-detail-modal';
      this.modal.setAttribute('aria-modal', 'true');
      this.modal.setAttribute('role', 'dialog');
      this.modal.setAttribute('aria-labelledby', 'modal-title');
      document.body.appendChild(this.modal);
    }

    const formattedDate = this.formatDate(story.createdAt);

    this.modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="modal-title" class="modal-title">${this.escapeHtml(story.name)}</h2>
          <div class="modal-header-actions">
            <button class="bookmark-btn ${this.isBookmarked ? 'bookmarked' : ''}" 
                    data-story-id="${story.id}" 
                    aria-label="${this.isBookmarked ? 'Hapus dari bookmark' : 'Tambah ke bookmark'}"
                    title="${this.isBookmarked ? 'Hapus dari bookmark' : 'Tambah ke bookmark'}">
              <svg class="bookmark-icon" viewBox="0 0 24 24" fill="${this.isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
              </svg>
              <span class="bookmark-text">${this.isBookmarked ? 'Tersimpan' : 'Simpan'}</span>
            </button>
            <button class="close-modal-btn" aria-label="Tutup modal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <div class="modal-body">
          <img src="${story.photoUrl}" alt="${this.escapeHtml(story.name)}" class="story-image" 
               onerror="this.src='data:image/svg+xml;charset=UTF-8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"400\\" height=\\"300\\"><rect width=\\"400\\" height=\\"300\\" fill=\\"#f0f0f0\\"/><text x=\\"200\\" y=\\"150\\" text-anchor=\\"middle\\" dy=\\".3em\\" font-family=\\"Arial\\" font-size=\\"16\\" fill=\\"#666\\">No Image</text></svg>'" />
          <p class="story-description">${this.escapeHtml(story.description)}</p>
          <div class="story-meta">
            <p><strong>Tanggal:</strong> ${formattedDate}</p>
            ${
              story.lat && story.lon && !isNaN(story.lat) && !isNaN(story.lon)
                ? `<p><strong>Lokasi:</strong> ${story.lat.toFixed(3)}, ${story.lon.toFixed(3)}</p>
                   <button class="btn btn-outline view-location-btn" data-lat="${story.lat}" data-lon="${story.lon}">
                     📍 Lihat di Peta
                   </button>`
                : '<p><strong>Lokasi:</strong> Tidak tersedia</p>'
            }
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary close-modal-btn">Tutup</button>
        </div>
      </div>
    `;

    this.modal.style.display = 'block';
    this.announceToScreenReader(`Modal detail story untuk ${story.name} dibuka`);
    this.focusModal();
  }

  setupEventListeners() {
    const closeButtons = this.modal.querySelectorAll('.close-modal-btn');
    const viewLocationBtn = this.modal.querySelector('.view-location-btn');
    const bookmarkBtn = this.modal.querySelector('.bookmark-btn');

    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });

    if (viewLocationBtn) {
      viewLocationBtn.addEventListener('click', () => {
        const lat = parseFloat(viewLocationBtn.getAttribute('data-lat'));
        const lon = parseFloat(viewLocationBtn.getAttribute('data-lon'));
        this.onLocationButtonClick(lat, lon);
      });
    }

    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', () => {
        this.toggleBookmark();
      });
    }

    document.addEventListener('keydown', this.handleKeydown.bind(this), { once: true });
    this.trapFocus();
  }

  async toggleBookmark() {
    if (!this.currentStory || !this.currentStory.id) {
      console.error('Invalid story: missing ID or currentStory');
      this.showError('Story tidak valid untuk di-bookmark');
      return;
    }

    const bookmarkBtn = this.modal.querySelector('.bookmark-btn');
    if (!bookmarkBtn) {
      console.error('Bookmark button not found');
      this.showError('Tombol bookmark tidak ditemukan');
      return;
    }

    const isCurrentlyBookmarked = this.isBookmarked;

    try {
      if (isCurrentlyBookmarked) {
        console.log(`Attempting to delete bookmark for story ID: ${this.currentStory.id}`);
        await Database.deleteBookmark(String(this.currentStory.id));
        this.isBookmarked = false;
        bookmarkBtn.classList.remove('bookmarked');
        bookmarkBtn.setAttribute('aria-label', 'Tambah ke bookmark');
        bookmarkBtn.setAttribute('title', 'Tambah ke bookmark');

        const icon = bookmarkBtn.querySelector('.bookmark-icon');
        const text = bookmarkBtn.querySelector('.bookmark-text');
        if (icon && text) {
          icon.setAttribute('fill', 'none');
          text.textContent = 'Simpan';
        } else {
          console.warn('Bookmark icon or text element missing');
        }

        this.announceToScreenReader('Story dihapus dari bookmark');
        console.log(`Bookmark deleted for story ID: ${this.currentStory.id}`);
      } else {
        const bookmark = {
          id: String(this.currentStory.id),
          name: this.currentStory.name || '',
          description: this.currentStory.description || '',
          photoUrl: this.currentStory.photoUrl || '',
          createdAt: this.currentStory.createdAt || new Date().toISOString(),
          lat: this.currentStory.lat || null,
          lon: this.currentStory.lon || null,
          bookmarkedAt: new Date().toISOString()
        };

        console.log('Attempting to save bookmark:', JSON.stringify(bookmark, null, 2));
        await Database.putBookmark(bookmark);
        this.isBookmarked = true;
        bookmarkBtn.classList.add('bookmarked');
        bookmarkBtn.setAttribute('aria-label', 'Hapus dari bookmark');
        bookmarkBtn.setAttribute('title', 'Hapus dari bookmark');

        const icon = bookmarkBtn.querySelector('.bookmark-icon');
        const text = bookmarkBtn.querySelector('.bookmark-text');
        if (icon && text) {
          icon.setAttribute('fill', 'currentColor');
          text.textContent = 'Tersimpan';
        } else {
          console.warn('Bookmark icon or text element missing');
        }

        this.announceToScreenReader('Story ditambahkan ke bookmark');
        console.log(`Bookmark saved successfully for story ID: ${this.currentStory.id}`);
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
      this.showError(`Gagal menyimpan bookmark: ${error.message}`);
    }
  }

  async isStoryBookmarked(storyId) {
    try {
      console.log(`Checking if story ID ${storyId} is bookmarked`);
      const bookmark = await Database.getBookmarkById(String(storyId));
      const isBookmarked = !!bookmark;
      console.log(`Story ID ${storyId} isBookmarked: ${isBookmarked}`);
      return isBookmarked;
    } catch (error) {
      console.error('Error checking bookmark status:', error);
      return false;
    }
  }

  handleKeydown(event) {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  trapFocus() {
    const focusableElements = this.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    });
  }

  focusModal() {
    const firstFocusable = this.modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (firstFocusable) {
      firstFocusable.focus();
    }
  }

  close() {
    if (this.modal) {
      this.modal.style.display = 'none';
      this.announceToScreenReader('Modal detail story ditutup');
      const activeElement = document.querySelector(`.story-card[data-story-id]:focus`);
      if (activeElement) {
        activeElement.focus();
      }
    }
  }

  showError(message) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: message,
        confirmButtonText: 'OK'
      });
    } else {
      alert(message);
    }
    this.announceToScreenReader(message);
  }

  announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => {
      if (announcement.parentNode) {
        announcement.parentNode.removeChild(announcement);
      }
    }, 1000);
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateString) {
    try {
      if (!dateString) return 'Tanggal tidak tersedia';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Tanggal tidak valid';
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Kesalahan memformat tanggal:', error);
      return 'Tanggal tidak valid';
    }
  }

  setOnLocationButtonClick(callback) {
    this.onLocationButtonClick = callback;
  }
}