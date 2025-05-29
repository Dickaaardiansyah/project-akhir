// story-detail-modal.js
import { getStoryDetail } from '../../data/api.js';

export default class StoryDetailModal {
  constructor() {
    this.modal = null;
  }

  async show(storyId) {
    try {
      // Fetch story details from API
      const response = await getStoryDetail(storyId);
      if (response.error === false && response.story) {
        this.render(response.story);
        this.setupEventListeners();
      } else {
        throw new Error(response.message || 'Failed to fetch story details');
      }
    } catch (error) {
    }
  }

  render(story) {
    // Create modal container if not already created
    if (!this.modal) {
      this.modal = document.createElement('div');
      this.modal.className = 'story-detail-modal';
      this.modal.setAttribute('aria-modal', 'true');
      this.modal.setAttribute('role', 'dialog');
      this.modal.setAttribute('aria-labelledby', 'modal-title');
      document.body.appendChild(this.modal);
    }

    // Format date
    const formattedDate = this.formatDate(story.createdAt);

    // Render modal content
    this.modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="modal-title" class="modal-title">${this.escapeHtml(story.name)}</h2>
          <button class="close-modal-btn" aria-label="Tutup modal">
            <span class="icon">✕</span>
          </button>
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
                     Lihat di Peta
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

    // Show modal
    this.modal.style.display = 'block';
    this.announceToScreenReader(`Modal detail story untuk ${story.name} dibuka`);
    this.focusModal();
  }

  setupEventListeners() {
    const closeButtons = this.modal.querySelectorAll('.close-modal-btn');
    const viewLocationBtn = this.modal.querySelector('.view-location-btn');

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

    // Handle Escape key
    document.addEventListener('keydown', this.handleKeydown.bind(this), { once: true });

    // Trap focus within modal
    this.trapFocus();
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
      // Return focus to the element that triggered the modal (if applicable)
      const activeElement = document.querySelector(`.story-card[data-story-id]:focus`);
      if (activeElement) {
        activeElement.focus();
      }
    }
  }

  showError(message) {
    // Use Swal or a simple alert for errors
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

  // Callback to be set by the parent component
  setOnLocationButtonClick(callback) {
    this.onLocationButtonClick = callback;
  }
}