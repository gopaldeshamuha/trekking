// --- Trail Moments Gallery Dynamic Loading ---
async function loadTrailMomentGallery() {
  const gallery = document.getElementById('trailMomentGallery');
  if (!gallery) return;
  gallery.innerHTML = '<div class="loading">Loading gallery...</div>';
  try {
    const res = await fetch('/api/gallery');
    const images = await res.json();
    if (!Array.isArray(images) || images.length === 0) {
      gallery.innerHTML = '<div class="loading">No images found.</div>';
      return;
    }
    gallery.innerHTML = images.map((img, i) =>
      img ? `<img src="${img}" alt="Trail Moment ${i+1}">` : ''
    ).join('');
  } catch (err) {
    gallery.innerHTML = '<div class="error-message">Failed to load gallery.</div>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadTrailMomentGallery();
});
// Shortcuts for selecting elements
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Set current year in footer
$("#year").textContent = new Date().getFullYear();

// Mobile nav toggle
const navToggle = $(".nav-toggle");
const siteNav = $(".site-nav");

navToggle.addEventListener("click", () => {
  const isOpen = siteNav.style.display === "flex";
  siteNav.style.display = isOpen ? "none" : "flex";
  navToggle.setAttribute("aria-expanded", !isOpen);
});

// Close mobile nav when clicking on links
$$(".site-nav a").forEach(a =>
  a.addEventListener("click", () => {
    if (window.innerWidth < 560) {
      siteNav.style.display = "none";
      navToggle.setAttribute("aria-expanded", "false");
    }
  })
);

// Close mobile nav when clicking outside
document.addEventListener("click", (e) => {
  if (window.innerWidth < 560 && 
      !navToggle.contains(e.target) && 
      !siteNav.contains(e.target) && 
      siteNav.style.display === "flex") {
    siteNav.style.display = "none";
    navToggle.setAttribute("aria-expanded", "false");
  }
});

// Global variables
let treks = [];

// Feedback popup logic
const feedbackBtn = document.getElementById('feedbackBtn');
const feedbackPopup = document.getElementById('feedbackPopup');
const feedbackCloseBtn = document.getElementById('feedbackCloseBtn');
const feedbackForm = document.getElementById('feedbackForm');
const feedbackText = document.getElementById('feedbackText');
const feedbackWordCount = document.getElementById('feedbackWordCount');
const feedbackMsg = document.getElementById('feedbackMsg');

if (feedbackBtn && feedbackPopup && feedbackCloseBtn && feedbackForm && feedbackText && feedbackWordCount && feedbackMsg) {
  feedbackBtn.addEventListener('click', () => {
    feedbackPopup.style.display = 'block';
    feedbackText.focus();
  });
  feedbackCloseBtn.addEventListener('click', () => {
    feedbackPopup.style.display = 'none';
    feedbackMsg.textContent = '';
    feedbackText.value = '';
    feedbackWordCount.textContent = '0/100 words';
  });
  feedbackText.addEventListener('input', () => {
    const words = feedbackText.value.trim().split(/\s+/).filter(Boolean);
    if (words.length > 100) {
      feedbackText.value = words.slice(0, 100).join(' ');
    }
    feedbackWordCount.textContent = `${Math.min(words.length, 100)}/100 words`;
  });
  feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const feedback = feedbackText.value.trim();
    const words = feedback.split(/\s+/).filter(Boolean);
    if (!feedback || words.length === 0) {
      feedbackMsg.textContent = 'Feedback cannot be empty.';
      return;
    }
    if (words.length > 100) {
      feedbackMsg.textContent = 'Feedback must be 100 words or less.';
      return;
    }
    feedbackMsg.textContent = 'Sending...';
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback })
      });
      if (res.ok) {
        feedbackMsg.textContent = 'Thank you for your feedback!';
        feedbackText.value = '';
        feedbackWordCount.textContent = '0/100 words';
        setTimeout(() => { feedbackPopup.style.display = 'none'; feedbackMsg.textContent = ''; }, 1500);
      } else {
        const data = await res.json();
        feedbackMsg.textContent = data.error || 'Failed to send feedback.';
      }
    } catch (err) {
      feedbackMsg.textContent = 'Failed to send feedback.';
    }
  });
}

