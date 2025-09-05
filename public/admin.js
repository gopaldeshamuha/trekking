let lastActivityTime = Date.now();

// Update last activity time
function updateActivity() {
    lastActivityTime = Date.now();
}

// Check for admin authentication and inactivity
function checkAuth() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/admin-login.html';
        return false;
    }

    // Check for inactivity
    const currentTime = Date.now();
    if (currentTime - lastActivityTime > ADMIN_UTILS.CONSTANTS.INACTIVE_TIMEOUT || document.hidden) {
        console.log('Session expired due to inactivity or tab inactive');
        localStorage.removeItem('adminToken');
        window.location.href = '/admin-login.html';
        return false;
    }

    return token;
}

// Verify token is still valid
async function verifyToken() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/admin-login.html';
        return;
    }

    // Check for inactivity
    const currentTime = Date.now();
    if (currentTime - lastActivityTime > ADMIN_UTILS.CONSTANTS.INACTIVE_TIMEOUT) {
        console.log('Session expired due to inactivity');
        localStorage.removeItem('adminToken');
        window.location.href = '/admin-login.html';
        return;
    }

    try {
        const response = await fetch('/api/admin/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            localStorage.removeItem('adminToken');
            window.location.href = '/admin-login.html';
        }
    } catch (err) {
        localStorage.removeItem('adminToken');
    window.location.href = '/admin-login.html';
  }
}

// Set up periodic token verification
let tokenCheckInterval;

function startTokenCheck() {
  // Check token every 30 seconds
  tokenCheckInterval = setInterval(verifyToken, ADMIN_UTILS.CONSTANTS.TOKEN_CHECK_INTERVAL);
}

function stopTokenCheck() {
  if (tokenCheckInterval) {
    clearInterval(tokenCheckInterval);
  }
}

