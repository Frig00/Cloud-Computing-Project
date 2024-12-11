import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Paper, Typography } from "@mui/material";
import { styled } from "@mui/system";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import usePreventDefaultDrop from "@/lib/usePreventDefaultDrop";

const DropZone = styled(Paper)(({ theme }) => ({
  border: `2px dashed ${theme.palette.primary.main}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
  textAlign: "center",
  cursor: "pointer",
  transition: "background-color 0.3s, border-color 0.3s",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

interface DropZoneViewProps {
  onFileSelected: (file: File) => void;
}

export default function DropZoneView({ onFileSelected }: DropZoneViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  usePreventDefaultDrop();

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget != e.target) return;
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    onFileSelected(droppedFiles[0]);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles[0]) {
      onFileSelected(selectedFiles[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <DropZone
      sx={{
        backgroundColor: isDragging ? "rgb(59 130 246 / 0.5)" : "inherit",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 1000000,
        }}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
      ></div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        style={{
          display: "none",
        }}
      />
      <CloudUploadIcon
        sx={{
          fontSize: 48,
          color: "textSecondary",
          mb: 2,
        }}
      />
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Drag and drop video here, or click to select video
      </Typography>
    </DropZone>
  );
}
