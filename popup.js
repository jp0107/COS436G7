document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const textInput = document.getElementById('textInput');
    const imagesContainer = document.getElementById('imagesContainer');

    generateBtn.addEventListener('click', async () => {
        const text = textInput.value.trim();
        if (!text) {
            alert('Please enter some text to generate an image.');
            return;
        }

        // Update the button state to indicate that the process is running
        generateBtn.disabled = true;
        generateBtn.innerText = 'Generating...';

        try {
            // Make an API call to your Azure Function endpoint
            const response = await fetch('https://aibackendfunction.azurewebsites.net/api/generateImage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: text }),
            });
            

            // Parse the response
            const data = await response.json();
            if (response.ok) {
                displayGeneratedImage(data.imageUrl);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Failed to reach the backend server. Please make sure it is running.');
            console.error('Error:', error);
        }

        // Reset the button state after the request is done
        generateBtn.disabled = false;
        generateBtn.innerText = 'Generate Image';
    });

    function displayGeneratedImage(imageUrl) {
        // Create an image element and add it to the images container
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Generated AI Image';
        img.style.margin = '10px';
        imagesContainer.appendChild(img);
    }
});
