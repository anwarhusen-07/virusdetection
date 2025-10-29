// Global State Variables
let selectedFiles = [];
let quarantineFiles = [];
let reports = [];
let scanning = false;
let totalScannedEver = 0;
let totalInfectedEver = 0;
let totalCleanEver = 0;

// Virus Signatures Database (Mock)
const virusSignatures = {
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855': 'Generic.Trojan',
    '5d41402abc4b2a76b9719d911017c592': 'EICAR.Test.Virus',
    'd41d8cd98f00b204e9800998ecf8427e': 'Suspicious.EmptyFile'
};

// Tab Switching Function
function switchTab(tabName) {
    // Remove active class from all content sections
    document.querySelectorAll('.content').forEach(function(content) {
        content.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    
    // Add active class to selected tab and content
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// File Input Change Handler
document.getElementById('fileInput').addEventListener('change', function(e) {
    selectedFiles = Array.from(e.target.files);
    
    if (selectedFiles.length > 0) {
        // Show file list container
        document.getElementById('fileListContainer').style.display = 'block';
        document.getElementById('scanBtn').disabled = false;
        
        // Display selected files
        let html = '';
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            html += '<div class="file-item">• ' + file.name + ' (' + (file.size / 1024).toFixed(2) + ' KB)</div>';
        }
        document.getElementById('fileList').innerHTML = html;
    }
});

// Add Log Entry Function
function addLog(type, message) {
    const logContainer = document.getElementById('logContainer');
    const time = new Date().toLocaleTimeString();
    
    // Clear placeholder text if exists
    if (logContainer.querySelector('[style*="text-align"]')) {
        logContainer.innerHTML = '';
    }
    
    // Create log entry
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry ' + type;
    logEntry.innerHTML = '<span class="log-time">[' + time + ']</span><span>' + message + '</span>';
    
    // Add to container and scroll to bottom
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// Calculate File Hash (Mock Implementation)
function calculateHash(file) {
    return new Promise(function(resolve) {
        // Simulate hash calculation based on file properties
        if (file.size === 0) {
            // Empty file - suspicious
            resolve('d41d8cd98f00b204e9800998ecf8427e');
        } else if (Math.random() > 0.85) {
            // 15% chance of detecting as EICAR test virus
            resolve('5d41402abc4b2a76b9719d911017c592');
        } else {
            // Generate random "clean" hash
            resolve('clean_' + Math.random().toString(36).substr(2, 9));
        }
    });
}

// Sleep Function for Delay
function sleep(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}

// Animate Progress Bar Smoothly
function animateProgress(targetProgress) {
    return new Promise(function(resolve) {
        const progressBar = document.getElementById('progressBar');
        const progressPercent = document.getElementById('progressPercent');
        const currentProgress = parseFloat(progressBar.style.width) || 0;
        const duration = 800; // Animation duration in milliseconds
        const steps = 60; // Number of animation steps
        const increment = (targetProgress - currentProgress) / steps;
        const stepDuration = duration / steps;
        
        let currentStep = 0;
        
        const animationInterval = setInterval(function() {
            currentStep++;
            const newProgress = currentProgress + (increment * currentStep);
            
            if (currentStep >= steps) {
                progressBar.style.width = targetProgress + '%';
                progressPercent.textContent = Math.round(targetProgress) + '%';
                clearInterval(animationInterval);
                resolve();
            } else {
                progressBar.style.width = newProgress + '%';
                progressPercent.textContent = Math.round(newProgress) + '%';
            }
        }, stepDuration);
    });
}

// Start Scan Function
async function startScan() {
    if (selectedFiles.length === 0 || scanning) return;
    
    // Set scanning state
    scanning = true;
    document.getElementById('scanBtn').disabled = true;
    document.getElementById('selectBtn').disabled = true;
    document.getElementById('progressSection').style.display = 'block';
    document.getElementById('statsContainer').style.display = 'grid';
    
    // Reset progress bar
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressPercent').textContent = '0%';
    
    let infected = 0;
    let clean = 0;
    const startTime = Date.now();
    
    // Scan each file
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const targetProgress = ((i + 1) / selectedFiles.length) * 100;
        
        // Log scanning message
        addLog('info', 'Scanning: ' + file.name + ' (' + (file.size / 1024).toFixed(2) + ' KB)');
        
        // Animate progress bar to target
        const progressPromise = animateProgress(targetProgress);
        
        // Simulate scanning delay (runs in parallel with progress animation)
        const scanPromise = sleep(1200); // Increased time for more realistic scanning
        
        // Wait for both animation and scan to complete
        await Promise.all([progressPromise, scanPromise]);
        
        // Calculate hash and check for threats
        const hash = await calculateHash(file);
        const threat = virusSignatures[hash];
        
        if (threat) {
            // Threat detected
            infected++;
            quarantineFiles.push({
                name: file.name,
                size: file.size,
                threat: threat,
                hash: hash,
                date: new Date().toISOString()
            });
            
            addLog('danger', '⚠️ THREAT DETECTED: ' + file.name + ' - ' + threat);
        } else {
            // File is clean
            clean++;
            addLog('success', '✓ Clean: ' + file.name);
        }
        
        // Update statistics (cumulative)
        totalScannedEver = totalScannedEver + 1;
        if (threat) {
            totalInfectedEver = totalInfectedEver + 1;
        } else {
            totalCleanEver = totalCleanEver + 1;
        }
        
        document.getElementById('statTotal').textContent = totalScannedEver;
        document.getElementById('statInfected').textContent = totalInfectedEver;
        document.getElementById('statClean').textContent = totalCleanEver;
    }
    
    // Calculate scan duration
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Generate report
    reports.unshift({
        id: Date.now(),
        date: new Date().toLocaleString(),
        filesScanned: selectedFiles.length,
        threatsFound: infected,
        cleanFiles: clean,
        duration: duration + 's'
    });
    
    // Update UI
    renderReports();
    
    // Reset scanning state
    scanning = false;
    document.getElementById('selectBtn').disabled = false;
    
    // Log completion message
    addLog('info', '✅ Scan Complete! ' + infected + ' threats found, ' + clean + ' files clean.');
}

// Render Reports List
function renderReports() {
    const container = document.getElementById('reportsList');
    
    if (reports.length === 0) {
        // Show empty state
        container.innerHTML = '<div class="empty-state">' +
            '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>' +
            '</svg>' +
            '<h3>No reports available</h3>' +
            '<p>Run a scan to generate reports</p>' +
            '</div>';
    } else {
        // Render report items
        let html = '';
        for (let i = 0; i < reports.length; i++) {
            const report = reports[i];
            html += '<div class="report-item">' +
                '<div class="report-header">' +
                '<div class="report-date">🕐 ' + report.date + '</div>' +
                '<div class="report-duration">Duration: ' + report.duration + '</div>' +
                '</div>' +
                '<div class="report-stats">' +
                '<div class="stat-card total">' +
                '<div class="stat-value">' + report.filesScanned + '</div>' +
                '<div class="stat-label">Files Scanned</div>' +
                '</div>' +
                '<div class="stat-card infected">' +
                '<div class="stat-value">' + report.threatsFound + '</div>' +
                '<div class="stat-label">Threats Found</div>' +
                '</div>' +
                '<div class="stat-card clean">' +
                '<div class="stat-value">' + report.cleanFiles + '</div>' +
                '<div class="stat-label">Clean Files</div>' +
                '</div>' +
                '</div>' +
                '</div>';
        }
        container.innerHTML = html;
    }
}

// Initialize on page load
window.addEventListener('load', function() {
    console.log('Real Antivirus Web Edition - Initialized');
    console.log('Educational Purpose Only - Not a real antivirus!');
});