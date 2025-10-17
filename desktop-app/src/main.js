import { app, BrowserWindow, screen } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Helper function to get the correct icon path based on platform
function getIconPath() {
  if (process.platform === 'win32') {
    return path.join(__dirname, 'public/icon.ico');
  } else if (process.platform === 'darwin') {
    return path.join(__dirname, 'public/icon.icns');
  } else {
    return path.join(__dirname, 'public/icon.png');
  }
}

// Set the application icon
function setAppIcon() {
  const iconPath = getIconPath();
  if (app.dock) {
    app.dock.setIcon(iconPath);
  }
  // For Windows/Linux, the icon is automatically set via BrowserWindow
}

const createWindow = () => {
  // Use full width of the primary display (not fullscreen)
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width: screenWidth,
    height: Math.min(900, screenHeight),
    minWidth: 1200, // Minimum width the window can be resized to
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: getIconPath(),
  });

  // Hide the menu bar completely
  mainWindow.setMenuBarVisibility(false);

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  
  mainWindow.webContents.closeDevTools();

  // Block common DevTools shortcuts
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (mainWindow) {
      const { control, shift, key } = input;
      if (
        (control && shift && key.toLowerCase() === 'i') || // Ctrl+Shift+I
        (key === 'F12') || // F12
        (control && shift && key.toLowerCase() === 'j') // Ctrl+Shift+J
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  });

  setAppIcon();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
