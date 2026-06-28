import { clearMessages, getMessages, saveMessage } from "../db.js";
import { callAIWithTools } from "../chat.js";
export async function runAgent(message) {
    await saveMessage("user", message);

    const history = await getMessages(20);

    console.info("LiteCursor is thinking...");

    const answer = await callAIWithTools(history);

    await saveMessage("assistant", answer);
    return answer;
}