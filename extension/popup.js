const KEY = "mailmindPersona";

const emptyPersona = () => ({
  fullName: "",
  position: "",
  businessName: "",
  contactInfo: "",
  tone: "professional",
  instructions: "",
});

function getFields() {
  return {
    fullName: (document.getElementById("fullName").value || "").trim(),
    position: (document.getElementById("position").value || "").trim(),
    businessName: (document.getElementById("businessName").value || "").trim(),
    contactInfo: (document.getElementById("contactInfo").value || "").trim(),
    tone: (document.getElementById("tone").value || "professional").trim(),
    instructions: (document.getElementById("instructions").value || "").trim(),
  };
}

function setFields(p) {
  if (!p) p = emptyPersona();
  document.getElementById("fullName").value = p.fullName || "";
  document.getElementById("position").value = p.position || "";
  document.getElementById("businessName").value = p.businessName || "";
  document.getElementById("contactInfo").value = p.contactInfo || "";
  document.getElementById("instructions").value = p.instructions || "";
  const t = p.tone || "professional";
  const sel = document.getElementById("tone");
  if ([...sel.options].some((o) => o.value === t)) sel.value = t;
  else sel.value = "professional";
}

function load() {
  chrome.storage.local.get([KEY], (r) => {
    setFields(r[KEY] || emptyPersona());
  });
}

function status(msg, ok) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.style.color = ok ? "#0d652d" : "#c5221f";
}

document.getElementById("save").addEventListener("click", () => {
  const p = getFields();
  if (!p.fullName) {
    status("Please enter at least your full name.", false);
    return;
  }
  chrome.storage.local.set({ [KEY]: p }, () => {
    if (chrome.runtime && chrome.runtime.lastError) {
      status("Could not save. Try again.", false);
      return;
    }
    status("Saved.", true);
  });
});

const shortcutsLink = document.getElementById("ext-shortcuts");
if (shortcutsLink) {
  shortcutsLink.addEventListener("click", (e) => {
    e.preventDefault();
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    }
  });
}

load();
