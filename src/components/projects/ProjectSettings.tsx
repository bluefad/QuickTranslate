import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { PickList } from "primereact/picklist";
import { useEffect, useState, useRef } from "react";
import { Toast } from "primereact/toast";
import "./ProjectSettings.css"; // 引入更新后的样式文件

interface Language {
    id: string;
    name: string;
}

interface ProjectLanguage {
    projectId: string;
    languageId: string;
}

interface Project {
    id: string;
    name: string;
    identifier: string;
    description: string;
    sourceLanguage: Language;
    projectLanguages: ProjectLanguage[];
}

interface ProjectSettingsProps {
    projectId: string;
}

const ProjectSettings: React.FC<ProjectSettingsProps> = ({ projectId }) => {
    const [project, setProject] = useState<Project | null>(null);
    const [languages, setLanguages] = useState<Language[]>([]);
    const [projectName, setProjectName] = useState("");
    const [projectIdentifier, setProjectIdentifier] = useState("");
    const [projectDescription, setProjectDescription] = useState("");
    const [sourceLanguage, setSourceLanguage] = useState<Language | null>(null);
    const [targetLanguages, setTargetLanguages] = useState<Language[]>([]);

    const toastRef = useRef<Toast>(null); // 引用 Toast 实例

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 获取项目数据
                const projectRes = await fetch(`/api/projects/${projectId}`);
                const projectData = await projectRes.json();
                setProject(projectData);
                setProjectName(projectData.name);
                setProjectIdentifier(projectData.identifier);
                setProjectDescription(projectData.description);
                setSourceLanguage(projectData.sourceLanguage);

                // 获取语言数据
                const languagesRes = await fetch("/api/languages");
                const languagesData = await languagesRes.json();
                setLanguages(languagesData);

                // 设置 targetLanguages
                setTargetLanguages(
                    projectData.projectLanguages.map((item: { languageId: string }) =>
                        languagesData.find((lang: Language) => lang.id === item.languageId)
                    )
                );
            } catch (error) {
                console.error("Failed to fetch project or languages", error);
            }
        };

        fetchData();
    }, [projectId]);

    const handleSaveProjectSettings = async () => {
        if (!project) return;

        const updatedProject = {
            ...project,
            name: projectName,
            identifier: projectIdentifier,
            description: projectDescription,
            sourceLanguageId: sourceLanguage?.id || "",
            targetLanguagesIds: targetLanguages.map((lang) => lang.id),
        };

        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updatedProject),
            });

            if (res.ok) {
                const updatedProjectData = await res.json();
                setProject(updatedProjectData); // Update the project with the saved data

                // 显示成功提示
                toastRef.current?.show({
                    severity: "success",
                    summary: "Success",
                    detail: "Project settings have been saved successfully!",
                    life: 3000, // 提示展示时间
                });
            } else {
                console.error("Failed to save project");
                // 显示错误提示
                toastRef.current?.show({
                    severity: "error",
                    summary: "Save Failed",
                    detail: "Failed to save, please check your inputs or try again later.",
                    life: 3000,
                });
            }
        } catch (error) {
            console.error("Error saving project:", error);
            // 显示错误提示
            toastRef.current?.show({
                severity: "error",
                summary: "Error",
                detail: "Save failed, please try again later.",
                life: 3000,
            });
        }
    };

    return (
        <div className="project-settings">
            {/* Toast 组件显示提示 */}
            <Toast ref={toastRef} />

            <div className="form-group">
                <label htmlFor="projectName">Project Name</label>
                <InputText
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name"
                    required
                />
            </div>

            <div className="form-group">
                <label htmlFor="projectIdentifier">Project Identifier</label>
                <InputText
                    id="projectIdentifier"
                    value={projectIdentifier}
                    onChange={(e) => setProjectIdentifier(e.target.value.toLowerCase())}
                    placeholder="Enter project identifier"
                    required
                />
            </div>

            <div className="form-group">
                <label htmlFor="projectDescription">Description</label>
                <InputTextarea
                    id="projectDescription"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Enter project description"
                    rows={2}
                />
            </div>

            <div className="form-group">
                <label htmlFor="sourceLanguage">Source Language</label>
                <Dropdown
                    id="sourceLanguage"
                    value={sourceLanguage}
                    options={languages}
                    optionLabel="name"
                    onChange={(e) => setSourceLanguage(e.value)}
                    placeholder="Select a Source Language"
                    required
                    filter={languages.length > 10}
                    resetFilterOnHide
                    filterInputAutoFocus={true}
                />
            </div>

            <div className="form-group">
                <label htmlFor="targetLanguages">Target Languages</label>
                <PickList
                    source={languages.filter((lang) => !targetLanguages.includes(lang))}
                    target={targetLanguages}
                    itemTemplate={(item: Language) => item.name}
                    onChange={(e) => setTargetLanguages(e.target)}
                    dataKey="id"
                    filter={true}
                    filterBy="name"
                    sourceStyle={{ height: '360px' }} targetStyle={{ height: '360px' }}
                />
            </div>

            <div className="form-actions">
                <Button label="Save Settings" icon="pi pi-check" onClick={handleSaveProjectSettings} className="p-button-rounded p-button-primary" />
            </div>
        </div>
    );
};

export default ProjectSettings;
