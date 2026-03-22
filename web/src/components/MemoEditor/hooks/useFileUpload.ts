import { useRef } from "react";
import type { LocalFile } from "../types/attachment";

export const useFileUpload = (onFilesSelected: (localFiles: LocalFile[]) => void) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectingFlagRef = useRef(false);

  const handleFileInputChange = (event?: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(fileInputRef.current?.files || event?.target.files || []) as File[];
    if (files.length === 0 || selectingFlagRef.current) {
      return;
    }
    selectingFlagRef.current = true;
    const localFiles: LocalFile[] = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "uploading",
    }));
    onFilesSelected(localFiles);
    selectingFlagRef.current = false;
    // Optionally clear input value to allow re-selecting the same file
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return {
    fileInputRef,
    selectingFlag: selectingFlagRef.current,
    handleFileInputChange,
    handleUploadClick,
  };
};
