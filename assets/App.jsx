import React, { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Introduction from "./components/introduction";
import Chat from "./components/Chat";

export default function App() {
    const [selectProject, setSelectProject] = useState(null);
    
    useEffect(() => {
    },[])
    return (
        <div className="app-shell">
            <Sidebar selectCallback={(item) => {
                setSelectProject(item)
            }}/>

            <main className="main">
                {!selectProject ? <Introduction/> : <Chat project={selectProject}/>}
            </main>
        </div>
    );
}