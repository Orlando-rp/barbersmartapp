import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  FileText, 
  Calendar, 
  Bell, 
  Gift, 
  Star,
  Clock,
  ThumbsUp,
  PartyPopper,
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  Loader2,
  Eye,
  Smartphone
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface MessageTemplate {
  id: string;
  name: string;
  category: 'confirmation' | 'reminder' | 'promotion' | 'feedback' | 'birthday' | 'general';
  message: string;
  variables: string[];
  is_default?: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  confirmation: <Calendar className="h-4 w-4" />,
  reminder: <Bell className="h-4 w-4" />,
  promotion: <Gift className="h-4 w-4" />,
  feedback: <Star className="h-4 w-4" />,
  birthday: <PartyPopper className="h-4 w-4" />,
  general: <MessageSquare className="h-4 w-4" />,
};

const defaultTemplates: MessageTemplate[] = [
  {
    id: 'default-confirmation',
    name: 'Confirmação de Agendamento',
    category: 'confirmation',
    message: `✅ *Agendamento Confirmado!*

Olá {nome}! Seu agendamento está confirmado.

📅 *Data:* {data}
🕐 *Horário:* {hora}
✂️ *Serviço:* {servico}
💈 *Profissional:* {profissional}

📍 Endereço: {endereco}

Até logo! 👋`,
    variables: ['nome', 'data', 'hora', 'servico', 'profissional', 'endereco'],
    is_default: true
  },
  {
    id: 'default-reminder-24h',
    name: 'Lembrete 24h antes',
    category: 'reminder',
    message: `🔔 *Lembrete de Agendamento*

Olá {nome}! Passando para lembrar do seu agendamento amanhã.

📅 *Data:* {data}
🕐 *Horário:* {hora}
✂️ *Serviço:* {servico}

Caso precise remarcar, entre em contato conosco.

Esperamos você! 😊`,
    variables: ['nome', 'data', 'hora', 'servico'],
    is_default: true
  },
  {
    id: 'default-feedback',
    name: 'Solicitação de Avaliação',
    category: 'feedback',
    message: `⭐ *Como foi sua experiência?*

Olá {nome}! Obrigado pela visita.

Gostaríamos de saber sua opinião sobre o atendimento. Sua avaliação é muito importante para nós!

Avalie de 1 a 5 estrelas respondendo esta mensagem.

Muito obrigado! 🙏`,
    variables: ['nome'],
    is_default: true
  },
  {
    id: 'default-birthday',
    name: 'Aniversário',
    category: 'birthday',
    message: `🎂 *Feliz Aniversário!*

Olá {nome}! A equipe da {barbearia} deseja um feliz aniversário! 🎉

Como presente, você ganhou *{desconto}% de desconto* no seu próximo serviço!

Válido até: {validade}

Venha comemorar conosco! 🎈`,
    variables: ['nome', 'barbearia', 'desconto', 'validade'],
    is_default: true
  },
  {
    id: 'default-promotion',
    name: 'Promoção',
    category: 'promotion',
    message: `🔥 *Promoção Especial!*

Olá {nome}!

{descricao_promocao}

🎁 *Desconto:* {desconto}%
📅 *Válido até:* {validade}

Agende já pelo nosso app ou responda esta mensagem!

💈 *{barbearia}*`,
    variables: ['nome', 'descricao_promocao', 'desconto', 'validade', 'barbearia'],
    is_default: true
  },
  {
    id: 'default-waitlist',
    name: 'Vaga Disponível (Lista de Espera)',
    category: 'general',
    message: `📢 *Boa notícia, {nome}!*

Uma vaga ficou disponível para o dia que você queria!

📅 *Data:* {data}
🕐 *Horário:* {hora}

Responda SIM para confirmar ou entre em contato para agendar.

⚡ Rápido! A vaga é limitada.`,
    variables: ['nome', 'data', 'hora'],
    is_default: true
  }
];

// Sample data for preview
const sampleData: Record<string, string> = {
  nome: 'João Silva',
  data: '15/01/2025',
  hora: '14:30',
  servico: 'Corte + Barba',
  profissional: 'Carlos',
  barbearia: 'Barbearia Premium',
  endereco: 'Rua das Flores, 123',
  desconto: '20',
  validade: '31/01/2025',
  descricao_promocao: 'Combo especial de verão com corte e barba!',
};

// Extract variables from message text
const extractVariables = (message: string): string[] => {
  const regex = /\{([^}]+)\}/g;
  const matches = message.matchAll(regex);
  const variables = new Set<string>();
  for (const match of matches) {
    variables.add(match[1]);
  }
  return Array.from(variables);
};

