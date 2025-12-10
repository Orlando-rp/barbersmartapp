import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Edit, 
  Star, 
  Loader2,
  Upload,
  GripVertical,
  X
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";

interface PortfolioPhoto {
  id: string;
  barbershop_id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  category: string | null;
  staff_id: string | null;
  is_featured: boolean;
  display_order: number;
  active: boolean;
  created_at: string;
}

const categories = [
  { value: "corte", label: "Cortes" },
  { value: "barba", label: "Barbas" },
  { value: "combo", label: "Combos" },
  { value: "coloracao", label: "Coloração" },
  { value: "desenho", label: "Desenhos" },
  { value: "outros", label: "Outros" },
];

const PortfolioGalleryManager = () => {
  const { selectedBarbershopId } = useAuth();
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PortfolioPhoto | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    is_featured: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (selectedBarbershopId) {
      fetchPhotos();
    }
  }, [selectedBarbershopId]);

  const fetchPhotos = async () => {
    if (!selectedBarbershopId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('portfolio_photos')
        .select('*')
        .eq('barbershop_id', selectedBarbershopId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Erro ao carregar portfolio:', error);
      toast.error('Erro ao carregar fotos do portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedBarbershopId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('portfolio')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      return null;
    }
  };

  const handleSave = async () => {
    if (!selectedBarbershopId) return;

    setUploading(true);
    try {
      let imageUrl = selectedPhoto?.image_url;

      // Upload new image if selected
      if (selectedFile) {
        const uploadedUrl = await uploadImage(selectedFile);
        if (!uploadedUrl) {
          toast.error('Erro ao fazer upload da imagem');
          return;
        }
        imageUrl = uploadedUrl;
      }

      if (!imageUrl && !selectedPhoto) {
        toast.error('Selecione uma imagem');
        return;
      }

      const photoData = {
        barbershop_id: selectedBarbershopId,
        title: formData.title || null,
        description: formData.description || null,
        category: formData.category || null,
        is_featured: formData.is_featured,
        image_url: imageUrl!,
        display_order: selectedPhoto?.display_order ?? photos.length,
      };

      if (selectedPhoto) {
        // Update
        const { error } = await supabase
          .from('portfolio_photos')
          .update(photoData)
          .eq('id', selectedPhoto.id);

        if (error) throw error;
        toast.success('Foto atualizada com sucesso!');
      } else {
        // Create
        const { error } = await supabase
          .from('portfolio_photos')
          .insert(photoData);

        if (error) throw error;
        toast.success('Foto adicionada ao portfolio!');
      }

      setDialogOpen(false);
      resetForm();
      fetchPhotos();
    } catch (error: any) {
      console.error('Erro ao salvar foto:', error);
      toast.error(error.message || 'Erro ao salvar foto');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPhoto) return;

    try {
      // Delete from storage
      const urlParts = selectedPhoto.image_url.split('/portfolio/');
      if (urlParts.length > 1) {
        await supabase.storage.from('portfolio').remove([urlParts[1]]);
      }

      // Delete from database
      const { error } = await supabase
        .from('portfolio_photos')
        .delete()
        .eq('id', selectedPhoto.id);

      if (error) throw error;

      toast.success('Foto removida do portfolio');
      setDeleteDialogOpen(false);
      setSelectedPhoto(null);
      fetchPhotos();
    } catch (error: any) {
      console.error('Erro ao deletar foto:', error);
      toast.error(error.message || 'Erro ao remover foto');
    }
  };

  const toggleFeatured = async (photo: PortfolioPhoto) => {
    try {
      const { error } = await supabase
        .from('portfolio_photos')
        .update({ is_featured: !photo.is_featured })
        .eq('id', photo.id);

      if (error) throw error;
      
      setPhotos(photos.map(p => 
        p.id === photo.id ? { ...p, is_featured: !p.is_featured } : p
      ));
      toast.success(photo.is_featured ? 'Removido dos destaques' : 'Adicionado aos destaques');
    } catch (error) {
      console.error('Erro ao atualizar destaque:', error);
      toast.error('Erro ao atualizar');
    }
  };

  const toggleActive = async (photo: PortfolioPhoto) => {
    try {
      const { error } = await supabase
        .from('portfolio_photos')
        .update({ active: !photo.active })
        .eq('id', photo.id);

      if (error) throw error;
      
      setPhotos(photos.map(p => 
        p.id === photo.id ? { ...p, active: !p.active } : p
      ));
      toast.success(photo.active ? 'Foto ocultada' : 'Foto ativada');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar');
    }
  };

  const openEditDialog = (photo: PortfolioPhoto) => {
    setSelectedPhoto(photo);
    setFormData({
      title: photo.title || "",
      description: photo.description || "",
      category: photo.category || "",
      is_featured: photo.is_featured,
    });
    setPreviewUrl(photo.image_url);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", category: "", is_featured: false });
    setSelectedPhoto(null);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const openNewDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Galeria / Portfolio
              </CardTitle>
              <CardDescription>
                Adicione fotos dos seus trabalhos para exibir na landing page
              </CardDescription>
            </div>
            <Button onClick={openNewDialog} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Foto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhuma foto no portfolio ainda
              </p>
              <Button onClick={openNewDialog} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Adicionar Primeira Foto
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className={`relative group rounded-lg overflow-hidden border ${
                    !photo.active ? 'opacity-50' : ''
                  }`}
                >
                  <img
                    src={photo.image_url}
                    alt={photo.title || 'Portfolio'}
                    className="w-full aspect-square object-cover"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                    <div className="flex justify-between items-start">
                      {photo.is_featured && (
                        <Badge className="bg-yellow-500">
                          <Star className="h-3 w-3 mr-1" />
                          Destaque
                        </Badge>
                      )}
                      {photo.category && (
                        <Badge variant="secondary" className="text-xs">
                          {categories.find(c => c.value === photo.category)?.label || photo.category}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex justify-center gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => toggleFeatured(photo)}
                        title={photo.is_featured ? 'Remover destaque' : 'Destacar'}
                      >
                        <Star className={`h-4 w-4 ${photo.is_featured ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => openEditDialog(photo)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => {
                          setSelectedPhoto(photo);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Title overlay */}
                  {photo.title && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-white text-sm font-medium truncate">{photo.title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          {photos.length > 0 && (
            <div className="flex gap-4 mt-4 pt-4 border-t text-sm text-muted-foreground">
              <span>{photos.length} fotos no total</span>
              <span>{photos.filter(p => p.is_featured).length} em destaque</span>
              <span>{photos.filter(p => p.active).length} ativas</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedPhoto ? 'Editar Foto' : 'Adicionar Foto'}
            </DialogTitle>
            <DialogDescription>
              {selectedPhoto ? 'Atualize as informações da foto' : 'Adicione uma nova foto ao seu portfolio'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image Upload/Preview */}
            <div className="space-y-2">
              <Label>Imagem</Label>
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full aspect-video object-cover rounded-lg"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setPreviewUrl(selectedPhoto?.image_url || null);
                      setSelectedFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Clique para selecionar uma imagem
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    JPG, PNG ou WebP (máx. 5MB)
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              )}
              {!previewUrl && (
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="photo-input"
                />
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título (opcional)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Corte degradê"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o trabalho realizado"
                rows={2}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-10 px-3 rounded-md border bg-background"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Featured */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Foto em Destaque</Label>
                <p className="text-xs text-muted-foreground">
                  Fotos em destaque aparecem primeiro na galeria
                </p>
              </div>
              <Switch
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={uploading || (!previewUrl && !selectedPhoto)}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover foto do portfolio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A foto será permanentemente removida do portfolio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PortfolioGalleryManager;
