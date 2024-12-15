import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import Base64 from 'base64-js';
import MarkdownIt from 'markdown-it';
import { maybeShowApiKeyBanner } from './gemini-api-banner';

// 🔥 FILL THIS OUT FIRST! 🔥
let API_KEY = 'AIzaSyCQ-u8FM9M8ydju4YCrMCEXGgIKw3SKOg4';

let video = document.querySelector('video');
let canvas = document.createElement('canvas');
let button = document.getElementById('capture-btn');
let output = document.querySelector('.output');

// Set up the live video feed using the front camera
async function setupCamera() {
  try {
    // Request video stream from the front camera
    let stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }  // 'user' ensures the front camera is used
    });
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;

    // Wait for the video to load enough to get dimensions
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    };
  } catch (err) {
    console.error("Error accessing camera:", err);
    output.textContent = 'Error accessing camera. Please allow camera permissions.';
  }
}

// Capture a frame and send it to the Gemini API
async function captureAndDescribe() {
  // Stop any ongoing TTS
  speechSynthesis.cancel();

  // Draw the video frame onto the canvas
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

  // Convert the canvas to a base64 string
  let imageBase64 = canvas.toDataURL('image/jpeg').split(',')[1];

  try {
    output.textContent = 'Generating...';

    let contents = [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
          { text: 'Describe this scene as to a blind man/woman, make it detailed and useful for navigation/understanding for blind people in Nepali' }
        ]
      }
    ];

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash', // or gemini-1.5-pro
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    // Send the image to Gemini API for description
    const result = await model.generateContentStream({ contents });

    // Parse the response and display it
    let buffer = [];
    let md = new MarkdownIt();
    for await (let response of result.stream) {
      buffer.push(response.text());
      output.innerHTML = md.render(buffer.join(''));
      
      // Trigger TTS to read the generated description aloud
      speakText(response.text());
    }
  } catch (e) {
    console.error("Error generating description:", e);
    output.textContent = 'Failed to generate description. Try again.';
  }
}

// Function to speak text using the SpeechSynthesis API
function speakText(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ne-NP';  // Set the language of the speech
    utterance.rate = 1; 
    speechSynthesis.speak(utterance);
  } else {
    console.error('Speech synthesis not supported in this browser.');
  }
}

// Add click listener to the button
button.addEventListener('click', captureAndDescribe);

// Initialize the camera feed
setupCamera();

// Display the API Key banner (optional)
maybeShowApiKeyBanner(API_KEY);
