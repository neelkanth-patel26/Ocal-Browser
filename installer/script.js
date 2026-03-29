document.addEventListener('DOMContentLoaded', () => {
    const screens = ['welcome', 'license', 'destination', 'preferences', 'installing'];
    let currentStepIndex = 0;

    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');
    const steps = document.querySelectorAll('.step');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const installStatus = document.getElementById('installStatus');
    const browseBtn = document.getElementById('browseBtn');
    const installPathInput = document.getElementById('installPath');
    const minimizeBtn = document.getElementById('minimizeBtn');
    const closeBtn = document.getElementById('closeBtn');
    const licenseTextContent = document.getElementById('licenseTextContent');
    const importFileBtn = document.getElementById('importFileBtn');
    const filePathLabel = document.getElementById('filePathLabel');
    let selectedBookmarkPath = null;
    let isUpdateMode = false;

    // Listen for Update State
    window.electronAPI.on('installer-state', (event, data) => {
        if (data && data.isUpdate) {
            isUpdateMode = true;
            document.getElementById('welcomeHeader').innerHTML = 'Welcome back to <span class="neon-text">Ocal Browser</span>';
            document.getElementById('welcomeSubtext').innerText = 'You are about to update Ocal to the latest professional version. All your data and AI settings will be preserved.';
            document.getElementById('featureTitle').innerText = 'Swift Update';
            document.getElementById('featureDesc').innerText = 'Optimizing your browser binaries for maximum performance.';
            
            // Skip License and Destination screens for Updates
            screens.splice(1, 2); 
            updateNavigation();
        }
    });

    // Load License Text
    fetch('../license.txt')
        .then(res => res.text())
        .then(text => {
            if (licenseTextContent) licenseTextContent.innerText = text;
        })
        .catch(err => {
            if (licenseTextContent) licenseTextContent.innerText = "Error loading License Agreement.";
        });

    // Window Controls
    minimizeBtn.onclick = () => window.electronAPI.send('window-minimize');
    closeBtn.onclick = () => window.electronAPI.send('window-close');

    function updateNavigation() {
        // Update Screen
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(`screen-${screens[currentStepIndex]}`).classList.add('active');

        // Update Sidebar
        steps.forEach((step, index) => {
            if (index <= currentStepIndex) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        // Update Buttons
        if (currentStepIndex === 0) {
            backBtn.style.display = 'none';
        } else {
            backBtn.style.display = 'block';
        }
        
        if (currentStepIndex === screens.length - 1) {
            nextBtn.style.display = 'none';
            startActualInstallation();
        } else {
            nextBtn.style.display = 'block';
            if (currentStepIndex === screens.length - 2) {
                nextBtn.innerText = isUpdateMode ? 'Update Now' : 'Install';
            } else {
                nextBtn.innerText = 'Next';
            }
        }

        // Handle validation for License screen
        if (screens[currentStepIndex] === 'license') {
            const agreeCheckbox = document.getElementById('agreeCheckbox');
            nextBtn.disabled = !agreeCheckbox.checked;
        } else {
            nextBtn.disabled = false;
        }
    }

    browseBtn.addEventListener('click', async () => {
        try {
            const selectedPath = await window.electronAPI.invoke('select-install-path');
            if (selectedPath) {
                installPathInput.value = selectedPath;
            }
        } catch (err) {
            console.error('Failed to select path:', err);
        }
    });

    if (importFileBtn) {
        importFileBtn.addEventListener('click', async () => {
            try {
                const selectedPath = await window.electronAPI.invoke('select-bookmark-file');
                if (selectedPath) {
                    selectedBookmarkPath = selectedPath;
                    filePathLabel.innerText = 'Selected: ' + selectedPath.split(/[\\/]/).pop();
                    filePathLabel.style.display = 'block';
                    document.getElementById('importData').checked = false; // Disable auto-import if manual is used
                }
            } catch (err) {
                console.error('Failed to select bookmark file:', err);
            }
        });
    }

    nextBtn.addEventListener('click', () => {
        if (currentStepIndex === screens.length - 2) {
            // "Install" button was clicked
            currentStepIndex++;
            updateNavigation();
            startActualInstallation();
        } else if (currentStepIndex < screens.length - 1) {
            currentStepIndex++;
            updateNavigation();
        }
    });

    backBtn.addEventListener('click', () => {
        if (currentStepIndex > 0) {
            currentStepIndex--;
            updateNavigation();
        }
    });

    const agreeCheckbox = document.getElementById('agreeCheckbox');
    if (agreeCheckbox) {
        agreeCheckbox.addEventListener('change', () => {
            if (screens[currentStepIndex] === 'license') {
                nextBtn.disabled = !agreeCheckbox.checked;
            }
        });
    }

    function startActualInstallation() {
        const config = {
            path: installPathInput.value,
            importData: document.getElementById('importData').checked,
            bookmarkFilePath: selectedBookmarkPath,
            setDefault: document.getElementById('setDefault').checked,
            createShortcut: document.getElementById('createShortcut').checked
        };

        window.electronAPI.send('start-installation', config);

        window.electronAPI.on('install-progress', (event, data) => {
            progressBar.style.width = `${data.progress}%`;
            progressText.innerText = `${data.progress}%`;
            installStatus.innerText = data.status;
            console.log(`Install progress: ${data.progress}% - ${data.status}`);
        });

        window.electronAPI.on('install-complete', () => {
            progressBar.style.width = '100%';
            progressText.innerText = '100%';
            installStatus.innerText = 'Ocal Browser is ready!';

            setTimeout(() => {
                const finishBtn = document.createElement('button');
                finishBtn.className = 'btn btn-primary';
                finishBtn.innerText = 'Launch Ocal';
                finishBtn.onclick = () => {
                    console.log('Launching app...');
                    window.electronAPI.send('launch-app');
                };
                
                const footer = document.querySelector('.footer');
                footer.innerHTML = '';
                footer.appendChild(finishBtn);
            }, 800);
        });

        window.electronAPI.on('install-error', (event, message) => {
            installStatus.innerText = `Error: ${message}`;
            installStatus.style.color = '#ff5f5f';
            console.error('Installation error:', message);
        });
    }

    function startInstallation() {
        // Redundant simulated function removed for IPC-based functional logic
    }

    // Carousel Logic for Welcome Screen
    let featureIndex = 0;
    const features = [
        { title: 'AI Copilot', desc: 'Integrated AI that understands your workflow.' },
        { title: 'Privacy Shield', desc: 'Advanced tracking protection by default.' },
        { title: 'Unified Search', desc: 'Fast, intelligent search across all your data.' }
    ];

    setInterval(() => {
        featureIndex = (featureIndex + 1) % features.length;
        const featureItem = document.querySelector('.feature-item');
        featureItem.classList.remove('active');
        
        setTimeout(() => {
            featureItem.querySelector('h3').innerText = features[featureIndex].title;
            featureItem.querySelector('p').innerText = features[featureIndex].desc;
            featureItem.classList.add('active');
        }, 400);
    }, 4000);

    // Initial State
    updateNavigation();
});
