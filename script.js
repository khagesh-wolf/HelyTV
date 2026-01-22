document.addEventListener('DOMContentLoaded', function() {

    // --- CONTENT PROTECTION SCRIPTS ---
    // Disable right-click
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });

    // Disable common developer keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // F12
        if(e.key === 'F12' || e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Inspect Element)
        if(e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
            e.preventDefault();
            return false;
        }
        // Ctrl+U (View Source)
        if(e.ctrlKey && (e.key === 'u' || e.keyCode === 85)) {
            e.preventDefault();
            // Redirect attempt if they try shortcut
            window.location.href = "https://khagesh.com.np";
            return false;
        }
        // Ctrl+S (Save Page)
        if(e.ctrlKey && (e.key === 's' || e.keyCode === 83)) {
            e.preventDefault();
            return false;
        }
    });

    // --- CONFIGURATION ---
    const GOOGLE_SHEET_ID = "1RthMctHFdKX7yEznC25Va8weBKwjchXCvXS4f4QCl6U"; // UPDATED SHEET ID
    const SHEET_TAB_NAME = "Sheet1"; // Change if your tab name is different
    // ---------------------

    const container = document.getElementById('match-cards-container');
    const parentContainer = container ? container.closest('.watch-live-container') : null;
    const progressBar = document.getElementById('scroll-progress-bar');
    const scrollLeftBtn = document.getElementById('scroll-left');
    const scrollRightBtn = document.getElementById('scroll-right');
    
    // --- NEW VARIABLES FOR OVERLAY ---
    let allMatchesData = [];
    const viewAllBtn = document.getElementById('view-all-btn');
    const overlay = document.getElementById('match-overlay');
    const closeBtn = document.getElementById('close-overlay');
    const overlayGrid = document.getElementById('overlay-grid');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    // --- VARIABLES FOR INSTALL MODAL & PWA ---
    const installModal = document.getElementById('install-modal');
    const downloadAppBtn = document.getElementById('download-app-btn');
    const closeInstallBtn = document.getElementById('close-install');
    const installTabs = document.querySelectorAll('.install-tab');
    const installContents = document.querySelectorAll('.install-content');
    const pwaInstallBtn = document.getElementById('pwa-install-btn');
    let deferredPrompt; // To hold the PWA prompt event

    let statusInterval = null;
    let sortInterval = null;
    let observer = null;

    // --- GOOGLE SHEETS FETCH FUNCTION ---
    function fetchAndRenderMatches() {
        if (!container) return;

        const endpoint = `https://opensheet.elk.sh/${GOOGLE_SHEET_ID}/${SHEET_TAB_NAME}`;

        fetch(endpoint)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                // Clear loading skeletons
                container.innerHTML = '';
                allMatchesData = data; // Store for modal usage
                
                // Add the widgets container back just in case (hidden)
                const widgetSection = document.createElement('div');
                widgetSection.id = 'watch-live-cards-section';
                widgetSection.style.display = 'none';
                container.appendChild(widgetSection);

                data.forEach(match => {
                   const cardHTML = createMatchCard(match);
                   container.insertAdjacentHTML('beforeend', cardHTML);
                });

                // Start the logic
                runAllUpdates();
            })
            .catch(error => {
                console.error('Error fetching matches:', error);
                container.innerHTML = '<div class="text-white p-4">Failed to load matches. Check Sheet ID.</div>';
            });
    }

    function createMatchCard(match) {
        // Safe defaults if data is missing
        const bgImage = match.BG_Image || 'https://www.fancode.com/skillup-uploads/cms-media/134017_5609_VCT_NSW_fc-Web.jpg';
        const team1Logo = match.Team1_Logo || 'https://placehold.co/100x100?text=T1';
        const team2Logo = match.Team2_Logo || 'https://placehold.co/100x100?text=T2';
        
        return `
        <a href="${match.Link}" target="_blank" rel="noopener noreferrer" class="match-card-link">
          <div class='match-card-new' data-start-time='${match.Start_Time}' data-end-time='${match.End_Time}'>
              <div class='card-top' style='background-image: url("${bgImage}");'>
              </div>
              <div class='card-bottom'>
                <div class='status-line'>
                  <i class='fas fa-play-circle'></i>
                  <span class='status-text'></span>
                </div>
                <p class='tournament-name'>${match.Tournament}</p>
                <div class='team-list'>
                  <div class='team-item' id='team1'>
                    <img class='team-logo-new' src='${team1Logo}' alt='${match.Team1_Name}' width="45" height="45" loading="lazy" />
                    <span class='team-name-new'>${match.Team1_Name}</span>
                  </div>
                  <div class='vs-separator'>VS</div>
                  <div class='team-item' id='team2'>
                    <img class='team-logo-new' src='${team2Logo}' alt='${match.Team2_Name}' width="45" height="45" loading="lazy" />
                    <span class='team-name-new'>${match.Team2_Name}</span>
                  </div>
                </div>
                <p class='match-start-time'></p>
              </div>
            </div>
        </a>`;
    }


    // --- ORIGINAL SCROLL FUNCTION ---
    function updateScrollControls() {
        if (!container || !parentContainer) return;

        const scrollLeft = container.scrollLeft;
        const scrollWidth = container.scrollWidth;
        const clientWidth = container.clientWidth;

        if (scrollLeft <= 0) {
            parentContainer.classList.add('no-scroll-left');
        } else {
            parentContainer.classList.remove('no-scroll-left');
        }

        if (scrollLeft + clientWidth >= scrollWidth - 2) {
            parentContainer.classList.add('no-scroll-right');
        } else {
            parentContainer.classList.remove('no-scroll-right');
        }
        
        if (progressBar) {
            let scrollPercentage = 0;
            if (scrollWidth - clientWidth > 0) {
                 scrollPercentage = (scrollLeft / (scrollWidth - clientWidth)) * 100;
            }
            progressBar.style.width = `${scrollPercentage}%`;
        }
    }

    // --- NEW MATCH STATUS FUNCTION ---
    function updateMatchStatus() {
        const cards = document.querySelectorAll('.match-card-new:not(.status-finished)');
        const now = new Date();

        cards.forEach(card => {
            const startTimeStr = card.dataset.startTime;
            const endTimeStr = card.dataset.endTime;
            const statusTextEl = card.querySelector('.status-text');
            const startTimeEl = card.querySelector('.match-start-time');

            if (!startTimeStr || !statusTextEl || !startTimeEl) return;

            const startTime = new Date(startTimeStr);
            const endTime = endTimeStr && endTimeStr !== 'undefined' ? new Date(endTimeStr) : null;

            if (!card.dataset.timeFormatted) {
                startTimeEl.textContent = startTime.toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                });
                card.dataset.timeFormatted = 'true';
            }

            // Status logic
            if (now >= startTime && (!endTime || now < endTime)) {
                // LIVE
                statusTextEl.textContent = 'LIVE 🔴';
                statusTextEl.classList.add('live');
                card.classList.remove('status-finished');
            } else if (now < startTime) {
                // UPCOMING
                statusTextEl.classList.remove('live');
                card.classList.remove('status-finished');
                const diff = startTime - now;
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                let countdown = 'Starts in: ';
                if (days > 0) countdown += `${days}d ${hours}h`;
                else if (hours > 0) countdown += `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                else if (minutes > 0) countdown += `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                else countdown += `${String(seconds).padStart(2, '0')}s`;
                statusTextEl.textContent = countdown + ' 🔵';
            } else {
                // FINISHED
                statusTextEl.classList.remove('live');
                statusTextEl.textContent = 'MATCH FINISHED ⚫';
                card.classList.add('status-finished');
            }
        });
    }

    // --- NEW SORTING LOGIC ---
    function getMatchStatus(card, now) {
        const startTimeStr = card.dataset.startTime;
        const endTimeStr = card.dataset.endTime;
        if (!startTimeStr) return { status: 3, time: 0 }; 

        const startTime = new Date(startTimeStr).getTime();
        const endTime = endTimeStr && endTimeStr !== 'undefined' ? new Date(endTimeStr).getTime() : 0;
        const nowTime = now.getTime();

        if (nowTime >= startTime && (!endTime || nowTime < endTime)) {
            return { status: 1, time: startTime }; // LIVE
        } else if (nowTime < startTime) {
            return { status: 2, time: startTime }; // UPCOMING
        } else {
            const finishTime = endTime || startTime;
            return { status: 3, time: -finishTime }; // FINISHED
        }
    }

    function sortMatchCards() {
        if (!container) return;
        if (observer) observer.disconnect();

        const links = Array.from(container.querySelectorAll('.match-card-link'));
        const now = new Date();

        links.sort((a, b) => {
            const cardA = a.querySelector('.match-card-new');
            const cardB = b.querySelector('.match-card-new');
            if (!cardA || !cardB) return 0;
            const statusA = getMatchStatus(cardA, now);
            const statusB = getMatchStatus(cardB, now);
            if (statusA.status !== statusB.status) {
                return statusA.status - statusB.status;
            }
            return statusA.time - statusB.time;
        });

        links.forEach(link => container.appendChild(link));

        if (observer) observer.observe(container, { childList: true });
    }

    // --- OVERLAY FUNCTIONS ---
    if(viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // Stop background scrolling
            renderOverlayCards('all');
        });
    }

    if(closeBtn) {
        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all
            filterBtns.forEach(b => {
                b.classList.remove('bg-blue-600', 'text-white');
                b.classList.add('bg-slate-700', 'text-gray-300');
            });
            // Add active to clicked
            e.target.classList.remove('bg-slate-700', 'text-gray-300');
            e.target.classList.add('bg-blue-600', 'text-white');
            
            renderOverlayCards(e.target.dataset.filter);
        });
    });

    function renderOverlayCards(filter) {
        overlayGrid.innerHTML = '';
        
        const filteredData = allMatchesData.filter(match => {
            if(filter === 'all') return true;
            
            // --- UPDATED FILTER LOGIC: CHECK CATEGORY COLUMN ---
            const category = (match.Category || '').toLowerCase().trim(); // Reads 'Category' column from Sheet
            
            if(filter === 'cricket') {
                // Only filters if Category column is explicitly 'cricket'
                return category === 'cricket';
            }
            if(filter === 'football') {
                return category === 'football';
            }
            return true;
        });

        if(filteredData.length === 0) {
            overlayGrid.innerHTML = '<div class="col-span-full text-center text-gray-400 py-10">No matches found for this category.</div>';
            return;
        }

        filteredData.forEach(match => {
            // Re-use createMatchCard logic
            const cardHTML = createMatchCard(match); 
            overlayGrid.insertAdjacentHTML('beforeend', cardHTML);
        });
        
        // Re-run status updates for these new cards immediately
        updateMatchStatus();
    }

    // --- PWA & INSTALL MODAL LOGIC ---
    
    // Capture PWA prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        // Show install button in Android tab
        if(pwaInstallBtn) pwaInstallBtn.style.display = 'block';
    });

    // Sticky Header Scroll Detection
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.main-header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Detect OS for Install Modal Default Tab
    function getMobileOS() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        if (/android/i.test(userAgent)) return 'android';
        if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) return 'ios';
        return 'pc';
    }

    // Open Install Modal
    if(downloadAppBtn) {
        downloadAppBtn.addEventListener('click', () => {
            installModal.classList.add('active');
            const os = getMobileOS();
            // Trigger click on relevant tab
            const targetTab = document.querySelector(`.install-tab[data-target="${os}"]`);
            if(targetTab) targetTab.click();
        });
    }

    // Close Install Modal
    if(closeInstallBtn) {
        closeInstallBtn.addEventListener('click', () => {
            installModal.classList.remove('active');
        });
    }

    // Handle Tab Switching
    installTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all
            installTabs.forEach(t => t.classList.remove('active'));
            installContents.forEach(c => c.classList.remove('active'));
            
            // Activate clicked
            tab.classList.add('active');
            const targetId = 'content-' + tab.dataset.target;
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Handle PWA Install Button Click
    if(pwaInstallBtn) {
        pwaInstallBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                deferredPrompt = null;
                if(outcome === 'accepted') {
                    installModal.classList.remove('active');
                }
            }
        });
    }

    // --- SCRIPT INITIALIZATION ---
    function runAllUpdates() {
        updateMatchStatus();
        sortMatchCards(); 
        updateScrollControls();
        
        if (statusInterval) clearInterval(statusInterval);
        if (sortInterval) clearInterval(sortInterval);
        
        statusInterval = setInterval(updateMatchStatus, 1000); 
        sortInterval = setInterval(() => {
            sortMatchCards();
            updateScrollControls();
        }, 30000); 
    }

    // --- START ---
    if (container && parentContainer && scrollLeftBtn && scrollRightBtn) {
        
        scrollLeftBtn.addEventListener('click', () => {
            container.scrollBy({ left: -250, behavior: 'smooth' });
        });
        
        scrollRightBtn.addEventListener('click', () => {
            container.scrollBy({ left: 250, behavior: 'smooth' });
        });

        container.addEventListener('scroll', updateScrollControls);

        // FETCH DATA FROM SHEETS
        fetchAndRenderMatches();
    
    } else {
        setTimeout(runAllUpdates, 1000);
    }
    

});

  (function initButtons() {
    const topContainer = document.getElementById('server-links-top');
    const botContainer = document.getElementById('server-links-bottom');
    
    if (typeof matchStreams !== 'undefined' && matchStreams.length > 0) {
      matchStreams.forEach((link, index) => {
        // Create Button HTML
        const btnHTML = `<button onclick="changeLink(${index}, this)" class="server-btn ${index === 0 ? 'active' : ''}">${link.name}</button>`;
        
        // Append to both containers
        if(topContainer) topContainer.innerHTML += btnHTML;
        if(botContainer) botContainer.innerHTML += btnHTML;
      });
      
      // Load First Link Automatically
      const player = document.getElementById('main-player');
      if (player) player.src = matchStreams[0].url;
    }
  })();

  // 2. CHANGE LINK FUNCTION
  function changeLink(index, btn) {
    if (typeof matchStreams === 'undefined' || !matchStreams[index]) return;
    
    // Update Player
    const player = document.getElementById('main-player');
    if (player.src !== matchStreams[index].url) {
      player.src = matchStreams[index].url;
    }
    
    // Update Active Class on ALL buttons (Top & Bottom)
    const allBtns = document.querySelectorAll('.server-btn');
    allBtns.forEach(b => b.classList.remove('active', 'bg-blue-600', 'text-white'));
    
    // Find buttons that correspond to this index and activate them
    const totalLinks = matchStreams.length;
    if(allBtns[index]) {
       allBtns[index].classList.add('active'); // Top
       allBtns[index].style.backgroundColor = '#2563eb';
    }
    if(allBtns[index + totalLinks]) {
       allBtns[index + totalLinks].classList.add('active'); // Bottom
       allBtns[index + totalLinks].style.backgroundColor = '#2563eb';
    }
    
    // Reset others visually
    allBtns.forEach(b => {
        if(!b.classList.contains('active')) b.style.backgroundColor = '#334155';
    });
  }

  // 3. STICKY PLAYER CLICK-TO-RETURN LOGIC
  document.addEventListener("DOMContentLoaded", function() {
      const container = document.querySelector('.video-container');
      const overlay = document.getElementById('sticky-click-overlay');
      
      // Monitor for Sticky Class changes (Observer)
      const observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
              if (mutation.attributeName === "class") {
                  const isSticky = container.classList.contains('sticky-player');
                  if (isSticky) {
                      overlay.style.display = 'block'; // Show click overlay
                  } else {
                      overlay.style.display = 'none'; // Hide overlay
                  }
              }
          });
      });
      
      if(container) {
          observer.observe(container, { attributes: true });
          
          // Click Logic
          overlay.addEventListener('click', function() {
              container.classList.remove('sticky-player');
              // Smooth scroll back to player
              container.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
      }
      
      // View Counter
      setInterval(() => {
        const el = document.getElementById('view-count');
        if(el) el.innerText = (85000 + Math.floor(Math.random() * 500)).toLocaleString();
      }, 5000);
  });
