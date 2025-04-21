// --- DOM Elements ---
const textInput = document.getElementById('text-input');
const sendTextBtn = document.getElementById('send-text-btn');
const recordAudioBtn = document.getElementById('record-audio-btn');
const chatOutput = document.getElementById('chat-output');
const statusArea = document.getElementById('status-area');
const audioResponseToggle = document.getElementById('audio-response-toggle');
const imageUpload = document.getElementById('image-upload');
const languageSelect = document.getElementById('language-select');
const loadingIndicator = document.getElementById('loading-indicator');
const speakerIcon = document.querySelector('.toggle-label');
const typingIndicator = document.getElementById('typing-indicator');
const audioLevelBar = document.querySelector('.audio-level-bar');
const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = themeToggle.querySelector('.material-symbols-outlined');

// --- State Variables ---
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let useAudioResponse = false;
let currentImage = null;
let currentLanguage = 'en';
let audioContext;
let analyser;
let dataArray;
let animationFrameId;

// --- Theme Management ---
const THEME_KEY = 'preferred_theme';
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const systemPrefersDark = prefersDarkScheme.matches;
    
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    } else if (systemPrefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcon('dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        updateThemeIcon('light');
    }
}

// Update theme icon
function updateThemeIcon(theme) {
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    }
}

// Toggle theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    updateThemeIcon(newTheme);
}

// Listen for system theme changes
prefersDarkScheme.addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_KEY)) {
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        updateThemeIcon(newTheme);
    }
});

// Initialize theme on load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    loadChatHistory();
    addClearHistoryButton();
});

// Sound effects
const startSound = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
const stopSound = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');

// Initialize audio context and analyser
function initAudioContext() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
}

// Update audio level meter
function updateAudioLevel() {
    if (!analyser) return;
    
    analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const level = Math.min(100, (average / 128) * 100);
    
    audioLevelBar.style.width = `${level}%`;
    animationFrameId = requestAnimationFrame(updateAudioLevel);
}

// --- Chat History Management ---
const CHAT_HISTORY_KEY = 'chat_history';

// --- Event Listeners ---
sendTextBtn.addEventListener('click', handleSendText);
textInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        handleSendText();
    }
});
recordAudioBtn.addEventListener('click', handleRecordAudio);
audioResponseToggle.addEventListener('change', (event) => {
    useAudioResponse = event.target.checked;
});
imageUpload.addEventListener('change', handleImageUpload);
languageSelect.addEventListener('change', (event) => {
    currentLanguage = event.target.value;
    console.log("Language changed to:", currentLanguage);
});

// Toggle speaker icon state
speakerIcon.addEventListener('click', () => {
    useAudioResponse = !useAudioResponse;
    speakerIcon.classList.toggle('active', useAudioResponse);
});

// --- Functions ---

// Adds a message bubble to the chat display
function addMessageToChat(content, sender, imageUrl = null, shouldSave = true) {
    console.log(`[addMessageToChat] Called with sender: ${sender}, content type: ${typeof content}`, content);
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender === 'user' ? 'user-message' : 'assistant-message');
    
    if (content instanceof HTMLAudioElement) {
        messageElement.appendChild(content);
    } else if (sender === 'assistant' && content instanceof Blob) {
        const audioPlayer = document.createElement('audio');
        audioPlayer.controls = true;
        audioPlayer.classList.add('audio-player');
        const audioUrl = URL.createObjectURL(content);
        audioPlayer.src = audioUrl;
        messageElement.appendChild(audioPlayer);
    } else {
        messageElement.textContent = content;
    }

    if (imageUrl) {
        messageElement.classList.add('has-image');
        const imgPreview = document.createElement('img');
        imgPreview.src = imageUrl;
        imgPreview.classList.add('image-preview');
        imgPreview.alt = 'Uploaded image';
        messageElement.appendChild(imgPreview);
    }
    
    chatOutput.appendChild(messageElement);
    chatOutput.scrollTop = chatOutput.scrollHeight;

    // Save to history only if requested and not an audio preview
    if (shouldSave && !(content instanceof HTMLAudioElement)) {
        saveMessageToHistory(content, sender, imageUrl);
    }
}

// Updates the status text
function setStatus(message) {
    statusArea.textContent = message;
}

// Clears the status text
function clearStatus() {
    statusArea.textContent = '';
}

// Shows the loading indicator
function showLoading() {
    loadingIndicator.classList.remove('loading-hidden');
}

// Hides the loading indicator
function hideLoading() {
    loadingIndicator.classList.add('loading-hidden');
}

// Shows the typing indicator
function showTypingIndicator() {
    typingIndicator.style.display = 'flex';
    chatOutput.scrollTop = chatOutput.scrollHeight;
}

// Hides the typing indicator
function hideTypingIndicator() {
    typingIndicator.style.display = 'none';
}

// Shows an error message in the chat
function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.classList.add('message', 'error-message');
    errorElement.textContent = message;
    chatOutput.appendChild(errorElement);
    chatOutput.scrollTop = chatOutput.scrollHeight;
}

