<script>
//<![CDATA[
document.addEventListener('DOMContentLoaded', function() {

    const container = document.getElementById('match-cards-container');
    let statusInterval = null;
    let sortInterval = null;

    // This function updates the status text (Live, Finished, countdown)
    function updateMatchStatus() {
        const cards = document.querySelectorAll('.match-card-new');
        const now = new Date();

        cards.forEach(card => {
            const startTimeStr = card.dataset.startTime;
            const endTimeStr = card.dataset.endTime;
            const statusTextEl = card.querySelector('.status-text');
            const startTimeEl = card.querySelector('.match-start-time');

            if (!startTimeStr || !statusTextEl || !startTimeEl) return;

            const startTime = new Date(startTimeStr);
            const endTime = endTimeStr ? new Date(endTimeStr) : null;

            // Format start time display
            startTimeEl.textContent = startTime.toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
            });

            // Status logic
            if (now >= startTime && (!endTime || now < endTime)) {
                // LIVE
                statusTextEl.textContent = 'LIVE 🔴';
                statusTextEl.classList.add('live');
            } else if (now < startTime) {
                // UPCOMING
                statusTextEl.classList.remove('live');
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
            }
        });
    }

    // This is the new function to get the sortable status of a card
    function getMatchStatus(card, now) {
        const startTimeStr = card.dataset.startTime;
        const endTimeStr = card.dataset.endTime;
        if (!startTimeStr) return { status: 3, time: 0 }; // Default to finished

        const startTime = new Date(startTimeStr).getTime();
        const endTime = endTimeStr ? new Date(endTimeStr).getTime() : 0;
        const nowTime = now.getTime();

        if (nowTime >= startTime && (!endTime || nowTime < endTime)) {
            // 1. LIVE
            return { status: 1, time: startTime }; // Sort live matches by start time (ascending)
        } else if (nowTime < startTime) {
            // 2. UPCOMING
            return { status: 2, time: startTime }; // Sort upcoming by start time (ascending)
        } else {
            // 3. FINISHED
            // Sort by end time (descending), fallback to start time
            const finishTime = endTime || startTime;
            return { status: 3, time: -finishTime }; // Negate for descending sort
        }
    }

    // This is the new function that performs the sorting
    function sortMatchCards() {
        if (!container) return;

        // Get the parent <a> tags which wrap the cards
        const links = Array.from(container.querySelectorAll('.match-card-link'));
        const now = new Date();

        links.sort((a, b) => {
            const cardA = a.querySelector('.match-card-new');
            const cardB = b.querySelector('.match-card-new');

            if (!cardA || !cardB) return 0;

            const statusA = getMatchStatus(cardA, now);
            const statusB = getMatchStatus(cardB, now);

            // 1. Sort by main status (1: Live, 2: Upcoming, 3: Finished)
            if (statusA.status !== statusB.status) {
                return statusA.status - statusB.status;
            }

            // 2. If status is same, sort by time
            return statusA.time - statusB.time;
        });

        // Re-append the sorted <a> elements to the container
        links.forEach(link => container.appendChild(link));
    }
    
    // Placeholder for your theme's scroll function to avoid errors
    function updateScrollControls() {
        // This function was in your original script snippet.
        // We leave it here so it can be called without error.
        // If it's defined elsewhere, this won't interfere.
    }

    // This function runs all updates and sets the intervals
    function runUpdates() {
        updateMatchStatus();
        sortMatchCards();
        updateScrollControls();
        
        if (statusInterval) clearInterval(statusInterval);
        if (sortInterval) clearInterval(sortInterval);
        
        // Update countdowns every second
        statusInterval = setInterval(updateMatchStatus, 1000); 
        // Re-sort every 30 seconds to catch matches changing state
        sortInterval = setInterval(sortMatchCards, 30000); 
    }

    // --- SCRIPT EXECUTION ---

    if (container) {
        // Initial run
        runUpdates();

        // Use an observer to re-run when Blogger adds new cards
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    runUpdates(); // Run updates when new cards are added
                }
            }
        });
        observer.observe(container, { childList: true });
    
    } else {
        // Fallback if container isn't ready yet
        setTimeout(runUpdates, 1000);
    }
    
});
//]]>
</script>