// Fetch treks from backend API
async function loadTreks() {
  try {
    console.log("Loading treks from API...");
    const response = await fetch('/api/treks');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    treks = data;
    renderTreks(treks);
    populateTrekDropdown(treks);
    // Start hero slideshow after treks are loaded
    startHeroSlideshow();
  } catch (err) {
    console.error('Error loading treks:', err);
    $("#trekList").innerHTML = `
      <div class="error-message">
        <p>Failed to load treks. Please try again later.</p>
        <button onclick="loadTreks()" class="btn btn-primary">Retry</button>
      </div>
    `;
  }
}

// Render trek cards
function renderTreks(list) {
  const container = $("#trekList");
  if (!list.length) {
    container.innerHTML = "<p class='loading'>No treks found matching your criteria.</p>";
    return;
  }

  // showTrekDetails defined globally below
  container.innerHTML = list.map(t => `
    <article class="trek-card" data-id="${t.id}" role="button" tabindex="0">
      <div class="trek-media">
        <img src="${t.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800'}" 
             alt="${t.name}" 
             loading="lazy"
             onerror="this.src='https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800'">
      </div>
      <div class="trek-body">
        <h3>${t.name}</h3>
        <p class="trek-description">${t.description ? t.description.substring(0, 120) + '...' : 'Discover this amazing trek experience.'}</p>
        <div class="badges">
          <span class="badge">${t.difficulty}</span>
          <span class="badge">${t.duration} days</span>
          <span class="badge">${t.max_altitude}ft</span>
          <span class="badge badge-price">₹${t.price || (Math.floor(Math.random()*1000)+1999)}</span>
        </div>
      </div>
    </article>
  `).join("");
  
  // Add click event listeners to all trek cards
  const trekCards = container.querySelectorAll('.trek-card');
  trekCards.forEach(card => {
    card.addEventListener('click', () => {
      const trekId = card.getAttribute('data-id');
      if (trekId) showTrekDetails(parseInt(trekId));
    });
  });
}

// Populate trek dropdown in registration form
function populateTrekDropdown(trekList) {
  const select = $("select[name='trek']");
  if (select) {
    select.innerHTML = '<option value="">Select a trek</option>' +
      trekList.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
  }
}

// Filter functionality
$("#trekSearch").addEventListener("input", applyFilters);
$("#difficultyFilter").addEventListener("change", applyFilters);

// Click handling added per-card in renderTreks

function applyFilters() {
  const query = $("#trekSearch").value.toLowerCase().trim();
  const difficulty = $("#difficultyFilter").value;
  
  const filtered = treks.filter(t => {
    const matchQuery = !query || 
      t.name.toLowerCase().includes(query) || 
      t.base_village?.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query);
    const matchDifficulty = !difficulty || t.difficulty === difficulty;
    return matchQuery && matchDifficulty;
  });
  
  renderTreks(filtered);
}

// Modal functionality
const trekModal = $("#trekModal");
const modalBody = $("#modalBody");
const closeBtn = $(".close-btn");

// Function to show trek details (fetches from API)
window.showTrekDetails = async function(trekId) {
  try {
    const messageEl = document.querySelector('#modalBody .form-msg');
  } catch {}
  try {
    modalBody.innerHTML = '<p class="loading">Loading trek details...</p>';
    trekModal.style.display = 'flex';
    const res = await fetch(`/api/treks/${trekId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch trek ${trekId}: ${res.status}`);
    }
    const trek = await res.json();
    showTrekModal(trek);
  } catch (err) {
    console.error('Error fetching trek details:', err);
    modalBody.innerHTML = '<p class="error-message">Failed to load trek details. Please try again.</p>';
  }
}

// Handle trek card keyboard interaction - Cross-device compatible
function handleTrekCardKeyboard(e) {
  // Handle Enter key (works on all devices)
  if (e.key === "Enter") {
    const card = e.target.closest('.trek-card');
    if (card) {
      e.preventDefault();
      const trekId = card.getAttribute('data-id');
      if (trekId) {
        showTrekDetails(parseInt(trekId));
      }
    }
    return;
  }

  // Handle Space key (works on PC/tablet, safe on mobile)
  if (e.key === " ") {
    const card = e.target.closest('.trek-card');
    if (card) {
      e.preventDefault();
      const trekId = card.getAttribute('data-id');
      if (trekId) {
        showTrekDetails(parseInt(trekId));
      }
    }
    return;
  }
}

// Single event listener for cross-device compatibility
$("#trekList").addEventListener("keydown", handleTrekCardKeyboard);