// Replace variables with sample data
const replaceVariablesWithSample = (message: string): string => {
  let result = message;
  Object.entries(sampleData).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  return result;
};

interface MessageTemplatesProps {
  onSelectTemplate: (template: MessageTemplate) => void;
  selectedTemplateId?: string;
}

export const MessageTemplates = ({ onSelectTemplate, selectedTemplateId }: MessageTemplatesProps) => {
  const { barbershopId } = useAuth();
  const [templates, setTemplates] = useState<MessageTemplate[]>(defaultTemplates);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);
  const [selectedForEdit, setSelectedForEdit] = useState<MessageTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<MessageTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'general' as MessageTemplate['category'],
    message: '',
  });

  const openPreview = (template: MessageTemplate) => {
    setPreviewTemplate(template);
    setPreviewDialogOpen(true);
  };

  useEffect(() => {
    if (barbershopId) {
      loadTemplates();
    }
  }, [barbershopId]);

  const loadTemplates = async () => {
    if (!barbershopId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('name');

      if (error) {
        // Table might not exist yet
        if (error.code !== 'PGRST204' && !error.message?.includes('message_templates')) {
          console.error('Error loading templates:', error);
        }
        setTemplates(defaultTemplates);
      } else {
        // Combine default templates with custom ones
        const customTemplates = (data || []).map(t => ({
          id: t.id,
          name: t.name,
          category: t.category,
          message: t.message,
          variables: t.variables || extractVariables(t.message),
          is_default: false,
        }));
        setTemplates([...defaultTemplates, ...customTemplates]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates(defaultTemplates);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setSelectedForEdit(null);
    setFormData({ name: '', category: 'general', message: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (template: MessageTemplate) => {
    setSelectedForEdit(template);
    setFormData({
      name: template.name,
      category: template.category,
      message: template.message,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!barbershopId || !formData.name.trim() || !formData.message.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      setSaving(true);
      const variables = extractVariables(formData.message);

      if (selectedForEdit && !selectedForEdit.is_default) {
        // Update existing
        const { error } = await supabase
          .from('message_templates')
          .update({
            name: formData.name,
            category: formData.category,
            message: formData.message,
            variables,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedForEdit.id);

        if (error) throw error;
        toast.success('Template atualizado');
      } else {
        // Create new
        const { error } = await supabase
          .from('message_templates')
          .insert({
            barbershop_id: barbershopId,
            name: formData.name,
            category: formData.category,
            message: formData.message,
            variables,
          });

        if (error) throw error;
        toast.success('Template criado');
      }

      setDialogOpen(false);
      loadTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete || templateToDelete.is_default) return;

    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', templateToDelete.id);

      if (error) throw error;
      toast.success('Template excluído');
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
      loadTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error(error.message || 'Erro ao excluir template');
    }
  };

  const getCategoryBadge = (category: MessageTemplate['category']) => {
    const styles: Record<typeof category, string> = {
      confirmation: 'bg-success/10 text-success',
      reminder: 'bg-warning/10 text-warning',
      promotion: 'bg-primary/10 text-primary',
      feedback: 'bg-purple-500/10 text-purple-500',
      birthday: 'bg-pink-500/10 text-pink-500',
      general: 'bg-muted text-muted-foreground'
    };

    const labels: Record<typeof category, string> = {
      confirmation: 'Confirmação',
      reminder: 'Lembrete',
      promotion: 'Promoção',
      feedback: 'Feedback',
      birthday: 'Aniversário',
      general: 'Geral'
    };

    return <Badge className={styles[category]}>{labels[category]}</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <FileText className="h-4 w-4 text-primary" />
                Templates de Mensagem
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Selecione ou crie templates
              </CardDescription>
            </div>
            <Button size="sm" onClick={openCreateDialog} className="w-full sm:w-auto text-xs sm:text-sm">
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
              Novo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[280px] sm:h-[320px] pr-2 sm:pr-4">
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`group relative p-2.5 sm:p-3 rounded-lg border transition-all hover:bg-accent/50 ${
                      selectedTemplateId === template.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <button
                      onClick={() => onSelectTemplate(template)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <span className="text-primary flex-shrink-0">{categoryIcons[template.category]}</span>
                          <span className="font-medium text-xs sm:text-sm truncate">{template.name}</span>
                          {template.is_default && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs hidden sm:inline-flex">Padrão</Badge>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {getCategoryBadge(template.category)}
                        </div>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-1.5 line-clamp-2">
                        {template.message.replace(/\*/g, '').substring(0, 60)}...
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5 sm:mt-2">
                        {template.variables.slice(0, 3).map((variable) => (
                          <span 
                            key={variable} 
                            className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 bg-muted rounded font-mono"
                          >
                            {`{${variable}}`}
                          </span>
                        ))}
                        {template.variables.length > 3 && (
                          <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 text-muted-foreground">
                            +{template.variables.length - 3}
                          </span>
                        )}
                      </div>
                    </button>
                    
                    {/* Preview/Edit/Delete buttons */}
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPreview(template);
                        }}
                        title="Visualizar preview"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {!template.is_default && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(template);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTemplateToDelete(template);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">
              {selectedForEdit ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Use variáveis como {'{nome}'}, {'{data}'}, {'{hora}'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Nome do Template</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Lembrete de Retorno"
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v as MessageTemplate['category'] })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmation">Confirmação</SelectItem>
                  <SelectItem value="reminder">Lembrete</SelectItem>
                  <SelectItem value="promotion">Promoção</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="birthday">Aniversário</SelectItem>
                  <SelectItem value="general">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Mensagem</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Olá {nome}! Seu agendamento..."
                rows={6}
                className="text-sm"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Variáveis: {'{nome}'}, {'{data}'}, {'{hora}'}, {'{servico}'}, {'{profissional}'}
              </p>
            </div>

            {formData.message && (
              <div className="space-y-2 sm:space-y-3">
                <div className="p-2 sm:p-3 rounded-lg bg-muted/50 border">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Variáveis detectadas:</p>
                  <div className="flex flex-wrap gap-1">
                    {extractVariables(formData.message).map((v) => (
                      <Badge key={v} variant="secondary" className="text-[10px] sm:text-xs font-mono">
                        {`{${v}}`}
                      </Badge>
                    ))}
                    {extractVariables(formData.message).length === 0 && (
                      <span className="text-[10px] sm:text-xs text-muted-foreground">Nenhuma variável</span>
                    )}
                  </div>
                </div>
                
                {/* Live Preview */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-primary/10 px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center gap-2 border-b">
                    <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    <span className="text-[10px] sm:text-xs font-medium">Preview</span>
                  </div>
                  <div className="bg-[#e5ddd5] p-3 sm:p-4">
                    <div className="max-w-[240px] sm:max-w-[280px] ml-auto bg-[#dcf8c6] rounded-lg p-2.5 sm:p-3 shadow-sm">
                      <p className="text-xs sm:text-sm whitespace-pre-wrap text-gray-800">
                        {replaceVariablesWithSample(formData.message)}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-gray-500 text-right mt-1">14:30 ✓✓</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="text-xs sm:text-sm">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="text-xs sm:text-sm">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="truncate">{previewTemplate?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Como a mensagem aparecerá
            </DialogDescription>
          </DialogHeader>
          
          {previewTemplate && (
            <div className="space-y-3 sm:space-y-4">
              {/* WhatsApp style preview */}
              <div className="border rounded-xl overflow-hidden shadow-lg">
                {/* Phone header */}
                <div className="bg-[#075e54] px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-gray-600 text-sm sm:text-lg font-semibold">B</span>
                  </div>
                  <div className="text-white">
                    <p className="font-semibold text-xs sm:text-sm">Barbearia Premium</p>
                    <p className="text-[10px] sm:text-xs text-green-200">online</p>
                  </div>
                </div>
                
                {/* Chat area */}
                <div className="bg-[#e5ddd5] p-3 sm:p-4 min-h-[150px] sm:min-h-[200px]" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cfc4' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}>
                  <div className="max-w-[90%] sm:max-w-[85%] ml-auto bg-[#dcf8c6] rounded-lg p-2.5 sm:p-3 shadow-sm">
                    <p className="text-xs sm:text-sm whitespace-pre-wrap text-gray-800 leading-relaxed">
                      {replaceVariablesWithSample(previewTemplate.message)}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-gray-500 text-right mt-1">14:30 ✓✓</p>
                  </div>
                </div>
              </div>
              
              {/* Variables used */}
              <div className="bg-muted/50 rounded-lg p-2.5 sm:p-3 border">
                <p className="text-[10px] sm:text-xs font-medium mb-1.5 sm:mb-2">Variáveis (dados exemplo):</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                  {previewTemplate.variables.map((v) => (
                    <div key={v} className="flex items-center gap-1 sm:gap-2">
                      <code className="bg-background px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px]">{`{${v}}`}</code>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium truncate">{sampleData[v] || '...'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)} className="text-xs sm:text-sm">
              Fechar
            </Button>
            <Button onClick={() => {
              if (previewTemplate) {
                onSelectTemplate(previewTemplate);
                setPreviewDialogOpen(false);
              }
            }} className="text-xs sm:text-sm">
              Usar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template &quot;{templateToDelete?.name}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export { defaultTemplates };
