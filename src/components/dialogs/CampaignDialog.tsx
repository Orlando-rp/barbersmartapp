import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CampaignForm, CampaignFormData } from "@/components/forms/CampaignForm";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface CampaignDialogProps {
  children: React.ReactNode;
  campaign?: any;
  onSuccess?: () => void;
}

export const CampaignDialog = ({ 
  children, 
  campaign,
  onSuccess 
}: CampaignDialogProps) => {
  const { barbershopId } = useAuth();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: CampaignFormData) => {
    if (!barbershopId) {
      toast.error("Erro de autenticação");
      return;
    }

    try {
      setIsLoading(true);

      const campaignData = {
        barbershop_id: barbershopId,
        name: data.name,
        description: data.description || null,
        type: data.type,
        status: data.active ? 'ativa' : 'pausada',
        config: {
          message_template: data.message_template,
          target_segment: data.target_segment,
          schedule_date: data.schedule_date || null,
        }
      };

      if (campaign) {
        // Atualizar campanha existente
        const { error } = await supabase
          .from('campaigns')
          .update(campaignData)
          .eq('id', campaign.id);

        if (error) throw error;
        toast.success("Campanha atualizada com sucesso!");
      } else {
        // Criar nova campanha
        const { error } = await supabase
          .from('campaigns')
          .insert([campaignData]);

        if (error) throw error;
        toast.success("Campanha criada com sucesso!");
      }

      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao salvar campanha:', error);
      toast.error(error.message || "Erro ao salvar campanha");
    } finally {
      setIsLoading(false);
    }
  };

  const initialData = campaign ? {
    name: campaign.name,
    description: campaign.description || "",
    type: campaign.type,
    message_template: campaign.config?.message_template || "",
    target_segment: campaign.config?.target_segment || "all",
    schedule_date: campaign.config?.schedule_date || "",
    active: campaign.status === 'ativa',
  } : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {campaign ? "Editar Campanha" : "Nova Campanha de Marketing"}
          </DialogTitle>
        </DialogHeader>
        <CampaignForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
};
