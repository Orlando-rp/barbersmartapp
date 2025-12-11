import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, X, Loader2, Scissors } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface ServiceImageUploadProps {
  imageUrl: string | null;
  serviceName: string;
  onImageChange: (url: string | null) => void;
  disabled?: boolean;
}

export const ServiceImageUpload = ({
  imageUrl,
  serviceName,
  onImageChange,
  disabled = false,
}: ServiceImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Use apenas imagens JPG, PNG, WebP ou GIF.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `services/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('service-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('service-images')
        .getPublicUrl(filePath);

      onImageChange(publicUrl);

      toast({
        title: "Imagem enviada",
        description: "A imagem do serviço foi atualizada.",
      });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: "Erro ao enviar imagem",
        description: error.message || "Não foi possível enviar a imagem.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!imageUrl) return;

    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/service-images/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage
          .from('service-images')
          .remove([filePath]);
      }

      onImageChange(null);

      toast({
        title: "Imagem removida",
        description: "A imagem do serviço foi removida.",
      });
    } catch (error: any) {
      console.error("Error removing image:", error);
      // Still remove from state even if storage delete fails
      onImageChange(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-border">
          <AvatarImage src={imageUrl || undefined} alt={serviceName} className="object-cover" />
          <AvatarFallback className="bg-muted text-muted-foreground">
            {serviceName ? getInitials(serviceName) : <Scissors className="h-6 w-6" />}
          </AvatarFallback>
        </Avatar>
        {imageUrl && !disabled && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full"
            onClick={handleRemoveImage}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="text-xs sm:text-sm"
        >
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Camera className="h-3.5 w-3.5 mr-1.5" />
              {imageUrl ? "Trocar Imagem" : "Adicionar Imagem"}
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, WebP ou GIF. Máx 5MB.
        </p>
      </div>
    </div>
  );
};
