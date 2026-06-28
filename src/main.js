import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { ipcMain } from "electron";
import { getLastMessage, getMessages, getProjects, saveMessage } from "./db.js";
import { callAIWithTools, loopWork, parseAgentJson, runAgentWithTools, stringify, summarizeWorkflow } from "./chat.js";
import { askRouterAgent } from "./agents/RouterAgent.js";
import { askPMAgent } from "./agents/PMAgent.js";
import { askTechLeadAgent } from "./agents/TechLeadAgent.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

ipcMain.handle("ping", async () => {
    return "pong from Electron native";
});

ipcMain.handle("project:list", async () => {
    return await getProjects();
});

ipcMain.handle("message:send", async (event, args) => {

    const id = await saveMessage("user", args?.input, args?.project_id);

    return getLastMessage(args?.project_id)
});

ipcMain.handle("message:list", async (event, args) => {
    const history = await getMessages(20, args?.project_id);
    return history ?? [];
});

ipcMain.on("ai:chat", async (event, args) => {

    // event.sender.send("ai:chunk", chunk);
    event.sender.send("ai:chunk", "LiteCursor is thinking...");
    try {
        const history = await getMessages(20, args?.project?.id);
        let messages = [...history];
        const routerAgent = await askRouterAgent({
            messages: messages,
            project: args?.project
        });
        if (!routerAgent?.content) {
            throw "RouterAgent did not return a response.";
        }
        const routerResponse = parseAgentJson(routerAgent, "RouterAgent");
        if (routerResponse.action === "reply") {
            await saveMessage("assistant", routerResponse.message, args?.project?.id);
            event.sender.send("ai:done");
            return;
        }
        event.sender.send("ai:chunk", "Project manager is planning...");
        const pmAgent = await askPMAgent({
            messages: [
                ...messages,
                {
                    role: "user",
                    content: routerResponse.message || "Create a plan for the user's request.",
                },
            ],
            project: args?.project
        });

        if (!pmAgent?.content) {
            throw "PMAgent did not return a response.";
        }

        const plan = parseAgentJson(pmAgent, "PMAgent");

        if (!Array.isArray(plan.tasks) || plan.tasks.length === 0) {
            throw "PMAgent did not return any tasks.";
        }
        event.sender.send("ai:chunk", `Project manager created ${plan.tasks.length} task(s).`);

        event.sender.send("ai:chunk", "Tech lead is converting the PM plan into technical tasks...");
        const techLead = await runAgentWithTools(
            "TechLeadAgent",
            askTechLeadAgent,
            [
                ...messages,
                {
                    role: "user",
                    content: `Convert this PM plan into technical implementation tasks:\n${stringify(plan)}`,
                },
            ],
            args?.project
        );

        const technicalPlan = parseAgentJson(techLead.message, "TechLeadAgent");

        if (!Array.isArray(technicalPlan.technical_tasks) || technicalPlan.technical_tasks.length === 0) {
            throw "TechLeadAgent did not return any technical tasks.";
        }
        event.sender.send("ai:chunk", `Tech lead created ${technicalPlan.technical_tasks.length} technical task(s).`);
        /**
         * Loop Work 
         */
        const taskResults = await loopWork(
            technicalPlan.technical_tasks,
            technicalPlan.project_context || {},
            (mess) => {
                event.sender.send("ai:chunk",mess);
            },
            args?.project 
        );

        const answer = summarizeWorkflow(plan, technicalPlan, taskResults);

        await saveMessage("assistant", answer, args?.project?.id);

    } catch (e) {
        console.log('error',e);
        const id = await saveMessage("assistant", e.toString(), args?.project?.id);
    }
    event.sender.send("ai:done");
});

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    if (!app.isPackaged) {
        win.loadURL("http://localhost:5173");
        win.webContents.on("before-input-event", (event, input) => {
            if (input.key === "F12") {
                win.webContents.toggleDevTools();
            }
        });
    } else {
        win.loadFile(
            path.join(__dirname, "../bundle/index.html")
        );
    }
}


app.whenReady().then(createWindow);