import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, User, Mail, Phone, MapPin, X, Tag, Bell, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { z } from "zod";
import { ClientAvatarUpload } from "@/components/profile/ClientAvatarUpload";
import { useSharedBarbershopId } from "@/hooks/useSharedBarbershopId";

interface ClientFormProps {
  onClose?: () => void;
  editingClient?: any;
}

interface NotificationTypes {
  appointment_created: boolean;
  appointment_updated: boolean;
  appointment_confirmed: boolean;
  appointment_cancelled: boolean;
  appointment_completed: boolean;
  appointment_reminder: boolean;
}

const defaultNotificationTypes: NotificationTypes = {
  appointment_created: true,
  appointment_updated: true,
  appointment_confirmed: true,
  appointment_cancelled: true,
  appointment_completed: true,
  appointment_reminder: true,
};

const clientSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().min(10, "Telefone deve ter no mínimo 10 caracteres").max(20),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export const ClientForm = ({ onClose, editingClient }: ClientFormProps) => {
  const [name, setName] = useState(editingClient?.name || "");
  const [preferredName, setPreferredName] = useState(editingClient?.preferred_name || "");
  const [email, setEmail] = useState(editingClient?.email || "");
  const [phone, setPhone] = useState(editingClient?.phone || "");
  const [address, setAddress] = useState(editingClient?.address || "");
  const [birthDate, setBirthDate] = useState<Date | undefined>(
    editingClient?.birth_date ? new Date(editingClient.birth_date) : undefined
  );
  const [notes, setNotes] = useState(editingClient?.notes || "");
  const [tags, setTags] = useState<string[]>(editingClient?.tags || []);
  const [newTag, setNewTag] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(editingClient?.avatar_url || null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  
  // Notification preferences
  const [notificationEnabled, setNotificationEnabled] = useState(
    editingClient?.notification_enabled ?? true
  );
  const [notificationTypes, setNotificationTypes] = useState<NotificationTypes>(
    editingClient?.notification_types || defaultNotificationTypes
  );
  
  const { toast } = useToast();
  // Usar matrizBarbershopId para associar cliente à matriz
  const { matrizBarbershopId } = useSharedBarbershopId();

  const addTag = () => {
    const trimmedTag = newTag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const toggleNotificationType = (type: keyof NotificationTypes) => {
    setNotificationTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    if (!matrizBarbershopId) {
      toast({
        title: "Erro",
        description: "Barbearia não encontrada. Por favor, faça login novamente.",
        variant: "destructive",
      });
      return;
    }

    try {
      const validatedData = clientSchema.parse({
        name,
        email: email || undefined,
        phone,
        address: address || undefined,
        notes: notes || undefined,
      });

      setLoading(true);

      // Cliente sempre associado à MATRIZ
      const clientData = {
        barbershop_id: matrizBarbershopId,
        name: validatedData.name,
        preferred_name: preferredName || null,
        email: validatedData.email || null,
        phone: validatedData.phone,
        birth_date: birthDate ? format(birthDate, "yyyy-MM-dd") : null,
        address: validatedData.address || null,
        notes: validatedData.notes || null,
        tags: tags.length > 0 ? tags : null,
        active: true,
        notification_enabled: notificationEnabled,
        notification_types: notificationTypes,
      };

      if (editingClient?.id) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id);

        if (error) throw error;

        toast({
          title: "Cliente Atualizado!",
          description: `${name} foi atualizado com sucesso.`,
        });
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([clientData]);

        if (error) throw error;

        toast({
          title: "Cliente Cadastrado!",
          description: `${name} foi cadastrado com sucesso.`,
        });
      }

      onClose?.();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const formattedErrors: any = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            formattedErrors[err.path[0]] = err.message;
          }
        });
        setErrors(formattedErrors);
      } else {
        console.error("Error saving client:", error);
        toast({
          title: "Erro ao salvar cliente",
          description: error.message || "Ocorreu um erro ao salvar o cliente.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        <h2 className="text-base sm:text-lg font-semibold">
          {editingClient ? "Editar Cliente" : "Novo Cliente"}
        </h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Avatar Upload - Only show when editing */}
        {editingClient?.id && (
          <div className="flex justify-center pb-3 sm:pb-4 border-b border-border">
            <ClientAvatarUpload
              clientId={editingClient.id}
              currentAvatarUrl={avatarUrl}
              clientName={name}
              onAvatarUpdate={setAvatarUrl}
              size="lg"
            />
          </div>
        )}

          {/* Basic Information */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Informações Básicas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="name" className="text-xs sm:text-sm">Nome Completo *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome completo do cliente"
                  className="text-sm"
                />
                {errors.name && (
                  <p className="text-xs sm:text-sm text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="preferredName" className="text-xs sm:text-sm">Como quer ser chamado</Label>
                <Input
                  id="preferredName"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder="Ex: João, Zé, Dr. Silva"
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Usado em notificações e mensagens
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="phone" className="text-xs sm:text-sm">Telefone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="pl-9 sm:pl-10 text-sm"
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs sm:text-sm text-destructive">{errors.phone}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="pl-9 sm:pl-10 text-sm"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs sm:text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">Data de Nascimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm",
                        !birthDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {birthDate ? format(birthDate, "dd/MM/yyyy") : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="start">
                    <Calendar
                      mode="single"
                      selected={birthDate}
                      onSelect={setBirthDate}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Endereço
            </h3>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="address" className="text-xs sm:text-sm">Endereço Completo</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, bairro, cidade..."
                  rows={2}
                  className="pl-9 sm:pl-10 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="notes" className="text-xs sm:text-sm">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preferências, histórico, observações especiais..."
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Tags
            </h3>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: vip, frequente"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-sm"
                />
                <Button type="button" variant="outline" onClick={addTag} size="sm">
                  Adicionar
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs sm:text-sm">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1.5 sm:ml-2 hover:text-destructive"
                      >
                        <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="space-y-3 sm:space-y-4 border-t pt-4">
            <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Preferências de Notificação
            </h3>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Receber Notificações via WhatsApp</Label>
                <p className="text-xs text-muted-foreground">
                  Ative para enviar mensagens automáticas
                </p>
              </div>
              <Switch
                checked={notificationEnabled}
                onCheckedChange={setNotificationEnabled}
              />
            </div>

            {notificationEnabled && (
              <>
                {/* Notification Types */}
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Tipos de Notificação</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2 p-2 rounded border">
                      <Checkbox
                        id="notification_created"
                        checked={notificationTypes.appointment_created}
                        onCheckedChange={() => toggleNotificationType('appointment_created')}
                      />
                      <Label htmlFor="notification_created" className="text-xs sm:text-sm cursor-pointer">
                        Confirmação de agendamento
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded border">
                      <Checkbox
                        id="notification_updated"
                        checked={notificationTypes.appointment_updated}
                        onCheckedChange={() => toggleNotificationType('appointment_updated')}
                      />
                      <Label htmlFor="notification_updated" className="text-xs sm:text-sm cursor-pointer">
                        Alteração de agendamento
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded border">
                      <Checkbox
                        id="notification_confirmed"
                        checked={notificationTypes.appointment_confirmed}
                        onCheckedChange={() => toggleNotificationType('appointment_confirmed')}
                      />
                      <Label htmlFor="notification_confirmed" className="text-xs sm:text-sm cursor-pointer">
                        Confirmado pelo barbeiro
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded border">
                      <Checkbox
                        id="notification_cancelled"
                        checked={notificationTypes.appointment_cancelled}
                        onCheckedChange={() => toggleNotificationType('appointment_cancelled')}
                      />
                      <Label htmlFor="notification_cancelled" className="text-xs sm:text-sm cursor-pointer">
                        Cancelamento
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded border">
                      <Checkbox
                        id="notification_completed"
                        checked={notificationTypes.appointment_completed}
                        onCheckedChange={() => toggleNotificationType('appointment_completed')}
                      />
                      <Label htmlFor="notification_completed" className="text-xs sm:text-sm cursor-pointer">
                        Pesquisa de satisfação
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded border">
                      <Checkbox
                        id="notification_reminder"
                        checked={notificationTypes.appointment_reminder}
                        onCheckedChange={() => toggleNotificationType('appointment_reminder')}
                      />
                      <Label htmlFor="notification_reminder" className="text-xs sm:text-sm cursor-pointer">
                        Lembrete de agendamento
                      </Label>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2 sm:pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" variant="premium" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Salvando..." : editingClient ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </div>
  );
};
