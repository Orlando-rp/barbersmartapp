import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  OptimizeOptions, 
  OptimizedImageResult, 
  ImageConfig,
  IMAGE_OPTIMIZATION_PRESETS 
} from '@/types/landing-page';
import { 
  optimizeImage, 
  formatFileSize, 
  generateImageFilename 
} from '@/lib/imageOptimization';
import { toast } from 'sonner';

interface UseImageOptimizationReturn {
  isOptimizing: boolean;
  isUploading: boolean;
  progress: number;
  lastResult: OptimizedImageResult | null;
  optimizeAndUpload: (
    file: File,
    barbershopId: string,
    context: keyof typeof IMAGE_OPTIMIZATION_PRESETS,
    customOptions?: Partial<OptimizeOptions>
  ) => Promise<ImageConfig | null>;
  optimizeOnly: (
    file: File,
    context: keyof typeof IMAGE_OPTIMIZATION_PRESETS,
    customOptions?: Partial<OptimizeOptions>
  ) => Promise<OptimizedImageResult | null>;
}

export const useImageOptimization = (): UseImageOptimizationReturn => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastResult, setLastResult] = useState<OptimizedImageResult | null>(null);

  const optimizeOnly = useCallback(async (
    file: File,
    context: keyof typeof IMAGE_OPTIMIZATION_PRESETS,
    customOptions?: Partial<OptimizeOptions>
  ): Promise<OptimizedImageResult | null> => {
    setIsOptimizing(true);
    setProgress(10);

    try {
      const preset = IMAGE_OPTIMIZATION_PRESETS[context];
      const options: OptimizeOptions = { ...preset, ...customOptions };

      setProgress(30);
      const result = await optimizeImage(file, options);
      setProgress(100);
      setLastResult(result);

      console.log(`Image optimized: ${formatFileSize(result.metadata.originalSize)} → ${formatFileSize(result.metadata.optimizedSize)} (${result.metadata.compressionRatio}% reduction)`);

      return result;
    } catch (error) {
      console.error('Error optimizing image:', error);
      toast.error('Erro ao otimizar imagem');
      return null;
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  const optimizeAndUpload = useCallback(async (
    file: File,
    barbershopId: string,
    context: keyof typeof IMAGE_OPTIMIZATION_PRESETS,
    customOptions?: Partial<OptimizeOptions>
  ): Promise<ImageConfig | null> => {
    setIsOptimizing(true);
    setIsUploading(false);
    setProgress(0);

    try {
      // Step 1: Optimize the image
      setProgress(10);
      const preset = IMAGE_OPTIMIZATION_PRESETS[context];
      const options: OptimizeOptions = { ...preset, ...customOptions };
      
      const result = await optimizeImage(file, options);
      setLastResult(result);
      setProgress(40);

      // Step 2: Upload optimized image
      setIsOptimizing(false);
      setIsUploading(true);
      
      const filename = generateImageFilename(file.name, `${barbershopId}/${context}`, result.metadata.format);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('landing-images')
        .upload(filename, result.optimizedBlob, {
          contentType: `image/${result.metadata.format}`,
          cacheControl: '31536000', // 1 year cache
        });

      if (uploadError) {
        throw uploadError;
      }

      setProgress(70);

      // Step 3: Upload thumbnail if exists
      let thumbnailUrl: string | undefined;
      if (result.thumbnailBlob) {
        const thumbFilename = generateImageFilename(file.name, `${barbershopId}/${context}/thumbs`, result.metadata.format);
        
        const { data: thumbData, error: thumbError } = await supabase.storage
          .from('landing-images')
          .upload(thumbFilename, result.thumbnailBlob, {
            contentType: `image/${result.metadata.format}`,
            cacheControl: '31536000',
          });

        if (!thumbError && thumbData) {
          const { data: thumbUrl } = supabase.storage
            .from('landing-images')
            .getPublicUrl(thumbData.path);
          thumbnailUrl = thumbUrl.publicUrl;
        }
      }

      setProgress(90);

      // Get public URL
      const { data: publicUrl } = supabase.storage
        .from('landing-images')
        .getPublicUrl(uploadData.path);

      setProgress(100);

      const imageConfig: ImageConfig = {
        id: crypto.randomUUID(),
        url: publicUrl.publicUrl,
        optimized_url: publicUrl.publicUrl,
        thumbnail_url: thumbnailUrl,
        alt: file.name.replace(/\.[^/.]+$/, ''),
        width: result.metadata.width,
        height: result.metadata.height,
      };

      toast.success(`Imagem otimizada e enviada (${result.metadata.compressionRatio}% menor)`);
      
      return imageConfig;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao enviar imagem');
      return null;
    } finally {
      setIsOptimizing(false);
      setIsUploading(false);
    }
  }, []);

  return {
    isOptimizing,
    isUploading,
    progress,
    lastResult,
    optimizeAndUpload,
    optimizeOnly,
  };
};