function showTrekModal(trek) {
  modalBody.innerHTML = `
    <div class="trek-modal-header">
      <img src="${trek.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200'}" alt="${trek.name}" onerror="this.src='https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200'" />
      <div class="overlay"></div>
      <div class="trek-modal-title">
        <h2>${trek.name}</h2>
        <span class="price-chip">₹${trek.price || (Math.floor(Math.random()*1000)+1999)}</span>
      </div>
    </div>
    
    <div class="trek-details">
      <div class="trek-stats">
        <div class="trek-stat"><span>Duration</span><strong>${trek.duration}</strong></div>
        <div class="trek-stat"><span>Difficulty</span><strong>${trek.difficulty}</strong></div>
        <div class="trek-stat"><span>Trek Length</span><strong>${trek.trek_length} km</strong></div>
        <div class="trek-stat"><span>Max Altitude</span><strong>${trek.max_altitude} ft</strong></div>
        <div class="trek-stat"><span>Base Village</span><strong>${trek.base_village}</strong></div>
        <div class="trek-stat"><span>Transport</span><strong>${trek.transport}</strong></div>
      </div>
      
      <div class="trek-tags">
        <span class="trek-tag">Meals: ${trek.meals}</span>
        <span class="trek-tag">Sightseeing: ${trek.sightseeing}</span>
      </div>
      
      <p class="trek-desc">${trek.description}</p>
    </div>
    
    <hr class="modal-divider">
    
    <div class="booking-section">
      <h3>Book This Trek</h3>
      <form id="bookingForm">
        <div class="form-grid-single">
          <label>Full Name*
            <input type="text" name="fullName" required>
          </label>
          <label>Contact Number*
            <input type="tel" name="contact" required>
          </label>
          <label>Email*
            <input type="email" name="email" required>
          </label>
          <label>Group Size*
            <input type="number" name="groupSize" min="1" max="20" value="1" required>
          </label>
          <label>Special Notes
            <textarea name="notes" rows="3" placeholder="Any special requirements or notes..."></textarea>
          </label>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Submit Booking</button>
          <button type="button" class="btn btn-outline" onclick="document.getElementById('trekModal').style.display='none'">Close</button>
          <p class="form-msg" role="status" aria-live="polite"></p>
        </div>
      </form>
    </div>
  `;
  
  trekModal.style.display = "flex";
  
  // Handle booking form submission
  const bookingForm = $("#bookingForm");
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleBookingSubmission(trek.id, bookingForm);
  });
}

// Duplicate event listener removed - now using single handler above

// Removed showTrekModal function as it's now integrated into showTrekDetails

// Handle booking form submission
async function handleBookingSubmission(trekId, form) {
  const formData = new FormData(form);
  const trekName = treks.find(t => t.id == trekId)?.name || '';
  const bookingData = {
    trek_id: trekId,
    trekName,
    fullName: formData.get('fullName'),
    contact: formData.get('contact'),
    email: formData.get('email'),
    groupSize: formData.get('groupSize'),
    notes: formData.get('notes')
  };
  
  const submitBtn = form.querySelector('button[type="submit"]');
  const messageEl = form.querySelector('.form-msg');
  
  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  messageEl.textContent = '';
  
  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      messageEl.textContent = 'Booking submitted successfully! We will contact you soon.';
      messageEl.style.color = '#4ade80';
      form.reset();
      
      // Close modal after delay
      setTimeout(() => {
        trekModal.style.display = "none";
      }, 2000);
    } else {
      throw new Error(result.error || 'Booking failed');
    }
  } catch (error) {
    console.error('Booking error:', error);
    messageEl.textContent = 'Failed to submit booking. Please try again.';
    messageEl.style.color = '#ff7aa5';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Booking';
  }
}

// Close modal functionality
closeBtn.addEventListener("click", () => {
  trekModal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === trekModal) {
    trekModal.style.display = "none";
  }
});

// Handle registration form
const registrationForm = $("#registrationForm");
if (registrationForm) {
  registrationForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const formData = new FormData(registrationForm);
    const trekId = formData.get('trek');
    if (!trekId) {
      alert('Please select a trek');
      return;
    }
    const trekName = treks.find(t => t.id == trekId)?.name || '';
    const bookingData = {
      trek_id: trekId,
      trekName,
      fullName: formData.get('name'),
      contact: formData.get('phone'),
      email: formData.get('email'),
      groupSize: formData.get('groupSize'),
      notes: formData.get('notes')
    };
    
    const submitBtn = registrationForm.querySelector('button[type="submit"]');
    const messageEl = registrationForm.querySelector('.form-msg');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    messageEl.textContent = '';
    
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        messageEl.textContent = 'Registration submitted successfully! We will contact you soon.';
        messageEl.style.color = '#4ade80';
        registrationForm.reset();
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      messageEl.textContent = 'Failed to submit registration. Please try again.';
      messageEl.style.color = '#ff7aa5';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Registration';
    }
  });
}

