import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useImageOptimization } from '@/hooks/useImageOptimization';
import { IMAGE_OPTIMIZATION_PRESETS, ImageConfig } from '@/types/landing-page';
import { formatFileSize } from '@/lib/imageOptimization';

interface OptimizedImageUploadProps {
  context: keyof typeof IMAGE_OPTIMIZATION_PRESETS;
  barbershopId: string;
  onUpload: (imageConfig: ImageConfig) => void;
  currentImage?: ImageConfig;
  onRemove?: () => void;
  aspectRatio?: string;
  className?: string;
  label?: string;
  description?: string;
}

export const OptimizedImageUpload: React.FC<OptimizedImageUploadProps> = ({
  context,
  barbershopId,
  onUpload,
  currentImage,
  onRemove,
  aspectRatio = '16/9',
  className,
  label,
  description,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const { 
    isOptimizing, 
    isUploading, 
    progress, 
    lastResult,
    optimizeAndUpload 
  } = useImageOptimization();

  const isProcessing = isOptimizing || isUploading;

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    // Optimize and upload
    const result = await optimizeAndUpload(file, barbershopId, context);
    
    if (result) {
      onUpload(result);
      setPreview(null);
    } else {
      setPreview(null);
    }

    URL.revokeObjectURL(previewUrl);
  }, [barbershopId, context, onUpload, optimizeAndUpload]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const displayImage = preview || currentImage?.url;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      
      <div
        onClick={() => !isProcessing && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative border-2 border-dashed rounded-lg overflow-hidden transition-all cursor-pointer',
          isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          isProcessing && 'pointer-events-none',
          !displayImage && 'bg-muted/30'
        )}
        style={{ aspectRatio }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
          disabled={isProcessing}
        />

        {displayImage ? (
          <>
            <img
              src={displayImage}
              alt={currentImage?.alt || 'Preview'}
              className="w-full h-full object-cover"
            />
            
            {/* Processing overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-center px-4">
                  <p className="text-sm font-medium">
                    {isOptimizing ? 'Otimizando...' : 'Enviando...'}
                  </p>
                  <Progress value={progress} className="w-32 mt-2" />
                </div>
                {lastResult && (
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(lastResult.metadata.originalSize)} → {formatFileSize(lastResult.metadata.optimizedSize)}
                    <span className="text-green-600 ml-1">
                      (-{lastResult.metadata.compressionRatio}%)
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Remove button */}
            {!isProcessing && onRemove && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            {/* Success indicator */}
            {!isProcessing && currentImage?.optimized_url && (
              <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Check className="h-3 w-3" />
                Otimizada
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            {isDragOver ? (
              <>
                <Upload className="h-10 w-10 text-primary animate-bounce" />
                <p className="text-sm font-medium text-primary">Solte a imagem aqui</p>
              </>
            ) : (
              <>
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">Clique ou arraste uma imagem</p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG ou WebP • Será otimizada automaticamente
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};