// Add auth headers to fetch requests
const authenticatedFetch = async (url, options = {}) => {
    // Update activity when making a request
    updateActivity();
    
    const token = checkAuth();
    if (!token) return Promise.reject('Not authenticated');
    
    // Check for inactivity before making request
    const currentTime = Date.now();
    if (currentTime - lastActivityTime > ADMIN_UTILS.CONSTANTS.INACTIVE_TIMEOUT) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin-login.html';
        return Promise.reject('Session expired due to inactivity');
    }
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`,
            }
        });
        
        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            window.location.href = '/admin-login.html';
            return Promise.reject('Session expired');
        }
        
        return response;
    } catch (err) {
        if (err.message.includes('401')) {
            localStorage.removeItem('adminToken');
            window.location.href = '/admin-login.html';
        }
        throw err;
    }
};

// Setup activity tracking
function setupActivityTracking() {
    // List of events to track for activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    // Throttle mousemove updates to once per second
    let lastMouseMove = 0;
    const mouseMoveHandler = (e) => {
        const now = Date.now();
        if (now - lastMouseMove >= 1000) {
            updateActivity();
            lastMouseMove = now;
        }
    };

    // Add event listeners
    events.forEach(event => {
        if (event === 'mousemove') {
            document.addEventListener(event, mouseMoveHandler);
        } else {
            document.addEventListener(event, updateActivity);
        }
    });

    // Track when tab becomes visible/invisible
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // When tab is hidden, we don't immediately count it as inactive
            // but we do update the last activity time
            lastActivityTime = Date.now();
        } else {
            // When returning to tab, update activity and check auth
            updateActivity();
            checkAuth();
        }
    });
}

// Notepad functionality
let notepadContent = localStorage.getItem('mismatchedNotes') || '';

function openNotepad() {
    const notepadContainer = document.getElementById('notepadContainer');
    const overlay = document.getElementById('notepadOverlay');
    const textarea = document.getElementById('notepadContent');
    
    textarea.value = notepadContent;
    notepadContainer.style.display = 'block';
    overlay.style.display = 'block';
    textarea.focus();
    
    // Add auto-save on input with visual feedback
    let saveTimeout;
    const inputHandler = () => {
        notepadContent = textarea.value;
        localStorage.setItem('mismatchedNotes', notepadContent);
        
        // Show "Saving..." indicator
        const saveIndicator = document.getElementById('saveIndicator');
        if (saveIndicator) {
            saveIndicator.textContent = 'Saving...';
            saveIndicator.style.opacity = '1';
            
            // Clear previous timeout
            if (saveTimeout) clearTimeout(saveTimeout);
            
            // Hide indicator after 1 second
            saveTimeout = setTimeout(() => {
                saveIndicator.style.opacity = '0';
            }, 1000);
        }
    };
    
    const keydownHandler = (e) => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveNotes();
        }
        if (e.key === 'Escape') {
            closeNotepad();
        }
    };
    
    // Remove any existing listeners to prevent duplicates
    textarea.removeEventListener('input', inputHandler);
    textarea.removeEventListener('keydown', keydownHandler);
    
    // Add new listeners
    textarea.addEventListener('input', inputHandler);
    textarea.addEventListener('keydown', keydownHandler);
    
    // Add click handler for overlay to close notepad
    const overlayClickHandler = (e) => {
        if (e.target === overlay) {
            closeNotepad();
        }
    };
    
    // Remove existing overlay listener and add new one
    overlay.removeEventListener('click', overlayClickHandler);
    overlay.addEventListener('click', overlayClickHandler);
}

function closeNotepad() {
    // Auto-save before closing
    const textarea = document.getElementById('notepadContent');
    if (textarea) {
        notepadContent = textarea.value;
        localStorage.setItem('mismatchedNotes', notepadContent);
        
        // Show auto-save confirmation
        const messageDiv = document.createElement('div');
        messageDiv.textContent = 'Notes auto-saved!';
        messageDiv.style.position = 'fixed';
        messageDiv.style.bottom = '20px';
        messageDiv.style.right = '20px';
        messageDiv.style.background = '#4ade80';
        messageDiv.style.color = 'white';
        messageDiv.style.padding = '10px 20px';
        messageDiv.style.borderRadius = '5px';
        messageDiv.style.zIndex = '1001';
        
        document.body.appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 2000);
    }
    
    const notepadContainer = document.getElementById('notepadContainer');
    const overlay = document.getElementById('notepadOverlay');
    
    notepadContainer.style.display = 'none';
    overlay.style.display = 'none';
}

function saveNotes() {
    const textarea = document.getElementById('notepadContent');
    notepadContent = textarea.value;
    localStorage.setItem('mismatchedNotes', notepadContent);
    
    // Show save confirmation
    const messageDiv = document.createElement('div');
    messageDiv.textContent = 'Notes saved!';
    messageDiv.style.position = 'fixed';
    messageDiv.style.bottom = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.background = '#4ade80';
    messageDiv.style.color = 'white';
    messageDiv.style.padding = '10px 20px';
    messageDiv.style.borderRadius = '5px';
    messageDiv.style.zIndex = '1001';
    
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 2000);
    
    // Close the notepad after saving
        closeNotepad();
}

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication when page loads
    checkAuth();
    
    // Setup activity tracking
    setupActivityTracking();
    
    // Add Mismatched Fields button to sidebar
    const sidebar = document.querySelector('.admin-dashboard');
    const mismatchedBtn = document.createElement('button');
    mismatchedBtn.id = 'adminMenuMismatched';
    mismatchedBtn.className = 'admin-menu-btn';
    mismatchedBtn.innerHTML = '📝 Mismatched Fields';
    mismatchedBtn.onclick = () => {
        // Set this button as active
        document.querySelectorAll('.admin-menu-btn').forEach(btn => btn.classList.remove('active'));
        mismatchedBtn.classList.add('active');
        
        // Show notepad
        openNotepad();
    };
    
    // Add button after Feedback button
    const feedbackButton = document.getElementById('adminMenuFeedback');
    if (feedbackButton && feedbackButton.parentNode) {
        feedbackButton.parentNode.insertBefore(mismatchedBtn, feedbackButton.nextSibling);
    }
    
    // Start token and activity verification
    startTokenCheck();
    
    // Initial activity timestamp
    updateActivity();
    
    // Check for inactivity every minute
    setInterval(() => {
        const currentTime = Date.now();
        const inactiveTime = currentTime - lastActivityTime;
        console.log(`Inactive time: ${Math.round(inactiveTime / 1000)} seconds`);
        
        if (inactiveTime > ADMIN_UTILS.CONSTANTS.INACTIVE_TIMEOUT) {
            console.log('Session expired due to inactivity');
            localStorage.removeItem('adminToken');
            window.location.href = '/admin-login.html';
        }
    }, ADMIN_UTILS.CONSTANTS.INACTIVITY_CHECK_INTERVAL);
    
    // Stop token check when leaving the page
    window.addEventListener('beforeunload', stopTokenCheck);
  
  // Sidebar menu event listeners

  const treksBtn = document.getElementById('adminMenuTreks');
  const bookingsBtn = document.getElementById('adminMenuBookings');
  const queriesBtn = document.getElementById('adminMenuQueries');
  const trekwiseBtn = document.getElementById('adminMenuTrekwise');
  const addTrekBtn = document.getElementById('adminMenuAddTrek');
  const feedbackBtn = document.getElementById('adminMenuFeedback');
  const menuBtns = [queriesBtn, bookingsBtn, trekwiseBtn, treksBtn, addTrekBtn, feedbackBtn];
  feedbackBtn.addEventListener('click', () => {
    setActive(feedbackBtn);
    fetchFeedback();
  });
// Fetch and render feedback entries
async function fetchFeedback() {
  const content = document.getElementById('adminContent');
  content.innerHTML = '<div class="loading">Loading feedback...</div>';
  try {
    const res = await authenticatedFetch('/api/feedback');
    if (!res.ok) throw new Error('Failed to fetch feedback');
    const feedbackList = await res.json();
    renderFeedback(feedbackList);
  } catch (err) {
    content.innerHTML = '<div class="error-message">Failed to load feedback.</div>';
  }
}

function renderFeedback(list) {
  const content = document.getElementById('adminContent');
  content.innerHTML = [
    '<h2 style="margin-bottom:1em;">User Feedback</h2>',
    list.length === 0
      ? '<div class="loading">No feedback submitted yet.</div>'
      : `<div class="feedback-list-admin"><table class="admin-feedback-table"><thead><tr><th>ID</th><th>Feedback</th><th>Date</th></tr></thead><tbody>` +
        list.map(f => `
          <tr class="feedback-item-admin">
            <td style="width:60px;font-weight:600;color:var(--brand-end);text-align:center;">${f.id}</td>
            <td style="font-size:1.08em;line-height:1.6;white-space:pre-line;">${escapeHtml(f.feedback)}</td>
            <td style="font-size:0.98em;color:var(--muted);text-align:center;min-width:120px;">${formatDateTime(f.created_at)}</td>
          </tr>
        `).join('') + '</tbody></table></div>'
  ].join('');
}

// Helper to escape HTML
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
// Helper to format date/time
function formatDateTime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleString();
}

  function setActive(btn) {
    menuBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }


  queriesBtn.addEventListener('click', () => {
    setActive(queriesBtn);
    fetchQueries();
  });
  bookingsBtn.addEventListener('click', () => {
    setActive(bookingsBtn);
    fetchBookings();
  });
  trekwiseBtn.addEventListener('click', () => {
    setActive(trekwiseBtn);
    fetchTrekwiseBookings();
  });
  treksBtn.addEventListener('click', () => {
    setActive(treksBtn);
    fetchTreks();
  });
  addTrekBtn.addEventListener('click', () => {
    setActive(addTrekBtn);
    renderChangesTabs();
  });

  function renderChangesTabs() {
    const content = document.getElementById('adminContent');
    content.innerHTML = [
      '<div class="changes-tabs" style="display:flex;gap:1em;margin-bottom:1.5em;">',
        '<button class="changes-tab-btn active" data-tab="addTrek">Add Trek</button>',
        '<button class="changes-tab-btn" data-tab="slide">Slide</button>',
        '<button class="changes-tab-btn" data-tab="trailMoment">Trail Moment</button>',
      '</div>',
      '<div id="changesTabContent"></div>'
    ].join('');
    // Tab switching logic
    const tabBtns = Array.from(document.querySelectorAll('.changes-tab-btn'));
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderChangesTabContent(btn.dataset.tab);
      });
    });
    renderChangesTabContent('addTrek');
  }

  function renderChangesTabContent(tab) {
    const tabContent = document.getElementById('changesTabContent');
    if (tab === 'addTrek') {
      tabContent.innerHTML = renderAddTrekFormHTML();
      bindAddTrekForm();
    } else if (tab === 'slide') {
      renderSlideImageTable(tabContent);
    } else if (tab === 'trailMoment') {
      renderTrailMomentImageTable(tabContent);
    }
}

// Trail Moments Gallery Management
async function renderTrailMomentImageTable(tabContent) {
  tabContent.innerHTML = '<div class="loading">Loading gallery images...</div>';
  try {
    const res = await fetch('/api/gallery');
    let images = await res.json();
    if (!Array.isArray(images) || images.length === 0) {
      images = [
        '', '', '', '', '', ''
      ];
    }
    tabContent.innerHTML = [
      '<table class="admin-trek-table" style="width:100%;margin-bottom:1.5em;">',
      '<thead><tr><th>#</th><th>Image URL</th><th>Preview</th><th>Action</th></tr></thead>',
      '<tbody>',
      images.map((img, i) => `
        <tr data-imgidx="${i}">
          <td style="font-weight:600;">${i+1}</td>
          <td>
            <input type="url" class="trail-moment-image-input" name="img${i}" value="${img || ''}" 
              style="width:90%;max-width:340px;"
              oninput="updateTrailMomentPreview(this, ${i})">
          </td>
          <td>
            <img src="${img || ''}" alt="Trail Moment ${i+1}" 
              id="trailMomentPreview${i}"
              style="max-width:180px;max-height:80px;border-radius:8px;border:1px solid #eee;object-fit:cover;">
          </td>
          <td>
            <button onclick="saveTrailMoment(${i})" 
              class="save-moment-btn"
              style="background:linear-gradient(90deg,#ff9800,#ffb347);color:#fff;font-weight:700;padding:0.4em 1.2em;border:none;border-radius:8px;cursor:pointer;">
              Save
            </button>
          </td>
        </tr>
      `).join(''),
      '</tbody></table>',
      '<div id="trailMomentMsg"></div>'
    ].join('');

    // Add helper functions to window for button onclick handlers
    window.updateTrailMomentPreview = function(input, index) {
      const preview = document.getElementById(`trailMomentPreview${index}`);
      if (preview) {
        preview.src = input.value.trim() || '';
      }
    };

    window.saveTrailMoment = async function(index) {
      const input = document.querySelector(`input[name="img${index}"]`);
      const messageEl = document.getElementById('trailMomentMsg');
      if (!input) return;

      try {
        // Get current gallery first
        const res = await fetch('/api/gallery');
        const currentImages = await res.json();
        console.log('Current gallery:', currentImages);
        
        // Update only the specific image
        const newImages = Array.isArray(currentImages) ? [...currentImages] : ['', '', '', '', '', ''];
        newImages[index] = input.value.trim();
        console.log('Sending updated gallery:', newImages);
        
        const saveRes = await fetch('/api/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: newImages })
        });
        
        if (!saveRes.ok) {
          const errorData = await saveRes.json();
          throw new Error(errorData.error || 'Failed to update');
        }

        messageEl.innerHTML = `<span style="color:green">Image ${index + 1} updated!</span>`;
        setTimeout(() => {
          messageEl.innerHTML = '';
        }, 3000);

        // Update the gallery on the main page
        const galleryEl = document.getElementById('trailMomentGallery');
        if (galleryEl) {
          // Fetch updated gallery and refresh display
          const galleryRes = await fetch('/api/gallery');
          const updatedImages = await galleryRes.json();
          galleryEl.innerHTML = updatedImages.map((img, i) =>
            img ? `<img src="${img}" alt="Trail Moment ${i+1}">` : ''
          ).join('');
        }
      } catch (err) {
        console.error('Error updating gallery:', err);
        messageEl.innerHTML = `<span style="color:red">Failed to update image ${index + 1}: ${err.message}</span>`;
      }
    };
  } catch (err) {
    tabContent.innerHTML = '<div class="error-message">Failed to load gallery images.</div>';
  }
}

async function renderSlideImageTable(tabContent) {
  tabContent.innerHTML = '<div class="loading">Loading treks...</div>';
  try {
    const res = await fetch('/api/treks');
    const treks = await res.json();
    if (!Array.isArray(treks) || treks.length === 0) {
      tabContent.innerHTML = '<div class="loading">No treks found.</div>';
      return;
    }
    tabContent.innerHTML = [
      '<table class="admin-trek-table" style="width:100%;margin-bottom:1.5em;">',
      '<thead><tr><th style="width:40%">Trek Name</th><th>Image</th><th>Action</th></tr></thead>',
      '<tbody>',
      treks.map(t => `
        <tr data-trekid="${t.id}">
          <td style="font-weight:600;">${t.name}</td>
          <td style="max-width:320px;">
            <input type="url" class="slide-image-input" value="${t.image || ''}" style="width:90%;max-width:340px;">
            <div style="margin-top:0.5em;"><img src="${t.image || ''}" alt="${t.name}" style="max-width:180px;max-height:80px;border-radius:8px;border:1px solid #eee;object-fit:cover;"></div>
          </td>
          <td><button class="save-slide-image-btn" style="background:linear-gradient(90deg,#ff9800,#ffb347);color:#fff;font-weight:700;padding:0.4em 1.2em;border:none;border-radius:8px;cursor:pointer;">Save</button></td>
        </tr>
      `).join(''),
      '</tbody></table>',
      '<div id="slideImageMsg"></div>'
    ].join('');
    // Add save event listeners
    tabContent.querySelectorAll('.save-slide-image-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const row = btn.closest('tr');
        const trekId = row.getAttribute('data-trekid');
        const input = row.querySelector('.slide-image-input');
        const newImage = input.value.trim();
        btn.disabled = true;
        try {
          const res = await fetch(`/api/treks/${trekId}/image`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: newImage })
          });
          if (res.ok) {
            document.getElementById('slideImageMsg').innerHTML = '<span style="color:green">Image updated!</span>';
            renderSlideImageTable(tabContent);
          } else {
            document.getElementById('slideImageMsg').innerHTML = '<span style="color:red">Failed to update image.</span>';
          }
        } catch (err) {
          document.getElementById('slideImageMsg').innerHTML = '<span style="color:red">Error updating image.</span>';
        }
        btn.disabled = false;
      });
    });
  } catch (err) {
    tabContent.innerHTML = '<div class="error-message">Failed to load treks.</div>';
  
}
}

function renderAddTrekFormHTML() {
    return [
      '<form id="addTrekForm" class="admin-add-trek-form">',
      '<label for="trekName">Trek Name*</label>',
      '<input type="text" id="trekName" name="name" required minlength="3" placeholder="Enter trek name (min 3 characters)">',
      '<label for="trekDesc">Description*</label>',
      '<textarea id="trekDesc" name="description" required minlength="10" placeholder="Describe the trek experience (min 10 characters)"></textarea>',
      '<label for="trekDuration">Duration*</label>',
      '<input type="text" id="trekDuration" name="duration" required placeholder="Every Saturday & Sunday">',
      '<label for="trekLength">Trek Length (km)*</label>',
      '<input type="number" id="trekLength" name="trek_length" min="0.1" step="0.1" required placeholder="Enter trek distance">',
      '<label for="trekDifficulty">Difficulty*</label>',
      '<select id="trekDifficulty" name="difficulty" required>',
        '<option value="">Select difficulty level</option>',
        '<option value="Easy">Easy</option>',
        '<option value="Moderate">Moderate</option>',
        '<option value="Challenging">Challenging</option>',
      '</select>',
      '<label for="trekMaxAlt">Max Altitude (ft)*</label>',
      '<input type="number" id="trekMaxAlt" name="max_altitude" min="1" required placeholder="Enter maximum altitude">',
      '<label for="trekBaseVillage">Base Village*</label>',
      '<input type="text" id="trekBaseVillage" name="base_village" required placeholder="Enter base village name">',
      '<label for="trekTransport">Transport*</label>',
      '<input type="text" id="trekTransport" name="transport" required placeholder="Transport details">',
      '<label for="trekMeals">Meals*</label>',
      '<input type="text" id="trekMeals" name="meals" required placeholder="Meal arrangements">',
      '<label for="trekSightseeing">Sightseeing*</label>',
      '<textarea id="trekSightseeing" name="sightseeing" required placeholder="Sightseeing highlights"></textarea>',
      '<label for="trekImage">Image URL*</label>',
      '<input type="url" id="trekImage" name="image" required placeholder="https://example.com/image.jpg">',
      '<label for="trekPrice">Price (INR)*</label>',
      '<input type="number" id="trekPrice" name="price" min="0" step="100" required placeholder="Enter trek price">',
      '<button type="submit">Add Trek</button>',
      '</form>',
      '<div id="addTrekMsg"></div>'
    ].join('');
  }

  function bindAddTrekForm() {
    const form = document.getElementById('addTrekForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      // Validate data using utility function
      const validation = ADMIN_UTILS.VALIDATION.validateTrekData(data);
      if (!validation.isValid) {
        ADMIN_UTILS.ERROR_HANDLING.showError(validation.errors.join('<br>'), 'addTrekMsg');
        return;
      }
      
      try {
        // Get next available ID
        data.id = await ADMIN_UTILS.DATA.getNextTrekId();
        
        const res = await fetch('/api/treks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (res.ok) {
          ADMIN_UTILS.ERROR_HANDLING.showSuccess('Trek added successfully!', 'addTrekMsg');
          form.reset();
          
          // Refresh treks list if available
          if (typeof fetchTreks === 'function') {
            fetchTreks();
          }
        } else {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to add trek');
        }
      } catch (err) {
        const errorMessage = ADMIN_UTILS.ERROR_HANDLING.handleApiError(err, 'Adding trek');
        ADMIN_UTILS.ERROR_HANDLING.showError(errorMessage, 'addTrekMsg');
      }
    });
  }
// Fetch and render trekwise booking counts
async function fetchTrekwiseBookings() {
  try {
    // Fetch all treks and bookings
    const [treksRes, bookingsRes] = await Promise.all([
      fetch('/api/treks'),
      fetch('/api/bookings')
    ]);
    const treks = await treksRes.json();
    const bookings = await bookingsRes.json();
    // Manual reset logic
    let resetData = localStorage.getItem('trekwise_manual_reset');
    let lastReset = localStorage.getItem('trekwise_last_reset');
    let resetObj = { reset: false, time: null };
    if (resetData) {
      try { resetObj = JSON.parse(resetData); } catch {}
    }
    // Map trek id to name
    const trekMap = {};
    treks.forEach(t => trekMap[t.id] = t.name);
    // Only count bookings after last reset
    let resetTime = resetObj.reset && resetObj.time ? new Date(resetObj.time) : null;
    const trekCounts = {};
    bookings.forEach(b => {
      // If reset, only count bookings after reset time
      let created = b.created_at ? new Date(b.created_at) : null;
      if (resetTime && created && created <= resetTime) return;
      if (!trekCounts[b.trek_id]) trekCounts[b.trek_id] = 0;
      trekCounts[b.trek_id] += Number(b.groupSize) || 1;
    });
    // Prepare data for display
    const rows = treks.map(t => ({
      name: t.name,
      count: trekCounts[t.id] || 0
    }));
    renderTrekwiseBookings(rows, resetObj.time);
  } catch (err) {
    renderError('Failed to load trekwise bookings.');
  }
}

function renderTrekwiseBookings(rows, lastResetTime) {
  const content = document.getElementById('adminContent');
  // Format last reset time
  let resetText = '';
  if (lastResetTime) {
    const d = new Date(lastResetTime);
    resetText = `<div style="font-size:1.1em;font-weight:600;margin-bottom:0.7em;color:#ff9800;">Last Reset: ${d.toLocaleString()}</div>`;
  } else {
    resetText = `<div style="font-size:1.1em;font-weight:600;margin-bottom:0.7em;color:#ff9800;">No reset yet</div>`;
  }
  content.innerHTML = [
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5em;">',
      resetText,
      '<div style="display:flex;gap:0.5em;align-items:center;">',
        '<button id="trekwiseResetBtn" title="Reset Data" style="background:linear-gradient(90deg,#ff9800,#ffb347);color:#fff;font-weight:700;padding:0.5em 1.2em;border:none;border-radius:8px;box-shadow:0 2px 8px 0 rgba(0,0,0,0.10);cursor:pointer;font-size:1em;">Reset Data</button>',
        '<button id="trekwiseRevertBtn" title="Revert Reset" style="background:#fff;color:#ff9800;font-weight:700;padding:0.5em 0.9em;border:2px solid #ff9800;border-radius:8px;box-shadow:0 2px 8px 0 rgba(0,0,0,0.07);cursor:pointer;font-size:1.2em;line-height:1;">&#8634;</button>',
      '</div>',
    '</div>',
    '<div class="admin-trekwise-table-wrap" style="overflow-x:auto;">',
    '<table class="admin-trek-table" style="width:100%;border-collapse:collapse;">',
    '<thead><tr><th>Trek Name</th><th>Total Bookings</th></tr></thead>',
    '<tbody>',
    rows.map(r => `<tr><td>${r.name}</td><td>${r.count}</td></tr>`).join(''),
    '</tbody></table></div>'
  ].join('');
  // Add reset button handler
  const resetBtn = document.getElementById('trekwiseResetBtn');
  if (resetBtn) {
    resetBtn.onclick = function() {
      const now = new Date();
      // Save previous reset state for revert
      const prev = localStorage.getItem('trekwise_manual_reset');
      if (prev) localStorage.setItem('trekwise_manual_reset_prev', prev);
      localStorage.setItem('trekwise_manual_reset', JSON.stringify({reset:true, time:now.toISOString()}));
      fetchTrekwiseBookings();
    };
  }
  // Add revert button handler
  const revertBtn = document.getElementById('trekwiseRevertBtn');
  if (revertBtn) {
    revertBtn.onclick = function() {
      const prev = localStorage.getItem('trekwise_manual_reset_prev');
      if (prev) {
        localStorage.setItem('trekwise_manual_reset', prev);
        fetchTrekwiseBookings();
      } else {
        alert('No previous reset state to revert to.');
      }
    };
  }
}

  // Default: show Booking Details
  setActive(bookingsBtn);
  fetchBookings();
});
// Add Trek form rendering and submission

// Consolidated Add Trek form - using renderAddTrekFormHTML() function

// Form binding is handled by bindAddTrekForm() function

async function fetchTreks() {
  try {
    const res = await fetch('/api/treks');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const treks = await res.json();
    renderTreks(treks);
  } catch (err) {
    const errorMessage = ADMIN_UTILS.ERROR_HANDLING.handleApiError(err, 'Fetching treks');
    renderError(errorMessage);
  }
}

async function fetchBookings() {
  try {
    const res = await fetch('/api/bookings');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const bookings = await res.json();
    renderBookings(bookings);
  } catch (err) {
    const errorMessage = ADMIN_UTILS.ERROR_HANDLING.handleApiError(err, 'Fetching bookings');
    renderError(errorMessage);
  }
}

async function fetchQueries() {
  try {
    const res = await fetch('/api/business-queries');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const queries = await res.json();
    renderQueries(queries);
  } catch (err) {
    const errorMessage = ADMIN_UTILS.ERROR_HANDLING.handleApiError(err, 'Fetching business queries');
    renderError(errorMessage);
  }
}

function renderTreks(treks) {
  const content = document.getElementById('adminContent');
  if (!Array.isArray(treks)) return renderError('No treks found.');


  // Add Delete column
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'price', label: 'Price' },
    { key: 'delete', label: 'Delete' }
  ];

  // Table header
  const thead = [
    '<thead><tr>',
    columns.map(col => `<th><span class="trek-col-label" id="col-label-${col.key}">${col.label}</span></th>`).join(''),
    '</tr></thead>'
  ].join('');

  // Table body with editable price and delete button
  const tbody = [
    '<tbody>',
    treks.map(trek =>
      `<tr data-trekid="${trek.id}">` +
        `<td>${trek.id}</td>` +
        `<td>${trek.name}</td>` +
        `<td><input type="number" class="edit-trek-price" value="${trek.price}" min="0" style="width:90px;"> <button class="save-trek-price" title="Save" style="margin-left:0.5em;">💾</button></td>` +
        `<td><button class="delete-trek-btn" title="Delete" style="background:#ff2f2f;color:#fff;border:none;border-radius:6px;padding:0.4em 1.1em;cursor:pointer;font-weight:700;">Delete</button></td>` +
      '</tr>'
    ).join('') +
    '</tbody>'
  ].join('');

  content.innerHTML = [
    '<div class="admin-trek-table-wrap" style="overflow-x:auto;">',
    '<table class="admin-trek-table" style="width:100%;border-collapse:collapse;">',
    thead,
    tbody,
    '</table>',
    '</div>',
    '<div id="trekPriceMsg"></div>'
  ].join('');

  // Add save event listeners for price
  const saveBtns = content.querySelectorAll('.save-trek-price');
  saveBtns.forEach(btn => {
    btn.addEventListener('click', async function(e) {
      const row = btn.closest('tr');
      const trekId = row.getAttribute('data-trekid');
      const priceInput = row.querySelector('.edit-trek-price');
      const newPrice = priceInput.value;
      btn.disabled = true;
      try {
        const res = await fetch(`/api/treks/${trekId}/price`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ price: newPrice })
        });
        if (res.ok) {
          document.getElementById('trekPriceMsg').innerHTML = '<span style="color:green">Price updated!</span>';
          // Refresh dashboard and frontend
          fetchTreks();
          if (window.loadTreks) window.loadTreks();
        } else {
          document.getElementById('trekPriceMsg').innerHTML = '<span style="color:red">Failed to update price.</span>';
        }
      } catch (err) {
        document.getElementById('trekPriceMsg').innerHTML = '<span style="color:red">Error updating price.</span>';
      }
      btn.disabled = false;
    });
  });

  // Add delete event listeners
  const deleteBtns = content.querySelectorAll('.delete-trek-btn');
  deleteBtns.forEach(btn => {
    btn.addEventListener('click', async function(e) {
      const row = btn.closest('tr');
      const trekId = row.getAttribute('data-trekid');
      if (!confirm('Are you sure you want to delete this trek? This cannot be undone.')) return;
      btn.disabled = true;
      try {
        const res = await fetch(`/api/treks/${trekId}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          document.getElementById('trekPriceMsg').innerHTML = '<span style="color:green">Trek deleted!</span>';
          fetchTreks();
          if (window.loadTreks) window.loadTreks();
        } else {
          document.getElementById('trekPriceMsg').innerHTML = '<span style="color:red">Failed to delete trek.</span>';
        }
      } catch (err) {
        document.getElementById('trekPriceMsg').innerHTML = '<span style="color:red">Error deleting trek.</span>';
      }
      btn.disabled = false;
    });
  });
}

