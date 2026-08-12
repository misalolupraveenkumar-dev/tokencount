const GEMINI_MODEL = "gemini-1.5-flash"; // Switch from 2.0 to 1.5-flash for free tier eligibility

async function fetchWithRetry(url, options, retries = 3, backoffMs = 2000) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    if (response.status !== 429) return response;
    
    // Extract retryDelay from header or wait exponentially
    await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, i)));
  }
  return fetch(url, options);
}

async function fetchAvailableModels(apiKey) {
  try {
    const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, { method: "GET" });
    if (!response.ok) return [];
    const data = await response.json();
    if (!data || !Array.isArray(data.models)) return [];

    return data.models
      .filter((m) => {
        if (!m.supportedGenerationMethods || !m.supportedGenerationMethods.includes("generateContent")) return false;
        
        const name = (m.name || "").toLowerCase();
        // Exclude non-text models (TTS, Audio, Imagen, Embedding, Realtime)
        if (name.includes("-tts") || name.includes("-audio") || name.includes("-imagen") || name.includes("embedding") || name.includes("realtime")) {
          return false;
        }

        // If outputModalities is specified, ensure TEXT is included
        if (Array.isArray(m.outputModalities) && !m.outputModalities.includes("TEXT")) {
          return false;
        }

        return true;
      })
      .map((m) => m.name.replace(/^models\//, ""));
  } catch (err) {
    console.warn("fetchAvailableModels warning:", err.message);
    return [];
  }
}

async function handleGeminiTask(prompt, apiKey, preferredModel = "gemini-2.0-flash") {
  let dynamicModels = [];
  try {
    dynamicModels = await fetchAvailableModels(apiKey);
  } catch (e) {
    console.warn("Dynamic model fetching failed, using fallback list.");
  }

  const defaultModels = [
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-1.5-pro-latest",
    "gemini-1.5-pro",
    "gemini-2.0-flash-lite-preview-02-05"
  ];

  // Prioritize user selected model, then dynamically discovered models, then defaults
  const modelsToTry = [
    ...new Set([preferredModel, ...dynamicModels, ...defaultModels].filter((m) => Boolean(m) && m !== "auto"))
  ];
  
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}`;
      const payload = JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] });

      // 1. Attempt countTokens API call
      let countTokens = 0;
      try {
        const countResponse = await fetchWithRetry(`${baseUrl}:countTokens?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload
        });
        if (countResponse.ok) {
          const countData = await countResponse.json();
          countTokens = countData.totalTokens || 0;
        }
      } catch (err) {
        console.warn("countTokens API warning:", err.message);
      }

      // 2. Generate Content API call
      const generateResponse = await fetchWithRetry(`${baseUrl}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json().catch(() => null);
        const errorMessage = errorData?.error?.message || (await generateResponse.text().catch(() => generateResponse.statusText));
        
        // If API key itself is invalid (400 / 403 with key error), throw fatal key error
        if ((generateResponse.status === 400 || generateResponse.status === 403) && errorMessage.toLowerCase().includes("key")) {
          throw new Error(`Gemini API Error: Invalid API Key - ${errorMessage}`);
        }
        
        throw new Error(`Generation Error (${model}): ${errorMessage}`);
      }

      const generateData = await generateResponse.json();

      // 3. Extract generated text safely
      const candidate = generateData.candidates && generateData.candidates[0];
      let text = "";
      if (candidate && candidate.content && candidate.content.parts) {
        text = candidate.content.parts.map((p) => p.text).join("");
      } else if (candidate && candidate.finishReason) {
        text = `[Generation ended with reason: ${candidate.finishReason}]`;
      } else {
        text = "[No text returned from model]";
      }

      // 4. Extract token counts from usageMetadata or countTokens fallback
      const usage = generateData.usageMetadata || {};
      const promptTokens = usage.promptTokenCount || countTokens || 0;
      const candidateTokens = usage.candidatesTokenCount || 0;
      const totalTokens = usage.totalTokenCount || (promptTokens + candidateTokens);

      return {
        model,
        promptTokens,
        candidateTokens,
        totalTokens,
        text,
        usage: {
          promptTokenCount: promptTokens,
          candidatesTokenCount: candidateTokens,
          totalTokenCount: totalTokens
        }
      };
    } catch (err) {
      lastError = err;
      if (err.message.includes("Invalid API Key")) throw err; // Only stop loop if API key itself is invalid
      console.warn(`Failed with model ${model}, trying fallback if available...`);
    }
  }

  throw lastError || new Error("Failed to process request with Gemini API.");
}

// Listen for messages from the popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "EXECUTE_GEMINI") {
      handleGeminiTask(message.prompt, message.apiKey, message.model)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ error: error.message }));
      
      // Return true to indicate we'll respond asynchronously
      return true;
    }
  });
}

if (typeof module !== "undefined") {
  module.exports = { GEMINI_MODEL, fetchWithRetry, handleGeminiTask };
}