import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";

// Parallax Background Component
const ParallaxBackground = ({ 
  imageUrl, 
  speed = 0.3,
  className = "" 
}: { 
  imageUrl: string; 
  speed?: number;
  className?: string;
}) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], ["0%", `${speed * 100}%`]);
  
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <motion.div 
        className={`absolute inset-0 bg-cover bg-center scale-110 ${className}`}
        style={{ 
          backgroundImage: `url(${imageUrl})`,
          y 
        }}
      />
    </div>
  );
};
import { 
  Calendar, 
  MessageSquare, 
  TrendingUp, 
  Users, 
  Scissors,
  Clock, 
  Bell, 
  BarChart3, 
  Shield, 
  Smartphone,
  Check,
  Star,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Zap,
  Building2,
  CreditCard,
  Puzzle,
  Menu,
  X
} from "lucide-react";
import logoDark from "@/assets/logo-dark.png";
import logoIcon from "@/assets/logo-icon.png";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { PackageComparison } from "@/components/pricing/PackageComparison";
import { ModularPlanBuilder } from "@/components/pricing/ModularPlanBuilder";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Animated counter component
const AnimatedCounter = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return <span ref={ref}>{count.toLocaleString('pt-BR')}{suffix}</span>;
};

// Bento Grid Feature Card
const BentoCard = ({ 
  icon: Icon, 
  title, 
  description, 
  className = "",
  delay = 0 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  className?: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className={`group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-500 hover:border-amber-500/30 hover:shadow-[0_0_40px_rgba(212,168,83,0.15)] ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="relative z-10">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/25 group-hover:shadow-amber-500/40 transition-shadow duration-500">
        <Icon className="w-6 h-6 text-black" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-white/60 text-sm leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

// Timeline Step Component
const TimelineStep = ({ 
  number, 
  title, 
  description, 
  delay 
}: { 
  number: number; 
  title: string; 
  description: string; 
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay }}
    className="flex flex-col items-center text-center"
  >
    <div className="relative mb-6">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-2xl font-bold text-black shadow-lg shadow-amber-500/30">
        {number}
      </div>
      <div className="absolute -inset-2 rounded-full bg-amber-500/20 animate-pulse" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
    <p className="text-white/60 max-w-xs">{description}</p>
  </motion.div>
);

// Pricing Card Component
const PricingCard = ({
  name,
  price,
  description,
  features,
  popular = false,
  delay = 0,
  onSelect
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
  delay?: number;
  onSelect: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className={`relative rounded-2xl p-8 ${
      popular 
        ? 'bg-gradient-to-b from-amber-500/20 to-transparent border-2 border-amber-500/50 shadow-[0_0_60px_rgba(212,168,83,0.2)]' 
        : 'bg-white/5 border border-white/10'
    } backdrop-blur-xl`}
  >
    {popular && (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-black text-sm font-semibold">
        Mais Popular
      </div>
    )}
    <div className="text-center mb-6">
      <h3 className="text-xl font-semibold text-white mb-2">{name}</h3>
      <div className="flex items-baseline justify-center gap-1 mb-2">
        <span className="text-4xl font-bold text-white">{price}</span>
        <span className="text-white/60">/mês</span>
      </div>
      <p className="text-white/60 text-sm">{description}</p>
    </div>
    <ul className="space-y-3 mb-8">
      {features.map((feature, index) => (
        <li key={index} className="flex items-start gap-3 text-white/80">
          <Check className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <span className="text-sm">{feature}</span>
        </li>
      ))}
    </ul>
    <Button 
      onClick={onSelect}
      className={`w-full ${
        popular 
          ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold' 
          : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
      }`}
    >
      Começar Agora
    </Button>
  </motion.div>
);

// WhatsApp Message Bubble
const WhatsAppBubble = ({ 
  message, 
  isUser = false, 
  delay 
}: { 
  message: string; 
  isUser?: boolean; 
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, x: isUser ? 20 : -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay }}
    className={`max-w-[80%] p-3 rounded-2xl text-sm ${
      isUser 
        ? 'bg-emerald-600 text-white ml-auto rounded-br-md' 
        : 'bg-white/10 text-white/90 rounded-bl-md'
    }`}
  >
    {message}
  </motion.div>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [showBuilder, setShowBuilder] = useState(false);

  const faqs = [
    {
      question: "Quanto tempo leva para configurar?",
      answer: "Em menos de 10 minutos você tem sua barbearia configurada e pronta para receber agendamentos. Nosso assistente de configuração guia você em cada passo."
    },
    {
      question: "Preciso ter conhecimento técnico?",
      answer: "Não! O BarberSmart foi criado para ser simples e intuitivo. Se você sabe usar WhatsApp, sabe usar nosso sistema."
    },
    {
      question: "Como funciona o chatbot do WhatsApp?",
      answer: "Nosso chatbot com IA responde automaticamente as mensagens dos clientes, agenda horários, envia lembretes e confirmações. Tudo sem você precisar fazer nada."
    },
    {
      question: "Posso cancelar a qualquer momento?",
      answer: "Sim! Não há fidelidade ou multa. Você pode cancelar sua assinatura a qualquer momento diretamente no sistema."
    },
    {
      question: "Funciona para redes com várias unidades?",
      answer: "Sim! Temos planos específicos para redes de barbearias com gestão centralizada, relatórios consolidados e controle de múltiplas unidades."
    }
  ];

  const plans = [
    {
      name: "Essencial",
      price: billingPeriod === 'monthly' ? "R$ 49,90" : "R$ 39,90",
      description: "Para barbearias pequenas",
      features: [
        "Até 3 profissionais",
        "Agendamento online",
        "Notificações WhatsApp",
        "Gestão de clientes",
        "Relatórios básicos"
      ]
    },
    {
      name: "Profissional",
      price: billingPeriod === 'monthly' ? "R$ 97,90" : "R$ 78,30",
      description: "Para barbearias em crescimento",
      features: [
        "Até 8 profissionais",
        "Chatbot IA WhatsApp",
        "Gestão financeira completa",
        "Campanhas de marketing",
        "Relatórios avançados",
        "Comissões automáticas"
      ],
      popular: true
    },
    {
      name: "Completo",
      price: billingPeriod === 'monthly' ? "R$ 197,90" : "R$ 158,30",
      description: "Tudo que você precisa",
      features: [
        "Profissionais ilimitados",
        "Múltiplas unidades",
        "Programa de fidelidade",
        "Análises preditivas",
        "Suporte prioritário",
        "Todos os recursos"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-[150px]" />
      </div>

      {/* Navbar */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 px-2 sm:px-4 py-2 sm:py-4"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/10 px-3 sm:px-6 py-2 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src={logoDark} 
              alt="Barber Smart" 
              className="h-8 sm:h-10 w-auto object-contain hidden sm:block"
            />
            <img 
              src={logoIcon} 
              alt="Barber Smart" 
              className="h-8 w-auto object-contain sm:hidden"
            />
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-white/70 hover:text-white transition-colors text-sm"
            >
              Recursos
            </button>
            <button 
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-white/70 hover:text-white transition-colors text-sm"
            >
              Como Funciona
            </button>
            <button 
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-white/70 hover:text-white transition-colors text-sm"
            >
              Planos
            </button>
            <button 
              onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-white/70 hover:text-white transition-colors text-sm"
            >
              FAQ
            </button>
          </div>
          
          {/* Desktop buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button 
              variant="ghost" 
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => navigate('/auth')}
            >
              Entrar
            </Button>
            <Button 
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
              onClick={() => navigate('/auth?tab=signup')}
            >
              Começar Grátis
            </Button>
          </div>

          {/* Mobile menu */}
          <div className="flex md:hidden items-center gap-2">
            <Button 
              size="sm"
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold text-xs px-3"
              onClick={() => navigate('/auth?tab=signup')}
            >
              Começar
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[#0a0a0a] border-white/10 w-72">
                <div className="flex flex-col gap-6 mt-8">
                  <img 
                    src={logoDark} 
                    alt="Barber Smart" 
                    className="h-10 w-auto object-contain"
                  />
                  <nav className="flex flex-col gap-4">
                    <SheetClose asChild>
                      <button 
                        onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                        className="text-white/70 hover:text-white transition-colors text-left py-2 border-b border-white/10"
                      >
                        Recursos
                      </button>
                    </SheetClose>
                    <SheetClose asChild>
                      <button 
                        onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                        className="text-white/70 hover:text-white transition-colors text-left py-2 border-b border-white/10"
                      >
                        Como Funciona
                      </button>
                    </SheetClose>
                    <SheetClose asChild>
                      <button 
                        onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                        className="text-white/70 hover:text-white transition-colors text-left py-2 border-b border-white/10"
                      >
                        Planos
                      </button>
                    </SheetClose>
                    <SheetClose asChild>
                      <button 
                        onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
                        className="text-white/70 hover:text-white transition-colors text-left py-2 border-b border-white/10"
                      >
                        FAQ
                      </button>
                    </SheetClose>
                  </nav>
                  <div className="flex flex-col gap-3 mt-4">
                    <SheetClose asChild>
                      <Button 
                        variant="outline" 
                        className="w-full border-white/20 text-white hover:bg-white/10"
                        onClick={() => navigate('/auth')}
                      >
                        Entrar
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button 
                        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
                        onClick={() => navigate('/auth?tab=signup')}
                      >
                        Começar Grátis
                      </Button>
                    </SheetClose>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 min-h-screen flex items-center overflow-hidden">
        {/* Parallax Background Image */}
        <ParallaxBackground imageUrl="/images/barbershop-hero.jpg" speed={0.2} />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/75" />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]/90" />
        
        <div className="max-w-7xl mx-auto relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs sm:text-sm font-medium mb-4 sm:mb-6"
              >
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                Inteligência Artificial Integrada
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-4 sm:mb-6 font-display"
              >
                Sua Barbearia no{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600">
                  Piloto Automático
                </span>
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-base sm:text-lg md:text-xl text-white/60 max-w-xl mx-auto lg:mx-0 mb-6 sm:mb-8"
              >
                Agendamento inteligente, WhatsApp automatizado e gestão completa. 
                Enquanto você foca nos cortes, a gente cuida do resto.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12 justify-center lg:justify-start"
              >
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300"
                  onClick={() => navigate('/auth?tab=signup')}
                >
                  Começar Grátis
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 rounded-xl bg-white/5 backdrop-blur"
                  onClick={() => navigate('/auth')}
                >
                  Acessar Sistema
                </Button>
              </motion.div>
              
              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="grid grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
              >
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                    <AnimatedCounter value={500} suffix="+" />
                  </div>
                  <div className="text-white/50 text-xs sm:text-sm mt-1">Barbearias</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                    <AnimatedCounter value={50} suffix="k+" />
                  </div>
                  <div className="text-white/50 text-xs sm:text-sm mt-1">Agendamentos</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                    <AnimatedCounter value={98} suffix="%" />
                  </div>
                  <div className="text-white/50 text-xs sm:text-sm mt-1">Satisfação</div>
                </div>
              </motion.div>
            </div>
            
            {/* Hero Visual - Animated Dashboard Demo */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative hidden lg:block"
            >
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-amber-600/20 rounded-3xl blur-3xl" />
                
                {/* Dashboard mockup with animations */}
                <div className="relative bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 p-5 shadow-2xl overflow-hidden">
                  {/* Browser dots */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <div className="ml-4 flex-1 h-6 bg-white/5 rounded-lg flex items-center px-3">
                      <span className="text-[10px] text-white/40">barbersmart.app/dashboard</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Header with animated notification */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                          <Scissors className="w-4 h-4 text-black" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">Barbearia Classic</div>
                          <div className="text-[10px] text-white/50">Bem-vindo, Carlos!</div>
                        </div>
                      </div>
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        className="relative"
                      >
                        <Bell className="w-5 h-5 text-white/60" />
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full" />
                      </motion.div>
                    </div>
                    
                    {/* Animated Stats row */}
                    <div className="grid grid-cols-3 gap-2">
                      <motion.div 
                        className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-xl p-3 border border-amber-500/20"
                        animate={{ opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <div className="text-[10px] text-white/60 mb-1">Hoje</div>
                        <div className="text-lg font-bold text-amber-500">12</div>
                        <div className="text-[10px] text-white/50">agendamentos</div>
                      </motion.div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <div className="text-[10px] text-white/60 mb-1">Semana</div>
                        <div className="text-lg font-bold text-white">R$ 4.850</div>
                        <div className="text-[10px] text-emerald-400">+18% ↑</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <div className="text-[10px] text-white/60 mb-1">Taxa</div>
                        <div className="text-lg font-bold text-white">94%</div>
                        <div className="text-[10px] text-white/50">presença</div>
                      </div>
                    </div>
                    
                    {/* Animated appointments list */}
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium text-white">Próximos Agendamentos</div>
                        <div className="text-[10px] text-amber-500">Ver todos</div>
                      </div>
                      <div className="space-y-2">
                        {[
                          { name: "João Silva", service: "Corte + Barba", time: "09:00", status: "now" },
                          { name: "Pedro Santos", service: "Corte Degradê", time: "09:45", status: "next" },
                          { name: "Lucas Oliveira", service: "Barba", time: "10:15", status: "upcoming" }
                        ].map((apt, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1 + i * 0.3, duration: 0.4 }}
                            className={`flex items-center justify-between p-2 rounded-lg ${
                              apt.status === 'now' 
                                ? 'bg-amber-500/20 border border-amber-500/30' 
                                : 'bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center text-[10px] font-medium">
                                {apt.name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-[11px] font-medium text-white">{apt.name}</div>
                                <div className="text-[9px] text-white/50">{apt.service}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-[11px] font-medium ${apt.status === 'now' ? 'text-amber-500' : 'text-white/70'}`}>
                                {apt.time}
                              </div>
                              {apt.status === 'now' && (
                                <motion.div 
                                  animate={{ opacity: [1, 0.5, 1] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                  className="text-[9px] text-amber-500"
                                >
                                  Agora
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Mini calendar with animated highlight */}
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <div className="text-xs font-medium text-white mb-2">Dezembro 2024</div>
                      <div className="grid grid-cols-7 gap-1">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                          <div key={i} className="text-[8px] text-white/40 text-center">{day}</div>
                        ))}
                        {Array.from({ length: 31 }).map((_, i) => (
                          <motion.div 
                            key={i} 
                            className={`h-5 rounded text-[9px] flex items-center justify-center ${
                              i === 14 
                                ? 'bg-amber-500 text-black font-bold' 
                                : [8, 10, 15, 17, 22, 24].includes(i)
                                  ? 'bg-amber-500/30 text-white/80'
                                  : 'bg-white/5 text-white/40'
                            }`}
                            animate={i === 14 ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            {i + 1}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating WhatsApp notification */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ delay: 2, duration: 0.5 }}
                  className="absolute -top-4 -right-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-3 shadow-lg shadow-emerald-500/30"
                >
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="w-5 h-5 text-white" />
                    <div className="text-[10px] text-white font-medium">Nova mensagem!</div>
                  </motion.div>
                </motion.div>
                
                {/* Floating new appointment notification */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 3.5, duration: 0.5 }}
                  className="absolute -bottom-3 -left-4 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-3 border border-white/20 shadow-xl"
                >
                  <motion.div
                    animate={{ y: [0, 5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-white">Novo agendamento!</div>
                      <div className="text-[9px] text-white/50">Maria - 14:30 - Corte</div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Confirmation badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 5, duration: 0.3, type: "spring" }}
                  className="absolute top-1/2 -right-8 bg-emerald-500 rounded-full p-2 shadow-lg shadow-emerald-500/30"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex flex-col items-center gap-2 text-white/40"
          >
            <span className="text-xs">Scroll</span>
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.div>
      </section>

      {/* Trusted By / Logos Section */}
      <section className="py-16 px-4 border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-white/40 text-sm mb-10 uppercase tracking-widest"
          >
            Mais de 500 barbearias confiam no BarberSmart
          </motion.p>
          
          {/* Logo Marquee */}
          <div className="relative overflow-hidden">
            {/* Gradient masks */}
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10" />
            
            <motion.div
              animate={{ x: [0, -1200] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="flex items-center gap-16"
            >
              {/* First set of logos */}
              {[
                { name: "Barbearia Classic", icon: "✂️" },
                { name: "The Barber House", icon: "🪒" },
                { name: "Corte Certo", icon: "💈" },
                { name: "Studio Barba", icon: "✨" },
                { name: "Premium Cuts", icon: "👔" },
                { name: "Old School Barber", icon: "🎩" },
                { name: "Navalha de Ouro", icon: "⭐" },
                { name: "Barbearia Elegance", icon: "💎" },
              ].map((client, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-3 text-white/30 hover:text-white/60 transition-colors whitespace-nowrap"
                >
                  <span className="text-2xl">{client.icon}</span>
                  <span className="text-lg font-semibold tracking-tight">{client.name}</span>
                </div>
              ))}
              
              {/* Duplicate for seamless loop */}
              {[
                { name: "Barbearia Classic", icon: "✂️" },
                { name: "The Barber House", icon: "🪒" },
                { name: "Corte Certo", icon: "💈" },
                { name: "Studio Barba", icon: "✨" },
                { name: "Premium Cuts", icon: "👔" },
                { name: "Old School Barber", icon: "🎩" },
                { name: "Navalha de Ouro", icon: "⭐" },
                { name: "Barbearia Elegance", icon: "💎" },
              ].map((client, index) => (
                <div 
                  key={`dup-${index}`} 
                  className="flex items-center gap-3 text-white/30 hover:text-white/60 transition-colors whitespace-nowrap"
                >
                  <span className="text-2xl">{client.icon}</span>
                  <span className="text-lg font-semibold tracking-tight">{client.name}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Tudo que você precisa.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                Nada que você não precisa.
              </span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Ferramentas poderosas e simples de usar para transformar a gestão da sua barbearia.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <BentoCard
              icon={Calendar}
              title="Agenda Inteligente"
              description="Controle total dos agendamentos com visualização por dia, semana ou mês. Evite conflitos e maximize sua agenda."
              className="lg:col-span-2"
              delay={0.1}
            />
            <BentoCard
              icon={MessageSquare}
              title="WhatsApp Automatizado"
              description="Chatbot com IA que agenda, confirma e lembra seus clientes automaticamente."
              delay={0.2}
            />
            <BentoCard
              icon={TrendingUp}
              title="Gestão Financeira"
              description="Controle receitas, despesas e comissões em um só lugar."
              delay={0.3}
            />
            <BentoCard
              icon={Users}
              title="Gestão de Equipe"
              description="Horários, folgas e desempenho de cada profissional."
              delay={0.4}
            />
            <BentoCard
              icon={BarChart3}
              title="Relatórios Avançados"
              description="Insights poderosos para tomar decisões baseadas em dados reais."
              className="lg:col-span-2"
              delay={0.5}
            />
            <BentoCard
              icon={Smartphone}
              title="Multi-plataforma"
              description="Acesse de qualquer dispositivo, a qualquer hora, de qualquer lugar."
              delay={0.6}
            />
            <BentoCard
              icon={Shield}
              title="Dados Seguros"
              description="Criptografia de ponta e backups automáticos para sua tranquilidade."
              delay={0.7}
            />
            <BentoCard
              icon={Building2}
              title="Multi-unidades"
              description="Gerencie várias unidades em um painel centralizado."
              delay={0.8}
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-12 sm:py-24 px-4 relative overflow-hidden">
        {/* Parallax Background Image */}
        <ParallaxBackground imageUrl="/images/barbershop-how-it-works.jpg" speed={0.25} />
        {/* Dark Overlay with blur effect */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              Simples como deve ser
            </h2>
            <p className="text-white/60 text-sm sm:text-lg max-w-2xl mx-auto px-4">
              Em poucos minutos você está pronto para receber agendamentos
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-4 relative">
            {/* Connection lines */}
            <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
            
            <TimelineStep
              number={1}
              title="Configure em minutos"
              description="Cadastre sua barbearia, serviços e equipe de forma simples e rápida"
              delay={0.1}
            />
            <TimelineStep
              number={2}
              title="Clientes agendam online"
              description="Compartilhe seu link de agendamento ou deixe o chatbot fazer o trabalho"
              delay={0.3}
            />
            <TimelineStep
              number={3}
              title="Foque no que importa"
              description="Enquanto você corta cabelo, o sistema cuida de todo o resto"
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* WhatsApp Section */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm font-medium mb-6">
                <MessageSquare className="w-4 h-4" />
                Integração WhatsApp
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Seu assistente virtual{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
                  24 horas por dia
                </span>
              </h2>
              <p className="text-white/60 text-lg mb-8">
                Nosso chatbot com inteligência artificial atende seus clientes pelo WhatsApp, 
                agenda horários, envia lembretes e confirma presenças. Tudo automaticamente.
              </p>
              <ul className="space-y-4">
                {[
                  "Agendamento por conversa natural",
                  "Lembretes automáticos 24h antes",
                  "Confirmação de presença",
                  "Reagendamento sem complicação"
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-white/80">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* WhatsApp Chat Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 rounded-3xl blur-3xl" />
              <div className="relative bg-gradient-to-b from-[#1f2c33] to-[#0b141a] rounded-3xl border border-white/10 p-4 max-w-sm mx-auto shadow-2xl">
                {/* WhatsApp Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                    <Scissors className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <div className="font-medium text-white">Barbearia Classic</div>
                    <div className="text-xs text-emerald-400">online</div>
                  </div>
                </div>
                
                {/* Chat Messages */}
                <div className="py-4 space-y-3">
                  <WhatsAppBubble 
                    message="Olá! Gostaria de agendar um corte para amanhã" 
                    isUser 
                    delay={0.3}
                  />
                  <WhatsAppBubble 
                    message="Olá! 😊 Claro, temos horários disponíveis amanhã. Qual horário você prefere?" 
                    delay={0.5}
                  />
                  <WhatsAppBubble 
                    message="Às 15h pode ser?" 
                    isUser 
                    delay={0.7}
                  />
                  <WhatsAppBubble 
                    message="Perfeito! ✅ Agendei seu corte para amanhã às 15h com o Carlos. Vou te enviar um lembrete!" 
                    delay={0.9}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 sm:py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent" />
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            {/* Free Trial Banner */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 mb-6 sm:mb-8 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 rounded-full"
            >
              <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-emerald-500 rounded-full">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-black" />
              </div>
              <span className="text-emerald-400 font-semibold text-sm sm:text-base">
                14 dias grátis em todos os planos
              </span>
              <span className="text-white/60 text-xs sm:text-sm hidden sm:inline">
                Sem cartão de crédito
              </span>
            </motion.div>

            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              Investimento que se paga
            </h2>
            <p className="text-white/60 text-sm sm:text-lg max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
              Escolha o plano ideal para o tamanho do seu negócio. <span className="text-emerald-400 font-medium">Teste grátis por 14 dias!</span>
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 p-1.5 bg-white/5 rounded-xl border border-white/10">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingPeriod === 'monthly' 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  billingPeriod === 'annual' 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Anual
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  billingPeriod === 'annual' 
                    ? 'bg-black/20 text-black' 
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  -20%
                </span>
              </button>
            </div>
          </motion.div>

          <PackageComparison 
            plans={plans.map((plan, index) => ({
              id: plan.name.toLowerCase(),
              name: plan.name,
              slug: plan.name.toLowerCase(),
              description: plan.description,
              price: parseFloat(plan.price.replace('R$ ', '').replace(',', '.')),
              max_staff: index === 0 ? 3 : index === 1 ? 8 : -1,
              max_clients: -1,
              max_appointments_month: -1,
              is_base_plan: false,
              is_bundle: true,
              discount_percentage: billingPeriod === 'annual' ? 20 : 0,
              highlight_text: plan.popular ? 'Mais Popular' : null,
              feature_flags: {} as any,
              features: plan.features
            }))}
            billingPeriod={billingPeriod}
            onSelectPlan={() => navigate('/auth?tab=signup')}
            onCustomize={() => setShowBuilder(true)}
          />

          <ModularPlanBuilder 
            isOpen={showBuilder}
            onClose={() => setShowBuilder(false)}
            onContinue={() => {
              setShowBuilder(false);
              navigate('/auth?tab=signup');
            }}
          />
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 sm:py-24 px-4 relative overflow-hidden">
        {/* Parallax Background Image */}
        <ParallaxBackground imageUrl="/images/barbershop-testimonials.jpg" speed={0.2} />
        {/* Dark Overlay with sepia tint */}
        <div className="absolute inset-0 bg-black/85" />
        {/* Warm color overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-transparent to-amber-800/10" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              Quem usa, recomenda
            </h2>
            <p className="text-white/60 text-sm sm:text-lg">
              Veja o que nossos clientes dizem sobre o Barber Smart
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                name: "Carlos Silva",
                role: "Barbearia Classic",
                content: "Reduzi 80% do tempo que gastava com agendamentos. O chatbot é incrível!",
                rating: 5
              },
              {
                name: "André Oliveira",
                role: "The Barber House",
                content: "Finalmente um sistema que entende a rotina de uma barbearia. Muito prático!",
                rating: 5
              },
              {
                name: "Ricardo Santos",
                role: "Rede Corte Certo",
                content: "Gerenciar 5 unidades nunca foi tão fácil. Relatórios consolidados são um diferencial.",
                rating: 5
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-500 fill-amber-500" />
                  ))}
                </div>
                <p className="text-white/80 mb-6">&ldquo;{testimonial.content}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600" />
                  <div>
                    <div className="font-medium text-white">{testimonial.name}</div>
                    <div className="text-sm text-white/50">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-12 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-white/60 text-sm sm:text-lg">
              Tire suas dúvidas sobre o Barber Smart
            </p>
          </motion.div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <AccordionItem 
                  value={`item-${index}`}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-6 overflow-hidden"
                >
                  <AccordionTrigger className="text-left text-white hover:text-amber-500 py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/60 pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 sm:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-500/30 p-6 sm:p-12 text-center"
          >
            {/* Parallax Background Image */}
            <ParallaxBackground imageUrl="/images/barbershop-cta.jpg" speed={0.15} />
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/70" />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 via-amber-600/20 to-transparent" />
            
            <div className="relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-amber-500/20 text-amber-500 text-xs sm:text-sm font-medium mb-4 sm:mb-6"
              >
                <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                Comece grátis por 14 dias
              </motion.div>
              
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
                Pronto para transformar sua barbearia?
              </h2>
              <p className="text-white/60 text-sm sm:text-lg max-w-xl mx-auto mb-6 sm:mb-8">
                Junte-se a mais de 500 barbearias que já usam o Barber Smart para crescer seus negócios.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold text-lg px-8 h-14 rounded-xl shadow-lg shadow-amber-500/25"
                  onClick={() => navigate('/auth?tab=signup')}
                >
                  Criar Conta Grátis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <img 
                src={logoIcon} 
                alt="Barber Smart" 
                className="h-8 w-auto object-contain"
              />
              <span className="font-bold">Barber Smart</span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-white/50">
              <a href="/privacy" className="hover:text-white transition-colors">Privacidade</a>
              <a href="/terms" className="hover:text-white transition-colors">Termos</a>
              <a href="mailto:contato@barbersmart.app" className="hover:text-white transition-colors">Contato</a>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-1 text-xs sm:text-sm text-white/50 text-center md:text-right">
              <div>© {new Date().getFullYear()} Barber Smart. Todos os direitos reservados.</div>
              <div>
                Desenvolvido por{" "}
                <a 
                  href="https://syncsmart.com.br" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 transition-colors font-medium"
                >
                  Sync Smart
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <motion.a
        href="https://wa.me/5511999999999?text=Olá! Gostaria de saber mais sobre o BarberSmart"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 2, type: "spring", stiffness: 200 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-colors"
        aria-label="Contato via WhatsApp"
      >
        <svg 
          viewBox="0 0 24 24" 
          className="w-7 h-7 text-white fill-current"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        
        {/* Pulse animation */}
        <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-25" />
      </motion.a>
    </div>
  );
};

export default LandingPage;
