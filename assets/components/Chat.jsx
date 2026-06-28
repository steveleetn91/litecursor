import React, { useEffect, useState } from "react";
import Thinks from "./Chat/Thinks";

export default function Chat({
    project = null
}) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [think, setThink] = useState("");
    const listMessages = async () => {
        const result = await window.litecursor.listMessages({
            project_id: project?.id
        });
        setMessages(result);
    }
    const sendMessage = async () => {
        const result = await window.litecursor.sendMessage({
            input: input,
            project_id: project?.id
        });
        setMessages((prev) => {
            return [
                ...prev,
                result
            ]
        });
        setInput('');
        await window.litecursor.AIResponse({
            project: project
        });
    }
    useEffect(() => {
        listMessages();
    }, []);
    useEffect(() => {

        window.litecursor.onChunk(chunk => {
            setThink(chunk);
        });

        window.litecursor.onDone(() => {
            setThink("");
            listMessages();
        });

    }, []);
    return (
        <div>
            <section className="chat-card d-flex flex-column">

                <header className="chat-header">
                    <div className="project-select">
                        luna-app
                    </div>
                </header>

                <div className="chat-body flex-grow-1">

                    <div className="messages">
                        {messages.map((item, index) => {
                            return item.role !== 'user' ? <div key={index} className="assistant-row">

                                <div className="assistant-icon">
                                    ⚡
                                </div>

                                <div className="assistant-content">

                                    <div className="assistant-message">
                                        {item.content}

                                        <small>{new Date(item.created_at).toDateString()} {new Date(item.created_at).toLocaleTimeString()}</small>
                                    </div>

                                </div>

                            </div> : <div key={index} className="user-message ms-auto">
                                <div>{item.content}</div>

                                <small>
                                    {new Date(item.created_at).toDateString()} {new Date(item.created_at).toLocaleTimeString()}
                                    <i className="bi bi-check-lg ms-1"></i>
                                </small>
                            </div>
                        })}
                        {think && think !== "" ? <Thinks>{think} </Thinks> : null}

                    </div>

                </div>

                <div className="composer">

                    <textarea
                        className="form-control border-0 shadow-none"
                        placeholder="Ask anything or describe a task..."
                        rows={3}
                        onChange={(e) => {
                            setInput(e.target.value)
                        }}
                        value={input}
                    />

                    <div className="composer-actions">

                        <div className="left-actions">
                            <i className="bi bi-image"></i>
                        </div>

                        <button
                            onClick={sendMessage}
                            className="btn btn-primary rounded-circle">
                            <i className="bi bi-send-fill"></i>
                        </button>

                    </div>

                </div>

            </section>


            <div className="footer-note">
                LiteCursor can make mistakes. Please review code carefully.
            </div>
        </div>
    );
}