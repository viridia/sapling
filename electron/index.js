// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
    },
  });
  mainWindow.maximize();

  // and load the index.html of the app.
  // mainWindow.loadFile('../index.html');
  mainWindow.loadURL('http://localhost:3002');

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  ipcMain.handle('open-file', (event) => {
    return dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      title: 'Open model file',
      extensions: ['glb'],
    }).then(result => {
      return result.filePaths.length > 0 ? result.filePaths[0] : undefined;
    });
  });

  ipcMain.handle('open-save-as', (event, path) => {
    return dialog.showSaveDialog(mainWindow, {
      properties: ['createDirectory', 'showOverwriteConfirmation'],
      defaultPath: path,
      title: 'Save model file',
    }).then(result => {
      return result.filePath;
    });
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
