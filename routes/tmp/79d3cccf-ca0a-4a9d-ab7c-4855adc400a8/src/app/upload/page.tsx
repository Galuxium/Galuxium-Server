import React from 'react';
import { useDropzone } from 'react-dropzone';

interface FileInputProps {
  onDrop: (files: File[]) => void;
}

const FileInput: React.FC<FileInputProps> = ({ onDrop }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div
      {...getRootProps()}
      className="w-64 border-2 border-dashed border-gray-300 p-6 rounded-lg cursor-pointer"
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the files here ...</p>
      ) : (
        <p>Drag and drop some files here, or click to select files</p>
      )}
    </div>
  );
};

export default FileInput;