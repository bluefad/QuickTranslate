/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "primereact/button";
import { DataView } from "primereact/dataview";
import { Dialog } from "primereact/dialog";
import { FileUpload } from "primereact/fileupload";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import React, { useEffect, useRef, useState } from "react";
import "./ProjectFileList.css"; // 引入样式文件

interface Module {
  id: string;
  name: string;
  description: string;
  resourceCount: number;
}

interface LanguageResource {
  key: string;
  value: string;
  moduleId: string;
  languageId: string;
  order: number;
}

interface ProjectFileListProps {
  projectId: string;
  onModuleSelect: (moduleId: string) => void; // Add onModuleSelect callback
}

const ProjectFileList: React.FC<ProjectFileListProps> = ({ projectId, onModuleSelect }) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [moduleName, setModuleName] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [showAddEditDialog, setShowAddEditDialog] = useState(false); // 控制添加/编辑模块Dialog的显示
  const [showImportDialog, setShowImportDialog] = useState(false); // 控制导入确认Dialog的显示
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [comparisonResults, setComparisonResults] = useState<any | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isModuleNameDuplicate, setIsModuleNameDuplicate] = useState(false); // 控制重名提示框的显示
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false); // 控制删除确认框的显示
  const [importingModuleId, setImportingModuleId] = useState<string | null>(null); // 新增的状态变量
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null); // 保存待删除的模块
  const [refreshKey, setRefreshKey] = useState(0); // 用来强制触发 useEffect

  const fileImportRef = useRef<FileUpload>(null);
  const fileUploadRef = useRef<FileUpload>(null);
  const toastRef = useRef<Toast>(null); // 创建 Toast 的 ref

  // Fetch project modules
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/modules`);
        if (res.ok) {
          const data = await res.json();
          setModules(data);
        } else {
          console.error("Failed to fetch modules");
        }
      } catch (error) {
        console.error("Error fetching modules:", error);
      }
    };

    fetchModules();
  }, [projectId, refreshKey]);

  // Trigger module selection callback
  const handleModuleSelect = (moduleId: string) => {
    onModuleSelect(moduleId); // Pass selected module ID to parent
  };

  // Add new module
  const handleAddModule = () => {
    setEditingModule(null);
    setModuleName("");
    setModuleDescription("");
    setFile(null);
    setShowAddEditDialog(true);
  };

  // Check if module name already exists (case-insensitive, trim spaces)
  const checkIfModuleNameExists = async (name: string) => {
    const res = await fetch(`/api/projects/${projectId}/modules`);
    if (res.ok) {
      const data = await res.json();
      // Remove leading/trailing spaces and convert both names to lowercase for case-insensitive comparison
      const trimmedName = name.trim().toLowerCase();
      return data.some((module: Module) => module.name.trim().toLowerCase() === trimmedName);
    }
    return false;
  };

  // Save new or edited module
  const handleSaveModule = async () => {
    const isDuplicate = await checkIfModuleNameExists(moduleName);
    if (isDuplicate) {
      setIsModuleNameDuplicate(true);
      return;
    }

    if (!editingModule && !file) {
      toastRef.current?.show({
        severity: "warn",
        summary: "Validation",
        detail: "Please upload a valid JSON file.",
        life: 3000,
      });
      return;
    }

    const newModule = { name: moduleName, description: moduleDescription };

    const reader = new FileReader();
    reader.onload = async (event) => {
      const json = event.target?.result;
      if (json && typeof json === "string") {
        const parsedData = JSON.parse(json);

        try {
          const res = await fetch(`/api/projects/${projectId}/modules`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newModule),
          });

          if (res.ok) {
            const savedModule = await res.json();
            const moduleId = savedModule.id;
            const resources = flattenJsonToResources(parsedData, moduleId); // 扁平化 JSON 数据
            const resourceRes = await fetch(`/api/resources/${moduleId}/import`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ resources }),
            });

            if (resourceRes.ok) {
              setModules((prev) => [...prev, savedModule]);
              setRefreshKey((prevKey) => prevKey + 1); // 强制触发 useEffect
              setShowAddEditDialog(false);
              toastRef.current?.show({
                severity: "success",
                summary: "Module Added",
                detail: "The module has been added successfully.",
                life: 3000,
              });
            } else {
              console.error("Failed to save language resources");
              toastRef.current?.show({
                severity: "error",
                summary: "Error",
                detail: "Failed to save language resources",
                life: 3000,
              });
            }
          } else {
            console.error("Failed to save module");
          }
        } catch (error) {
          console.error("Error saving module:", error);
        }
        finally {
          fileUploadRef.current?.clear();
        }
      }
    };

    if (file) {
      reader.readAsText(file);
    } else if (editingModule) {
      // If editing, just save without file upload
      try {
        const res = await fetch(`/api/projects/${projectId}/modules/${editingModule.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newModule),
        });

        if (res.ok) {
          setModules((prev) =>
            prev.map((module) => (module.id === editingModule.id ? { ...module, ...newModule } : module))
          );
          setRefreshKey((prevKey) => prevKey + 1); // 强制触发 useEffect
          setShowAddEditDialog(false);
          toastRef.current?.show({
            severity: "success",
            summary: "Module Updated",
            detail: "The module has been updated successfully.",
            life: 3000,
          });
        } else {
          console.error("Failed to update module");
        }
      } catch (error) {
        console.error("Error updating module:", error);
      }
    }
  };

  // Edit module
  const handleEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleName(module.name);
    setModuleDescription(module.description);
    setShowAddEditDialog(true);
  };

  // Delete module
  const handleDeleteModule = (module: Module) => {
    setModuleToDelete(module);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDeleteModule = async () => {
    if (!moduleToDelete) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/modules/${moduleToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setModules((prev) => prev.filter((module) => module.id !== moduleToDelete.id));
        setRefreshKey((prevKey) => prevKey + 1); // 强制触发 useEffect
        setShowDeleteConfirmDialog(false);
        toastRef.current?.show({
          severity: "success",
          summary: "Module Deleted",
          detail: "The module has been deleted successfully.",
          life: 3000,
        });
      } else {
        console.error("Failed to delete module");
      }
    } catch (error) {
      console.error("Error deleting module:", error);
    }
  };

  // Import multiple files at once
  const handleImportFiles = async (event: any) => {
    const files = event.files;
    if (!files || files.length === 0) {
      toastRef.current?.show({
        severity: "warn",
        summary: "Validation",
        detail: "Please choose valid JSON files.",
        life: 3000,
      });
      return;
    }

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const json = event.target?.result;
        if (json && typeof json === "string") {
          const parsedData = JSON.parse(json);
          const newModule = { name: file.name.replace(".json", ""), description: file.name };

          try {
            const res = await fetch(`/api/projects/${projectId}/modules`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(newModule),
            });

            if (res.ok) {
              const savedModule = await res.json();
              const moduleId = savedModule.id;
              const resources = flattenJsonToResources(parsedData, moduleId);
              const resourceRes = await fetch(`/api/resources/${moduleId}/import`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ resources }),
              });

              if (resourceRes.ok) {
                setModules((prev) => [...prev, savedModule]);
                setRefreshKey((prevKey) => prevKey + 1);
                toastRef.current?.show({
                  severity: "success",
                  summary: "Module Added",
                  detail: `${file.name} has been imported successfully.`,
                  life: 3000,
                });
              } else {
                console.error("Failed to save language resources");
                toastRef.current?.show({
                  severity: "error",
                  summary: "Error",
                  detail: `Failed to save language resources for ${file.name}`,
                  life: 3000,
                });
              }
            } else {
              console.error("Failed to save module");
            }
          } catch (error) {
            console.error("Error saving module:", error);
          }
        }
      };
      reader.readAsText(file);
    }
    fileImportRef.current?.clear();
  };

  // Handle import JSON automatically when file is selected
  const handleImportJson = async (event: any, moduleId: string) => {
    const selectedFile = event.files[0];
    if (!selectedFile) {
      toastRef.current?.show({
        severity: "warn",
        summary: "Validation",
        detail: "Please choose a valid JSON file.",
        life: 3000,
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const json = e.target?.result;
      if (json && typeof json === "string") {
        const newResources = flattenJsonToResources(JSON.parse(json), moduleId); // 扁平化 JSON 数据

        // 1. Fetch current resources from the database (original language data)
        const currentResources = await fetchCurrentResources(moduleId);

        // 2. Compare the original and new resources
        const comparison = compareResources(currentResources, newResources);

        // 3. Show the comparison results in a confirmation dialog
        setComparisonResults(comparison);
        setImportingModuleId(moduleId);
        setShowImportDialog(true);
        setFile(selectedFile);
      }
    };
    reader.readAsText(selectedFile);
  };

  // Fetch current resources for a module
  const fetchCurrentResources = async (moduleId: string) => {
    try {
      const res = await fetch(`/api/resources/${moduleId}`);
      if (res.ok) {
        return await res.json();
      } else {
        console.error("Failed to fetch current resources");
        return [];
      }
    } catch (error) {
      console.error("Error fetching current resources:", error);
      return [];
    }
  };

  // Flatten the nested JSON into a flat structure for comparison
  const flattenJsonToResources = (nestedJson: any, moduleId: string, parentKey = ""): LanguageResource[] => {
    const resources: LanguageResource[] = [];
    let order = 0;  // 用于跟踪每个资源的顺序

    // Recursively flatten the JSON and track the order
    const flatten = (nestedJson: any, parentKey: string) => {
      for (const [key, value] of Object.entries(nestedJson)) {
        const newKey = parentKey ? `${parentKey}.${key}` : key;

        if (typeof value === "object" && !Array.isArray(value)) {
          // Recursively flatten nested objects
          flatten(value, newKey);
        } else {
          // Create a resource entry for each key-value pair
          resources.push({
            key: newKey,
            value: String(value),
            moduleId,
            languageId: "", // Set languageId as needed
            order: order++,  // Add the order field based on the current position
          });
        }
      }
    };

    flatten(nestedJson, parentKey);

    return resources;
  };

  // Compare original resources with new resources
  const compareResources = (currentResources: any[], newResources: any[]) => {
    const currentKeys = currentResources.map((item) => item.key);
    const newKeys = newResources.map((item) => item.key);

    const addedKeys = newKeys.filter((key) => !currentKeys.includes(key));
    const removedKeys = currentKeys.filter((key) => !newKeys.includes(key));
    const updatedKeys = newResources.filter(
      (newItem) =>
        currentResources.some(
          (currentItem) => currentItem.key === newItem.key && currentItem.value !== newItem.value
        )
    );

    return {
      added: addedKeys.length,
      removed: removedKeys.length,
      updated: updatedKeys.length,
    };
  };

  // Handle the user's confirmation for import
  const handleConfirmImport = async () => {
    if (!file || !importingModuleId) {
      alert("No file selected or module ID is missing.");
      return;
    }

    setIsImporting(true); // Start import process

    const reader = new FileReader();
    reader.onload = async (e) => {
      const json = e.target?.result;
      if (json && typeof json === "string") {
        const resources = flattenJsonToResources(JSON.parse(json), importingModuleId);

        // Process import
        try {
          const res = await fetch(`/api/resources/${importingModuleId}/import`, { // 使用保存的 moduleId
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ resources }),
          });

          if (res.ok) {
            setShowImportDialog(false); // Close the dialog
            setIsImporting(false); // Stop import process
            setImportingModuleId(null); // Reset the moduleId after successful import
            setRefreshKey((prevKey) => prevKey + 1); // 强制触发 useEffect
            toastRef.current?.show({
              severity: "success",
              summary: "Import Success",
              detail: "The resources have been imported successfully.",
              life: 3000,
            });
          } else {
            console.error("Failed to import JSON resources");
            setIsImporting(false);
            setImportingModuleId(null); // Reset the moduleId if import fails
          }
        } catch (error) {
          console.error("Error importing JSON:", error);
          setIsImporting(false);
          setImportingModuleId(null); // Reset the moduleId on error
        }
        finally {
          fileImportRef.current?.clear();
        }
      }
    };
    reader.readAsText(file);
  };

  const handleCancelImport = () => {
    setShowImportDialog(false); // Close the dialog without importing
    setIsImporting(false); // Reset importing state
    setImportingModuleId(null);
    fileImportRef.current?.clear();
  };

  // Render each module in the list
  const itemTemplate = (module: Module) => {
    return (
      <div className="file-item">
        <div className="file-details">
          <h5>{module.name}</h5>
          <p>{module.description}</p>
        </div>

        <div className="file-resource">
          <Tag icon="pi pi-language" value={`Source Strings ${module.resourceCount}`} rounded />
        </div>

        <div className="file-actions">
          <Button
            label="Edit"
            icon="pi pi-pencil"
            className="p-button-rounded p-button-warning"
            onClick={() => handleEditModule(module)}
          />
          <Button
            label="Delete"
            icon="pi pi-trash"
            className="p-button-rounded p-button-danger"
            onClick={() => handleDeleteModule(module)}
          />
          {/* Import button (auto mode) */}
          <FileUpload
            ref={fileImportRef}
            mode="basic"
            name="importFile"
            accept=".json"
            auto={true}
            customUpload
            uploadHandler={(e) => handleImportJson(e, module.id)} // Handle import when file is selected
            chooseLabel="Update File"
            chooseOptions={{ icon: 'pi pi-file', iconOnly: false }}
          />
          <Button
            label="View Strings"
            icon="pi pi-pen-to-square"
            className="p-button-rounded p-button-info"
            onClick={() => handleModuleSelect(module.id)} // Handle module selection
          />
        </div>
      </div>
    );
  };


  return (
    <div className="project-file-list">
      <Toast ref={toastRef} />
      <div className="button-container">
        <FileUpload
          ref={fileImportRef}
          mode="basic"
          name="importFiles"
          accept=".json"
          multiple
          auto={true}
          customUpload
          uploadHandler={(e) => handleImportFiles(e)}
          chooseLabel="Import Files"
          chooseOptions={{ icon: 'pi pi-file-import', iconOnly: false }}
        />
        <Button label="Add Files" icon="pi pi-plus" onClick={handleAddModule} className="add-file-button" />
      </div>
      <div className="file-list">
        <DataView value={modules} layout="list" itemTemplate={itemTemplate} />
      </div>
      {/* Add/Edit Module Dialog */}
      <Dialog
        visible={showAddEditDialog}
        style={{ width: "500px", maxWidth: "90%" }}
        header={editingModule ? "Edit File Info" : "Add New File"}
        modal={true}
        onHide={() => setShowAddEditDialog(false)}
        className="modal-dialog"
      >
        <div className="form-group">
          <label htmlFor="fileName">Resulting file after translation export</label>
          <InputText
            id="fileName"
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
            placeholder="Enter File name"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="fileTitle">Title as it appears to translators</label>
          <InputText
            id="fileTitle"
            value={moduleDescription}
            onChange={(e) => setModuleDescription(e.target.value)}
            placeholder="Enter File Title"
          />
        </div>

        {/* Only show file upload when adding a new module */}
        {!editingModule && (
          <div className="form-group file-upload-wrapper">
            <label htmlFor="fileUpload">Upload JSON File</label>
            <FileUpload
              ref={fileImportRef}
              name="file"
              accept=".json"
              auto={true}
              customUpload
              mode="basic"
              uploadHandler={(e) => setFile(e.files[0])}
              chooseLabel="Choose File"
              chooseOptions={{ icon: 'pi pi-file', iconOnly: false }}
            />
          </div>
        )}

        <div className="form-actions">
          <Button label="Cancel" icon="pi pi-times" onClick={() => setShowAddEditDialog(false)} className="p-button-text p-button-rounded" />
          <Button
            label={editingModule ? "Update File Info" : "Save File"}
            icon="pi pi-check"
            onClick={handleSaveModule}
            className="p-button-primary p-button-rounded"
          />
        </div>
      </Dialog>

      {/* Confirmation Dialog for import */}
      {comparisonResults && (
        <Dialog
          visible={showImportDialog}
          style={{ width: "500px", maxWidth: "90%" }}
          header="Import Confirmation"
          modal={true}
          onHide={() => handleCancelImport()}
          className="modal-dialog"
        >
          <p>
            <strong>Added Keys:</strong> {comparisonResults.added}
          </p>
          <p>
            <strong>Removed Keys:</strong> {comparisonResults.removed}
          </p>
          <p>
            <strong>Updated Keys:</strong> {comparisonResults.updated}
          </p>
          <div className="form-actions">
            <Button label="Cancel" icon="pi pi-times" onClick={handleCancelImport} className="p-button-text p-button-rounded" />
            <Button
              label="Confirm Import"
              icon="pi pi-check"
              onClick={handleConfirmImport}
              className="p-button-primary p-button-rounded"
              disabled={isImporting}
            />
          </div>
        </Dialog>
      )}

      {/* 重名提示框 */}
      <Dialog header="Module Name Duplicate" visible={isModuleNameDuplicate} onHide={() => setIsModuleNameDuplicate(false)} modal={true} className="modal-dialog">
        <p>Module name already exists. Please choose another name.</p>
        <div className="form-actions">
          <Button label="Close" onClick={() => setIsModuleNameDuplicate(false)} className="p-button-primary p-button-rounded" />
        </div>
      </Dialog>

      {/* 删除模块确认框 */}
      <Dialog header="Confirm Delete" visible={showDeleteConfirmDialog} onHide={() => setShowDeleteConfirmDialog(false)} modal={true} className="modal-dialog">
        <p>Are you sure you want to delete this module?</p>
        <div className="form-actions">
          <Button label="Cancel" onClick={() => setShowDeleteConfirmDialog(false)} className="p-button-rounded p-button-text" />
          <Button label="Confirm" onClick={confirmDeleteModule} className="p-button-rounded p-button-primary" />
        </div>
      </Dialog>
    </div>
  );
};

export default ProjectFileList;