// Handles sending the text message
function handleSendText() {
    const text = textInput.value.trim();
    if (text && !isRecording) { // Prevent sending text while recording
        addMessageToChat(text, 'user');
        sendTextMessageToBackend(text);
        textInput.value = '';
    }
}

// Sends the text message to the backend API
async function sendTextMessageToBackend(text) {
    setStatus('Processing your message...');
    showLoading(sendTextBtn);
    showTypingIndicator();

    try {
        const apiUrl = `/process_text?output_format=${useAudioResponse ? 'audio' : 'text'}&lang=${currentLanguage}`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text }),
        });

        if (!response.ok) {
            let errorDetail = `HTTP error! Status: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData.detail) errorDetail = `Error: ${errorData.detail}`;
            } catch (e) { /* Ignore */ }
            throw new Error(errorDetail);
        }

        if (useAudioResponse) {
            const audioBlob = await response.blob();
            if (audioBlob.size === 0) {
                throw new Error('Received empty audio response');
            }
            addMessageToChat(audioBlob, 'assistant');
        } else {
            const data = await response.json();
            addMessageToChat(data.response, 'assistant');
        }
    } catch (error) {
        console.error('Error sending text message:', error);
        showError(`Sorry, I encountered an error: ${error.message}`);
    } finally {
        hideLoading(sendTextBtn);
        hideTypingIndicator();
        clearStatus();
    }
}

// --- Audio Recording Functions ---

// Toggles audio recording on/off
async function handleRecordAudio() {
    if (!isRecording) {
        try {
            await startRecording();
        } catch (error) {
            console.error('Error starting recording:', error);
            showError(`Failed to start recording: ${error.message}`);
        }
    } else {
        stopRecording();
    }
}

// Starts the recording process
async function startRecording() {
    try {
        // Initialize audio context if not already done
        if (!audioContext) {
            initAudioContext();
        }
        
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Connect audio stream to analyser
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        // --- Create MediaRecorder --- 
        // Explicitly check for supported MIME types
        const options = getSupportedMimeTypeOptions();
        mediaRecorder = new MediaRecorder(stream, options);

        // Reset audio chunks array
        audioChunks = [];

        // Event handler for when data is available
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        // Event handler for when recording stops
        mediaRecorder.onstop = () => {
            // Combine chunks into a single Blob
            const mimeType = options.mimeType || 'audio/webm'; // Default fallback
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            
            // Create and display audio preview
            const audioUrl = URL.createObjectURL(audioBlob);
            const audioPreview = document.createElement('audio');
            audioPreview.controls = true;
            audioPreview.src = audioUrl;
            audioPreview.classList.add('audio-preview');
            
            // Add preview to chat
            addMessageToChat(audioPreview, 'user');
            
            // Send the blob to backend
            sendAudioToBackend(audioBlob, mimeType.split('/')[1]);
            
            // Clean up the stream tracks
            stream.getTracks().forEach(track => track.stop());
            
            // Stop audio level meter
            cancelAnimationFrame(animationFrameId);
            audioLevelBar.style.width = '0%';
        };

        // Start recording
        mediaRecorder.start();
        isRecording = true;
        recordAudioBtn.innerHTML = '<span class="material-symbols-outlined">stop</span>';
        recordAudioBtn.classList.add('recording');
        setStatus('Recording audio...');
        textInput.disabled = true; // Disable text input while recording
        sendTextBtn.disabled = true;
        
        // Start audio level meter and play start sound
        startSound.play();
        updateAudioLevel();

    } catch (error) {
        console.error('Error accessing microphone or starting recording:', error);
        setStatus(`Error: Could not start recording. ${error.message}`);
        addMessageToChat(`Error accessing microphone: ${error.message}`, 'assistant');
    }
}

// Stops the recording process
function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        recordAudioBtn.innerHTML = '<span class="material-symbols-outlined">mic</span>';
        recordAudioBtn.classList.remove('recording');
        setStatus('');
        textInput.disabled = false;
        sendTextBtn.disabled = false;
        
        // Play stop sound
        stopSound.play();
    }
}

// Helper to find a supported MIME type
function getSupportedMimeTypeOptions() {
    const mimeTypes = [
        'audio/webm;codecs=opus', // Preferred
        'audio/ogg;codecs=opus', 
        'audio/mp4', // Might require specific codecs
        'audio/webm', 
        'audio/ogg',
    ];
    for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
            console.log("Using MIME type:", type);
            return { mimeType: type };
        }
    }
    console.warn("No preferred MIME type supported, using browser default.");
    return {}; // Let the browser decide
}

// Sends the recorded audio blob to the backend
async function sendAudioToBackend(audioBlob, fileExtension = 'webm') {
    setStatus('Processing audio...');
    showLoading();
    const formData = new FormData();
    const fileName = `recording.${fileExtension}`;
    formData.append('file', audioBlob, fileName); 

    try {
        const apiUrl = `/process_audio?output_format=${useAudioResponse ? 'audio' : 'text'}&lang=${currentLanguage}`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            let errorDetail = `HTTP error! Status: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData.detail) errorDetail = `Error: ${errorData.detail}`;
            } catch (e) { /* Ignore */ }
            throw new Error(errorDetail);
        }

        if (useAudioResponse) {
            // For audio response, get the blob directly
            const audioBlob = await response.blob();
            console.log("[sendAudioToBackend] Received audio blob:", audioBlob); // DEBUG
            console.log("[sendAudioToBackend] Blob size:", audioBlob.size);     // DEBUG
            console.log("[sendAudioToBackend] Blob type:", audioBlob.type);     // DEBUG
            addMessageToChat(audioBlob, 'assistant');
        } else {
            // For text response, parse JSON
            const data = await response.json();
            addMessageToChat(data.response, 'assistant');
        }
        clearStatus();
    } catch (error) {
        console.error('Error sending audio message:', error);
        setStatus(`Error: ${error.message}`);
        addMessageToChat(`Sorry, I encountered an error processing your audio: ${error.message}`, 'assistant');
    } finally {
        hideLoading();
    }
}

