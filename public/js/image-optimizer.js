// Image Optimization and Lazy Loading Utility
class ImageOptimizer {
  constructor() {
    this.intersectionObserver = null;
    this.init();
  }

  init() {
    // Check if Intersection Observer is supported
    if ('IntersectionObserver' in window) {
      this.setupIntersectionObserver();
    } else {
      // Fallback for older browsers
      this.loadAllImages();
    }
  }

  setupIntersectionObserver() {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target);
            this.intersectionObserver.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before image comes into view
        threshold: 0.01
      }
    );

    // Observe all images with data-src attribute
    this.observeImages();
  }

  observeImages() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => {
      this.intersectionObserver.observe(img);
    });
  }

  loadImage(img) {
    if (img.dataset.src) {
      img.src = img.dataset.src;
      img.classList.remove('lazy');
      img.classList.add('loaded');
      
      // Remove data-src attribute after loading
      img.removeAttribute('data-src');
      
      // Add fade-in animation
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.3s ease-in';
      
      setTimeout(() => {
        img.style.opacity = '1';
      }, 100);
    }
  }

  loadAllImages() {
    // Fallback for browsers without Intersection Observer
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => {
      this.loadImage(img);
    });
  }

  // Create responsive image sources
  createResponsiveImage(img, srcset) {
    if (img.dataset.srcset) {
      img.srcset = img.dataset.srcset;
      img.sizes = img.dataset.sizes || '100vw';
      img.removeAttribute('data-srcset');
      img.removeAttribute('data-sizes');
    }
  }

  // Optimize image quality based on device pixel ratio
  getOptimalImageUrl(baseUrl, width) {
    const pixelRatio = window.devicePixelRatio || 1;
    const optimalWidth = Math.round(width * pixelRatio);
    
    // If the image service supports dynamic sizing, use it
    if (baseUrl.includes('unsplash.com')) {
      return baseUrl.replace(/w=\d+/, `w=${optimalWidth}`);
    }
    
    return baseUrl;
  }

  // Preload critical images
  preloadCriticalImages() {
    const criticalImages = [
      '/images/hero-bg.jpg',
      '/images/logo.png'
    ];

    criticalImages.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });
  }

  // Add loading animation
  addLoadingAnimation(img) {
    if (!img.classList.contains('loading')) {
      img.classList.add('loading');
      
      // Create loading placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'image-placeholder';
      placeholder.innerHTML = '<div class="loading-spinner"></div>';
      
      img.parentNode.insertBefore(placeholder, img);
      
      img.addEventListener('load', () => {
        img.classList.remove('loading');
        img.classList.add('loaded');
        if (placeholder.parentNode) {
          placeholder.parentNode.removeChild(placeholder);
        }
      });
      
      img.addEventListener('error', () => {
        img.classList.remove('loading');
        img.classList.add('error');
        if (placeholder.parentNode) {
          placeholder.parentNode.removeChild(placeholder);
        }
        this.handleImageError(img);
      });
    }
  }

  // Handle image loading errors
  handleImageError(img) {
    // Set fallback image
    img.src = '/images/placeholder.jpg';
    img.alt = 'Image not available';
    
    // Add error styling
    img.style.border = '2px solid #dc3545';
    img.style.backgroundColor = '#f8d7da';
  }

  // Optimize existing images on page
  optimizeExistingImages() {
    const images = document.querySelectorAll('img:not([data-src])');
    images.forEach(img => {
      this.addLoadingAnimation(img);
      
      // Add responsive attributes if not present
      if (!img.sizes && img.src) {
        img.sizes = '100vw';
      }
    });
  }

  // Refresh observer when new content is added
  refresh() {
    if (this.intersectionObserver) {
      this.observeImages();
    }
  }

  // Destroy observer
  destroy() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }
}

// Initialize image optimizer
const imageOptimizer = new ImageOptimizer();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageOptimizer;
}

// Add to window for global access
window.ImageOptimizer = ImageOptimizer;
