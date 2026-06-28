import React from "react";

export default function Thinks({ children = "" }) {
    return (
        <div className="assistant-row thinking-row">

            <div className="assistant-icon thinking-icon">
                ⚡
            </div>

            <div className="thinking-content">

                <div className="thinking-header">
                    <span>{children}</span>
                    <span className="thinking-dots">
                        <span>.</span>
                        <span>.</span>
                        <span>.</span>
                    </span>
                </div>
            </div>

        </div>
    );
}