async function initPopup() {
  const apiKeyInput = document.getElementById("apiKey");
  const modelSelect = document.getElementById("modelSelect");
  const promptInput = document.getElementById("prompt");
  const runBtn = document.getElementById("runBtn");
  const outputDiv = document.getElementById("output");

  // Load cached settings
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    const stored = await chrome.storage.local.get(["geminiApiKey", "geminiModel"]);
    if (stored && stored.geminiApiKey) apiKeyInput.value = stored.geminiApiKey;
    if (stored && stored.geminiModel && modelSelect) modelSelect.value = stored.geminiModel;
  }

  runBtn.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect ? modelSelect.value : "auto";
    const prompt = promptInput.value.trim();

    if (!apiKey) return alert("API Key is required");
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ geminiApiKey: apiKey, geminiModel: model });
    }

    outputDiv.innerText = "Processing...";

    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage(
        { action: "EXECUTE_GEMINI", prompt, apiKey, model },
        (response) => {
          if (!response) return;
          if (response.error) {
            outputDiv.innerText = `Error: ${response.error}`;
          } else {
            const promptTokens = response.promptTokens ?? response.usage?.promptTokenCount ?? 'N/A';
            const candidateTokens = response.candidateTokens ?? response.usage?.candidatesTokenCount ?? 'N/A';
            const totalTokens = response.totalTokens ?? response.usage?.totalTokenCount ?? 'N/A';
            const modelName = response.model || 'Gemini API';

            outputDiv.innerHTML = `
              <div style="font-size:12px; margin-bottom:8px; background:#eef2ff; padding:8px; border-radius:4px;">
                <p style="margin:2px 0;"><strong>Model:</strong> ${modelName}</p>
                <p style="margin:2px 0;"><strong>Prompt Tokens:</strong> ${promptTokens}</p>
                <p style="margin:2px 0;"><strong>Response Tokens:</strong> ${candidateTokens}</p>
                <p style="margin:2px 0; font-size:13px; color:#1e40af;"><strong>Total Tokens:</strong> ${totalTokens}</p>
              </div>
              <p style="margin:4px 0;"><strong>Response:</strong></p>
              <pre>${response.text}</pre>
            `;
          }
        }
      );
    }
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", initPopup);
}

if (typeof module !== "undefined") {
  module.exports = { initPopup };
}