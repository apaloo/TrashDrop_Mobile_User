/**
 * TrashDrop Reports JavaScript
 * Handles loading, displaying, and filtering illegal dumping reports
 */

class ReportsManager {
    constructor() {
        this.reports = [];
        this.filteredReports = [];
        this.currentFilter = 'all';
        this.currentWasteType = 'all';
        this.currentDateRange = 'all';
        this.startDate = null;
        this.endDate = null;
        this.searchTerm = '';
        this.currentPage = 1;
        this.itemsPerPage = 5;
        this.map = null;
        this.markers = [];
        
        // Initialize the reports data
        this.init();
    }
    
    /**
     * Initialize the reports manager
     */
    init() {
        this.loadReports();
        this.setupEventListeners();
        this.initMap();
        this.applyFilters();
    }
    
    /**
     * Load reports from localStorage or API
     */
    loadReports() {
        // In a real app, this would fetch from an API
        // For demo purposes, we'll use localStorage with fallback to demo data
        const storedReports = localStorage.getItem('userReports');
        
        if (storedReports) {
            this.reports = JSON.parse(storedReports);
        } else {
            // If no reports exist, create demo data
            this.reports = this.generateDemoReports();
            localStorage.setItem('userReports', JSON.stringify(this.reports));
        }
        
        // Set filtered reports to all reports initially
        this.filteredReports = [...this.reports];
    }
    
