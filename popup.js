document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const mainDiv = document.getElementById('main');
    const loginDiv = document.getElementById('login');
    const profilePic = document.getElementById('profilePic');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');

    // Helper function to update the UI based on auth state
    function updateUIBasedOnAuth(isAuthenticated, userInfo = null) {
        if (isAuthenticated && userInfo) {
            loginDiv.style.display = 'none';
            mainDiv.style.display = 'block';
            profileName.textContent = userInfo.name;
            profilePic.src = userInfo.picture;
            if (userInfo.email) {
                profileEmail.textContent = userInfo.email; // Set email
            } else {
                console.error("No email found in user info:", JSON.stringify(userInfo, null, 2));
            }
        } else {
            mainDiv.style.display = 'none';
            loginDiv.style.display = 'block';
        }
    }

    // Enhanced authentication check on load
    function checkAuthStatus() {
        return new Promise((resolve) => {
            // Attempt to get a token silently to check authentication status
            chrome.identity.getAuthToken({ interactive: false }, (token) => {
                if (token) {
                    // Token exists, user is authenticated; fetch user info
                    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })
                        .then(response => response.json())
                        .then(userInfo => {
                            // Store authenticated state and user info in storage for session
                            chrome.storage.local.set({ isAuthenticated: true, userInfo: userInfo });
                            resolve({ isAuthenticated: true, userInfo });
                        })
                        .catch(error => {
                            console.error("Error fetching user info:", error);
                            resolve({ isAuthenticated: false });
                        });
                } else {
                    console.log("No token found; user not authenticated");
                    resolve({ isAuthenticated: false });
                }
            });
        });
    }

    // Call checkAuthStatus and update UI accordingly
    checkAuthStatus().then(({ isAuthenticated, userInfo }) => {
        updateUIBasedOnAuth(isAuthenticated, userInfo);
    });

    // Login with Google
    loginBtn.addEventListener('click', () => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError || !token) {
                console.error("Authentication failed:", chrome.runtime.lastError);
                return;
            }

            fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
                headers: { 'Authorization': 'Bearer ' + token }
            }).then(response => response.json())
                .then(userInfo => {
                    chrome.storage.local.set({ isAuthenticated: true, userInfo: userInfo }, () => {
                        updateUIBasedOnAuth(true, userInfo);
                    });
                }).catch(error => console.error('Error fetching user info:', error));
        });
    });

    // Logout and revoke token
    logoutBtn.addEventListener('click', () => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (token) {
                fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`, {
                    method: 'POST',
                    headers: { 'Content-type': 'application/x-www-form-urlencoded' }
                })
                    .then(() => {
                        chrome.identity.removeCachedAuthToken({ token }, () => {
                            chrome.storage.local.clear(() => {
                                updateUIBasedOnAuth(false);
                            });
                            console.log("Token revoked and user logged out.");
                        });
                    })
                    .catch(error => {
                        console.error("Failed to revoke token:", error);
                    });
            } else {
                chrome.storage.local.clear(() => {
                    updateUIBasedOnAuth(false);
                });
            }
        });
    });

    const generateTab = document.getElementById('generateTab');
    const historyTab = document.getElementById('historyTab');
    const generateSection = document.getElementById('generateSection');
    const historySection = document.getElementById('historySection');

    // Tab switching logic
    generateTab.addEventListener('click', () => {
        switchTab(generateTab, historyTab, generateSection, historySection);
    });

    historyTab.addEventListener('click', () => {
        switchTab(historyTab, generateTab, historySection, generateSection);
        updateHistory(); // Automatically update history when switching to the History tab
    });

    function switchTab(activeTab, inactiveTab, showSection, hideSection) {
        activeTab.classList.add('selected');
        inactiveTab.classList.remove('selected');
        showSection.classList.add('active');
        hideSection.classList.remove('active');
    }

    // Helper function to update history
    function updateHistory() {
        chrome.storage.local.get(['imageHistory'], (data) => {
            historyContainer.innerHTML = ''; // Clear previous history
            const history = data.imageHistory || [];
    
            if (history.length > 0) {
                const previousImages = history.slice(0, 10);
                previousImages.forEach(({ inputText, imageUrl }, index) => {
                    const entryContainer = document.createElement('div');
                    entryContainer.classList.add('history-entry'); // Assign class for styling
    
                    const titleElement = document.createElement('p');
                    titleElement.textContent = `Image ${index + 1}`;
                    titleElement.classList.add('history-title');
    
                    const textElement = document.createElement('p');
                    textElement.textContent = inputText;
                    textElement.classList.add('history-text');
    
                    const imageElement = document.createElement('img');
                    imageElement.src = imageUrl;
                    imageElement.alt = `Generated image ${index + 1}`;
                    imageElement.classList.add('history-image');
    
                    entryContainer.appendChild(titleElement);
                    entryContainer.appendChild(textElement);
                    entryContainer.appendChild(imageElement);
                    historyContainer.appendChild(entryContainer);
                });
            } else {
                historyContainer.textContent = 'No history available.';
            }
        });
    }
    

    const generateBtn = document.getElementById('generateBtn');
    const textInput = document.getElementById('textInput');
    const imagesContainer = document.getElementById('imagesContainer');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        setTimeout(() => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getRedditText' }, async (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error:", chrome.runtime.lastError.message);
                    return;
                }
                if (response && response.text) {
                    console.log("Received text from content script:", response.text);
                    textInput.value = response.text;
                    await generateImage(response.text);
                } else {
                    console.log("No text received from content script.");
                    textInput.placeholder = "Unable to retrieve text. Please type manually.";
                }
            });
        }, 1000);
    });

    generateBtn.addEventListener('click', async () => {
        const text = textInput.value.trim();
        if (!text) {
            alert('Please enter some text to generate an image.');
            return;
        }
        await generateImage(text);
    });

    function animateGeneratingText(button) {
        let dots = 0;
        button.innerText = 'Generating';
        const interval = setInterval(() => {
            dots = (dots + 1) % 4; // Cycle through 0, 1, 2, 3
            button.innerText = 'Generating' + '.'.repeat(dots);
        }, 500); // Adjust timing if needed
    
        return interval;
    }    

    async function generateImage(text) {
        imagesContainer.innerHTML = '';
        generateBtn.disabled = true;
        generateBtn.innerText = 'Generating...';

        const apiKey = '9DjmPPktBczJiVsX4YbCy0SPwtFdGz5lt0dD3x7Huvpw2hqk6Al0JQQJ99AJACYeBjFXJ3w3AAABACOG72mv';
        const functionUrl = 'https://group7jjis.openai.azure.com/openai/deployments/dall-e-3/images/generations?api-version=2024-02-01';

        let generatingInterval = animateGeneratingText(generateBtn); // Start animation

        try {
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': apiKey,
                },
                body: JSON.stringify({
                    prompt: text,
                    n: 1,
                    size: '1024x1024'
                }),
            });

            if (!response.ok) {
                throw new Error(`Server returned status: ${response.status}`);
            }

            const data = await response.json();
            if (data && data.data && data.data.length > 0) {
                const imageUrl = data.data[0].url;
                console.log("Generated Image URL:", imageUrl);
                displayGeneratedImage(imageUrl);

                // Save text and image URL in history
                chrome.storage.local.get(['imageHistory'], (data) => {
                    const history = data.imageHistory || [];
                    history.unshift({ inputText: text, imageUrl: imageUrl });
                    if (history.length > 10) history.pop();
                    chrome.storage.local.set({ imageHistory: history });
                    updateHistory();
                });

                // Send image URL to content script for copying and prompt the user
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'prepareCopy', imageUrl: imageUrl }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error("Error:", chrome.runtime.lastError.message);
                        } else if (response && response.success) {
                            console.log("Image URL sent to content script.");
                            alert("Please close this popup, click in the Reddit editor text box, and the image will be copied automatically.");
                        } else {
                            console.log("Failed to prepare image copying.");
                        }
                    });
                });
            } else {
                alert('Error: Unexpected response from the server');
                console.error('Unexpected response:', data);
            }
        } catch (error) {
            alert('Failed to reach the backend server. Please make sure it is running.');
            console.error('Error:', error);
        }
        
        clearInterval(generatingInterval);
        generateBtn.disabled = false;
        generateBtn.innerText = 'Generate Image';
    }

    function displayGeneratedImage(imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Generated AI Image';
        img.style.margin = '10px';
        imagesContainer.appendChild(img);
    }

});
