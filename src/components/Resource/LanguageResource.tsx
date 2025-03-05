"use client";

import React, { useState, useEffect } from "react";
import { DataTable } from "primereact/datatable";
import { Column, ColumnEditorOptions, ColumnEvent } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";  // 导入 Toast 组件
import "./LanguageResource.css";

interface LanguageResource {
  id: string;
  key: string;
  value: string;
}

interface Module {
  id: string;
  name: string;
}

interface LanguageResourceProps {
  projectId: string;
  initialModuleId?: string;
}

const LanguageResource = ({
  projectId,
  initialModuleId,
}: LanguageResourceProps) => {
  const [resources, setResources] = useState<LanguageResource[]>([]);
  const [selectedResources, setSelectedResources] = useState<LanguageResource[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const toast = React.useRef<Toast>(null);  // 创建 toast 引用

  useEffect(() => {
    const fetchModules = async () => {
      const res = await fetch(`/api/projects/${projectId}/modules`);
      const data = await res.json();
      setModules(data);

      if (initialModuleId) {
        setSelectedModuleId(initialModuleId);
      } else if (data.length > 0) {
        setSelectedModuleId(data[0].id);
      }
    };

    fetchModules();
  }, [projectId, initialModuleId]);

  useEffect(() => {
    if (selectedModuleId) {
      const fetchResources = async () => {
        const res = await fetch(`/api/resources/${selectedModuleId}`);
        const data = await res.json();
        setResources(data);
      };

      fetchResources();
    }
  }, [selectedModuleId]);

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/resources/${selectedModuleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resources),
      });

      if (res.ok) {
        toast.current?.show({ severity: 'success', summary: 'Success', detail: 'Resources saved successfully', life: 3000 });
      } else {
        toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to save resources', life: 3000 });
      }
    } catch (error) {
      console.error("Error saving resources:", error);
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Error saving resources', life: 3000 });
    }
  };

  const handleCancel = () => {
    setResources([...resources]);
  };

  const handleDelete = async () => {
    const selectedIds = selectedResources.map((res) => res.id);

    try {
      const res = await fetch(`/api/resources/${selectedModuleId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(selectedIds),
      });

      if (res.ok) {
        setResources((prev) => prev.filter((resource) => !selectedIds.includes(resource.id)));
        setSelectedResources([]);
        toast.current?.show({ severity: 'success', summary: 'Success', detail: 'Resources deleted successfully', life: 3000 });
      } else {
        toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to delete resources', life: 3000 });
      }
    } catch (error) {
      console.error("Error deleting resources:", error);
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Error deleting resources', life: 3000 });
    }
  };

  const onCellEditComplete = (e: ColumnEvent) => {
    const { rowData, newValue } = e;
    const updatedResources = resources.map((resource) =>
      resource.id === rowData.id ? { ...resource, value: newValue } : resource
    );
    setResources(updatedResources);
  };

  const textEditor = (options: ColumnEditorOptions) => {
    return (
      <InputText
        type="text"
        value={options.value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          if (options.editorCallback) {
            options.editorCallback(e.target.value);
          }
        }}
        onKeyDown={(e) => e.stopPropagation()}
        className="p-inputtext" />
    );
  };

  return (
    <div className="language-resources">
      <Toast ref={toast} /> {/* 显示 Toast */}

      <div className="module-selector">
        <label>Strings: </label>
        <Dropdown
          value={selectedModuleId}
          options={modules}
          onChange={(e) => setSelectedModuleId(e.value)}
          optionLabel="name"
          optionValue="id"
          placeholder="Select a File"
          className="module-dropdown"
        />
      </div>

      <div className="actions">
        <Button
          label="Save"
          onClick={handleSave}
          icon="pi pi-save"
          className="p-button-primary p-button-rounded"
        />
        <Button
          label="Cancel"
          onClick={handleCancel}
          icon="pi pi-times"
          className="p-button-secondary p-button-rounded"
        />
        <Button
          label="Delete Selected"
          onClick={handleDelete}
          icon="pi pi-trash"
          className="p-button-danger p-button-rounded"
        />
      </div>

      <DataTable
        value={resources}
        selection={selectedResources}
        selectionMode={"checkbox"}
        onSelectionChange={(e) => setSelectedResources(e.value)}
        paginator={resources.length > 0}
        rows={10}
        rowsPerPageOptions={[10, 25, 50, 100]}
        editMode="cell"
        paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} resources"
        className="resource-table"
      >
        <Column selectionMode="multiple" headerStyle={{ width: "3em" }} />
        <Column key="Key" field="key" header="Key" sortable style={{ width: "35%" }} />
        <Column
          key="Value"
          field="value"
          header="Source String"
          editor={(options) => textEditor(options)}
          onCellEditComplete={onCellEditComplete}
        />
      </DataTable>
    </div>
  );
};

export default LanguageResource;