    /**
     * Generate demo reports for testing
     */
    generateDemoReports() {
        // Create a range of dates from today back 30 days
        const reports = [];
        const today = new Date();
        
        const wasteTypes = [
            { name: 'Household Trash', icon: 'trash', color: 'primary' },
            { name: 'Construction Waste', icon: 'building', color: 'secondary' },
            { name: 'Electronic Waste', icon: 'cpu', color: 'info' },
            { name: 'Hazardous Materials', icon: 'exclamation-octagon', color: 'danger' },
            { name: 'Green Waste', icon: 'tree', color: 'success' }
        ];
        
        const locations = [
            '123 Green Street',
            '456 Park Avenue',
            '789 River Road',
            '321 Mountain View',
            '654 Sunset Boulevard',
            '987 Lake Drive',
            '246 Forest Lane',
            '135 Beach Road',
            '864 Valley Street',
            '753 Ocean Drive'
        ];
        
        const statuses = [
            'Pending Review',
            'In Progress',
            'Cleaned',
            'Critical'
        ];
        
        const severities = ['Low', 'Medium', 'High'];
        const sizes = ['Small (< 1 cubic meter)', 'Medium (1-5 cubic meters)', 'Large (> 5 cubic meters)'];
        
        // Generate 15 random reports
        for (let i = 1; i <= 15; i++) {
            const date = new Date();
            date.setDate(today.getDate() - Math.floor(Math.random() * 30));
            
            const wasteType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
            const location = locations[Math.floor(Math.random() * locations.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const severity = severities[Math.floor(Math.random() * severities.length)];
            const size = sizes[Math.floor(Math.random() * sizes.length)];
            
            const report = {
                id: `${i}`,
                reportId: `RP-${this.formatDateForId(date)}${i.toString().padStart(2, '0')}`,
                wasteType: wasteType.name,
                wasteTypeIcon: wasteType.icon,
                wasteTypeColor: wasteType.color,
                location: location,
                date: date,
                timestamp: date.toISOString(),
                formattedDate: this.formatDate(date),
                status: status,
                severity: severity,
                size: size,
                description: this.generateDescription(wasteType.name),
                reportedBy: Math.random() > 0.2 ? 'You' : ['John D.', 'Maria S.', 'Robert L.', 'Emma W.'][Math.floor(Math.random() * 4)],
                photos: Math.floor(Math.random() * 3) + 1,
                cleanedOn: status === 'Cleaned' ? this.formatDate(new Date(date.getTime() + Math.random() * 86400000 * 3)) : null
            };
            
            reports.push(report);
        }
        
        // Sort reports by date (newest first)
        return reports.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    /**
     * Generate a description based on waste type
     */
    generateDescription(wasteType) {
        const descriptions = {
            'Household Trash': [
                'Several garbage bags left outside designated collection area.',
                'Household waste improperly disposed of on public property.',
                'Multiple trash bags and household items dumped overnight.'
            ],
            'Construction Waste': [
                'Several piles of construction materials including concrete, wood, and metal scraps dumped on the side of the road.',
                'Building materials and debris left after a renovation project.',
                'Large pile of concrete, drywall, and lumber waste dumped illegally.'
            ],
            'Electronic Waste': [
                'Several old computers, TVs, and other electronic equipment dumped near the river bank. Potential environmental hazard.',
                'Discarded electronic devices including monitors, printers, and computer parts.',
                'Multiple appliances and electronic waste improperly disposed of.'
            ],
            'Hazardous Materials': [
                'Suspicious containers with unknown liquids and chemical waste.',
                'Several paint cans, solvents, and other potentially toxic materials dumped.',
                'Oil drums and chemical containers disposed of improperly. Urgent cleanup needed.'
            ],
            'Green Waste': [
                'Large pile of yard trimmings and garden waste dumped on public land.',
                'Landscape debris including branches, leaves, and grass clippings.',
                'Tree cuttings and other green waste blocking public access.'
            ]
        };
        
        const typeDescriptions = descriptions[wasteType] || descriptions['Household Trash'];
        return typeDescriptions[Math.floor(Math.random() * typeDescriptions.length)];
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.report-filter-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                // Remove active class from all buttons
                document.querySelectorAll('.report-filter-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Add active class to clicked button
                e.target.classList.add('active');
                
                this.currentFilter = e.target.dataset.filter;
                this.currentPage = 1; // Reset to first page when filter changes
                this.applyFilters();
            });
        });
        
        // Waste type selector
        const wasteTypeSelect = document.getElementById('waste-type');
        if (wasteTypeSelect) {
            wasteTypeSelect.addEventListener('change', (e) => {
                this.currentWasteType = e.target.value;
                this.currentPage = 1; // Reset to first page when waste type changes
                this.applyFilters();
            });
        }
        
        // Date range selector
        const dateRangeSelect = document.getElementById('date-range');
        if (dateRangeSelect) {
            dateRangeSelect.addEventListener('change', (e) => {
                this.currentDateRange = e.target.value;
                
                // Show/hide custom date range inputs
                const customDateRange = document.getElementById('custom-date-range');
                if (customDateRange) {
                    customDateRange.style.display = this.currentDateRange === 'custom' ? 'block' : 'none';
                }
                
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
        const searchInput = document.getElementById('report-search');
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
     * Apply all current filters and render the report list
     */
    applyFilters() {
        // Start with all reports
        let filtered = [...this.reports];
        
        // Apply status filter
        if (this.currentFilter !== 'all') {
            if (this.currentFilter === 'my-reports') {
                filtered = filtered.filter(report => report.reportedBy === 'You');
            } else {
                // Convert filter name to status (e.g., 'in-progress' to 'In Progress')
                const statusMap = {
                    'pending': 'Pending Review',
                    'in-progress': 'In Progress',
                    'cleaned': 'Cleaned'
                };
                const statusFilter = statusMap[this.currentFilter];
                
                if (statusFilter) {
                    filtered = filtered.filter(report => report.status === statusFilter);
                }
            }
        }
        
        // Apply waste type filter
        if (this.currentWasteType !== 'all') {
            filtered = filtered.filter(report => {
                return report.wasteType.toLowerCase().includes(this.currentWasteType.toLowerCase());
            });
        }
        
        // Apply date range filter
        filtered = this.applyDateFilter(filtered);
        
        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(report => {
                return (
                    report.wasteType.toLowerCase().includes(this.searchTerm) ||
                    report.location.toLowerCase().includes(this.searchTerm) ||
                    report.description.toLowerCase().includes(this.searchTerm) ||
                    report.status.toLowerCase().includes(this.searchTerm)
                );
            });
        }
        
        // Update filtered reports
        this.filteredReports = filtered;
        
        // Show/hide empty state
        const emptyState = document.getElementById('empty-state');
        const reportsContainer = document.getElementById('reports-container');
        
        if (emptyState && reportsContainer) {
            if (this.filteredReports.length === 0) {
                emptyState.classList.remove('d-none');
                reportsContainer.classList.add('d-none');
            } else {
                emptyState.classList.add('d-none');
                reportsContainer.classList.remove('d-none');
            }
        }
        
        // Render the reports
        this.renderReports();
    }
    
    /**
     * Apply date range filter to reports
     */
    applyDateFilter(reports) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const startOfWeek = new Date(today);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        switch (this.currentDateRange) {
            case 'today':
                return reports.filter(report => {
                    const reportDate = new Date(report.date);
                    return reportDate >= today;
                });
                
            case 'week':
                return reports.filter(report => {
                    const reportDate = new Date(report.date);
                    return reportDate >= startOfWeek;
                });
                
            case 'month':
                return reports.filter(report => {
                    const reportDate = new Date(report.date);
                    return reportDate >= startOfMonth;
                });
                
            case 'custom':
                return reports.filter(report => {
                    const reportDate = new Date(report.date);
                    let passes = true;
                    
                    if (this.startDate) {
                        this.startDate.setHours(0, 0, 0, 0);
                        passes = passes && reportDate >= this.startDate;
                    }
                    
                    if (this.endDate) {
                        const endDateCopy = new Date(this.endDate);
                        endDateCopy.setHours(23, 59, 59, 999);
                        passes = passes && reportDate <= endDateCopy;
                    }
                    
                    return passes;
                });
                
            default: // 'all'
                return reports;
        }
    }
    
    /**
     * Calculate total pages based on filtered reports
     */
    getTotalPages() {
        return Math.ceil(this.filteredReports.length / this.itemsPerPage);
    }
    
    /**
     * Get reports for the current page
     */
    getCurrentPageReports() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return this.filteredReports.slice(start, end);
    }
    
    /**
     * Group reports by date
     */
    groupReportsByDate(reports) {
        const groupedReports = {};
        
        reports.forEach(report => {
            const date = new Date(report.date);
            const dateKey = this.getDateKey(date);
            
            if (!groupedReports[dateKey]) {
                groupedReports[dateKey] = [];
            }
            
            groupedReports[dateKey].push(report);
        });
        
        return groupedReports;
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
     * Format date for grouping headers
     */
    formatDateForGrouping(date) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
    
    /**
     * Render reports to the DOM
     */
    renderReports() {
        const reportsContainer = document.getElementById('reports-container');
        if (!reportsContainer) return;
        
        // Clear current content
        reportsContainer.innerHTML = '';
        
        // Get current page reports
        const currentReports = this.getCurrentPageReports();
        
        // If no reports match the filters, this will be handled by the empty state div
        if (currentReports.length === 0) {
            return;
        }
        
        // Group reports by date
        const groupedReports = this.groupReportsByDate(currentReports);
        
        // Render each date group
        Object.keys(groupedReports).forEach((dateKey, index) => {
            const reports = groupedReports[dateKey];
            
            // Create date header
            const dateHeader = document.createElement('div');
            dateHeader.className = 'report-date-header';
            dateHeader.textContent = dateKey;
            reportsContainer.appendChild(dateHeader);
            
            // Create report list for this date
            const listGroup = document.createElement('div');
            listGroup.className = 'list-group list-group-flush';
            
            // Add reports to the list
            reports.forEach(report => {
                const reportItem = this.createReportItem(report);
                listGroup.appendChild(reportItem);
            });
            
            reportsContainer.appendChild(listGroup);
        });
        
        // Update pagination
        this.updatePagination();
        
        // Initialize detail maps after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.initDetailMaps();
        }, 500);
    }
    
