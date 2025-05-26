/**
 * TrashDrop Activity History JavaScript
 * Handles loading, displaying, and filtering user activity history
 */

class ActivityManager {
    constructor() {
        this.activities = [];
        this.filteredActivities = [];
        this.currentFilter = 'all';
        this.currentDateRange = 'all';
        this.startDate = null;
        this.endDate = null;
        this.searchTerm = '';
        this.currentPage = 1;
        this.itemsPerPage = 10;
        
        // Initialize the activity data
        this.init();
    }
    
    /**
     * Initialize the activity manager
     */
    init() {
        this.loadActivities();
        this.setupEventListeners();
        this.applyFilters();
    }
    
    /**
     * Load activities from localStorage or API
     */
    loadActivities() {
        // In a real app, this would fetch from an API
        // For demo purposes, we'll use localStorage with fallback to demo data
        const storedActivities = localStorage.getItem('userActivities');
        
        if (storedActivities) {
            this.activities = JSON.parse(storedActivities);
        } else {
            // If no activities exist, create demo data
            this.activities = this.generateDemoActivities();
            localStorage.setItem('userActivities', JSON.stringify(this.activities));
        }
        
        // Set filtered activities to all activities initially
        this.filteredActivities = [...this.activities];
    }
    
    /**
     * Generate demo activities for testing
     */
    generateDemoActivities() {
        // Create a range of dates from today back 30 days
        const activities = [];
        const today = new Date();
        
        // Pickup activities
        for (let i = 0; i < 10; i++) {
            const date = new Date();
            date.setDate(today.getDate() - Math.floor(Math.random() * 30));
            const points = Math.floor(Math.random() * 30) + 15;
            
            activities.push({
                id: `PK-${this.formatDateForId(date)}${Math.floor(Math.random() * 9999)}`,
                type: 'pickup',
                title: 'Pickup Completed',
                description: `${Math.floor(Math.random() * 5) + 1} bags from ${Math.random() > 0.5 ? 'Home' : 'Work'}`,
                date: date,
                timestamp: date.toISOString(),
                formattedDate: this.formatDate(date),
                points: points,
                details: {
                    location: Math.random() > 0.5 ? 'Home - 123 Main St' : 'Work - 456 Office Blvd',
                    collector: ['John D.', 'Maria S.', 'Robert L.', 'Emma W.'][Math.floor(Math.random() * 4)],
                    wasteType: ['Recyclables', 'Mixed Waste', 'Organic Waste', 'Electronic Waste'][Math.floor(Math.random() * 4)],
                    weight: (Math.random() * 10 + 1).toFixed(1) + ' kg',
                    carbonOffset: (Math.random() * 5).toFixed(1) + ' kg CO₂'
                },
                badge: {
                    text: `+${points} points`,
                    class: 'bg-success'
                }
            });
        }
        
        // Delivery activities
        for (let i = 0; i < 5; i++) {
            const date = new Date();
            date.setDate(today.getDate() - Math.floor(Math.random() * 30));
            
            activities.push({
                id: `DL-${this.formatDateForId(date)}${Math.floor(Math.random() * 9999)}`,
                type: 'delivery',
                title: 'Bags Delivered',
                description: `${Math.floor(Math.random() * 10) + 1} recycling bags`,
                date: date,
                timestamp: date.toISOString(),
                formattedDate: this.formatDate(date),
                points: 0,
                details: {
                    location: Math.random() > 0.5 ? 'Home - 123 Main St' : 'Work - 456 Office Blvd',
                    deliveredBy: ['John D.', 'Maria S.', 'Robert L.', 'Emma W.'][Math.floor(Math.random() * 4)],
                    bagType: ['Standard Recycling', 'Premium Recycling', 'Compostable', 'Special Waste'][Math.floor(Math.random() * 4)],
                    quantity: Math.floor(Math.random() * 10) + 1,
                    status: 'Delivered'
                },
                badge: {
                    text: 'Delivered',
                    class: 'bg-info'
                }
            });
        }
        
        // Report activities
        for (let i = 0; i < 3; i++) {
            const date = new Date();
            date.setDate(today.getDate() - Math.floor(Math.random() * 30));
            const points = Math.floor(Math.random() * 20) + 10;
            
            const locations = [
                'River Park - North Entrance',
                'Downtown - Main Street',
                'Harbor View - Beach Access',
                'Mountain Trail - Lookout Point'
            ];
            
            const wasteTypes = [
                'Construction Debris',
                'Household Waste',
                'Industrial Waste',
                'Mixed Litter'
            ];
            
            const location = locations[Math.floor(Math.random() * locations.length)];
            const wasteType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
            
            const resolvedDate = new Date(date);
            resolvedDate.setDate(date.getDate() + Math.floor(Math.random() * 3) + 1);
            
            activities.push({
                id: `RP-${this.formatDateForId(date)}${Math.floor(Math.random() * 9999)}`,
                type: 'report',
                title: 'Illegal Dumping Reported',
                description: location,
                date: date,
                timestamp: date.toISOString(),
                formattedDate: this.formatDate(date),
                points: points,
                details: {
                    location: location,
                    status: Math.random() > 0.3 ? 'Resolved' : 'Pending',
                    wasteType: wasteType,
                    cleanedOn: Math.random() > 0.3 ? this.formatDate(resolvedDate) : 'Pending',
                    pointsEarned: `+${points}`
                },
                badge: {
                    text: Math.random() > 0.3 ? 'Resolved' : 'Pending',
                    class: Math.random() > 0.3 ? 'bg-success' : 'bg-warning text-dark'
                }
            });
        }
        
        // Points/achievement activities
        for (let i = 0; i < 4; i++) {
            const date = new Date();
            date.setDate(today.getDate() - Math.floor(Math.random() * 30));
            const points = [50, 100, 150, 200][Math.floor(Math.random() * 4)];
            
            const achievements = [
                {title: 'Level Up Achievement', desc: 'Reached "Eco Warrior" level', details: 'Congratulations on reaching the "Eco Warrior" level! You\'ve consistently participated in our recycling program. New perks unlocked: Premium bag designs, priority pickups, and 10% discount at partner stores.'},
                {title: 'Monthly Challenge Completed', desc: '10 pickups in one month', details: 'You\'ve successfully completed the monthly challenge by scheduling 10 pickups in a single month. Your dedication to waste management is making a real difference!'},
                {title: 'Recycling Milestone', desc: '100kg of waste recycled', details: 'You\'ve helped recycle 100kg of waste! This has saved approximately 50kg of CO₂ emissions and conserved valuable resources.'},
                {title: 'Community Champion', desc: 'Referred 5 new users', details: 'Thank you for referring 5 new users to TrashDrop! Your effort helps expand our environmental impact and builds a stronger community of eco-conscious individuals.'}
            ];
            
            const achievement = achievements[Math.floor(Math.random() * achievements.length)];
            
            activities.push({
                id: `AC-${this.formatDateForId(date)}${Math.floor(Math.random() * 9999)}`,
                type: 'points',
                title: achievement.title,
                description: achievement.desc,
                date: date,
                timestamp: date.toISOString(),
                formattedDate: this.formatDate(date),
                points: points,
                details: {
                    description: achievement.details
                },
                badge: {
                    text: `+${points} points`,
                    class: 'bg-warning text-dark'
                }
            });
        }
        
        // Sort activities by date (newest first)
        return activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.activity-filter-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                this.currentFilter = e.target.dataset.filter;
                this.currentPage = 1; // Reset to first page when filter changes
                this.applyFilters();
            });
        });
        
        // Date range selector
        const dateRangeSelect = document.getElementById('date-range');
        if (dateRangeSelect) {
            dateRangeSelect.addEventListener('change', (e) => {
                this.currentDateRange = e.target.value;
                this.currentPage = 1; // Reset to first page when date range changes
                this.applyFilters();
            });
        }
        
        // Custom date inputs
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        
        if (startDateInput && endDateInput) {
            startDateInput.addEventListener('change', () => {
                this.startDate = startDateInput.value ? new Date(startDateInput.value) : null;
                this.currentPage = 1;
                this.applyFilters();
            });
            
            endDateInput.addEventListener('change', () => {
                this.endDate = endDateInput.value ? new Date(endDateInput.value) : null;
                this.currentPage = 1;
                this.applyFilters();
            });
        }
        
        // Search input
        const searchInput = document.getElementById('activity-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.currentPage = 1; // Reset to first page when search term changes
                this.applyFilters();
            });
        }
        
        // Pagination
        document.querySelectorAll('.pagination .page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageText = e.target.textContent;
                
                if (pageText === 'Previous') {
                    if (this.currentPage > 1) {
                        this.currentPage--;
                    }
                } else if (pageText === 'Next') {
                    if (this.currentPage < this.getTotalPages()) {
                        this.currentPage++;
                    }
                } else {
                    this.currentPage = parseInt(pageText);
                }
                
                this.applyFilters();
            });
        });
    }
    
    /**
     * Apply all current filters and render the activity list
     */
    applyFilters() {
        // Start with all activities
        let filtered = [...this.activities];
        
        // Apply type filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(activity => activity.type === this.currentFilter);
        }
        
        // Apply date range filter
        filtered = this.applyDateFilter(filtered);
        
        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(activity => {
                return (
                    activity.title.toLowerCase().includes(this.searchTerm) ||
                    activity.description.toLowerCase().includes(this.searchTerm) ||
                    (activity.details && JSON.stringify(activity.details).toLowerCase().includes(this.searchTerm))
                );
            });
        }
        
        // Update filtered activities
        this.filteredActivities = filtered;
        
        // Render the activities
        this.renderActivities();
    }
    
    /**
     * Apply date range filter to activities
     */
    applyDateFilter(activities) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const startOfWeek = new Date(today);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        switch (this.currentDateRange) {
            case 'today':
                return activities.filter(activity => {
                    const activityDate = new Date(activity.date);
                    return activityDate >= today;
                });
                
            case 'week':
                return activities.filter(activity => {
                    const activityDate = new Date(activity.date);
                    return activityDate >= startOfWeek;
                });
                
            case 'month':
                return activities.filter(activity => {
                    const activityDate = new Date(activity.date);
                    return activityDate >= startOfMonth;
                });
                
            case 'custom':
                return activities.filter(activity => {
                    const activityDate = new Date(activity.date);
                    let passes = true;
                    
                    if (this.startDate) {
                        this.startDate.setHours(0, 0, 0, 0);
                        passes = passes && activityDate >= this.startDate;
                    }
                    
                    if (this.endDate) {
                        const endDateCopy = new Date(this.endDate);
                        endDateCopy.setHours(23, 59, 59, 999);
                        passes = passes && activityDate <= endDateCopy;
                    }
                    
                    return passes;
                });
                
            default: // 'all'
                return activities;
        }
    }
    
    /**
     * Calculate total pages based on filtered activities
     */
    getTotalPages() {
        return Math.ceil(this.filteredActivities.length / this.itemsPerPage);
    }
    
    /**
     * Get activities for the current page
     */
    getCurrentPageActivities() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return this.filteredActivities.slice(start, end);
    }
    
    /**
     * Group activities by date
     */
    groupActivitiesByDate(activities) {
        const groupedActivities = {};
        
        activities.forEach(activity => {
            const date = new Date(activity.date);
            const dateKey = this.getDateKey(date);
            
            if (!groupedActivities[dateKey]) {
                groupedActivities[dateKey] = [];
            }
            
            groupedActivities[dateKey].push(activity);
        });
        
        return groupedActivities;
    }
    
    /**
     * Get a consistent date key for grouping
     */
    getDateKey(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date >= today) {
            return 'Today';
        } else if (date >= yesterday) {
            return 'Yesterday';
        } else {
            return this.formatDateForGrouping(date);
        }
    }
    
    /**
     * Format date for ID generation
     */
    formatDateForId(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${year}${month}${day}${hours}${minutes}`;
    }
    
    /**
     * Format date for display
     */
    formatDate(date) {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString('en-US', options);
    }
    
    /**
     * Format date for grouping headers
     */
    formatDateForGrouping(date) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
    
    /**
     * Render activities to the DOM
     */
    renderActivities() {
        const activityContainer = document.getElementById('activity-container');
        if (!activityContainer) return;
        
        // Clear current content
        activityContainer.innerHTML = '';
        
        // Get current page activities
        const currentActivities = this.getCurrentPageActivities();
        
        // If no activities match the filters
        if (currentActivities.length === 0) {
            activityContainer.innerHTML = `
                <div class="p-4 text-center">
                    <i class="bi bi-search fs-1 text-muted mb-3"></i>
                    <h5>No activities found</h5>
                    <p class="text-muted">Try adjusting your filters or search terms</p>
                </div>
            `;
            return;
        }
        
        // Group activities by date
        const groupedActivities = this.groupActivitiesByDate(currentActivities);
        
        // Render each date group
        Object.keys(groupedActivities).forEach((dateKey, index) => {
            const activities = groupedActivities[dateKey];
            
            // Create date header
            const dateHeader = document.createElement('div');
            dateHeader.className = 'activity-date-header';
            dateHeader.textContent = dateKey;
            activityContainer.appendChild(dateHeader);
            
            // Create activity list for this date
            const listGroup = document.createElement('div');
            listGroup.className = 'list-group list-group-flush';
            
            // Add activities to the list
            activities.forEach(activity => {
                const activityItem = this.createActivityItem(activity);
                listGroup.appendChild(activityItem);
            });
            
            activityContainer.appendChild(listGroup);
        });
        
        // Update pagination
        this.updatePagination();
    }
    
    /**
     * Create a single activity item element
     */
    createActivityItem(activity) {
        const item = document.createElement('div');
        item.className = 'list-group-item px-3 py-3 activity-item';
        item.dataset.type = activity.type;
        
        const iconClass = this.getIconClass(activity.type);
        const colorClass = this.getColorClass(activity.type);
        
        item.innerHTML = `
            <div class="d-flex align-items-start">
                <div class="activity-icon ${colorClass} rounded-circle me-3">
                    <i class="bi ${iconClass}"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="mb-1 fs-6">${activity.title}</h5>
                    <p class="mb-1">${activity.description}</p>
                    <p class="mb-0 text-muted">${activity.formattedDate}</p>
                </div>
                <div class="ms-auto text-end">
                    <span class="badge ${activity.badge.class} mb-2">${activity.badge.text}</span>
                    <div>
                        <button class="btn btn-sm btn-link text-decoration-none p-0" data-bs-toggle="collapse" data-bs-target="#details-${activity.id}" aria-expanded="false" aria-controls="details-${activity.id}">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
            <div class="collapse mt-3" id="details-${activity.id}">
                <div class="card card-body bg-light">
                    ${this.formatActivityDetails(activity)}
                </div>
            </div>
        `;
        
        return item;
    }
    
    /**
     * Get icon class based on activity type
     */
    getIconClass(type) {
        switch (type) {
            case 'pickup': return 'bi-check-circle';
            case 'delivery': return 'bi-bag-check';
            case 'report': return 'bi-exclamation-triangle';
            case 'points': return 'bi-award';
            default: return 'bi-clock-history';
        }
    }
    
    /**
     * Get color class based on activity type
     */
    getColorClass(type) {
        switch (type) {
            case 'pickup': return 'bg-success bg-opacity-10 text-success';
            case 'delivery': return 'bg-info bg-opacity-10 text-info';
            case 'report': return 'bg-danger bg-opacity-10 text-danger';
            case 'points': return 'bg-warning bg-opacity-10 text-warning';
            default: return 'bg-secondary bg-opacity-10 text-secondary';
        }
    }
    
    /**
     * Format activity details as HTML
     */
    formatActivityDetails(activity) {
        if (activity.type === 'points') {
            // For points/achievements, just show description
            return `<p class="mb-0">${activity.details.description}</p>`;
        } else {
            // For other types, create a two-column layout
            let html = '<div class="row">';
            
            // First column
            html += '<div class="col-md-6">';
            html += `<p class="mb-1"><strong>ID:</strong> ${activity.id}</p>`;
            
            if (activity.details.location) {
                html += `<p class="mb-1"><strong>Location:</strong> ${activity.details.location}</p>`;
            }
            
            if (activity.details.collector) {
                html += `<p class="mb-1"><strong>Collector:</strong> ${activity.details.collector}</p>`;
            }
            
            if (activity.details.deliveredBy) {
                html += `<p class="mb-1"><strong>Delivered by:</strong> ${activity.details.deliveredBy}</p>`;
            }
            
            if (activity.details.status) {
                html += `<p class="mb-1"><strong>Status:</strong> ${activity.details.status}</p>`;
            }
            html += '</div>';
            
            // Second column
            html += '<div class="col-md-6">';
            if (activity.details.wasteType) {
                html += `<p class="mb-1"><strong>Waste Type:</strong> ${activity.details.wasteType}</p>`;
            }
            
            if (activity.details.weight) {
                html += `<p class="mb-1"><strong>Weight:</strong> ${activity.details.weight}</p>`;
            }
            
            if (activity.details.carbonOffset) {
                html += `<p class="mb-1"><strong>Carbon Offset:</strong> ${activity.details.carbonOffset}</p>`;
            }
            
            if (activity.details.bagType) {
                html += `<p class="mb-1"><strong>Bag Type:</strong> ${activity.details.bagType}</p>`;
            }
            
            if (activity.details.quantity) {
                html += `<p class="mb-1"><strong>Quantity:</strong> ${activity.details.quantity}</p>`;
            }
            
            if (activity.details.cleanedOn) {
                html += `<p class="mb-1"><strong>Cleaned on:</strong> ${activity.details.cleanedOn}</p>`;
            }
            
            if (activity.details.pointsEarned) {
                html += `<p class="mb-1"><strong>Points Earned:</strong> ${activity.details.pointsEarned}</p>`;
            }
            html += '</div>';
            
            html += '</div>';
            
            // Add thank you message for reports
            if (activity.type === 'report' && activity.details.status === 'Resolved') {
                html += '<p class="mt-2 mb-0">Thank you for your report! The area has been cleaned and monitored for further violations.</p>';
            }
            
            return html;
        }
    }
    
    /**
     * Update pagination UI
     */
    updatePagination() {
        const pagination = document.querySelector('.pagination');
        if (!pagination) return;
        
        const totalPages = this.getTotalPages();
        
        // Clear current pagination
        pagination.innerHTML = '';
        
        // Previous button
        const prevItem = document.createElement('li');
        prevItem.className = `page-item${this.currentPage === 1 ? ' disabled' : ''}`;
        prevItem.innerHTML = `
            <a class="page-link" href="#" tabindex="${this.currentPage === 1 ? '-1' : '0'}" aria-disabled="${this.currentPage === 1 ? 'true' : 'false'}">Previous</a>
        `;
        pagination.appendChild(prevItem);
        
        // Page numbers
        const maxPagesToShow = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        
        // Adjust startPage if we're near the end
        if (endPage - startPage + 1 < maxPagesToShow && startPage > 1) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageItem = document.createElement('li');
            pageItem.className = `page-item${i === this.currentPage ? ' active' : ''}`;
            if (i === this.currentPage) {
                pageItem.setAttribute('aria-current', 'page');
            }
            
            pageItem.innerHTML = `
                <a class="page-link" href="#">${i}</a>
            `;
            pagination.appendChild(pageItem);
        }
        
        // Next button
        const nextItem = document.createElement('li');
        nextItem.className = `page-item${this.currentPage === totalPages ? ' disabled' : ''}`;
        nextItem.innerHTML = `
            <a class="page-link" href="#" tabindex="${this.currentPage === totalPages ? '-1' : '0'}" aria-disabled="${this.currentPage === totalPages ? 'true' : 'false'}">Next</a>
        `;
        pagination.appendChild(nextItem);
        
        // Re-attach event listeners
        this.setupPaginationEventListeners();
    }
    
    /**
     * Setup pagination event listeners
     */
    setupPaginationEventListeners() {
        document.querySelectorAll('.pagination .page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageText = e.target.textContent;
                
                if (pageText === 'Previous') {
                    if (this.currentPage > 1) {
                        this.currentPage--;
                    }
                } else if (pageText === 'Next') {
                    if (this.currentPage < this.getTotalPages()) {
                        this.currentPage++;
                    }
                } else {
                    this.currentPage = parseInt(pageText);
                }
                
                this.applyFilters();
            });
        });
    }
}

// Initialize the activity manager when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the activity manager
    const activityManager = new ActivityManager();
    
    // Add activity manager to window for debugging
    window.activityManager = activityManager;
});
