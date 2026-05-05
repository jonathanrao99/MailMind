const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const BACKEND_HEALTH_URL = "http://127.0.0.1:8000/health";
const MAIL_DIST_INDEX = path.join(ROOT_DIR, "apps/mail/dist/index.html");
const USE_MAIL_DEV = process.env.MAILMIND_MAIL_DEV === "1";
const MAIL_DEV_URL = process.env.MAILMIND_MAIL_DEV_URL || "http://127.0.0.1:5174";

let backendProc = null;

function isBackendUp(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function waitForBackend(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) return reject(new Error("Backend did not start in time"));
        setTimeout(probe, 500);
      });
      req.setTimeout(1200, () => req.destroy());
    };
    probe();
  });
}

function startBackend() {
  backendProc = spawn("bash", ["-lc", "./scripts/dev-start.sh"], {
    cwd: ROOT_DIR,
    env: { ...process.env },
    stdio: "inherit",
  });
  backendProc.on("exit", (code) => {
    if (code !== 0) console.error(`Backend exited with code ${code}`);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 980,
    minHeight: 700,
    title: "MailMind",
    autoHideMenuBar: true,
    backgroundColor: "#f5f5f3",
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  if (USE_MAIL_DEV) {
    win.loadURL(MAIL_DEV_URL);
  } else {
    win.loadFile(MAIL_DIST_INDEX);
  }
}

app.whenReady().then(async () => {
  const alreadyRunning = await isBackendUp(BACKEND_HEALTH_URL);
  if (!alreadyRunning) startBackend();
  try {
    await waitForBackend(BACKEND_HEALTH_URL);
  } catch (e) {
    console.error(String(e));
  }
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("quit", () => {
  if (backendProc && !backendProc.killed) backendProc.kill("SIGTERM");
});
