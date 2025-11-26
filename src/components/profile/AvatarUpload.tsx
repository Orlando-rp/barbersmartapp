import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Trash2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  onAvatarUpdate: (url: string) => void;
}

export const AvatarUpload = ({ currentAvatarUrl, onAvatarUpdate }: AvatarUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAvatarUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);
    
    return data.publicUrl;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!user) {
        toast({
          title: 'Erro',
          description: 'Usuário não autenticado',
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
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/').pop();
        if (oldPath && !oldPath.startsWith('http')) {
          await supabase.storage
            .from('avatars')
            .remove([oldPath]);
        }
      }

      // Upload novo arquivo
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Date.now()}.${fileExt}`;

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
        .eq('id', user.id);

      if (updateError) throw updateError;

      const publicUrl = getAvatarUrl(filePath);
      if (publicUrl) {
        onAvatarUpdate(publicUrl);
      }

      toast({
        title: 'Foto atualizada!',
        description: 'Sua foto de perfil foi atualizada com sucesso.',
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
    if (!user || !currentAvatarUrl) return;

    try {
      setDeleting(true);

      // Deletar arquivo do storage
      const path = currentAvatarUrl.split('/').pop();
      if (path && !path.startsWith('http')) {
        await supabase.storage
          .from('avatars')
          .remove([path]);
      }

      // Atualizar perfil
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (error) throw error;

      onAvatarUpdate('');

      toast({
        title: 'Foto removida',
        description: 'Sua foto de perfil foi removida com sucesso.',
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

  const getInitials = () => {
    if (!user?.email) return '??';
    return user.email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
          <AvatarImage src={getAvatarUrl(currentAvatarUrl) || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-3xl">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        <div className="absolute bottom-0 right-0 p-1 bg-background rounded-full border-2 border-background shadow-lg">
          <Button
            size="icon"
            variant="default"
            className="h-10 w-10 rounded-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || deleting}
          >
            {uploading ? (
              <Upload className="h-4 w-4 animate-pulse" />
            ) : (
              <Camera className="h-4 w-4" />
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
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || deleting}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? 'Enviando...' : 'Alterar Foto'}
        </Button>
        {currentAvatarUrl && (
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={uploading || deleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
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
