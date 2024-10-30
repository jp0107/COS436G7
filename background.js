chrome.action.onClicked.addListener((tab) => {
    // Ensure we're on a valid Reddit post creation page
    if (tab.url && tab.url.includes("reddit.com/submit")) {
        // Add a delay to give the content script time to load
        setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'getRedditText' }, async (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error:", chrome.runtime.lastError.message);
                    return;
                }

                if (response && response.text) {
                    console.log("Received text from content script:", response.text);
                    await generateImage(response.text, tab.id);
                } else {
                    console.log("No text received from content script.");
                }
            });
        }, 1000); // 1 second delay to ensure content script is ready
    } else {
        console.error("This extension can only be used on Reddit post creation pages.");
    }
});

// Function to generate an image and handle the response
async function generateImage(text, tabId) {
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

            // Send image URL to content script to insert into the Reddit editor and copy to clipboard
            chrome.tabs.sendMessage(tabId, { action: 'insertImageAndCopy', imageUrl: imageUrl }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error:", chrome.runtime.lastError.message);
                } else if (response && response.success) {
                    console.log("Image successfully inserted into Reddit editor.");
                } else {
                    console.log("Failed to insert image into Reddit editor.");
                }
            });
        } else {
            alert('Error: Unexpected response from the server');
            console.error('Unexpected response:', data);
        }
    } catch (error) {
        alert('Failed to reach the backend server. Please make sure it is running.');
        console.error('Error:', error);
    }
}

// Function to copy the actual image to the clipboard
async function copyImageToClipboard(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch the image from URL: ${response.statusText}`);
        }

        const blob = await response.blob();
        const clipboardItem = new ClipboardItem({ "image/png": blob });

        // Attempt to write the image blob to the clipboard
        await navigator.clipboard.write([clipboardItem]);
        console.log("Image successfully copied to clipboard.");

    } catch (error) {
        console.error("Failed to copy image to clipboard:", error);
        alert("Failed to copy image to clipboard. Please try manually copying the image from the browser and pasting it into the Reddit editor.");
    }
}
