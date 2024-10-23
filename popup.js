document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const textInput = document.getElementById('textInput');
    const imagesContainer = document.getElementById('imagesContainer');

    generateBtn.addEventListener('click', async () => {
        const text = textInput.value.trim();
        if (!text) {
            alert('Please enter some text to generate images.');
            return;
        }

        // Clear previous images
        imagesContainer.innerHTML = '';

        // Disable the button while generating images
        generateBtn.disabled = true;
        generateBtn.innerText = 'Generating...';

        const styles = ['cartoon', 'realistic', 'abstract', 'minimalist'];
        const apiKey = '9DjmPPktBczJiVsX4YbCy0SPwtFdGz5lt0dD3x7Huvpw2hqk6Al0JQQJ99AJACYeBjFXJ3w3AAABACOG72mv';
        const functionUrl = 'https://group7jjis.openai.azure.com/openai/deployments/dall-e-3/images/generations?api-version=2024-02-01';

        try {
            // Create an array of promises for each style
            const requests = styles.map(style => generateImageWithRetry(functionUrl, apiKey, text, style));
            const results = await Promise.all(requests);

            // Once all the promises are resolved, display all the images
            results.forEach(result => {
                if (result && result.imageUrl) {
                    displayGeneratedImage(result.imageUrl, result.style);
                } else {
                    displayErrorMessage(result.style, result.error || 'Unknown error');
                }
            });

        } catch (error) {
            alert('A critical error occurred. Please check console logs for more details.');
            console.error('Critical Error:', error);
        }

        // Enable the button after generating all images
        generateBtn.disabled = false;
        generateBtn.innerText = 'Generate Image';
    });

    async function generateImageWithRetry(functionUrl, apiKey, text, style, retries = 3) {
        const styledPrompt = `${text}, in ${style} style`;
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const response = await fetch(functionUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': apiKey,
                    },
                    body: JSON.stringify({
                        prompt: styledPrompt,
                        n: 1,
                        size: '1024x1024' // Adjusted resolution for Chrome extension
                    }),
                });

                if (!response.ok) {
                    if (response.status === 429) {
                        console.warn(`Rate limit hit for style ${style}. Retrying... (Attempt ${attempt + 1}/${retries})`);
                        await delay(500); // Wait 500ms before retrying
                    } else {
                        throw new Error(`Server returned status: ${response.status} for style ${style}`);
                    }
                } else {
                    const data = await response.json();
                    if (data && data.data && data.data.length > 0) {
                        return { imageUrl: data.data[0].url, style };
                    } else {
                        throw new Error('Unexpected response structure');
                    }
                }
            } catch (error) {
                if (attempt === retries - 1) {
                    console.error(`Failed to generate image for style ${style} after ${retries} attempts.`, error);
                    return { style, error };
                }
            }
        }
    }

    function displayGeneratedImage(imageUrl, style) {
        // Create a container for each image and its label
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'image-wrapper';

        // Create an image element
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = `Generated AI Image - ${style} style`;
        img.className = 'generated-image'; // Add class for CSS styling

        // Create a label for the style
        const label = document.createElement('p');
        label.innerText = `Style: ${style}`;
        label.className = 'image-label';

        // Append image and label to the container
        imageWrapper.appendChild(img);
        imageWrapper.appendChild(label);

        // Append the container to the images container
        imagesContainer.appendChild(imageWrapper);
    }

    function displayErrorMessage(style, error) {
        const errorWrapper = document.createElement('div');
        errorWrapper.className = 'error-wrapper';

        const errorText = document.createElement('p');
        errorText.innerText = `Error generating image for style: ${style}. ${error.message || error}`;
        errorText.className = 'error-message';

        errorWrapper.appendChild(errorText);
        imagesContainer.appendChild(errorWrapper);
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
});
