// /home/piikee/soyol/components/admin/AdminImageUpload.tsx
'use client';

import { useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadImage } from '@/lib/uploadClient';

interface AdminImageUploadProps {
  disabled?: boolean;
  onUpload: (url: string) => void;
  placeholder?: string;
  multiple?: boolean;
}

export default function AdminImageUpload({ 
  disabled, 
  onUpload, 
  placeholder = "Зураг сонгох", 
  multiple = false 
}: AdminImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadImage(file);
        onUpload(url);
      }
      toast.success('Зураг амжилттай оруулагдлаа');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Зураг оруулахад алдаа гарлаа');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <label className="cursor-pointer">
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={disabled || isUploading}
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="w-full px-4 py-8 bg-slate-800/50 border border-white/10 border-dashed rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 hover:border-amber-500/50 transition-all flex flex-col items-center justify-center gap-2">
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 mb-2 animate-spin" />
            <span className="text-sm font-medium">Хуулж байна...</span>
          </>
        ) : (
          <>
            <ImagePlus className="h-8 w-8 mb-2" />
            <span className="text-sm font-medium">{placeholder}</span>
          </>
        )}
      </div>
    </label>
  );
}