    /**
     * Create a single report item element
     */
    createReportItem(report) {
        const item = document.createElement('div');
        item.className = 'list-group-item px-3 py-3 report-item';
        item.dataset.type = report.status.toLowerCase().replace(' ', '-');
        item.dataset.waste = report.wasteType.toLowerCase().replace(' ', '-');
        
        const statusBadge = this.getStatusBadge(report.status);
        
        item.innerHTML = `
            <div class="d-flex align-items-start">
                <div class="report-icon bg-danger bg-opacity-10 text-danger rounded-circle me-3">
                    <i class="bi bi-exclamation-triangle"></i>
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center mb-1">
                        <div class="waste-type-icon bg-${report.wasteTypeColor} bg-opacity-10">
                            <i class="bi bi-${report.wasteTypeIcon}"></i>
                        </div>
                        <h5 class="mb-0 fs-6">${report.wasteType}</h5>
                    </div>
                    <p class="mb-1">${report.location}</p>
                    <p class="mb-0 text-muted">${report.formattedDate}</p>
                </div>
                <div class="ms-auto text-end">
                    <span class="badge ${statusBadge} mb-2">${report.status}</span>
                    <div>
                        <button class="btn btn-sm btn-link text-decoration-none p-0" data-bs-toggle="collapse" data-bs-target="#details-${report.id}" aria-expanded="false" aria-controls="details-${report.id}">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
            <div class="collapse mt-3" id="details-${report.id}">
                <div class="card card-body bg-light">
                    <div class="row">
                        <div class="col-md-6">
                            <p class="mb-1"><strong>Report ID:</strong> ${report.reportId}</p>
                            <p class="mb-1"><strong>Location:</strong> ${report.location}</p>
                            <p class="mb-1"><strong>Status:</strong> ${report.status}</p>
                            <p class="mb-1"><strong>Reported by:</strong> ${report.reportedBy}</p>
                        </div>
                        <div class="col-md-6">
                            <p class="mb-1"><strong>Waste Type:</strong> ${report.wasteType}</p>
                            <p class="mb-1"><strong>Severity:</strong> ${report.severity}</p>
                            <p class="mb-1"><strong>Size:</strong> ${report.size}</p>
                            ${report.cleanedOn ? `<p class="mb-1"><strong>Cleaned on:</strong> ${report.cleanedOn}</p>` : ''}
                        </div>
                    </div>
                    <p class="mt-2 mb-2"><strong>Description:</strong> ${report.description}</p>
                    <div class="report-map" id="map-details-${report.id}"></div>
                    ${this.generatePhotoGallery(report)}
                    ${this.generateStatusAlert(report)}
                </div>
            </div>
        `;
        
        return item;
    }
    