// Handle contact form
const contactForm = $("#contactForm");
if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(contactForm);
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const message = formData.get('message');
    const messageEl = contactForm.querySelector('.form-msg');
    messageEl.textContent = '';

    // Basic validation
    if (!name || !email || !phone || !message) {
      messageEl.textContent = 'All fields are required.';
      messageEl.style.color = '#ff7aa5';
      return;
    }
    // Email format validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      messageEl.textContent = 'Please enter a valid email address.';
      messageEl.style.color = '#ff7aa5';
      return;
    }
    // Phone format validation
    if (!/^[0-9\-\+\s]{8,20}$/.test(phone)) {
      messageEl.textContent = 'Please enter a valid phone number.';
      messageEl.style.color = '#ff7aa5';
      return;
    }

    try {
      const response = await fetch('/api/business-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, message })
      });
      const result = await response.json();
      if (response.ok) {
        messageEl.textContent = 'Thank you! Your query has been submitted.';
        messageEl.style.color = '#4ade80';
        contactForm.reset();
      } else {
        throw new Error(result.error || 'Submission failed');
      }
    } catch (error) {
      messageEl.textContent = 'Failed to submit. Please try again.';
      messageEl.style.color = '#ff7aa5';
    }
  });
}

// Smooth scrolling for navigation links
$$('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Active link highlighting on scroll
const sections = ["home", "about", "treks", "register", "gallery", "contact"]
  .map(id => document.getElementById(id))
  .filter(Boolean);
const navLinks = $$(".site-nav a");

function setActiveLink() {
  const scrollY = window.scrollY + 140;
  let current = sections[0]?.id || 'home';
  
  for (const section of sections) {
    if (section.offsetTop <= scrollY) {
      current = section.id;
    }
  }
  
  navLinks.forEach(link => {
    link.classList.toggle("active", link.getAttribute("href") === `#${current}`);
  });
}

window.addEventListener("scroll", setActiveLink);
window.addEventListener("load", setActiveLink);

// --- Hero Background Slideshow ---
let heroBgIndex = 0;
let heroBgInterval = null;


function setHeroBgImage(imgUrl) {
  const heroBg = document.querySelector('.hero-background');
  if (!heroBg) {
    console.error('❌ Hero background element not found in setHeroBgImage');
    return;
  }
  
  console.log('🖼️ Setting hero background image:', imgUrl);
  heroBg.style.background = `linear-gradient(rgba(15, 10, 31, 0.7), rgba(15, 10, 31, 0.8)), url('${imgUrl}') center/cover`;
  heroBg.style.transition = 'background-image 0.5s ease-in-out';
}

function setHeroTrekName(name) {
  const heroTrekName = document.getElementById('heroTrekName');
  if (!heroTrekName) {
    console.error('❌ Hero trek name element not found in setHeroTrekName');
    return;
  }
  
  console.log('📝 Setting hero trek name:', name);
  heroTrekName.textContent = name || '';
}

// Preload all hero images before starting slideshow
async function preloadHeroImages(imageUrls) {
  console.log('🔄 Preloading hero images...');
  
  const heroLoading = document.getElementById('heroLoading');
  const loadingText = heroLoading ? heroLoading.querySelector('p') : null;
  
  let loadedCount = 0;
  const totalCount = imageUrls.length;
  
  const preloadPromises = imageUrls.map((url, index) => {
    return preloadImage(url).then(() => {
      loadedCount++;
      if (loadingText) {
        loadingText.textContent = `Loading adventure ${loadedCount}/${totalCount}...`;
      }
      console.log(`✅ Image ${loadedCount}/${totalCount} loaded: ${url}`);
      return url;
    }).catch((error) => {
      console.warn(`⚠️ Failed to load image ${index + 1}: ${url}`, error);
      return url; // Return URL even if failed for fallback
    });
  });
  
  try {
    await Promise.all(preloadPromises);
    console.log('✅ All hero images preloaded successfully');
    if (loadingText) {
      loadingText.textContent = 'Starting your adventure...';
    }
    return true;
  } catch (error) {
    console.warn('⚠️ Some images failed to preload:', error);
    if (loadingText) {
      loadingText.textContent = 'Starting your adventure...';
    }
    return false;
  }
}

function startHeroSlideshow() {
  console.log('🎬 Starting hero slideshow...');
  console.log('📊 Treks available:', treks ? treks.length : 'undefined');
  
  if (!treks || !treks.length) {
    console.log('⚠️ No treks available for slideshow, using fallback');
    // Use fallback image if no treks
    const heroBg = document.querySelector('.hero-background');
    if (heroBg) {
      heroBg.style.background = `linear-gradient(rgba(15, 10, 31, 0.7), rgba(15, 10, 31, 0.8)), url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1600&auto=format&fit=crop') center/cover`;
    }
    return;
  }
  
  const heroBg = document.querySelector('.hero-background');
  const heroTrekName = document.getElementById('heroTrekName');
  
  if (!heroBg) {
    console.error('❌ Hero background element not found');
    return;
  }
  
  if (!heroTrekName) {
    console.error('❌ Hero trek name element not found');
    return;
  }
  
  // Filter treks with valid images
  const slides = treks.filter(t => t.image && t.image.trim() !== '').map(t => ({ 
    image: t.image, 
    name: t.name 
  }));
  
  console.log('🖼️ Valid trek images found:', slides.length);
  slides.forEach((slide, index) => {
    console.log(`  ${index + 1}. ${slide.name}: ${slide.image}`);
  });
  
  if (!slides.length) {
    console.log('⚠️ No trek images available, using fallback');
    // Use fallback image
    heroBg.style.background = `linear-gradient(rgba(15, 10, 31, 0.7), rgba(15, 10, 31, 0.8)), url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1600&auto=format&fit=crop') center/cover`;
    return;
  }

  // Extract image URLs for preloading
  const imageUrls = slides.map(slide => slide.image);
  
  // Show loading state
  const heroLoading = document.getElementById('heroLoading');
  if (heroLoading) {
    heroLoading.style.display = 'block';
  }
  heroBg.style.background = `linear-gradient(rgba(15, 10, 31, 0.8), rgba(15, 10, 31, 0.9)), url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1600&auto=format&fit=crop') center/cover`;
  heroTrekName.textContent = 'Loading amazing treks...';
  heroTrekName.style.display = 'block';
  
  // Preload images then start slideshow
  preloadHeroImages(imageUrls).then(() => {
    console.log('🚀 Starting slideshow with preloaded images');
    
    // Hide loading indicator
    if (heroLoading) {
      heroLoading.classList.add('hidden');
      setTimeout(() => {
        heroLoading.style.display = 'none';
        heroLoading.classList.remove('hidden');
      }, 500);
    }
    
    heroBgIndex = 0;
    setHeroBgImage(slides[heroBgIndex].image);
    setHeroTrekName(slides[heroBgIndex].name);
    heroTrekName.style.display = 'block';
    
    if (heroBgInterval) clearInterval(heroBgInterval);
    
    heroBgInterval = setInterval(() => {
      heroBgIndex = (heroBgIndex + 1) % slides.length;
      console.log(`🔄 Switching to image ${heroBgIndex + 1}/${slides.length}: ${slides[heroBgIndex].name}`);
      setHeroBgImage(slides[heroBgIndex].image);
      setHeroTrekName(slides[heroBgIndex].name);
    }, 3000);
    
    console.log('✅ Hero slideshow started successfully with preloaded images');
  }).catch(error => {
    console.error('❌ Failed to preload images, starting slideshow anyway:', error);
    // Start slideshow even if preloading failed
    
    // Hide loading indicator
    if (heroLoading) {
      heroLoading.classList.add('hidden');
      setTimeout(() => {
        heroLoading.style.display = 'none';
        heroLoading.classList.remove('hidden');
      }, 500);
    }
    
    heroBgIndex = 0;
    setHeroBgImage(slides[heroBgIndex].image);
    setHeroTrekName(slides[heroBgIndex].name);
    heroTrekName.style.display = 'block';
    
    if (heroBgInterval) clearInterval(heroBgInterval);
    
    heroBgInterval = setInterval(() => {
      heroBgIndex = (heroBgIndex + 1) % slides.length;
      setHeroBgImage(slides[heroBgIndex].image);
      setHeroTrekName(slides[heroBgIndex].name);
    }, 3000);
  });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  loadTreks();
  setActiveLink();
  

});

// Load treks immediately if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadTreks);
} else {
  loadTreks();
}

