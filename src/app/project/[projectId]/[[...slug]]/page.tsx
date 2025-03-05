/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import ProjectLanguageList from "@/components/language/ProjectLanguageList";
import LanguageModuleList from "@/components/module/LanguageModuleList";
import ProjectFileList from "@/components/module/ProjectFileList";
import ProjectSettings from "@/components/projects/ProjectSettings";
import LanguageResource from "@/components/Resource/LanguageResource";
import { useParams, usePathname } from "next/navigation";
import { BreadCrumb } from "primereact/breadcrumb";
import { TabPanel, TabView } from "primereact/tabview";
import { useEffect, useState } from "react";
import "./project.css"; // 引入样式文件
import { MenuItem } from "primereact/menuitem";

// 定义 Tab 类型的枚举
enum TabType {
  DASHBOARD = 0,
  SOURCE = 1,
  SETTINGS = 2,
}

// 定义 Source Tab 子类型的枚举
enum SourceTabType {
  FILES = 0,
  STRINGS = 1,
}

const ProjectPage = () => {
  const { projectId, slug } = useParams<{ projectId: string, slug?: string[] }>(); // 从 URL 获取 projectId 和 slug
  const pathname = usePathname(); // 使用 usePathname 获取当前路径
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>("");
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [activeSourceTabIndex, setActiveSourceTabIndex] = useState<number>(0);
  const [breadcrumbItems, setBreadcrumbItems] = useState<MenuItem[]>([]);

  // 获取项目详情
  useEffect(() => {
    if (projectId) {
      const fetchProjectDetails = async () => {
        const res = await fetch(`/api/projects/${projectId}`);
        const projectData = await res.json();

        setBreadcrumbItems([
          { label: "Home", url: "/", icon: "pi pi-home" }, // 主页图标
          { label: "Project", url: `/project/${projectId}`, icon: "pi pi-briefcase" }, // 项目图标
          { label: projectData.name, icon: "pi pi-folder" } // 项目名称的图标
        ]);
      };

      fetchProjectDetails();
    }
  }, [projectId]);

  // 路径变化时更新 Tab 和子路由
  useEffect(() => {
    if (slug) {
      const [firstSegment] = slug;

      switch (firstSegment) {
        case "sources":
          setActiveIndex(TabType.SOURCE); // 激活 "Source" Tab
          const secondSegment = slug[1];
          switch (secondSegment) {
            case "strings":
              setActiveSourceTabIndex(SourceTabType.STRINGS); // 切换到 "Strings" Tab
              break;
            default:
              setActiveSourceTabIndex(SourceTabType.FILES); // 切换到 "Files" Tab
          }
          break;

        case "settings":
          setActiveIndex(TabType.SETTINGS); // 激活 "Settings" Tab
          break;

        default:
          if (slug.length === 1 && slug[0]) {
            setSelectedLanguageId(slug[0]); // 设置语言
          }
      }
    }
  }, []);

  // 防止多次跳转的路由变化处理函数
  const handleTabChange = (index: number) => {
    setActiveIndex(index);

    let newPath = "";

    switch (index) {
      case TabType.SETTINGS:
        newPath = `/project/${projectId}/settings`;
        break;
      case TabType.SOURCE:
        newPath = `/project/${projectId}/sources/files`;
        break;
      default:
        newPath = `/project/${projectId}`;
    }

    // 只有路径不同才更新
    if (pathname !== newPath) {
      window.history.pushState(null, '', newPath); // 使用 pushState 替代 router.push
    }
  };

  // 处理 Source Tab 中 Files 和 Strings 的切换
  const handleSourceTabChange = (index: number) => {
    setActiveSourceTabIndex(index);

    let path = "";

    switch (index) {
      case SourceTabType.STRINGS:
        path = `/project/${projectId}/sources/strings`;
        break;
      case SourceTabType.FILES:
        path = `/project/${projectId}/sources/files`;
        break;
    }

    // 只有路径不同才更新
    if (pathname !== path) {
      window.history.pushState(null, '', path); // 使用 pushState 替代 router.push
    }
  };

  // 处理语言代码变更
  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguageId(languageCode);

    // 只有路径不同才更新
    if (pathname !== `/project/${projectId}/${languageCode}`) {
      window.history.pushState(null, '', `/project/${projectId}/${languageCode}`); // 使用 pushState 替代 router.push
    }
  };

  // 处理模块选择并更新路由
  const handleModuleSelect = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setActiveSourceTabIndex(SourceTabType.STRINGS);
  };

  return (
    <div className="project-page">
      <BreadCrumb model={breadcrumbItems} />

      <TabView activeIndex={activeIndex} onTabChange={(e) => handleTabChange(e.index)}>
        <TabPanel header="Dashboard">
          {selectedLanguageId ? (
            <LanguageModuleList
              projectId={projectId}
              initialLanguageId={selectedLanguageId}
              onLanguageSelect={handleLanguageChange}
              onGoBack={() => handleLanguageChange("")}
            />
          ) : (
            <ProjectLanguageList
              projectId={projectId}
              onLanguageSelect={handleLanguageChange}
            />
          )}
        </TabPanel>

        <TabPanel header="Source">
          <TabView activeIndex={activeSourceTabIndex} onTabChange={(e) => handleSourceTabChange(e.index)}>
            <TabPanel header="Files">
              <ProjectFileList
                projectId={projectId}
                onModuleSelect={handleModuleSelect}
              />
            </TabPanel>
            <TabPanel header="Strings">
              <LanguageResource
                projectId={projectId}
                initialModuleId={selectedModuleId}
              />
            </TabPanel>
          </TabView>
        </TabPanel>

        <TabPanel header="Settings">
          <ProjectSettings
            projectId={projectId}
          />
        </TabPanel>
      </TabView>
    </div>
  );
};

export default ProjectPage;
