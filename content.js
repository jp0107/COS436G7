console.log("Content script loaded on Reddit page.");

let imageUrlToCopy = null;

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getRedditText') {
        console.log("Received request to get Reddit text.");

        setTimeout(() => {
            try {
                const textElement = document.querySelector('div[slot="rte"][contenteditable="true"][role="textbox"]');
                if (textElement) {
                    console.log("Found the slotted text editor element in light DOM.");

                    const paragraphs = textElement.querySelectorAll('p');
                    let extractedText = '';

                    paragraphs.forEach((p) => {
                        if (p.querySelector('span[data-lexical-text="true"]')) {
                            const spanTexts = p.querySelectorAll('span[data-lexical-text="true"]');
                            spanTexts.forEach((span) => {
                                extractedText += span.innerText + ' ';
                            });
                        } else {
                            extractedText += p.innerText + ' ';
                        }
                    });

                    extractedText = extractedText.trim();
                    console.log("Extracted text:", extractedText);

                    if (extractedText) {
                        sendResponse({ text: extractedText });
                    } else {
                        console.log("No text found in Reddit post.");
                        sendResponse({ text: '' });
                    }
                } else {
                    console.log("Could not find the slotted text editor element in light DOM.");
                    sendResponse({ text: '' });
                }
            } catch (error) {
                console.error("An error occurred:", error);
                sendResponse({ text: '' });
            }
        }, 1000);
        return true; // Indicates that we will respond asynchronously
    }

    // Prepare to copy the image when the user refocuses on the page
    if (request.action === 'prepareCopy' && request.imageUrl) {
        imageUrlToCopy = request.imageUrl;
        console.log("Image URL received, waiting for page focus to copy.");

        // Send a success response to popup.js
        sendResponse({ success: true });
    }

    return true; // Keeps the response channel open for async response
});

// Listen for the page to regain focus, then attempt to copy the image to clipboard
window.addEventListener('focus', async () => {
    if (imageUrlToCopy) {
        console.log("Page refocused, attempting to copy image to clipboard.");

        try {
            // Check if the document is focused before attempting to copy
            if (!document.hasFocus()) {
                console.log("Document is not focused. Waiting for user to click in the editor.");
                alert("Please click in the Reddit editor text box to focus before copying.");
                return;
            }

            // Fetch the image and copy it to the clipboard
            const response = await fetch(imageUrlToCopy);
            const blob = await response.blob();
            const clipboardItem = new ClipboardItem({ "image/png": blob });

            await navigator.clipboard.write([clipboardItem]);
            console.log("Image copied to clipboard.");
            alert("The image has been copied to your clipboard. Press Ctrl+V (Cmd+V on Mac) to paste it into the Reddit editor.");

            // Clear the image URL to prevent repeated copying
            imageUrlToCopy = null;
        } catch (clipboardError) {
            console.error("Failed to write to clipboard:", clipboardError);
            alert("Failed to copy image. Please try again.");
        }
    }
});
