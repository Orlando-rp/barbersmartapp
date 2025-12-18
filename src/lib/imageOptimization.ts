// Image Optimization Utilities
import { OptimizeOptions, OptimizedImageResult } from '@/types/landing-page';

/**
 * Load an image file into an HTMLImageElement
 */
export const loadImage = (file: File | Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Calculate new dimensions maintaining aspect ratio
 */
export const calculateDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight?: number
): { width: number; height: number } => {
  let width = originalWidth;
  let height = originalHeight;

  // Scale down if wider than maxWidth
  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  // Scale down if taller than maxHeight (if specified)
  if (maxHeight && height > maxHeight) {
    width = Math.round((width * maxHeight) / height);
    height = maxHeight;
  }

  return { width, height };
};

/**
 * Convert canvas to blob with specified format and quality
 */
const canvasToBlob = (
  canvas: HTMLCanvasElement,
  format: string,
  quality: number
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const mimeType = format === 'webp' ? 'image/webp' : 
                     format === 'png' ? 'image/png' : 'image/jpeg';
    
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      mimeType,
      quality / 100
    );
  });
};

/**
 * Check if browser supports WebP
 */
export const supportsWebP = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const dataUrl = canvas.toDataURL('image/webp');
    resolve(dataUrl.indexOf('data:image/webp') === 0);
  });
};

/**
 * Main optimization function - processes image in browser before upload
 */
export const optimizeImage = async (
  file: File,
  options: OptimizeOptions
): Promise<OptimizedImageResult> => {
  const { maxWidth, maxHeight, quality, format, generateThumbnail, thumbnailWidth } = options;

  // Load the original image
  const img = await loadImage(file);
  
  // Calculate optimized dimensions
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    maxWidth,
    maxHeight
  );

  // Create canvas for optimization
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  canvas.width = width;
  canvas.height = height;

  // Enable high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw the image
  ctx.drawImage(img, 0, 0, width, height);

  // Check WebP support and fallback if needed
  let finalFormat = format;
  if (format === 'webp') {
    const hasWebP = await supportsWebP();
    if (!hasWebP) {
      finalFormat = 'jpeg';
    }
  }

  // Convert to optimized blob
  const optimizedBlob = await canvasToBlob(canvas, finalFormat, quality);

  // Generate thumbnail if requested
  let thumbnailBlob: Blob | undefined;
  if (generateThumbnail && thumbnailWidth) {
    const thumbDimensions = calculateDimensions(width, height, thumbnailWidth);
    const thumbCanvas = document.createElement('canvas');
    const thumbCtx = thumbCanvas.getContext('2d');
    
    if (thumbCtx) {
      thumbCanvas.width = thumbDimensions.width;
      thumbCanvas.height = thumbDimensions.height;
      thumbCtx.imageSmoothingEnabled = true;
      thumbCtx.imageSmoothingQuality = 'high';
      thumbCtx.drawImage(canvas, 0, 0, thumbDimensions.width, thumbDimensions.height);
      thumbnailBlob = await canvasToBlob(thumbCanvas, finalFormat, quality - 5);
    }
  }

  // Calculate compression stats
  const originalSize = file.size;
  const optimizedSize = optimizedBlob.size;
  const compressionRatio = Number(((1 - optimizedSize / originalSize) * 100).toFixed(1));

  return {
    optimizedBlob,
    thumbnailBlob,
    metadata: {
      originalSize,
      optimizedSize,
      width,
      height,
      format: finalFormat,
      compressionRatio,
    },
  };
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Generate a unique filename for uploads
 */
export const generateImageFilename = (
  originalName: string,
  prefix: string,
  format: string
): string => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '-');
  return `${prefix}/${timestamp}-${randomStr}-${baseName}.${format}`;
};
