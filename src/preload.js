const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("litecursor", {
    ping: () => ipcRenderer.invoke("ping"),

    listProjects: () => ipcRenderer.invoke("project:list"),

    sendMessage: (args) =>
        ipcRenderer.invoke("message:send", args),

    listMessages: (args) =>
        ipcRenderer.invoke("message:list", args),
    /**
     * Stream 
     */
    AIResponse(args) {
        ipcRenderer.send("ai:chat",args);
    },

    onChunk(callback) {
        ipcRenderer.on("ai:chunk", (_, data) => callback(data));
    },

    onDone(callback) {
        ipcRenderer.on("ai:done", callback);
    }
});