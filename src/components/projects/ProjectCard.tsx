import React from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import "./ProjectCard.css"; // 引入更新后的样式文件
import { Tag } from "primereact/tag";

interface ProjectCardProps {
  id: string; // 项目 ID
  name: string;
  description: string;
  sourceLanguage: string;
  resourceCount: number; // 源语言待翻译记录数
  languageCount: number; // 目标语言数量
  onEdit: () => void; // 编辑按钮的回调
  onDelete: () => void; // 删除按钮的回调
}

// 随机生成稍深的马卡龙系颜色
const getMacaronColor = () => {
  // 设定稍深的马卡龙系颜色范围（柔和但更饱和的颜色）
  const colors = [
    { r: 255, g: 105, b: 180 }, // 深粉色
    { r: 135, g: 206, b: 235 }, // 浅蓝色
    { r: 186, g: 85, b: 211 }, // 深紫色
    { r: 60, g: 179, b: 113 }, // 深绿色
    { r: 255, g: 215, b: 0 },   // 金黄色
    { r: 255, g: 140, b: 0 },   // 橙色
  ];

  // 随机选择一种颜色
  const color = colors[Math.floor(Math.random() * colors.length)];

  // 将 RGB 转换为十六进制
  const rgbToHex = (r: number, g: number, b: number) => {
    return `#${(1 << 24 | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
  };

  return rgbToHex(color.r, color.g, color.b);
};

const ProjectCard = ({
  id,
  name,
  description,
  sourceLanguage,
  resourceCount,
  languageCount,
  onEdit,
  onDelete,
}: ProjectCardProps) => {
  // 提取项目名称的首字母
  const firstLetter = name.charAt(0).toUpperCase();

  // 基于项目 ID 生成颜色
  const backgroundColor = getMacaronColor();

  return (
    <Card
      title={name}
      subTitle={sourceLanguage}
      className="project-card"
      footer={
        <div className="project-card-footer">
          <Button
            label="Edit"
            icon="pi pi-pencil"
            className="p-button-rounded p-button-info"
            onClick={onEdit}
          />
          <Button
            label="Delete"
            icon="pi pi-trash"
            className="p-button-rounded p-button-danger"
            onClick={onDelete}
          />
          <a href={`/project/${id}`}>
            <Button
              label="Go"
              icon="pi pi-arrow-right"
              iconPos="right"
              className="p-button-rounded p-button-success"
            />
          </a>
        </div>
      }
    >
      <div className="project-card-initials" style={{ backgroundColor: backgroundColor }}>
        {firstLetter}
      </div>

      <p className="project-description">{description}</p>

      {/* 添加 Tag 显示源语言待翻译记录数和目标语言数量 */}
      <div className="project-tags">
        <Tag icon="pi pi-language" value={`STRINGS ${resourceCount}`} />
        <Tag icon="pi pi-globe" value={`LANGUAGES ${languageCount}`} />
      </div>
    </Card>
  );
};

export default ProjectCard;
