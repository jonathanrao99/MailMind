const PERSONA_KEY = "mailmindPersona";
const DEFAULT_PERSONA = {
  fullName: "",
  position: "",
  businessName: "",
  contactInfo: "",
  tone: "professional",
  instructions: "",
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get([PERSONA_KEY], (data) => {
    if (data[PERSONA_KEY] == null) {
      chrome.storage.local.set({ [PERSONA_KEY]: { ...DEFAULT_PERSONA } });
    }
  });
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== "mailmind-ai-draft") return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length || tabs[0].id == null) return;
    // Content script is only on mail.google.com; other tabs will get no listener.
    chrome.tabs.sendMessage(tabs[0].id, { type: "mailmind-ai-draft" }, () => {
      if (chrome.runtime && chrome.runtime.lastError) {
        void chrome.runtime.lastError;
      }
    });
  });
});