    /**
     * Generate photo gallery HTML
     */
    generatePhotoGallery(report) {
        if (!report.photos || report.photos === 0) {
            return '';
        }
        
        let html = '<div class="d-flex flex-wrap gap-2 mt-2">';
        
        for (let i = 1; i <= report.photos; i++) {
            html += `<img src="/images/placeholder/report-photo-${Math.floor(Math.random() * 5) + 1}.jpg" alt="Report photo" class="img-thumbnail" style="width: 80px; height: 80px; object-fit: cover;">`;
        }
        
        html += '</div>';
        return html;
    }
    
    /**
     * Generate status-specific alert
     */
    generateStatusAlert(report) {
        if (report.status === 'Cleaned') {
            return `
                <div class="alert alert-success mt-3 mb-0">
                    <i class="bi bi-check-circle me-2"></i>
                    This report has been resolved. The area has been cleaned and is now free of illegal dumping.
                </div>
            `;
        } else if (report.status === 'In Progress') {
            return `
                <div class="alert alert-info mt-3 mb-0">
                    <i class="bi bi-info-circle me-2"></i>
                    Cleanup crew has been assigned and will clean up this location soon. ${report.wasteType === 'Electronic Waste' || report.wasteType === 'Hazardous Materials' ? 'Specialized equipment is required for this type of waste handling.' : ''}
                </div>
            `;
        } else if (report.status === 'Critical') {
            return `
                <div class="alert alert-danger mt-3 mb-0">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    This report has been marked as critical due to environmental or health hazards. Emergency cleanup has been prioritized.
                </div>
            `;
        }
        
        return '';
    }
    
