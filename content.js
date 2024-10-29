chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getRedditText') {
        console.log("Received request to get Reddit text.");

        // Adding a slight delay to allow Reddit's editor to fully load
        setTimeout(() => {
            try {
                const textElement = document.querySelector('div[slot="rte"][contenteditable="true"][role="textbox"]');
                if (textElement) {
                    console.log("Found the slotted text editor element in light DOM.");
                    console.log("HTML structure of the element:", textElement.outerHTML);

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
        }, 1000); // Reduced delay to make the response faster
        return true; // Indicates that we will respond asynchronously
    }

    if (request.action === 'insertImage') {
        try {
            const textElement = document.querySelector('div[slot="rte"][contenteditable="true"][role="textbox"]');
            if (textElement && request.imageUrl) {
                const imgTag = document.createElement('img');
                imgTag.src = request.imageUrl;
                imgTag.alt = 'Generated Image';
                imgTag.style.maxWidth = '100%';
                imgTag.style.marginTop = '10px';

                // Insert the image at the end of the current content
                textElement.appendChild(imgTag);
                console.log("Image inserted into the Reddit editor.");
                sendResponse({ success: true });
            } else {
                console.log("Unable to find the Reddit text element or image URL missing.");
                sendResponse({ success: false });
            }
        } catch (error) {
            console.error("An error occurred while inserting the image:", error);
            sendResponse({ success: false });
        }
        return true; // Indicates that we will respond asynchronously
    }
});
