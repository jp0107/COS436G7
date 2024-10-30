// Listen for messages from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getRedditText') {
        console.log("Received request to get Reddit text.");

        setTimeout(() => {
            try {
                // Select the Reddit post editor element
                const textElement = document.querySelector('div[slot="rte"][contenteditable="true"][role="textbox"]');
                if (textElement) {
                    console.log("Found the slotted text editor element in light DOM.");

                    // Extract text from all paragraph elements within the editor
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

    // Insert the generated image and copy it to the clipboard
    if (request.action === 'insertImageAndCopy') {
        try {
            if (request.imageUrl) {
                // Ensure the Reddit editor is focused
                const textElement = document.querySelector('div[slot="rte"][contenteditable="true"][role="textbox"]');
                if (textElement) {
                    textElement.focus();
                }

                // Delay before writing to clipboard, giving time for the user to ensure the window is focused
                setTimeout(async () => {
                    try {
                        // Fetch the image and convert it into a Blob
                        const response = await fetch(request.imageUrl);
                        const blob = await response.blob();

                        const clipboardItem = new ClipboardItem({ "image/png": blob });

                        // Attempt to write the image blob to the clipboard
                        await navigator.clipboard.write([clipboardItem]);

                        alert("The image has been copied to your clipboard. Please click inside the Reddit editor and press Ctrl+V (Cmd+V on Mac) to paste it.");

                        sendResponse({ success: true });
                    } catch (clipboardError) {
                        console.error("Failed to write to clipboard:", clipboardError);
                        alert("Failed to write image to clipboard. Please try manually copying the image from the browser and pasting it into the Reddit editor.");
                        sendResponse({ success: false });
                    }
                }, 3000); // 3-second delay to ensure the document is focused
            } else {
                console.log("Image URL is missing.");
                sendResponse({ success: false });
            }
        } catch (error) {
            console.error("An error occurred while inserting the image:", error);
            sendResponse({ success: false });
        }
        return true; // Indicates that we will respond asynchronously
    }
});
