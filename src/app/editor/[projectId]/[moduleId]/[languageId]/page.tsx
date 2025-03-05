"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column, ColumnEditorOptions, ColumnEvent } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import { BreadCrumb } from "primereact/breadcrumb"; // 引入 BreadCrumb 组件
import { Dialog } from "primereact/dialog"; // 引入 Dialog 组件
import { Tooltip } from "primereact/tooltip";
import "./editor.css"; // 引入样式文件
import { MenuItem } from "primereact/menuitem";

interface LanguageResource {
  id: string;
  key: string;
  sourceValue: string;
  value: string;
  isModified?: boolean; // 是否已经被修改，新增此属性
}

interface Module {
  id: string;
  name: string;
}

interface Language {
  id: string;
  name: string;
}

const TranslatePage = () => {
  const { projectId, moduleId, languageId } = useParams();
  const router = useRouter();
  const [resources, setResources] = useState<LanguageResource[]>([]);
  const [moduleName, setModuleName] = useState<string>('');
  const [languageName, setLanguageName] = useState<string>('');  // 新增语言名称
  const [projectName, setProjectName] = useState<string>('');    // 新增项目名称
  const [breadcrumbItems, setBreadcrumbItems] = useState<MenuItem[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);  // 添加语言列表
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);  // 控制语言选择框的显示
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const toast = React.useRef<Toast>(null);

  useEffect(() => {
    if (projectId && moduleId && languageId) {
      const fetchResources = async () => {
        try {
          const res = await fetch(`/api/editor/${moduleId}/${languageId}`);
          const data = await res.json();
          setResources(data);
        } catch (error) {
          console.error("Error fetching resources:", error);
        }
      };

      const fetchModuleName = async () => {
        try {
          const res = await fetch(`/api/projects/${projectId}/modules/${moduleId}`);
          const data = await res.json();
          setModuleName(data.name);
        } catch (error) {
          console.error("Error fetching module name:", error);
        }
      };

      const fetchLanguageName = async () => {
        try {
          const res = await fetch(`/api/languages/${languageId}`);
          const data = await res.json();
          setLanguageName(data.name);  // 获取并设置语言名称
        } catch (error) {
          console.error("Error fetching language name:", error);
        }
      };

      const fetchProjectName = async () => {
        try {
          const res = await fetch(`/api/projects/${projectId}`);
          const data = await res.json();
          setProjectName(data.name);  // 获取并设置项目名称
        } catch (error) {
          console.error("Error fetching project name:", error);
        }
      };

      const fetchModules = async () => {
        try {
          const res = await fetch(`/api/projects/${projectId}/modules`);
          const data = await res.json();
          setModules(data);
        } catch (error) {
          console.error("Error fetching modules:", error);
        }
      };

      const fetchLanguages = async () => {
        try {
          const res = await fetch(`/api/projects/${projectId}/languages`);
          const data = await res.json();
          setLanguages(data);  // 假设API返回语言数据
        } catch (error) {
          console.error("Error fetching languages:", error);
        }
      };

      fetchResources();
      fetchModuleName();
      fetchLanguageName();
      fetchProjectName();
      fetchModules();
      fetchLanguages();

      setBreadcrumbItems([
        { label: projectName, icon: 'pi pi-home', url: `/project/${projectId}` },  // 显示真实的项目名称
        {
          label: languageName, // 显示真实的语言名称
          command: () => setShowLanguageDialog(true), // 点击语言跳出选择框
        },
        { label: moduleName, command: () => setShowModuleDialog(true) },
      ]);
    }
  }, [projectId, moduleId, languageId, moduleName, projectName, languageName]);


  const onCellEditComplete = (e: ColumnEvent) => {
    const { rowData, newValue } = e;

    // 只有在新值和原值不相同的情况下，才更新 isModified 和 hasUnsavedChanges
    const updatedResources = resources.map((resource) =>
      resource.key === rowData.key
        ? { ...resource, value: newValue, isModified: newValue !== resource.value }
        : resource
    );
    setResources(updatedResources);

    // 如果新值和原值不同，则设置有未保存的更改
    if (newValue !== rowData.value) {
      setHasUnsavedChanges(true);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(
        `/api/editor/${moduleId}/${languageId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(resources),
        }
      );

      if (res.ok) {
        // 成功保存后，重置所有修改状态
        const resetResources = resources.map((resource) => ({
          ...resource,
          isModified: false, // 重置为未修改
        }));
        setResources(resetResources);
        setHasUnsavedChanges(false);
        toast.current?.show({ severity: "success", summary: "Success", detail: "Translations saved successfully!" });
      } else {
        toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to save translations." });
      }
    } catch (error) {
      console.error("Error saving translations:", error);
      toast.current?.show({ severity: "error", summary: "Error", detail: "Error saving translations." });
    }
  };

  const handleCancel = () => {
    const resetResources = resources.map((resource) => ({
      ...resource,
      value: resource.value, // 取消修改，恢复原值
      isModified: false, // 标记为未修改
    }));
    setResources(resetResources);
    setHasUnsavedChanges(false);
  };

  const textEditor = (options: ColumnEditorOptions) => {
    return (
      <InputText
        type="text"
        value={options.value}
        onChange={(e) => options.editorCallback?.(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        className="p-inputtext" />
    );
  };

  const handleModuleSelect = (moduleId: string) => {
    setShowModuleDialog(false);
    router.push(`/editor/${projectId}/${moduleId}/${languageId}`);
  };

  const handleLanguageSelect = (selectedLanguageId: string) => {
    setShowLanguageDialog(false);
    router.push(`/editor/${projectId}/${moduleId}/${selectedLanguageId}`);
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        const message = "You have unsaved changes. Are you sure you want to leave?";
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return (
    <div className="editor-page">
      <Toast ref={toast} />

      <BreadCrumb model={breadcrumbItems} />

      <div className="actions">
        <Button label="Save" icon="pi pi-save" onClick={handleSave} className="p-button-primary p-button-rounded" />
        <Button label="Cancel" icon="pi pi-times" onClick={handleCancel} className="p-button-secondary p-button-rounded" />
      </div>

      <DataTable
        value={resources}
        paginator={resources.length > 0}
        rows={10}
        rowsPerPageOptions={[10, 25, 50, 100]}
        editMode="cell"
        paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} resources"
        className="resource-table"
      >
        <Column
          key="Source" field="sourceValue" header="Source String"
          body={(rowData: LanguageResource) => (
            <div className="source-key-column">
              <div className="source-text">{rowData.sourceValue}</div>
              <div className="key-text">{rowData.key}</div>
            </div>
          )}
          style={{ width: "30%" }}  // 重新定义宽度，适应合并后的列
        />
        <Column
          key="Value"
          field="value"
          header="Translation"
          editor={(options) => textEditor(options)}
          onCellEditComplete={onCellEditComplete}
        />
        <Column
          body={(rowData: LanguageResource) => rowData.isModified ? (
            <>
              <i className="pi pi-pencil" data-pr-tooltip="Unsaved translation" />
              <Tooltip target=".pi-pencil" />
            </>
          ) : null}
          style={{ width: "168px" }}
        />
      </DataTable>

      <Dialog
        visible={showModuleDialog}
        style={{ width: "500px" }}
        header="Switch Module"
        modal
        onHide={() => setShowModuleDialog(false)}
        className="list-dialog">
        <div className="module-list">
          <DataTable value={modules} showHeaders={false}>
            <Column field="name" header="Module Name" />
            <Column
              body={(rowData: Module) => (
                <Button
                  label="Select" className="p-button-text p-button-rounded"
                  onClick={() => handleModuleSelect(rowData.id)}
                />
              )}
            />
          </DataTable>
        </div>
      </Dialog>

      <Dialog
        visible={showLanguageDialog}
        style={{ width: "500px" }}
        header="Switch Language"
        modal
        onHide={() => setShowLanguageDialog(false)}
        className="list-dialog">
        <div className="language-list">
          <DataTable value={languages} showHeaders={false}>
            <Column field="name" header="Language Name" />
            <Column
              body={(rowData: Language) => (
                <Button
                  label="Select" className="p-button-text p-button-rounded"
                  onClick={() => handleLanguageSelect(rowData.id)}
                />
              )}
            />
          </DataTable>
        </div>
      </Dialog>
    </div>
  );
};

export default TranslatePage;
