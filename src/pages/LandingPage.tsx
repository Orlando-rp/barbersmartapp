import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Calendar, 
  MessageSquare, 
  TrendingUp, 
  Users, 
  Smartphone, 
  Shield, 
  Zap, 
  BarChart3, 
  Clock, 
  Star,
  CheckCircle2,
  ArrowRight,
  Scissors,
  Building2,
  Bot,
  CreditCard
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Calendar,
      title: 'Agendamento Inteligente',
      description: 'Sistema de agendamento online 24/7 integrado com WhatsApp. Seus clientes agendam quando quiserem.'
    },
    {
      icon: MessageSquare,
      title: 'WhatsApp Automatizado',
      description: 'Confirmações, lembretes e mensagens de pós-atendimento automáticas via WhatsApp.'
    },
    {
      icon: Bot,
      title: 'Chatbot com IA',
      description: 'Atendimento automatizado para agendamentos e dúvidas. Funciona 24 horas por dia.'
    },
    {
      icon: TrendingUp,
      title: 'Gestão Financeira',
      description: 'Controle de receitas, despesas, comissões e relatórios completos do seu negócio.'
    },
    {
      icon: Building2,
      title: 'Multi-unidade',
      description: 'Gerencie múltiplas unidades em uma única plataforma com visão consolidada.'
    },
    {
      icon: Users,
      title: 'CRM de Clientes',
      description: 'Histórico completo, preferências e programa de fidelidade para cada cliente.'
    }
  ];

  const benefits = [
    'Reduza faltas em até 70% com lembretes automáticos',
    'Economize 10+ horas por semana em tarefas administrativas',
    'Aumente a retenção de clientes com programa de fidelidade',
    'Tenha controle total das comissões da equipe',
    'Relatórios detalhados para tomar decisões estratégicas',
    'Landing page profissional para sua barbearia'
  ];

  const plans = [
    {
      name: 'Básico',
      price: 'R$ 97',
      period: '/mês',
      description: 'Ideal para barbearias iniciando',
      features: [
        'Agendamento online',
        'Até 2 profissionais',
        'Notificações WhatsApp',
        'Gestão de clientes',
        'Relatórios básicos'
      ],
      popular: false
    },
    {
      name: 'Profissional',
      price: 'R$ 197',
      period: '/mês',
      description: 'Para barbearias em crescimento',
      features: [
        'Tudo do plano Básico',
        'Até 5 profissionais',
        'Chatbot com IA',
        'Gestão financeira completa',
        'Programa de fidelidade',
        'Marketing automatizado'
      ],
      popular: true
    },
    {
      name: 'Premium',
      price: 'R$ 397',
      period: '/mês',
      description: 'Para redes de barbearias',
      features: [
        'Tudo do plano Profissional',
        'Profissionais ilimitados',
        'Multi-unidade',
        'White label',
        'API de integração',
        'Suporte prioritário'
      ],
      popular: false
    }
  ];

  const faqs = [
    {
      question: 'Preciso ter conhecimento técnico para usar?',
      answer: 'Não! O BarberSmart foi desenvolvido para ser extremamente intuitivo. Qualquer pessoa consegue usar em poucos minutos, e oferecemos suporte completo para ajudar na configuração inicial.'
    },
    {
      question: 'Como funciona a integração com WhatsApp?',
      answer: 'Integramos diretamente com a API oficial do WhatsApp Business. Todas as mensagens são enviadas automaticamente: confirmações, lembretes, agradecimentos e mais.'
    },
    {
      question: 'Posso testar antes de assinar?',
      answer: 'Sim! Oferecemos 14 dias de teste grátis com acesso a todas as funcionalidades. Não precisa de cartão de crédito para começar.'
    },
    {
      question: 'Consigo migrar meus dados de outro sistema?',
      answer: 'Sim, nossa equipe ajuda na importação de dados de clientes, agendamentos e histórico de outros sistemas ou planilhas.'
    },
    {
      question: 'O sistema funciona offline?',
      answer: 'O BarberSmart é um sistema web otimizado que funciona em qualquer dispositivo. Algumas funcionalidades básicas funcionam offline e sincronizam quando a conexão é restabelecida.'
    }
  ];

  const stats = [
    { value: '500+', label: 'Barbearias' },
    { value: '50.000+', label: 'Agendamentos/mês' },
    { value: '98%', label: 'Satisfação' },
    { value: '-70%', label: 'Faltas' }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
              <Scissors className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="font-serif text-xl font-semibold">BarberSmart</span>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/auth')}
              className="hidden sm:flex"
            >
              Acessar Sistema
            </Button>
            <Button 
              onClick={() => navigate('/auth?tab=signup')}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Começar Grátis
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              Gestão inteligente para barbearias modernas
            </span>
            
            <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight mb-6">
              Transforme sua Barbearia com{' '}
              <span className="text-accent">Tecnologia</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Agendamento online, WhatsApp automatizado, gestão financeira e muito mais. 
              Tudo que você precisa para crescer seu negócio em uma única plataforma.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => navigate('/auth?tab=signup')}
                className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-8 h-14 shadow-gold"
              >
                Teste Grátis por 14 Dias
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => navigate('/auth')}
                className="text-lg px-8 h-14"
              >
                Já sou cliente
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              Sem necessidade de cartão de crédito
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-accent">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              Tudo que sua barbearia precisa
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Funcionalidades completas para automatizar e profissionalizar seu negócio
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="p-6 h-full hover:shadow-medium transition-all duration-300 border-border/50 bg-card/80">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
                Por que escolher o BarberSmart?
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Desenvolvido por quem entende de barbearias, para resolver os problemas reais do seu dia a dia.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2 className="h-6 w-6 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 p-8 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                  <div className="bg-card rounded-xl p-4 shadow-soft">
                    <Clock className="h-8 w-8 text-accent mb-2" />
                    <div className="text-2xl font-bold">10h+</div>
                    <div className="text-sm text-muted-foreground">Economizadas/semana</div>
                  </div>
                  <div className="bg-card rounded-xl p-4 shadow-soft">
                    <TrendingUp className="h-8 w-8 text-accent mb-2" />
                    <div className="text-2xl font-bold">+40%</div>
                    <div className="text-sm text-muted-foreground">Mais agendamentos</div>
                  </div>
                  <div className="bg-card rounded-xl p-4 shadow-soft">
                    <Star className="h-8 w-8 text-accent mb-2" />
                    <div className="text-2xl font-bold">4.9</div>
                    <div className="text-sm text-muted-foreground">Avaliação média</div>
                  </div>
                  <div className="bg-card rounded-xl p-4 shadow-soft">
                    <Shield className="h-8 w-8 text-accent mb-2" />
                    <div className="text-2xl font-bold">100%</div>
                    <div className="text-sm text-muted-foreground">Dados seguros</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 md:py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              Planos para cada fase do seu negócio
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Escolha o plano ideal e comece a transformar sua barbearia hoje
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className={`p-6 h-full relative ${plan.popular ? 'border-accent shadow-gold' : 'border-border/50'}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full">
                        Mais Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={`w-full ${plan.popular ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => navigate('/auth?tab=signup')}
                  >
                    Começar Agora
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-muted-foreground text-lg">
              Tire suas dúvidas sobre o BarberSmart
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card border border-border/50 rounded-lg px-6"
              >
                <AccordionTrigger className="text-left hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              Pronto para transformar sua barbearia?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
              Junte-se a centenas de barbearias que já estão crescendo com o BarberSmart. 
              Comece seu teste grátis hoje mesmo.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => navigate('/auth?tab=signup')}
                className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-8 h-14"
              >
                Começar Teste Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-lg px-8 h-14"
                onClick={() => window.open('https://wa.me/5511999999999?text=Olá! Gostaria de saber mais sobre o BarberSmart', '_blank')}
              >
                <MessageSquare className="mr-2 h-5 w-5" />
                Falar com Especialista
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Scissors className="h-4 w-4 text-accent-foreground" />
              </div>
              <span className="font-serif font-semibold">BarberSmart</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <button onClick={() => navigate('/privacy')} className="hover:text-foreground transition-colors">
                Privacidade
              </button>
              <button onClick={() => navigate('/terms')} className="hover:text-foreground transition-colors">
                Termos de Uso
              </button>
              <button onClick={() => navigate('/auth')} className="hover:text-foreground transition-colors">
                Login
              </button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} BarberSmart. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
