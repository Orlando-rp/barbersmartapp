import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Star, TrendingUp, Users, Award } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client: { name: string };
  staff: { profiles: { full_name: string } } | null;
  appointments: { service_name: string };
}

const Reviews = () => {
  const { activeBarbershopIds } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<number[]>([0, 0, 0, 0, 0]);

  useEffect(() => {
    if (activeBarbershopIds.length > 0) {
      loadReviews();
    }
  }, [activeBarbershopIds]);

  const loadReviews = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("reviews")
        .select(`
          id,
          rating,
          comment,
          created_at,
          client:clients(name),
          staff:staff(id),
          appointments:appointments(service_name)
        `)
        .in("barbershop_id", activeBarbershopIds)
        .order("created_at", { ascending: false });

      // Handle table not existing gracefully
      if (error) {
        if (error.message?.includes("does not exist") || error.code === "PGRST205") {
          console.warn("Tabela reviews não existe ainda. Execute o SQL de criação.");
          setReviews([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      // Get staff names separately
      if (data && data.length > 0) {
        const staffIds = [...new Set(data.map((r: any) => r.staff?.id).filter(Boolean))];
        
        const { data: staffData } = await supabase
          .from("staff")
          .select("id, user_id")
          .in("id", staffIds);

        if (staffData) {
          const userIds = staffData.map(s => s.user_id);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);

          const profileMap = new Map(profilesData?.map(p => [p.id, p.full_name]));
          const staffMap = new Map(staffData.map(s => [s.id, profileMap.get(s.user_id)]));

          const enrichedData = data.map((review: any) => ({
            ...review,
            staff: review.staff?.id ? { profiles: { full_name: staffMap.get(review.staff.id) } } : null,
          }));

          setReviews(enrichedData);
          calculateStats(enrichedData);
        }
      } else {
        setReviews([]);
      }
    } catch (error: any) {
      console.error("Erro ao carregar avaliações:", error);
      if (!error.message?.includes("does not exist")) {
        toast.error("Erro ao carregar avaliações");
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reviews: any[]) => {
    if (reviews.length === 0) return;

    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = sum / total;

    setTotalReviews(total);
    setAverageRating(avg);

    // Calculate distribution
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      dist[r.rating - 1]++;
    });
    setRatingDistribution(dist);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Avaliações</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Feedback dos clientes sobre os serviços
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader className="p-3 sm:pb-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" />
                Avaliação Média
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl sm:text-3xl font-bold">
                {averageRating.toFixed(1)}
              </div>
              <div className="flex gap-1 mt-2">
                {renderStars(Math.round(averageRating))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 sm:pb-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Total de Avaliações
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl sm:text-3xl font-bold">{totalReviews}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Clientes avaliaram
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 sm:pb-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4 text-success" />
                5 Estrelas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl sm:text-3xl font-bold">{ratingDistribution[4]}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalReviews > 0
                  ? `${Math.round((ratingDistribution[4] / totalReviews) * 100)}% do total`
                  : "0% do total"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Rating Distribution */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Distribuição de Avaliações</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="space-y-2 sm:space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingDistribution[star - 1];
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

                return (
                  <div key={star} className="flex items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-1 w-12 sm:w-24">
                      <span className="text-xs sm:text-sm font-medium">{star}</span>
                      <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 sm:w-16 text-right">
                      {count} ({Math.round(percentage)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Todas as Avaliações</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Feedback detalhado dos clientes</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            {reviews.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Nenhuma avaliação ainda
              </p>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-3 sm:p-4 border border-border rounded-lg space-y-2 sm:space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm">
                            {review.client.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">{review.client.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(review.created_at), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0">{renderStars(review.rating)}</div>
                    </div>

                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      <Badge variant="outline" className="text-xs truncate max-w-[120px] sm:max-w-none">{review.appointments.service_name}</Badge>
                      {review.staff?.profiles?.full_name && (
                        <Badge variant="secondary" className="text-xs truncate max-w-[100px] sm:max-w-none">
                          {review.staff.profiles.full_name}
                        </Badge>
                      )}
                    </div>

                    {review.comment && (
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 sm:line-clamp-none">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Reviews;
