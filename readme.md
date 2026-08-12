 Gemini Developer Assistant — Chrome Extension (Manifest V3)
Manifest V3 
Node.js Test Suite
 
License: MIT

A powerful, high-performance Chrome Browser Extension built with Manifest V3 for executing AI prompts and tracking token usage in real-time using Google's Gemini API.

📌 Features
⚡ Real-Time Token Analytics: Calculates prompt input tokens, generated output tokens, and total token count per request.
🔄 Dynamic Model Discovery: Queries the Gemini API (/v1beta/models) to automatically detect and auto-route requests to the active text generation models enabled for your API key.
🛡️ Intelligent Modality Filtering: Filters out non-text models (such as TTS/Audio, Imagen, Embedding) to prevent modal mismatch errors.
🔁 Exponential Backoff & Retry: Built-in HTTP 429 rate limit retry mechanism for seamless execution under traffic surges.
🔒 Secure Local Storage: Remembers your API key and model preferences using Chrome's encrypted chrome.storage.local.
🧪 Comprehensive Test Suite: 100% automated test coverage including unit tests (node --test) and end-to-end browser tests in Google Chrome via Puppeteer.
🏗️ Architecture & Directory Structure


🛠️ Installation & Setup
Option 1: Load Unpacked Folder in Chrome (Recommended)
Clone or download this repository.
Open Google Chrome and navigate to chrome://extensions.
Enable Developer mode using the toggle switch in the top-right corner.
Click Load unpacked in the top-left menu.
Select the 
dist
 folder (d:\workspace\Google Gemini\Extension\dist).
Option 2: Install via ZIP Package
Extract 
gemini-developer-assistant.zip
.
Open chrome://extensions in Chrome.
Click Load unpacked and select the extracted folder.
💡 How to Use
Obtain a free Gemini API Key from Google AI Studio.
Click the Gemini Developer Assistant icon in your Chrome extensions toolbar.
Enter your Gemini API Key.
Choose a model from the dropdown:
Auto-Detect Best Available Model (Recommended)
gemini-2.0-flash
gemini-1.5-flash-latest
gemini-1.5-pro-latest
Type your prompt into the text box and click Run Prompt.
View the detailed token usage breakdown (Prompt Tokens, Response Tokens, Total Tokens) and generated response.
🧪 Testing Suite
This repository includes automated tests for all components of the Chrome extension.

1. Execute Unit & Manifest Tests
Runs schema validation, API mock tests, and popup UI event tests:

bash

npm test
2. Execute Headed Chrome Browser E2E Test
Launches a visible Google Chrome browser window, loads the extension, and automates UI interactions via Puppeteer:

bash

npm run test:browser
3. Execute Direct CLI Manual Test
Test API responses directly from the command line:

bash

npm run test:manual -- "YOUR_GEMINI_API_KEY" "Write a 1-sentence prompt about space."
🔌 API Reference
The background service worker communicates with the Google Gemini v1beta REST API:

Endpoint	Method	Purpose
/v1beta/models	GET	Dynamically lists supported models for the API key
/v1beta/models/{model}:countTokens	POST	Calculates prompt input token length prior to generation
/v1beta/models/{model}:generateContent	POST	Generates response text and extracts usageMetadata
📄 License
Distributed under the MIT License. See LICENSE for more information.