// Store last trek data for filtering
let lastTrekData = [];

// Show filter input for a column
function showTrekFilterInput(colKey, columns) {
  const wrap = document.getElementById('trekFilterInputWrap');
  wrap.innerHTML = '';
  // Highlight column label
  columns.forEach(col => {
    const label = document.getElementById('col-label-' + col.key);
    if (label) {
      label.style.background = (col.key === colKey) ? 'var(--brand-start, #ff512f)' : '';
      label.style.color = (col.key === colKey) ? '#fff' : '';
      label.style.borderRadius = (col.key === colKey) ? '6px' : '';
      label.style.padding = (col.key === colKey) ? '0.1em 0.5em' : '';
    }
  });
  // Add input
  wrap.innerHTML = [
    `<div style="margin:0.7em 0 1em 0;display:flex;align-items:center;gap:0.5em;">`,
    `<label style="font-weight:600;">Filter by ${columns.find(c => c.key === colKey).label}:</label>`,
    `<input type="text" id="trekFilterInput" style="padding:0.3em 0.7em;border-radius:5px;border:1px solid #ccc;">`,
    `<button id="trekFilterApplyBtn" style="margin-left:0.5em;">Apply</button>`,
    `<button id="trekFilterClearBtn" style="margin-left:0.5em;">Clear</button>`,
    `</div>`
  ].join('');
  document.getElementById('trekFilterInput').focus();
  document.getElementById('trekFilterApplyBtn').onclick = function() {
    applyTrekColumnFilter(colKey, columns);
  };
  document.getElementById('trekFilterClearBtn').onclick = function() {
    clearTrekColumnFilter(columns);
  };
}

