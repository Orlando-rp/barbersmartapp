import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Calendar, 
  Bell, 
  Gift, 
  Star,
  Clock,
  ThumbsUp,
  PartyPopper
} from "lucide-react";

export interface MessageTemplate {
  id: string;
  name: string;
  category: 'confirmation' | 'reminder' | 'promotion' | 'feedback' | 'birthday' | 'general';
  icon: React.ReactNode;
  message: string;
  variables: string[];
}

const defaultTemplates: MessageTemplate[] = [
  {
    id: 'confirmation',
    name: 'Confirmação de Agendamento',
    category: 'confirmation',
    icon: <Calendar className="h-4 w-4" />,
    message: `✅ *Agendamento Confirmado!*

Olá {nome}! Seu agendamento está confirmado.

📅 *Data:* {data}
🕐 *Horário:* {hora}
✂️ *Serviço:* {servico}
💈 *Profissional:* {profissional}

📍 Endereço: {endereco}

Até logo! 👋`,
    variables: ['nome', 'data', 'hora', 'servico', 'profissional', 'endereco']
  },
  {
    id: 'reminder-24h',
    name: 'Lembrete 24h antes',
    category: 'reminder',
    icon: <Bell className="h-4 w-4" />,
    message: `🔔 *Lembrete de Agendamento*

Olá {nome}! Passando para lembrar do seu agendamento amanhã.

📅 *Data:* {data}
🕐 *Horário:* {hora}
✂️ *Serviço:* {servico}

Caso precise remarcar, entre em contato conosco.

Esperamos você! 😊`,
    variables: ['nome', 'data', 'hora', 'servico']
  },
  {
    id: 'reminder-1h',
    name: 'Lembrete 1h antes',
    category: 'reminder',
    icon: <Clock className="h-4 w-4" />,
    message: `⏰ *Falta 1 hora!*

Olá {nome}! Seu horário está chegando.

🕐 *Horário:* {hora}
✂️ *Serviço:* {servico}

Estamos te esperando! 💈`,
    variables: ['nome', 'hora', 'servico']
  },
  {
    id: 'feedback',
    name: 'Solicitação de Avaliação',
    category: 'feedback',
    icon: <Star className="h-4 w-4" />,
    message: `⭐ *Como foi sua experiência?*

Olá {nome}! Obrigado pela visita.

Gostaríamos de saber sua opinião sobre o atendimento. Sua avaliação é muito importante para nós!

Avalie de 1 a 5 estrelas respondendo esta mensagem.

Muito obrigado! 🙏`,
    variables: ['nome']
  },
  {
    id: 'thanks',
    name: 'Agradecimento',
    category: 'general',
    icon: <ThumbsUp className="h-4 w-4" />,
    message: `🙏 *Obrigado pela visita!*

Olá {nome}! Foi um prazer atendê-lo hoje.

Esperamos que tenha gostado! Volte sempre. 😊

💈 *{barbearia}*`,
    variables: ['nome', 'barbearia']
  },
  {
    id: 'birthday',
    name: 'Aniversário',
    category: 'birthday',
    icon: <PartyPopper className="h-4 w-4" />,
    message: `🎂 *Feliz Aniversário!*

Olá {nome}! A equipe da {barbearia} deseja um feliz aniversário! 🎉

Como presente, você ganhou *{desconto}% de desconto* no seu próximo serviço!

Válido até: {validade}

Venha comemorar conosco! 🎈`,
    variables: ['nome', 'barbearia', 'desconto', 'validade']
  },
  {
    id: 'promotion',
    name: 'Promoção',
    category: 'promotion',
    icon: <Gift className="h-4 w-4" />,
    message: `🔥 *Promoção Especial!*

Olá {nome}!

{descricao_promocao}

🎁 *Desconto:* {desconto}%
📅 *Válido até:* {validade}

Agende já pelo nosso app ou responda esta mensagem!

💈 *{barbearia}*`,
    variables: ['nome', 'descricao_promocao', 'desconto', 'validade', 'barbearia']
  },
  {
    id: 'waitlist',
    name: 'Vaga Disponível (Lista de Espera)',
    category: 'general',
    icon: <Calendar className="h-4 w-4" />,
    message: `📢 *Boa notícia, {nome}!*

Uma vaga ficou disponível para o dia que você queria!

📅 *Data:* {data}
🕐 *Horário:* {hora}

Responda SIM para confirmar ou entre em contato para agendar.

⚡ Rápido! A vaga é limitada.`,
    variables: ['nome', 'data', 'hora']
  }
];

interface MessageTemplatesProps {
  onSelectTemplate: (template: MessageTemplate) => void;
  selectedTemplateId?: string;
}

export const MessageTemplates = ({ onSelectTemplate, selectedTemplateId }: MessageTemplatesProps) => {
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" />
          Templates de Mensagem
        </CardTitle>
        <CardDescription>
          Selecione um template para preencher a mensagem automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-2">
            {defaultTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className={`w-full text-left p-3 rounded-lg border transition-all hover:bg-accent/50 ${
                  selectedTemplateId === template.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-primary">{template.icon}</span>
                    <span className="font-medium text-sm">{template.name}</span>
                  </div>
                  {getCategoryBadge(template.category)}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                  {template.message.replace(/\*/g, '').substring(0, 80)}...
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {template.variables.slice(0, 4).map((variable) => (
                    <span 
                      key={variable} 
                      className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono"
                    >
                      {`{${variable}}`}
                    </span>
                  ))}
                  {template.variables.length > 4 && (
                    <span className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                      +{template.variables.length - 4} mais
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export { defaultTemplates };
