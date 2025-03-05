"use client";

import { Button } from "primereact/button";
import { DataView } from "primereact/dataview";
import { ProgressBar } from "primereact/progressbar";
import { Tag } from "primereact/tag";
import React, { useEffect, useState } from "react";
import "./ProjectLanguageList.css"; // 引入样式文件

interface Language {
  id: string;
  name: string;
  code: string;
  progress: number;
}

interface ProjectLanguageListProps {
  projectId: string;
  onLanguageSelect: (languageId: string) => void;  // 新增语言选择回调
}

const ProjectLanguageList: React.FC<ProjectLanguageListProps> = ({ projectId, onLanguageSelect }) => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [projectName, setProjectName] = useState<string>("");

  // 获取目标语言列表和项目名称
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/languages`);
        if (res.ok) {
          const data = await res.json();
          setLanguages(data);
        } else {
          console.error("Failed to fetch languages");
        }
      } catch (error) {
        console.error("Error fetching languages:", error);
      }
    };

    const fetchProjectName = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setProjectName(data.name); // 获取项目名称
        } else {
          console.error("Failed to fetch project name");
        }
      } catch (error) {
        console.error("Error fetching project name:", error);
      }
    };

    fetchLanguages();
    fetchProjectName();
  }, [projectId]);

  const handleDownloadResources = async (languageId: string, languageCode: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/${languageId}/export`);
      if (!res.ok) {
        throw new Error("Failed to fetch ZIP file");
      }

      // 构建文件名
      const fileName = `${projectName}.${languageCode}.zip`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName; // 使用项目名和语言代码生成文件名
      a.click(); // 模拟点击，开始下载
      URL.revokeObjectURL(url); // 清理 URL 对象
    } catch (error) {
      console.error("Error downloading language resources:", error);
      alert("Failed to download resources.");
    }
  };

  const handleSelectLanguage = (languageId: string) => {
    onLanguageSelect(languageId);  // 触发父组件的回调
  };

  // 渲染每一项语言
  const itemTemplate = (language: Language) => {
    return (
      <div className="language-item p-shadow-2">
        <div className="language-details">
          <h5>{language.name}</h5>
        </div>

        <div className="language-progress">
          <ProgressBar value={language.progress} showValue={false} className="progress-bar" />
          <Tag value={`${language.progress ?? 0}%`} className="progress-tag" rounded />
        </div>
        
        <div className="language-actions">
          {/* Download Button */}
          <Button
            label="Download"
            icon="pi pi-download"
            className="p-button-rounded p-button-info"
            onClick={() => handleDownloadResources(language.id, language.code)}
          />
          {/* Translate Button */}
          <Button
            label="Translate"
            icon="pi pi-language"
            className="p-button-rounded p-button-success"
            onClick={() => handleSelectLanguage(language.id)}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="language-list-container">
      <div className="language-list">
        <DataView
          value={languages}
          layout="list"
          itemTemplate={itemTemplate}
        />
      </div>
    </div>
  );
};

export default ProjectLanguageList;