// Apply filter to trek table
function applyTrekColumnFilter(colKey, columns) {
  const input = document.getElementById('trekFilterInput');
  if (!input) return;
  const value = input.value.trim().toLowerCase();
  if (!lastTrekData.length) {
    // Save last data
    const rows = document.querySelectorAll('.admin-trek-table tbody tr');
    lastTrekData = Array.from(rows).map(row => Array.from(row.children).map(td => td.innerText));
  }
  const colIdx = columns.findIndex(c => c.key === colKey);
  const rows = document.querySelectorAll('.admin-trek-table tbody tr');
  rows.forEach((row, i) => {
    const cell = row.children[colIdx];
    if (!cell.innerText.toLowerCase().includes(value)) {
      row.style.display = 'none';
    } else {
      row.style.display = '';
    }
  });
}

// Clear trek table filter
function clearTrekColumnFilter(columns) {
  const rows = document.querySelectorAll('.admin-trek-table tbody tr');
  rows.forEach(row => row.style.display = '');
  // Remove highlight
  columns.forEach(col => {
    const label = document.getElementById('col-label-' + col.key);
    if (label) {
      label.style.background = '';
      label.style.color = '';
      label.style.borderRadius = '';
      label.style.padding = '';
    }
  });
  document.getElementById('trekFilterInputWrap').innerHTML = '';
  lastTrekData = [];
}
function renderBookings(bookings) {
  const content = document.getElementById('adminContent');
  if (!Array.isArray(bookings)) return renderError('No bookings found.');

  // Sort bookings: newest first (by id or created_at)
  bookings = bookings.slice().sort((a, b) => {
    if (b.created_at && a.created_at) {
      return new Date(b.created_at) - new Date(a.created_at);
    }
    return (b.id || 0) - (a.id || 0);
  });

  // Pagination logic
  const pageSize = 10;
  let page = 1;
  // Try to keep page in memory for user
  if (window.bookingPage) page = window.bookingPage;
  const totalPages = Math.ceil(bookings.length / pageSize) || 1;
  if (page > totalPages) page = totalPages;

  function renderPage(pageNum) {
    window.bookingPage = pageNum;
    const start = (pageNum - 1) * pageSize;
    const end = start + pageSize;
    const pageBookings = bookings.slice(start, end);

    // Define columns for booking table
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'trekName', label: 'Trek Name' },
      { key: 'fullName', label: 'Full Name' },
      { key: 'email', label: 'Email' },
      { key: 'contact', label: 'Phone' },
      { key: 'groupSize', label: 'Group Size' },
      { key: 'notes', label: 'Notes' }
    ];

    // Table header with color grading and center alignment
    const thead = [
      '<thead><tr>',
      columns.map(col =>
        `<th style="background:linear-gradient(90deg, var(--brand-start,#ff9800), var(--brand-end,#ffb347));color:#fff;text-align:center;padding:0.7em 0.5em;font-size:1.1em;border:1px solid #fff;letter-spacing:0.5px;">` +
        `<span class="booking-col-label" id="col-label-${col.key}">${col.label}</span></th>`
      ).join(''),
      '</tr></thead>'
    ].join('');

    // Table body
    const tbody = [
      '<tbody>',
      pageBookings.map(b =>
        '<tr>' + columns.map(col =>
          `<td style="text-align:center;border:1px solid #eee;">${b[col.key] != null ? b[col.key] : ''}</td>`
        ).join('') + '</tr>'
      ).join(''),
      '</tbody>'
    ].join('');

    // Pagination controls using utility function
    const pagination = ADMIN_UTILS.UI.createPagination(pageNum, totalPages, (page) => renderPage(page));

    content.innerHTML = [
      '<div class="admin-booking-table-wrap" style="overflow-x:auto;">',
      '<table class="admin-trek-table" style="width:100%;border-collapse:collapse;box-shadow:0 2px 16px 0 rgba(0,0,0,0.07);background:var(--card);">',
      thead,
      tbody,
      '</table>',
      '</div>',
      pagination
    ].join('');

    // Add event listeners for pagination using utility function
    ADMIN_UTILS.UI.bindPaginationEvents(content, (page) => renderPage(page));
  }

  renderPage(page);
}

