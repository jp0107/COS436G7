document.addEventListener('DOMContentLoaded', () => {
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