    /**
     * Get appropriate badge class for status
     */
    getStatusBadge(status) {
        switch (status) {
            case 'Pending Review':
                return 'bg-warning text-dark';
            case 'In Progress':
                return 'bg-info';
            case 'Cleaned':
                return 'bg-success';
            case 'Critical':
                return 'bg-danger';
            default:
                return 'bg-secondary';
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
        nextItem.className = `page-item${this.currentPage === totalPages || totalPages === 0 ? ' disabled' : ''}`;
        nextItem.innerHTML = `
            <a class="page-link" href="#" tabindex="${this.currentPage === totalPages || totalPages === 0 ? '-1' : '0'}" aria-disabled="${this.currentPage === totalPages || totalPages === 0 ? 'true' : 'false'}">Next</a>
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
    
    /**
     * Initialize the overview map
     */
    initMap() {
        // Initialize map if the container exists
        const mapContainer = document.getElementById('reports-map');
        if (!mapContainer) return;
        
        // Check if Leaflet is available
        if (typeof L === 'undefined') {
            console.error('Leaflet library not loaded');
            return;
        }
        
        // Create map instance
        this.map = L.map('reports-map').setView([40.7128, -74.0060], 12);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);
        
        // Add markers for each report
        this.addMapMarkers();
    }
    
    /**
     * Add markers to the map for each report
     */
    addMapMarkers() {
        if (!this.map) return;
        
        // Clear existing markers
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
        
        // Add new markers
        this.reports.forEach(report => {
            // Use demo coordinates for now - in a real app these would come from the report data
            const lat = 40.7128 + (Math.random() - 0.5) * 0.05;
            const lng = -74.0060 + (Math.random() - 0.5) * 0.05;
            
            // Create marker with appropriate icon based on status
            const markerColor = this.getStatusColor(report.status);
            const markerIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: ${markerColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            
            const marker = L.marker([lat, lng], { icon: markerIcon })
                .addTo(this.map)
                .bindPopup(`
                    <strong>${report.wasteType}</strong><br>
                    ${report.location}<br>
                    <span class="badge" style="background-color: ${markerColor};">${report.status}</span>
                `);
            
            this.markers.push(marker);
        });
        
        // Initialize detail maps for expanded reports
        setTimeout(() => {
            this.initDetailMaps();
        }, 500);
    }
    
    /**
     * Initialize small maps for report details
     */
    initDetailMaps() {
        document.querySelectorAll('[id^="map-details-"]').forEach(container => {
            const reportId = container.id.replace('map-details-', '');
            const report = this.reports.find(r => r.id === reportId);
            
            if (!report) return;
            
            // Use demo coordinates for now
            const lat = 40.7128 + (Math.random() - 0.5) * 0.05;
            const lng = -74.0060 + (Math.random() - 0.5) * 0.05;
            
            const detailMap = L.map(container).setView([lat, lng], 15);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(detailMap);
            
            const markerColor = this.getStatusColor(report.status);
            const markerIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: ${markerColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            
            L.marker([lat, lng], { icon: markerIcon }).addTo(detailMap);
        });
    }
    
    /**
     * Get color for report status
     */
    getStatusColor(status) {
        switch (status.toLowerCase()) {
            case 'pending review':
                return '#ffc107'; // warning
            case 'in progress':
                return '#17a2b8'; // info
            case 'cleaned':
                return '#28a745'; // success
            case 'critical':
                return '#dc3545'; // danger
            default:
                return '#6c757d'; // secondary
        }
    }
}

// Initialize the reports manager when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the reports manager
    const reportsManager = new ReportsManager();
    
    // Add reports manager to window for debugging
    window.reportsManager = reportsManager;
});
