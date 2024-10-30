document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const textInput = document.getElementById('textInput');
    const imagesContainer = document.getElementById('imagesContainer');

    // Automatically request text from Reddit content (content.js)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        // Add a small delay to ensure the content script is properly loaded
        setTimeout(() => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getRedditText' }, async (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error:", chrome.runtime.lastError.message);
                    return;
                }
                if (response && response.text) {
                    console.log("Received text from content script:", response.text);
                    textInput.value = response.text; // Set the text in the popup textarea

                    // Automatically generate the image based on the extracted text
                    await generateImage(response.text);
                } else {
                    console.log("No text received from content script.");
                    textInput.placeholder = "Unable to retrieve text. Please type manually.";
                }
            });
        }, 1000); // Delay to allow content script to be ready
    });

    // Button click fallback (if user wants to manually trigger generation)
    generateBtn.addEventListener('click', async () => {
        const text = textInput.value.trim();
        if (!text) {
            alert('Please enter some text to generate an image.');
            return;
        }

        await generateImage(text);
    });

    // Generate a single image based on the given text
    async function generateImage(text) {
        // Clear previous images
        imagesContainer.innerHTML = '';

        // Disable the button while generating images
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
                    size: '1024x1024' // Adjusted resolution for Chrome extension
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
                await copyToClipboard(imageUrl);
                alert('Image URL has been copied to your clipboard.');

                // Send image URL to content script to insert into the Reddit editor
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'insertImage', imageUrl: imageUrl }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error("Error:", chrome.runtime.lastError.message);
                        } else if (response && response.success) {
                            console.log("Image successfully inserted into Reddit editor.");
                        } else {
                            console.log("Failed to insert image into Reddit editor.");
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

        // Enable the button after generating images
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

    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            console.log("Image URL copied to clipboard:", text);
        } catch (error) {
            console.error("Failed to copy image URL to clipboard:", error);
        }
    }
});
