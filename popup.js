document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const mainDiv = document.getElementById('main');
    const loginDiv = document.getElementById('login');
    const profilePic = document.getElementById('profilePic');
    const profileName = document.getElementById('profileName');

    // Helper function to update the UI based on auth state
    function updateUIBasedOnAuth(isAuthenticated, userInfo = null) {
        if (isAuthenticated && userInfo) {
            loginDiv.style.display = 'none';
            mainDiv.style.display = 'block';
            profileName.textContent = userInfo.name;
            profilePic.src = userInfo.picture;
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
                    fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
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

    const generateBtn = document.getElementById('generateBtn');
    const clearBtn = document.getElementById('clearBtn');
    const textInput = document.getElementById('textInput');
    const imagesContainer = document.getElementById('imagesContainer');

    function isAuthenticated() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['isAuthenticated'], (result) => resolve(result.isAuthenticated));
        });
    }

    isAuthenticated().then((authStatus) => {
        if (authStatus) {
            // Check if there's stored text or image
            chrome.storage.local.get(['savedText', 'savedImageUrl'], (result) => {
                if (result.savedText || result.savedImageUrl) {
                    // If storage data exists, load it
                    if (result.savedText) {
                        textInput.value = result.savedText;
                    }
                    if (result.savedImageUrl) {
                        displayGeneratedImage(result.savedImageUrl);
                    }
                } else {
                    // If no storage data, proceed with auto-retrieval and generation
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        const currentTab = tabs[0];
                        if (currentTab && currentTab.url.includes('reddit.com')) { // Only proceed if URL matches Reddit
                            setTimeout(() => {
                                chrome.tabs.sendMessage(currentTab.id, { action: 'getRedditText' }, async (response) => {
                                    if (chrome.runtime.lastError) {
                                        console.error("Error:", chrome.runtime.lastError.message);
                                        return;
                                    }
                                    if (response && response.text) {
                                        console.log("Received text from content script:", response.text);
                                        textInput.value = response.text;
                                        chrome.storage.local.set({ savedText: response.text });
                                        await generateImage(response.text);
                                    } else {
                                        textInput.placeholder = "Unable to retrieve text. Please type manually.";
                                    }
                                });
                            }, 1000);
                        } else {
                            console.warn("Content script not available on this tab");
                        }
                    });
                }
            });

            // Save input text changes
            textInput.addEventListener('input', () => {
                chrome.storage.local.set({ savedText: textInput.value });
            });

            // Generate image on button click
            generateBtn.addEventListener('click', async () => {
                const text = textInput.value.trim();
                if (!text) {
                    alert('Please enter some text to generate an image.');
                    return;
                }
                await generateImage(text);
            });

            // Clear storage and reset UI when clear button is clicked
            clearBtn.addEventListener('click', () => {
                chrome.storage.local.clear(() => {
                    console.log("chrome.storage.local cleared by user.");
                    textInput.value = '';
                    imagesContainer.innerHTML = ''; // Clear any displayed images
                });
            });
        }
    });

    async function generateImage(text) {
        imagesContainer.innerHTML = '';
        generateBtn.disabled = true;
        generateBtn.innerText = 'Generating...';

        const apiKey = '9DjmPPktBczJiVsX4YbCy0SPwtFdGz5lt0dD3x7Huvpw2hqk6Al0JQQJ99AJACYeBjFXJ3w3AAABACOG72mv';
        const functionUrl = 'https://group7jjis.openai.azure.com/openai/deployments/dall-e-3/images/generations?api-version=2024-02-01';

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

                // Save image URL in storage
                chrome.storage.local.set({ savedImageUrl: imageUrl });

                // Send image URL to content script for copying
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
