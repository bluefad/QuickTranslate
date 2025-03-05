/* eslint-disable @typescript-eslint/no-empty-object-type */
"use client";

import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown"; // Source Language Dropdown
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea"; // 修正为 InputTextarea
import { PickList } from "primereact/picklist"; // Target Languages PickList
import { useEffect, useState } from "react";
import ProjectCard from "./ProjectCard";
import "./ProjectList.css";

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
  resourceCount: number; // 源语言待翻译记录数
  languageCount: number; // 目标语言数量
}

interface ProjectProps { }

const ProjectList = ({ }: ProjectProps) => {
  const [showDialog, setShowDialog] = useState(false); // 控制Dialog显示/隐藏
  const [projectName, setProjectName] = useState(""); // 项目名称
  const [projectIdentifier, setProjectIdentifier] = useState(""); // identifier 输入框
  const [projectDescription, setProjectDescription] = useState(""); // 项目描述
  const [sourceLanguage, setSourceLanguage] = useState<Language | null>(null); // Source Language
  const [targetLanguages, setTargetLanguages] = useState<Language[]>([]); // Target Languages

  const [projects, setProjects] = useState<Project[]>([]); // 项目列表
  const [languages, setLanguages] = useState<Language[]>([]); // 所有语言

  const [showDeleteDialog, setShowDeleteDialog] = useState(false); // 控制删除确认框显示
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null); // 当前选中的项目待删除
  const [showEditDialog, setShowEditDialog] = useState(false); // 控制编辑弹窗显示
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null); // 当前编辑的项目

  // 获取项目列表
  useEffect(() => {
    const fetchProjects = async () => {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data);
    };

    fetchProjects();
  }, []);

  // 获取语言列表
  useEffect(() => {
    const fetchLanguages = async () => {
      const res = await fetch("/api/languages");
      const data = await res.json();
      setLanguages(data); // 假设返回的data是语言数据
    };

    fetchLanguages();
  }, []);

  // 显示添加项目弹窗
  const handleAddProject = () => {
    setShowDialog(true); // 打开弹窗
  };

  // 保存新项目
  const handleSaveProject = async () => {
    const newProject = {
      name: projectName,
      identifier: projectIdentifier,
      description: projectDescription,
      sourceLanguageId: sourceLanguage?.id || "",
      targetLanguageIds: targetLanguages.map((lang) => lang.id),
    };

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newProject),
      });

      if (res.ok) {
        const savedProject = await res.json();
        setProjects((prevProjects) => [...prevProjects, savedProject]); // 更新项目列表
        setShowDialog(false); // 关闭弹窗
        setProjectName(""); // 清空项目名称
        setProjectIdentifier(""); // 清空项目标识
        setProjectDescription(""); // 清空项目描述
        setSourceLanguage(null); // 清空源语言
        setTargetLanguages([]); // 清空目标语言
      } else {
        console.error("Failed to create project");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // 关闭弹窗并清空表单
  const handleDialogClose = () => {
    setShowDialog(false); // 关闭弹窗
    setProjectName(""); // 清空项目名称
    setProjectIdentifier(""); // 清空项目标识
    setProjectDescription(""); // 清空项目描述
    setSourceLanguage(null); // 清空源语言
    setTargetLanguages([]); // 清空目标语言
  };

  // 显示删除确认框
  const confirmDelete = (project: Project) => {
    setProjectToDelete(project);
    setShowDeleteDialog(true);
  };

  // 删除项目
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      const res = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setProjects(
          projects.filter((project) => project.id !== projectToDelete.id),
        ); // 更新项目列表
        setShowDeleteDialog(false); // 关闭删除确认框
        setProjectToDelete(null); // 清除选中的项目
      } else {
        console.error("Failed to delete project");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  // 显示编辑弹窗并填充项目数据
  const handleEditProject = (project: Project) => {
    setProjectToEdit(project);
    setProjectName(project.name);
    setProjectIdentifier(project.identifier);
    setProjectDescription(project.description);
    setSourceLanguage(
      languages.find((lang) => lang.id === project.sourceLanguage.id) || null,
    );
    setTargetLanguages(
      languages.filter((lang) =>
        project.projectLanguages.some((item) => item.languageId === lang.id),
      ),
    );
    setShowEditDialog(true); // 打开编辑弹窗
  };

  // 保存编辑后的项目
  const handleSaveEditProject = async () => {
    if (!projectToEdit) return;

    const updatedProject = {
      name: projectName,
      identifier: projectIdentifier,
      description: projectDescription,
      sourceLanguageId: sourceLanguage?.id || "",
      targetLanguagesIds: targetLanguages.map((lang) => lang.id),
    };

    try {
      const res = await fetch(`/api/projects/${projectToEdit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedProject),
      });

      if (res.ok) {
        const savedProject = await res.json();
        setProjects((prevProjects) =>
          prevProjects.map((project) =>
            project.id === savedProject.id ? savedProject : project,
          ),
        ); // 更新项目列表
        setShowEditDialog(false); // 关闭编辑弹窗
        setProjectName(""); // 清空项目名称
        setProjectIdentifier(""); // 清空项目标识
        setProjectDescription(""); // 清空项目描述
        setSourceLanguage(null); // 清空源语言
        setTargetLanguages([]); // 清空目标语言
      } else {
        console.error("Failed to update project");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDeleteDialogClose = () => {
    setShowDeleteDialog(false); // 关闭删除确认框
    setProjectToDelete(null); // 清除选中的项目
  };

  const handleEditDialogClose = () => {
    setShowEditDialog(false); // 关闭编辑弹窗
    setProjectToEdit(null); // 清除选中的项目
    setProjectName(""); // 清空项目名称
    setProjectIdentifier(""); // 清空项目标识
    setProjectDescription(""); // 清空项目描述
    setSourceLanguage(null); // 清空源语言
    setTargetLanguages([]); // 清空目标语言
  };

  // 同步 identifier 输入框
  const handleProjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setProjectName(name);
    setProjectIdentifier(name.toLowerCase()); // 自动转为小写
  };

  return (
    <div className="project-list">
      {/* "添加 Project" 卡片 */}
      <Card
        title="Create Project"
        subTitle="Click to create a new project"
        className="add-project-card"
        footer={
          <Button
            label="Create Project"
            icon="pi pi-plus"
            className="p-button-rounded"
            onClick={handleAddProject}
          />}>
      </Card>

      {/* 现有的项目列表 */}
      {projects.map((project) => (
        <div key={project.id}>
          <ProjectCard
            id={project.id}
            name={project.name}
            sourceLanguage={project.sourceLanguage.name}
            description={project.description}
            resourceCount={project.resourceCount}
            languageCount={project.languageCount}
            onEdit={() => handleEditProject(project)}
            onDelete={() => confirmDelete(project)}
          />
        </div>
      ))}

      {/* 添加项目的弹窗 */}
      <Dialog
        visible={showDialog}
        style={{ width: "860px" }}
        header="Add New Project"
        modal={true}
        onHide={handleDialogClose}
        className="modal-dialog"
      >
        <div className="form-group">
          <label htmlFor="projectName">Project Name</label>
          <InputText
            id="projectName"
            value={projectName}
            onChange={handleProjectNameChange}
            placeholder="Enter project name"
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

        {/* Source Language Dropdown */}
        <div className="form-group">
          <label htmlFor="sourceLanguage">Source Language</label>
          <Dropdown
            id="sourceLanguage"
            value={sourceLanguage}
            options={languages}
            optionLabel="name"
            onChange={(e) => setSourceLanguage(e.value)}
            placeholder="Select a Source Language"
            required={true}
            filter={languages.length > 10}
            resetFilterOnHide
            filterInputAutoFocus={true}
          />
        </div>

        {/* Target Languages PickList */}
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
            sourceStyle={{ height: '280px' }} targetStyle={{ height: '280px' }}
          />
        </div>

        <div className="form-actions">
          <Button
            label="Cancel"
            icon="pi pi-times"
            onClick={handleDialogClose}
            className="p-button-text p-button-rounded"
          />
          <Button label="Save" icon="pi pi-check" onClick={handleSaveProject} className="p-button-rounded p-button-primary" />
        </div>
      </Dialog>

      {/* 编辑项目的弹窗 */}
      <Dialog
        visible={showEditDialog}
        style={{ width: "860px" }}
        header="Edit Project"
        modal={true}
        onHide={handleEditDialogClose}
        className="modal-dialog"
      >
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
            placeholder="Enter project Identifier"
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

        {/* Source Language Dropdown */}
        <div className="form-group">
          <label htmlFor="sourceLanguage">Source Language</label>
          <Dropdown
            id="sourceLanguage"
            value={sourceLanguage}
            options={languages}
            optionLabel="name"
            onChange={(e) => setSourceLanguage(e.value)}
            placeholder="Select a Source Language"
            required={true}
            filter={languages.length > 10}
            resetFilterOnHide
            filterInputAutoFocus={true}
          />
        </div>

        {/* Target Languages PickList */}
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
            sourceStyle={{ height: '280px' }} targetStyle={{ height: '280px' }}
          />
        </div>

        <div className="form-actions">
          <Button
            label="Cancel"
            icon="pi pi-times"
            onClick={handleEditDialogClose}
            className="p-button-text p-button-rounded"
          />
          <Button
            label="Save"
            icon="pi pi-check"
            onClick={handleSaveEditProject}
            className="p-button-rounded p-button-primary"
          />
        </div>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog
        visible={showDeleteDialog}
        style={{ width: "860px" }}
        header="Confirm Deletion"
        modal={true}
        onHide={handleDeleteDialogClose}
        className="modal-dialog"
      >
        <p>Are you sure you want to delete this project?</p>
        <div className="form-actions">
          <Button
            label="Cancel"
            icon="pi pi-times"
            onClick={handleDeleteDialogClose}
            className="p-button-text p-button-rounded"
          />
          <Button
            label="Delete"
            icon="pi pi-check"
            onClick={handleDeleteProject}
            className="p-button-danger p-button-rounded"
          />
        </div>
      </Dialog>
    </div>
  );
};

export default ProjectList;