function renderQueries(queries) {
  const content = document.getElementById('adminContent');
  if (!Array.isArray(queries)) return renderError('No business queries found.');

  // Pagination logic
  const pageSize = 10;
  let page = 1;
  if (window.queryPage) page = window.queryPage;
  const totalPages = Math.ceil(queries.length / pageSize) || 1;
  if (page > totalPages) page = totalPages;

  // Persist contacted state in localStorage (one-way only)
  function getContactedMap() {
    try {
      return JSON.parse(localStorage.getItem('business_queries_contacted') || '{}');
    } catch { return {}; }
  }
  function setContacted(id, val) {
    const map = getContactedMap();
    if (val) { map[id] = true; }
    localStorage.setItem('business_queries_contacted', JSON.stringify(map));
  }

  function renderPage(pageNum) {
    window.queryPage = pageNum;
    const start = (pageNum - 1) * pageSize;
    const end = start + pageSize;
    const pageQueries = queries.slice(start, end);
    const contactedMap = getContactedMap();

    // Table columns
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'message', label: 'Message' },
      { key: 'contacted', label: 'Contacted?' }
    ];

    // Table header
    const thead = [
      '<thead><tr>',
      columns.map(col =>
        `<th style="background:linear-gradient(90deg, var(--brand-start,#ff9800), var(--brand-end,#ffb347));color:#fff;text-align:center;padding:0.7em 0.5em;font-size:1.1em;border:1px solid #fff;letter-spacing:0.5px;">${col.label}</th>`
      ).join(''),
      '</tr></thead>'
    ].join('');

    // Table body
    const tbody = [
      '<tbody>',
      pageQueries.map(q => {
        const contacted = contactedMap[q.id] === true;
        return '<tr>' +
          `<td style="text-align:center;border:1px solid #eee;">${q.name}</td>` +
          `<td style="text-align:center;border:1px solid #eee;">${q.email}</td>` +
          `<td style="text-align:center;border:1px solid #eee;">${q.phone || ''}</td>` +
          `<td style="text-align:center;border:1px solid #eee;max-width:320px;word-break:break-word;">${q.message}</td>` +
          `<td style="text-align:center;border:1px solid #eee;">` +
            (contacted
              ? `<span style='background:#4caf50;color:#fff;border-radius:6px;padding:0.3em 1em;font-weight:600;'>Contacted</span>`
              : `<button class="contacted-btn" data-id="${q.id}" style="background:#ff9800;color:#fff;border:none;border-radius:6px;padding:0.3em 1em;cursor:pointer;font-weight:600;">Not Contacted</button>`)
          + `</td>` +
        '</tr>';
      }).join('') +
      '</tbody>'
    ].join('');

    // Pagination controls using utility function
    const pagination = ADMIN_UTILS.UI.createPagination(pageNum, totalPages, (page) => renderPage(page));

    content.innerHTML = [
      '<div class="admin-booking-table-wrap" style="overflow-x:auto;">',
      '<table class="admin-trek-table" style="width:100%;border-collapse:collapse;box-shadow:0 2px 16px 0 rgba(0,0,0,0.07);background:var(--card);">',
      thead,
      tbody,
      '</table>',
      '</div>',
      pagination
    ].join('');

    // Pagination event listeners using utility function
    ADMIN_UTILS.UI.bindPaginationEvents(content, (page) => renderPage(page));

    // Contacted button event listeners (one-way only)
    content.querySelectorAll('.contacted-btn').forEach(btn => {
      btn.onclick = function() {
        const id = btn.getAttribute('data-id');
        setContacted(id, true);
        renderPage(pageNum);
      };
    });
  }

  renderPage(page);
}

function renderError(msg) {
  const content = document.getElementById('adminContent');
  content.innerHTML = '<div class="admin-error">' + msg + '</div>';
}
