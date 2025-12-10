import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Star,
  Scissors,
  Users,
  ChevronRight,
  MessageCircle,
  Instagram,
  Facebook,
} from "lucide-react";

interface Barbershop {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string | null;
  settings: {
    description?: string;
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  };
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  category: string | null;
}

interface StaffMember {
  id: string;
  user_id: string;
  avatar_url: string | null;
  full_name: string;
  specialties: string[];
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  client_name: string;
  created_at: string;
}

interface BusinessHour {
  day_of_week: string;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

interface LandingConfig {
  hero_title?: string | null;
  hero_subtitle?: string | null;
  show_services?: boolean;
  show_team?: boolean;
  show_reviews?: boolean;
  show_location?: boolean;
  theme?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_color?: string;
  text_color?: string;
  hero_image_url?: string;
  button_style?: 'rounded' | 'square' | 'pill';
  font_family?: string;
}

const dayNames: Record<string, string> = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
  sunday: "Domingo",
};

const BarbershopLanding = () => {
  const { barbershopId, subdomain } = useParams<{ barbershopId?: string; subdomain?: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [landingConfig, setLandingConfig] = useState<LandingConfig>({
    show_services: true,
    show_team: true,
    show_reviews: true,
    show_location: true,
  });
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadBarbershopData();
  }, [barbershopId, subdomain]);

  const loadBarbershopData = async () => {
    try {
      setLoading(true);
      let shopId = barbershopId;

      // If subdomain provided, lookup the barbershop
      if (subdomain && !barbershopId) {
        const { data: domainData, error: domainError } = await supabase
          .from('barbershop_domains')
          .select('barbershop_id, landing_page_config, landing_page_enabled')
          .eq('subdomain', subdomain.toLowerCase())
          .eq('subdomain_status', 'active')
          .maybeSingle();

        if (domainError || !domainData) {
          // Try custom domain
          const { data: customDomainData } = await supabase
            .from('barbershop_domains')
            .select('barbershop_id, landing_page_config, landing_page_enabled')
            .eq('custom_domain', subdomain.toLowerCase())
            .eq('custom_domain_status', 'active')
            .maybeSingle();

          if (!customDomainData) {
            setNotFound(true);
            return;
          }
          
          shopId = customDomainData.barbershop_id;
          setLandingConfig(customDomainData.landing_page_config || {});
          
          // If landing page disabled, redirect to booking
          if (!customDomainData.landing_page_enabled) {
            navigate(`/agendar/${shopId}`, { replace: true });
            return;
          }
        } else {
          shopId = domainData.barbershop_id;
          setLandingConfig(domainData.landing_page_config || {});
          
          if (!domainData.landing_page_enabled) {
            navigate(`/agendar/${shopId}`, { replace: true });
            return;
          }
        }
      }

      if (!shopId) {
        setNotFound(true);
        return;
      }

      // Fetch all data in parallel
      const [
        barbershopRes,
        servicesRes,
        staffRes,
        reviewsRes,
        hoursRes,
        ratingRes,
      ] = await Promise.all([
        supabase
          .from('barbershops')
          .select('*')
          .eq('id', shopId)
          .eq('active', true)
          .single(),
        supabase
          .from('services')
          .select('id, name, description, price, duration, category')
          .eq('barbershop_id', shopId)
          .eq('active', true)
          .order('category', { ascending: true })
          .order('name', { ascending: true }),
        supabase
          .from('staff')
          .select(`
            id,
            user_id,
            specialties,
            profiles!staff_user_id_fkey (
              full_name,
              avatar_url
            )
          `)
          .eq('barbershop_id', shopId)
          .eq('active', true),
        supabase
          .from('reviews')
          .select('id, rating, comment, client_name, created_at')
          .eq('barbershop_id', shopId)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('business_hours')
          .select('day_of_week, is_open, open_time, close_time')
          .eq('barbershop_id', shopId),
        supabase.rpc('get_barbershop_average_rating', { shop_id: shopId }),
      ]);

      if (barbershopRes.error || !barbershopRes.data) {
        setNotFound(true);
        return;
      }

      setBarbershop(barbershopRes.data);
      setServices(servicesRes.data || []);
      
      // Process staff data
      const processedStaff = (staffRes.data || []).map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        specialties: s.specialties || [],
        full_name: s.profiles?.full_name || 'Profissional',
        avatar_url: s.profiles?.avatar_url,
      }));
      setStaff(processedStaff);
      
      setReviews(reviewsRes.data || []);
      setBusinessHours(hoursRes.data || []);
      setAverageRating(ratingRes.data || 0);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = () => {
    if (barbershop) {
      navigate(`/agendar/${barbershop.id}`);
    }
  };

  const getWhatsAppLink = () => {
    const phone = barbershop?.settings?.whatsapp || barbershop?.phone;
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/55${cleanPhone}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (notFound || !barbershop) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Scissors className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Página não encontrada</h1>
        <p className="text-muted-foreground text-center max-w-md">
          A barbearia que você está procurando não existe ou não está disponível.
        </p>
      </div>
    );
  }

  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'Outros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  // Get button radius based on style
  const getButtonRadius = () => {
    switch (landingConfig.button_style) {
      case 'square': return 'rounded-none';
      case 'pill': return 'rounded-full';
      default: return 'rounded-md';
    }
  };

  // Custom styles based on config
  const customStyles = {
    '--landing-primary': landingConfig.primary_color || 'hsl(var(--primary))',
    '--landing-secondary': landingConfig.secondary_color || 'hsl(var(--secondary))',
    '--landing-accent': landingConfig.accent_color || 'hsl(var(--primary))',
    '--landing-background': landingConfig.background_color || 'hsl(var(--background))',
    '--landing-text': landingConfig.text_color || 'hsl(var(--foreground))',
    fontFamily: landingConfig.font_family || 'inherit',
  } as React.CSSProperties;

  return (
    <div className="min-h-screen" style={customStyles}>
      <style>{`
        .landing-page {
          background-color: var(--landing-background);
          color: var(--landing-text);
        }
        .landing-primary-bg {
          background-color: var(--landing-primary);
        }
        .landing-primary-text {
          color: var(--landing-primary);
        }
        .landing-accent-bg {
          background-color: var(--landing-accent);
        }
        .landing-accent-text {
          color: var(--landing-accent);
        }
      `}</style>
      
      <div className="landing-page">
        {/* Hero Section */}
        <section 
          className="relative overflow-hidden"
          style={{
            background: landingConfig.hero_image_url 
              ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${landingConfig.hero_image_url}) center/cover`
              : landingConfig.primary_color 
                ? `linear-gradient(135deg, ${landingConfig.primary_color}15, var(--landing-background), ${landingConfig.primary_color}08)`
                : undefined
          }}
        >
          {!landingConfig.hero_image_url && (
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5Qzk0OTgiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJIMXY0aDM2di00aC0xem0wLTEwdi0ySDJ2Mkgxdi00aDM2djRoLTF6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          )}
        
          <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Logo/Avatar */}
              <div className="shrink-0">
                {barbershop.logo_url ? (
                  <img
                    src={barbershop.logo_url}
                    alt={barbershop.name}
                    className="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover shadow-xl border-4"
                    style={{ borderColor: 'var(--landing-background)' }}
                  />
                ) : (
                  <div 
                    className="w-32 h-32 md:w-40 md:h-40 rounded-2xl flex items-center justify-center shadow-xl landing-primary-bg"
                  >
                    <Scissors className="h-16 w-16 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="text-center md:text-left flex-1">
                <h1 
                  className="text-3xl md:text-5xl font-bold mb-3"
                  style={{ color: landingConfig.hero_image_url ? '#fff' : 'var(--landing-text)' }}
                >
                  {landingConfig.hero_title || barbershop.name}
                </h1>
                <p 
                  className="text-lg md:text-xl mb-4 max-w-2xl opacity-80"
                  style={{ color: landingConfig.hero_image_url ? '#fff' : 'var(--landing-text)' }}
                >
                  {landingConfig.hero_subtitle || barbershop.settings?.description || 'A melhor experiência em barbearia para você'}
                </p>
                
                {/* Rating */}
                {averageRating > 0 && (
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-6">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= Math.round(averageRating)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-400'
                          }`}
                        />
                      ))}
                    </div>
                    <span 
                      className="font-semibold"
                      style={{ color: landingConfig.hero_image_url ? '#fff' : 'var(--landing-text)' }}
                    >
                      {averageRating.toFixed(1)}
                    </span>
                    <span 
                      className="opacity-70"
                      style={{ color: landingConfig.hero_image_url ? '#fff' : 'var(--landing-text)' }}
                    >
                      ({reviews.length} avaliações)
                    </span>
                  </div>
                )}

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                  <button
                    onClick={handleBookNow}
                    className={`inline-flex items-center justify-center gap-2 px-6 py-3 text-white font-medium transition-opacity hover:opacity-90 ${getButtonRadius()}`}
                    style={{ backgroundColor: 'var(--landing-accent)' }}
                  >
                    <Calendar className="h-5 w-5" />
                    Agendar Agora
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  {getWhatsAppLink() && (
                    <button
                      onClick={() => window.open(getWhatsAppLink()!, '_blank')}
                      className={`inline-flex items-center justify-center gap-2 px-6 py-3 font-medium border-2 transition-opacity hover:opacity-80 ${getButtonRadius()}`}
                      style={{ 
                        borderColor: landingConfig.hero_image_url ? '#fff' : 'var(--landing-primary)',
                        color: landingConfig.hero_image_url ? '#fff' : 'var(--landing-primary)',
                        backgroundColor: 'transparent'
                      }}
                    >
                      <MessageCircle className="h-5 w-5" />
                      WhatsApp
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* Services Section */}
      {landingConfig.show_services !== false && services.length > 0 && (
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Nossos Serviços
              </h2>
              <p className="text-muted-foreground">
                Confira os serviços disponíveis
              </p>
            </div>

            <div className="space-y-8">
              {Object.entries(groupedServices).map(([category, categoryServices]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Scissors className="h-5 w-5 text-primary" />
                    {category}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categoryServices.map((service) => (
                      <Card key={service.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-foreground">{service.name}</h4>
                            <Badge variant="secondary" className="shrink-0">
                              R$ {service.price.toFixed(2)}
                            </Badge>
                          </div>
                          {service.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {service.description}
                            </p>
                          )}
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{service.duration} min</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Button size="lg" onClick={handleBookNow}>
                Agendar Serviço
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Team Section */}
      {landingConfig.show_team !== false && staff.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Nossa Equipe
              </h2>
              <p className="text-muted-foreground">
                Profissionais qualificados para atendê-lo
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {staff.map((member) => (
                <Card key={member.id} className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <Avatar className="h-24 w-24 mx-auto mb-4">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                        {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold text-foreground mb-1">{member.full_name}</h3>
                    {member.specialties.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {member.specialties.slice(0, 2).join(', ')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Reviews Section */}
      {landingConfig.show_reviews !== false && reviews.length > 0 && (
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                O Que Nossos Clientes Dizem
              </h2>
              <p className="text-muted-foreground">
                Avaliações de quem já nos visitou
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= review.rating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-muted'
                          }`}
                        />
                      ))}
                    </div>
                    {review.comment && (
                      <p className="text-foreground mb-4 line-clamp-3">"{review.comment}"</p>
                    )}
                    <p className="text-sm text-muted-foreground font-medium">
                      — {review.client_name}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Location & Hours Section */}
      {landingConfig.show_location !== false && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid gap-8 md:grid-cols-2">
              {/* Contact Info */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Localização & Contato
                  </h3>
                  
                  <div className="space-y-4">
                    {barbershop.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Endereço</p>
                          <p className="text-foreground">{barbershop.address}</p>
                        </div>
                      </div>
                    )}
                    
                    {barbershop.phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Telefone</p>
                          <a href={`tel:${barbershop.phone}`} className="text-foreground hover:text-primary">
                            {barbershop.phone}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {barbershop.email && (
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <a href={`mailto:${barbershop.email}`} className="text-foreground hover:text-primary">
                            {barbershop.email}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Social Links */}
                  <div className="flex gap-3 mt-6 pt-6 border-t">
                    {barbershop.settings?.instagram && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(`https://instagram.com/${barbershop.settings.instagram}`, '_blank')}
                      >
                        <Instagram className="h-5 w-5" />
                      </Button>
                    )}
                    {barbershop.settings?.facebook && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(`https://facebook.com/${barbershop.settings.facebook}`, '_blank')}
                      >
                        <Facebook className="h-5 w-5" />
                      </Button>
                    )}
                    {getWhatsAppLink() && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(getWhatsAppLink()!, '_blank')}
                      >
                        <MessageCircle className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Business Hours */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Horário de Funcionamento
                  </h3>
                  
                  <div className="space-y-3">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                      const hours = businessHours.find(h => h.day_of_week === day);
                      const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() === day;
                      
                      return (
                        <div
                          key={day}
                          className={`flex justify-between items-center py-2 px-3 rounded-lg ${
                            isToday ? 'bg-primary/10 border border-primary/20' : ''
                          }`}
                        >
                          <span className={`font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
                            {dayNames[day]}
                            {isToday && <Badge className="ml-2 text-xs">Hoje</Badge>}
                          </span>
                          <span className={hours?.is_open ? 'text-foreground' : 'text-muted-foreground'}>
                            {hours?.is_open
                              ? `${hours.open_time} - ${hours.close_time}`
                              : 'Fechado'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section className="py-12 px-4 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Pronto para agendar?
          </h2>
          <p className="text-primary-foreground/80 mb-6">
            Reserve seu horário agora mesmo de forma rápida e fácil
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={handleBookNow}
            className="gap-2"
          >
            <Calendar className="h-5 w-5" />
            Agendar Agora
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 bg-muted/50 border-t">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {barbershop.name}. Todos os direitos reservados.</p>
          <p className="mt-1">
            Powered by <span className="font-semibold text-foreground">BarberSmart</span>
          </p>
        </div>
      </footer>
      </div>
    </div>
  );
};

export default BarbershopLanding;
