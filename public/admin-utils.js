// Admin Utilities - Common functions and constants
const ADMIN_UTILS = {
  // Constants
  CONSTANTS: {
    DEFAULT_MIN_ID: 5,
    PAGE_SIZE: 10,
    INACTIVE_TIMEOUT: 10 * 60 * 1000, // 10 minutes
    TOKEN_CHECK_INTERVAL: 30000, // 30 seconds
    INACTIVITY_CHECK_INTERVAL: 60000 // 1 minute
  },

  // Validation functions
  VALIDATION: {
    // Validate trek data
    validateTrekData: (data) => {
      const errors = [];
      
      if (!data.name || data.name.trim().length < 3) {
        errors.push('Trek name must be at least 3 characters long');
      }
      
      if (!data.description || data.description.trim().length < 10) {
        errors.push('Description must be at least 10 characters long');
      }
      
      if (!data.duration || data.duration.trim().length === 0) {
        errors.push('Duration is required');
      }
      
      if (!data.trek_length || data.trek_length <= 0) {
        errors.push('Trek length must be greater than 0');
      }
      
      if (!data.difficulty || !['Easy', 'Moderate', 'Challenging'].includes(data.difficulty)) {
        errors.push('Difficulty must be Easy, Moderate, or Challenging');
      }
      
      if (!data.max_altitude || data.max_altitude <= 0) {
        errors.push('Max altitude must be greater than 0');
      }
      
      if (!data.base_village || data.base_village.trim().length === 0) {
        errors.push('Base village is required');
      }
      
      if (!data.transport || data.transport.trim().length === 0) {
        errors.push('Transport is required');
      }
      
      if (!data.meals || data.meals.trim().length === 0) {
        errors.push('Meals information is required');
      }
      
      if (!data.sightseeing || data.sightseeing.trim().length === 0) {
        errors.push('Sightseeing information is required');
      }
      
      if (!data.image || !data.image.trim().match(/^https?:\/\/.+/)) {
        errors.push('Valid image URL is required');
      }
      
      if (!data.price || data.price < 0) {
        errors.push('Price must be 0 or greater');
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    },

    // Validate email format
    validateEmail: (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },

    // Validate phone number
    validatePhone: (phone) => {
      const phoneRegex = /^[0-9\-\+\s]{8,20}$/;
      return phoneRegex.test(phone);
    }
  },

  // Error handling
  ERROR_HANDLING: {
    // Standardized error response
    handleApiError: (error, context = '') => {
      console.error(`Error in ${context}:`, error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return 'Network error. Please check your connection.';
      }
      
      if (error.status === 401) {
        return 'Authentication failed. Please login again.';
      }
      
      if (error.status === 403) {
        return 'Access denied. Insufficient permissions.';
      }
      
      if (error.status === 404) {
        return 'Resource not found.';
      }
      
      if (error.status >= 500) {
        return 'Server error. Please try again later.';
      }
      
      return error.message || 'An unexpected error occurred.';
    },

    // Show user-friendly error message
    showError: (message, elementId = 'errorMessage') => {
      const element = document.getElementById(elementId);
      if (element) {
        element.innerHTML = `<span style="color:#ff7aa5;font-weight:600;">${message}</span>`;
        setTimeout(() => {
          element.innerHTML = '';
        }, 5000);
      }
    },

    // Show success message
    showSuccess: (message, elementId = 'successMessage') => {
      const element = document.getElementById(elementId);
      if (element) {
        element.innerHTML = `<span style="color:#4ade80;font-weight:600;">${message}</span>`;
        setTimeout(() => {
          element.innerHTML = '';
        }, 3000);
      }
    }
  },

  // UI utilities
  UI: {
    // Create pagination controls
    createPagination: (currentPage, totalPages, onPageChange) => {
      if (totalPages <= 1) return '';
      
      let pagination = '<div style="display:flex;justify-content:center;align-items:center;gap:0.7em;margin:1em 0;">';
      
      if (currentPage > 1) {
        pagination += `<button class="page-btn prev" data-page="${currentPage-1}" style="background:#ff9800;color:#fff;border:none;border-radius:6px;padding:0.4em 1em;cursor:pointer;font-weight:600;">Prev</button>`;
      }
      
      for (let i = 1; i <= totalPages; i++) {
        const isActive = i === currentPage;
        pagination += `<button class="page-btn${isActive?' active':''}" data-page="${i}" style="background:${isActive?'#ffb347':'#fff'};color:${isActive?'#222':'#ff9800'};border:none;border-radius:6px;padding:0.4em 1em;cursor:pointer;font-weight:600;">${i}</button>`;
      }
      
      if (currentPage < totalPages) {
        pagination += `<button class="page-btn next" data-page="${currentPage+1}" style="background:#ff9800;color:#fff;border:none;border-radius:6px;padding:0.4em 1em;cursor:pointer;font-weight:600;">Next</button>`;
      }
      
      pagination += '</div>';
      
      return pagination;
    },

    // Add pagination event listeners
    bindPaginationEvents: (container, onPageChange) => {
      container.querySelectorAll('.page-btn').forEach(btn => {
        btn.onclick = function() {
          const page = Number(btn.getAttribute('data-page'));
          onPageChange(page);
        };
      });
    },

    // Create table header with consistent styling
    createTableHeader: (columns) => {
      return [
        '<thead><tr>',
        columns.map(col =>
          `<th style="background:linear-gradient(90deg, var(--brand-start,#ff9800), var(--brand-end,#ffb347));color:#fff;text-align:center;padding:0.7em 0.5em;font-size:1.1em;border:1px solid #fff;letter-spacing:0.5px;">` +
          `<span class="col-label" id="col-label-${col.key}">${col.label}</span></th>`
        ).join(''),
        '</tr></thead>'
      ].join('');
    },

    // Create table body with consistent styling
    createTableBody: (data, columns) => {
      return [
        '<tbody>',
        data.map(row =>
          '<tr>' + columns.map(col =>
            `<td style="text-align:center;border:1px solid #eee;">${row[col.key] != null ? row[col.key] : ''}</td>`
          ).join('') + '</tr>'
        ).join(''),
        '</tbody>'
      ].join('');
    }
  },

  // Data utilities
  DATA: {
    // Get next available ID for treks
    getNextTrekId: async () => {
      try {
        const response = await fetch('/api/treks');
        const treks = await response.json();
        
        if (!Array.isArray(treks) || treks.length === 0) {
          return ADMIN_UTILS.CONSTANTS.DEFAULT_MIN_ID + 1;
        }
        
        const maxId = Math.max(...treks.map(t => Number(t.id) || 0));
        return Math.max(maxId + 1, ADMIN_UTILS.CONSTANTS.DEFAULT_MIN_ID + 1);
      } catch (error) {
        console.error('Error getting next trek ID:', error);
        return ADMIN_UTILS.CONSTANTS.DEFAULT_MIN_ID + 1;
      }
    },

    // Paginate data
    paginateData: (data, page, pageSize = ADMIN_UTILS.CONSTANTS.PAGE_SIZE) => {
      const totalPages = Math.ceil(data.length / pageSize) || 1;
      const validPage = Math.min(Math.max(1, page), totalPages);
      const start = (validPage - 1) * pageSize;
      const end = start + pageSize;
      
      return {
        data: data.slice(start, end),
        currentPage: validPage,
        totalPages,
        hasNext: validPage < totalPages,
        hasPrev: validPage > 1
      };
    }
  },

  // Authentication utilities
  AUTH: {
    // Check if user is authenticated
    isAuthenticated: () => {
      const token = localStorage.getItem('adminToken');
      return !!token;
    },

    // Get authentication headers
    getAuthHeaders: () => {
      const token = localStorage.getItem('adminToken');
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    },

    // Handle authentication errors
    handleAuthError: () => {
      localStorage.removeItem('adminToken');
      window.location.href = '/admin-login.html';
    }
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ADMIN_UTILS;
}
