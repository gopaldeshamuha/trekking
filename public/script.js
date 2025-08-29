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
  
  container.innerHTML = list.map(t => `
    <article class="trek-card" data-trek-id="${t.id}" role="button" tabindex="0">
      <div class="trek-media">
        <img src="${t.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800'}" 
             alt="${t.name}" 
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

// Add click handler for trek cards
document.addEventListener('click', (e) => {
  const trekCard = e.target.closest('.trek-card');
  if (trekCard) {
    const trekId = trekCard.getAttribute('data-id');
    if (trekId) {
      showTrekDetails(trekId);
    }
  }
});

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
function setupModalHandlers() {
  const trekList = document.getElementById('trekList');
  const trekModal = document.getElementById('trekModal');
  const modalBody = document.getElementById('modalBody');

  // Add click handler for trek cards
  if (trekList) {
    trekList.addEventListener('click', (e) => {
      const trekCard = e.target.closest('.trek-card');
      if (trekCard) {
        const trekId = trekCard.getAttribute('data-trek-id');
        if (trekId) {
          showTrekDetails(trekId);
        }
      }
    });
  }

  // Close modal when clicking close button or outside
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('close-btn') || e.target.classList.contains('trek-modal')) {
      if (trekModal) {
        trekModal.style.display = 'none';
      }
    }
  });

  // Close modal with Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && trekModal) {
      trekModal.style.display = 'none';
    }
  });
}

// Function to show trek details
function showTrekDetails(trekId) {
  const trekModal = document.getElementById('trekModal');
  const modalBody = document.getElementById('modalBody');
  const trek = treks.find(t => t.id == trekId);

  if (!trek || !trekModal || !modalBody) {
    console.error('Required elements not found');
    return;
  }
  
  if (!modal || !modalBody) {
    console.error('Modal elements not found. Please check if the modal HTML exists in your page.');
    return;
  }

  // Remove any existing event listeners from old forms
  const oldForm = document.getElementById('bookingForm');
  if (oldForm) {
    oldForm.replaceWith(oldForm.cloneNode(true));
  }

  // Create popup content
  modalBody.innerHTML = `
    <div class="modal-header">
      <h2>${trek.name}</h2>
      <img src="${trek.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800'}" 
           alt="${trek.name}" 
           style="width: 100%; height: 300px; object-fit: cover; border-radius: 12px; margin: 1rem 0;"
           onerror="this.src='https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800'">
    </div>
    <div class="trek-details">
      <div class="detail-grid">
        <div><strong>Duration:</strong> ${trek.duration} days</div>
        <div><strong>Difficulty:</strong> ${trek.difficulty}</div>
        <div><strong>Trek Length:</strong> ${trek.trek_length} km</div>
        <div><strong>Max Altitude:</strong> ${trek.max_altitude} ft</div>
        <div><strong>Base Village:</strong> ${trek.base_village}</div>
        <div><strong>Transport:</strong> ${trek.transport}</div>
        <div><strong>Price:</strong> <span class="badge badge-price">₹${trek.price || (Math.floor(Math.random()*1000)+1999)}</span></div>
      </div>
      <div class="trek-info">
        <div class="info-item">
          <strong>Meals:</strong> ${trek.meals}
        </div>
        <div class="info-item">
          <strong>Sightseeing:</strong> ${trek.sightseeing}
        </div>
        <div class="info-item">
          <strong>Description:</strong>
          <p>${trek.description}</p>
        </div>
      </div>
    </div>
    <hr>
    <div class="booking-section">
      <h3>Book This Trek</h3>
      <form id="bookingForm">
        <div class="form-grid">
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
          <label class="full">Special Notes
            <textarea name="notes" rows="2"></textarea>
          </label>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Book Now</button>
          <p class="form-msg" role="status" aria-live="polite"></p>
        </div>
      </form>
    </div>
  `;

  // Show the modal
  trekModal.style.display = "flex";

  // Add form submission handler
  const bookingForm = $("#bookingForm");
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleBookingSubmission(trek.id, bookingForm);
  });
}

// Handle trek card keyboard interaction
$("#trekList").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    const card = e.target.closest('.trek-card');
    if (card) {
      e.preventDefault();
      const trekId = card.getAttribute('data-id');
      showTrekDetails(trekId);
    }
  }
});

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
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('close-btn') || e.target.classList.contains('trek-modal')) {
    const modal = document.getElementById('trekModal');
    if (modal) {
      modal.style.display = "none";
    }
  }
});

// Also close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('trekModal');
    if (modal && modal.style.display === 'flex') {
      modal.style.display = "none";
    }
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


function startHeroSlideshow() {
  if (!treks.length) return;
  const heroBg = document.querySelector('.hero-background');
  const heroTrekName = document.getElementById('heroTrekName');
  if (!heroBg || !heroTrekName) return;
  // Prepare array of {image, name}
  const slides = treks.filter(t => t.image).map(t => ({ image: t.image, name: t.name }));
  if (!slides.length) return;
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
}

function setHeroBgImage(imgUrl) {
  const heroBg = document.querySelector('.hero-background');
  if (!heroBg) return;
  heroBg.style.background =
    `linear-gradient(rgba(15, 10, 31, 0.7), rgba(15, 10, 31, 0.8)), url('${imgUrl}') center/cover`;
}

function setHeroTrekName(name) {
  const heroTrekName = document.getElementById('heroTrekName');
  if (!heroTrekName) return;
  heroTrekName.textContent = name || '';
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  loadTreks();
  setActiveLink();
  setupModalHandlers();
});

// Load treks immediately if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadTreks);
} else {
  loadTreks();
}

