import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Trash2, Upload, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface StaffAvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  fullName: string;
  onAvatarUpdate: (url: string | null) => void;
  size?: "sm" | "md" | "lg";
}

export const StaffAvatarUpload = ({ 
  userId, 
  currentAvatarUrl, 
  fullName,
  onAvatarUpdate,
  size = "md"
}: StaffAvatarUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32"
  };

  const buttonSizeClasses = {
    sm: "h-7 w-7",
    md: "h-8 w-8",
    lg: "h-10 w-10"
  };

  const getAvatarUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);
    
    return data.publicUrl;
  };

  const getInitials = () => {
    if (!fullName) return null;
    return fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!userId) {
        toast({
          title: 'Erro',
          description: 'Usuário não identificado',
          variant: 'destructive',
        });
        return;
      }

      const file = event.target.files?.[0];
      if (!file) return;

      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Erro',
          description: 'Por favor, selecione uma imagem',
          variant: 'destructive',
        });
        return;
      }

      // Validar tamanho (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Erro',
          description: 'A imagem deve ter no máximo 2MB',
          variant: 'destructive',
        });
        return;
      }

      setUploading(true);

      // Deletar avatar antigo se existir
      if (currentAvatarUrl && !currentAvatarUrl.startsWith('http')) {
        const oldPath = currentAvatarUrl.includes('/') 
          ? currentAvatarUrl.split('/').pop() 
          : currentAvatarUrl;
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([oldPath]);
        }
      }

      // Upload novo arquivo
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Atualizar perfil com novo avatar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: filePath })
        .eq('id', userId);

      if (updateError) throw updateError;

      const publicUrl = getAvatarUrl(filePath);
      onAvatarUpdate(publicUrl);

      toast({
        title: 'Foto atualizada!',
        description: 'A foto do profissional foi atualizada com sucesso.',
      });
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: 'Erro ao atualizar foto',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!userId || !currentAvatarUrl) return;

    try {
      setDeleting(true);

      // Deletar arquivo do storage
      if (!currentAvatarUrl.startsWith('http')) {
        const path = currentAvatarUrl.includes('/') 
          ? currentAvatarUrl.split('/').pop() 
          : currentAvatarUrl;
        if (path) {
          await supabase.storage
            .from('avatars')
            .remove([path]);
        }
      }

      // Atualizar perfil
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (error) throw error;

      onAvatarUpdate(null);

      toast({
        title: 'Foto removida',
        description: 'A foto do profissional foi removida com sucesso.',
      });
    } catch (error: any) {
      console.error('Erro ao remover foto:', error);
      toast({
        title: 'Erro ao remover foto',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="relative">
        <Avatar className={`${sizeClasses[size]} border-4 border-background shadow-lg`}>
          <AvatarImage src={getAvatarUrl(currentAvatarUrl) || undefined} alt={fullName} />
          <AvatarFallback className="bg-primary/10 text-primary text-lg">
            {getInitials() || <User className="h-6 w-6" />}
          </AvatarFallback>
        </Avatar>
        <div className="absolute bottom-0 right-0 p-0.5 bg-background rounded-full border-2 border-background shadow-lg">
          <Button
            type="button"
            size="icon"
            variant="default"
            className={`${buttonSizeClasses[size]} rounded-full`}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || deleting}
          >
            {uploading ? (
              <Upload className="h-3 w-3 animate-pulse" />
            ) : (
              <Camera className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || deleting}
        >
          <Upload className="mr-2 h-3 w-3" />
          {uploading ? 'Enviando...' : 'Alterar'}
        </Button>
        {currentAvatarUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={uploading || deleting}
          >
            <Trash2 className="mr-2 h-3 w-3" />
            {deleting ? 'Removendo...' : 'Remover'}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        JPG, PNG ou WEBP. Máximo 2MB.
      </p>
    </div>
  );
};
