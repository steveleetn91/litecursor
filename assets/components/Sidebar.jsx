import React, { useEffect, useMemo, useState } from 'react'
export default function Sidebar({
    selectCallback= (project) => {}
}) {
    
    const [selectPro,setSelectPro] = useState(null);

    const [projects,setProjects] = useState([]);
    const getProjects = async () => {
        const result = await window.litecursor.listProjects();
        setProjects(result);
    }
    useEffect(() => {
        getProjects();
    },[]);
    return <div className="sidebar">
        <div className="brand">
            <div className="logo">ϟ</div>
            <div className="brand-name">LiteCursor</div>
            <i className="bi bi-pencil-square ms-auto"></i>
        </div>

        <div className="projects-head">
            <span>Projects</span>
            <button className="btn btn-primary-gradient">
                <i className="bi bi-plus-lg me-2"></i>
                Add Project
            </button>
        </div>

        <div className="section-label">Recent Projects</div>

        <div className="project-list">
            {projects.map((p,index) => (
                <div 
                onClick={() => {
                    setSelectPro(p);
                    selectCallback(p)
                }}
                className={`project-item ${selectPro?.id === p.id ? "active" : ""}`} key={index}>
                    <div className="flex-grow-1">
                        <div className="project-name">{p.project_path.split('/')[p.project_path.split('/').length - 1]}</div>
                        <div className="project-path">{p.project_path}</div>
                    </div>
                </div>
            ))}
        </div>

        <div className="user-card">
            <div className="user-avatar"></div>
            <div>
                <div className="user-name">Steve Lee</div>
                <div className="plan">Pro Plan</div>
            </div>
            <i className="bi bi-three-dots ms-auto"></i>
        </div>
    </div>
}