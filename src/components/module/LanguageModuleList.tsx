/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { DataView } from "primereact/dataview";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { FileUpload } from "primereact/fileupload";
import { ProgressBar } from "primereact/progressbar";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import React, { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import "./LanguageModuleList.css";

interface Module {
  id: string;
  name: string;
  description: string;
  totalKeys: number;
  translatedKeys: number;
  translationRatio: number;
}

interface LanguageModuleListProps {
  projectId: string;
  initialLanguageId: string;
  onLanguageSelect: (languageId: string) => void;  // 新增语言选择回调
  onGoBack: () => void;
}

const LanguageModuleList: React.FC<LanguageModuleListProps> = ({
  projectId,
  initialLanguageId,
  onLanguageSelect,
  onGoBack,
}) => {
  const router = useRouter();
  const [modules, setModules] = useState<Module[]>([]);
  const [languages, setLanguages] = useState<{ id: string; name: string; code: string }[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState(initialLanguageId);
  const [importStats, setImportStats] = useState({
    totalKeys: 0,
    matchedKeys: 0,
    missingKeys: 0,
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null); // 当前模块ID
  const [refreshKey, setRefreshKey] = useState(0); // 用来强制触发 useEffect

  const fileExcelRef = useRef<FileUpload>(null);
  const toastRef = useRef<Toast>(null); // 定义Toast的ref

  // 获取项目的所有目标语言
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

    fetchLanguages();
  }, [projectId]);

  // 获取当前选定语言的模块列表
  useEffect(() => {
    const fetchModules = async () => {
      if (!selectedLanguageId) return;

      try {
        const res = await fetch(`/api/projects/${projectId}/${selectedLanguageId}`);
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
  }, [projectId, selectedLanguageId, refreshKey]);

  // 从数据库获取当前模块的原始语言 key 列表
  const fetchOriginalKeysFromDatabase = async (moduleId: string) => {
    try {
      const res = await fetch(`/api/resources/${moduleId}/import`);
      if (res.ok) {
        const data = await res.json();
        return data.keys; // 假设返回一个 { keys: string[] } 的格式
      } else {
        console.error("Failed to fetch original keys");
        return [];
      }
    } catch (error) {
      console.error("Error fetching original keys:", error);
      return [];
    }
  };

  // 处理 Excel 文件中的数据
  const processExcelData = (data: any) => {
    return data
      .map((row: any) => {
        const key = row[0];
        const sourceLanguage = row[1];
        const targetLanguage = row[2];

        if (!targetLanguage) return null; // 跳过没有目标语言的行

        return {
          key,
          sourceLanguage,
          targetLanguage,
        };
      })
      .filter((row: any) => row !== null); // 移除 null 的行
  };

  // 计算比对结果
  const calculateImportStats = (importData: any[], originalKeys: string[]) => {
    const totalKeys = importData.length;
    let matchedKeys = 0;
    let missingKeys = 0;

    importData.forEach((row: any) => {
      const key = row.key;
      if (originalKeys.includes(key)) {
        matchedKeys++;
      } else {
        missingKeys++;
      }
    });

    return { totalKeys, matchedKeys, missingKeys };
  };

  // 处理 Excel 文件上传
  const handleFileUpload = async (e: any, moduleId: string) => {
    const file = e.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result;
        if (data) {
          const workbook = XLSX.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];

          // 获取所有行数据，从第三行开始（忽略前两行）
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1, // 将第一行作为 header
            range: 2, // 从第三行开始读取
          });

          // 处理和转换数据
          const processedData = processExcelData(jsonData);

          // 从数据库获取原始语言的 key
          const originalKeys = await fetchOriginalKeysFromDatabase(moduleId);

          // 计算并设置导入统计信息
          const { totalKeys, matchedKeys, missingKeys } = calculateImportStats(
            processedData,
            originalKeys
          );

          // 设置导入前的统计信息并显示确认框
          setProcessedData(processedData);
          setImportStats({ totalKeys, matchedKeys, missingKeys });
          setCurrentModuleId(moduleId); // 设置当前模块的 ID
          setShowConfirmDialog(true); // 打开确认框
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // 导入模块
  const handleImport = async (moduleId: string, importData: any) => {
    try {
      const res = await fetch(`/api/resources/${moduleId}/${selectedLanguageId}/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ languageId: selectedLanguageId, data: importData }),
      });

      if (res.ok) {
        // 导入成功后更新 refreshKey，触发 useEffect
        setRefreshKey((prevKey) => prevKey + 1); // 强制触发 useEffect
        toastRef.current?.show({ severity: 'success', summary: 'Import successful!' }); // 显示成功 Toast
      } else {
        console.error("Failed to import data");
        toastRef.current?.show({ severity: 'error', summary: 'Import failed!' }); // 显示失败 Toast
      }
    } catch (error) {
      console.error("Error importing data:", error);
      toastRef.current?.show({ severity: 'error', summary: 'Error importing data' }); // 显示错误 Toast
    }
  };

  // 导出模块
  const handleExport = async (moduleId: string, moduleName: string) => {
    try {
      // 获取当前选定语言的语言代码
      const selectedLanguage = languages.find(
        (language) => language.id === selectedLanguageId
      );

      if (!selectedLanguage) {
        console.error("Language not found!");
        return;
      }

      // 获取模块的翻译数据（假设后端 API 返回一个 JSON 格式的翻译列表）
      const res = await fetch(`/api/resources/${moduleId}/${selectedLanguageId}/export`);
      if (!res.ok) {
        console.error("Failed to fetch translations");
        toastRef.current?.show({ severity: 'error', summary: 'Export failed!' }); // 显示失败 Toast
        return;
      }

      const translationData = await res.json();

      // 将翻译数据转为 JSON 格式
      const jsonData = JSON.stringify(translationData, null, 2); // 格式化为易读的 JSON

      // 创建一个 Blob 对象，类型为 JSON 文件
      const blob = new Blob([jsonData], { type: "application/json" });

      // 创建下载链接并触发下载
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${moduleName}.${selectedLanguage.code}.json`; // 使用语言代码构建文件名
      a.click(); // 模拟点击，开始下载
      URL.revokeObjectURL(url); // 清理 URL 对象

      toastRef.current?.show({ severity: 'success', summary: 'Export successful!' }); // 显示成功 Toast
    } catch (error) {
      console.error("Error exporting module:", error);
      toastRef.current?.show({ severity: 'error', summary: 'Error exporting module' }); // 显示错误 Toast
    }
  };

  // 切换目标语言
  const handleLanguageChange = (e: any) => {
    setCurrentModuleId(null);
    setSelectedLanguageId(e.value);
    onLanguageSelect(e.value);
    fileExcelRef.current?.clear();
  };

  // 确认导入
  const handleConfirmImport = () => {
    if (currentModuleId) {
      handleImport(currentModuleId, processedData);
    }
    fileExcelRef.current?.clear();
    setShowConfirmDialog(false); // 关闭确认框
  };

  const handleCancelImport = () => {
    setCurrentModuleId(null);
    setShowConfirmDialog(false);
    fileExcelRef.current?.clear();
  };

  const itemTemplate = (module: Module) => {
    return (
      <div className="language-module-item">
        <div className="module-details">
          <h5>{module.name}</h5>
          <p>Translated: {module.translatedKeys} / {module.totalKeys} ({module.translationRatio}%)</p>
        </div>

        <div className="module-progress">
          <ProgressBar value={module.translationRatio} showValue={false} className="progress-bar" />
          <Tag value={`${module.translationRatio ?? 0}%`} className="progress-tag" rounded />
        </div>

        <div className="module-actions">
          <FileUpload
            ref={fileExcelRef}
            name="file"
            accept=".xlsx,.xls"
            customUpload
            uploadHandler={(e) => handleFileUpload(e, module.id)}
            chooseLabel="Import Excel"
            chooseOptions={{ icon: 'pi pi-file-excel', iconOnly: false }}
            auto
            mode="basic"
          />
          <Button
            label="Export"
            icon="pi pi-file-export"
            className="p-button-rounded p-button-warning"
            onClick={() => handleExport(module.id, module.name)}
          />
          <Button
            label="Translate"
            icon="pi pi-language"
            className="p-button-rounded p-button-success"
            onClick={() => router.push(`/editor/${projectId}/${module.id}/${selectedLanguageId}`)}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="language-module-list">
      <Toast ref={toastRef} /> {/* 用于显示 Toast 消息 */}

      {/* 新增的容器：按钮和下拉框放在同一行 */}
      <div className="header-actions">
        <Button
          icon="pi pi-arrow-left"
          onClick={onGoBack}
          className="p-button-rounded p-button-info"
        />
        <div className="language-selector">
          <Dropdown
            value={selectedLanguageId}
            options={languages}
            onChange={handleLanguageChange}
            optionLabel="name"
            optionValue="id"
            placeholder="Select Language"
          />
        </div>
      </div>

      <DataView value={modules} itemTemplate={itemTemplate} />

      <Dialog
        visible={showConfirmDialog}
        header="Import Confirmation"
        onHide={handleCancelImport}
        modal={true}
        className="modal-dialog"
      >
        <p>Total Keys: {importStats.totalKeys}</p>
        <p>Matched Keys: {importStats.matchedKeys}</p>
        <p>Missing Keys: {importStats.missingKeys}</p>
        <div className="form-actions">
          <Button label="Cancel" onClick={handleCancelImport} className="p-button-rounded p-button-text" />
          <Button label="Confirm Import" onClick={handleConfirmImport} className="p-button-rounded p-button-primary" />
        </div>
      </Dialog>
    </div>
  );
};

export default LanguageModuleList;
