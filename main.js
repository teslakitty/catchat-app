const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Recommended for security
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  win.loadFile('dialog.html');

  ipcMain.on('navigate', (event, url) => {
    win.loadURL(url).then(() => {
      win.webContents.executeJavaScript(`
        const { ipcRenderer } = require('electron');

        async function getScreenStream() {
          const inputSources = await ipcRenderer.invoke('DESKTOP_CAPTURER_GET_SOURCES', {
            types: ['screen'],
          });

          const screenStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: inputSources[0].id,
                minWidth: 1280,
                maxWidth: 1280,
                minHeight: 720,
                maxHeight: 720
              }
            }
          });

          return screenStream;
        }

        getScreenStream().then((stream) => {
          const videoElement = document.querySelector('video');
          videoElement.srcObject = stream;
          videoElement.onloadedmetadata = (e) => videoElement.play();
        });
      `);
    });
  });

  win.on('resize', () => {
    win.webContents.send('resize', win.getContentBounds());
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('DESKTOP_CAPTURER_GET_SOURCES', async (event, options) => {
  return desktopCapturer.getSources(options);
});