// --- Image Processing Functions ---

// Handles image file selection
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // Check if file is an image
        if (!file.type.startsWith('image/')) {
            setStatus('Error: Please select an image file');
            return;
        }

        // Add loading state to upload button
        const uploadLabel = document.querySelector('.image-upload-label');
        uploadLabel.classList.add('loading');

        // Create a preview URL for the image
        const imageUrl = URL.createObjectURL(file);
        currentImage = file;

        // Add the image to chat with a prompt
        addMessageToChat('[Uploaded Image]', 'user', imageUrl);
        
        // Send the image to the backend
        sendImageToBackend(file).finally(() => {
            // Remove loading state
            uploadLabel.classList.remove('loading');
        });
    }
}

// Sends the image to the backend for processing
async function sendImageToBackend(imageFile) {
    setStatus('Processing image...');
    showLoading();
    const formData = new FormData();
    formData.append('file', imageFile);

    try {
        const response = await fetch('/process_image', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            let errorDetail = `HTTP error! Status: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData.detail) errorDetail = `Error: ${errorData.detail}`;
            } catch (e) { /* Ignore */ }
            throw new Error(errorDetail);
        }

        const data = await response.json();
        // Extract the actual text from the response object
        const description = data.response || "Assistant: (No description available)"; // Added null check
        addMessageToChat(description, 'assistant'); // Use the extracted description
        clearStatus();
    } catch (error) {
        console.error('Error processing image:', error);
        setStatus(`Error: ${error.message}`);
        addMessageToChat(`Sorry, I encountered an error processing your image: ${error.message}`, 'assistant');
    } finally {
        hideLoading();
    }
}

// --- Chat History Management ---

// Save message to chat history
function saveMessageToHistory(content, sender, imageUrl = null) {
    const history = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]');
    history.push({
        content: content instanceof HTMLAudioElement ? 'audio' : content,
        sender,
        imageUrl,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
}

// Clear chat history
async function clearChatHistory() {
    try {
        // Clear frontend storage
        localStorage.removeItem(CHAT_HISTORY_KEY);
        chatOutput.innerHTML = ''; // Clear the chat display
        
        // Clear backend history
        const response = await fetch('/clear_history', {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to clear backend history');
        }
        
        addMessageToChat('Chat history cleared.', 'assistant');
    } catch (error) {
        console.error('Error clearing chat history:', error);
        showError('Failed to clear chat history. Please try again.');
    }
}

// Load chat history
async function loadChatHistory() {
    try {
        // Clear backend history first
        const response = await fetch('/clear_history', {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to clear backend history');
        }
        
        // Then load from localStorage
        const history = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]');
        chatOutput.innerHTML = '';
        history.forEach(item => {
            if (item.content === 'audio') {
                addMessageToChat('[Audio Message]', item.sender, null, false);
            } else {
                addMessageToChat(item.content, item.sender, item.imageUrl, false);
            }
        });
    } catch (error) {
        console.error('Error loading chat history:', error);
        showError('Failed to load chat history. Starting fresh.');
    }
}

// Add clear history button to the UI
function addClearHistoryButton() {
    const clearButton = document.createElement('button');
    clearButton.id = 'clear-history-btn';
    clearButton.innerHTML = '<span class="material-symbols-outlined">delete</span>';
    clearButton.setAttribute('aria-label', 'Clear chat history');
    clearButton.title = 'Clear chat history';
    document.querySelector('.control-group').appendChild(clearButton);

    clearButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the chat history?')) {
            clearChatHistory();
        }
    });
}

// Initialize chat when the page loads
// document.addEventListener('DOMContentLoaded', () => {
//     loadChatHistory();
//     addClearHistoryButton();
// });

// --- Initial Setup ---
// Optional: Display a welcome message on load
// addMessageToChat('Hello! How can I assist you today?', 'assistant'); 
