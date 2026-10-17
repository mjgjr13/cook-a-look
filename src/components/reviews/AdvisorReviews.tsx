import { useState, useEffect } from "react";
import { publicSupabase } from "@/integrations/supabase/publicClient";
import { supabase } from "@/integrations/supabase/client";
import { Star, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  reviewer_first_name: string | null;
  reviewer_avatar_url: string | null;
}

interface AdvisorReviewsProps {
  advisorId: string;
}

const AdvisorReviews = ({ advisorId }: AdvisorReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0 });

  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);

      const { data, error } = await publicSupabase.rpc("get_advisor_reviews", {
        p_advisor_id: advisorId,
        p_limit: 20,
      });

      if (error) {
        console.error("Error fetching reviews:", error);
      } else {
        const list = (data || []) as Review[];
        setReviews(list);
        if (list.length > 0) {
          const total = list.length;
          const avg = list.reduce((sum, r) => sum + r.rating, 0) / total;
          setStats({ avgRating: Math.round(avg * 10) / 10, totalReviews: total });
        }
      }

      setIsLoading(false);
    };

    if (advisorId) {
      fetchReviews();
    }
  }, [advisorId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="py-2 text-muted-foreground">
        <p>No reviews yet.</p>
        <p className="text-sm">Reviews appear after completed sessions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                "w-5 h-5",
                star <= Math.round(stats.avgRating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground"
              )}
            />
          ))}
        </div>
        <span className="text-lg font-medium">{stats.avgRating}</span>
        <span className="text-muted-foreground">
          ({stats.totalReviews} {stats.totalReviews === 1 ? "review" : "reviews"})
        </span>
      </div>

      {/* Review list */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="border-b pb-4 last:border-0">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={review.reviewer_avatar_url || undefined} />
                <AvatarFallback>
                  {review.reviewer_first_name?.charAt(0) || <User className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-medium">
                    {review.reviewer_first_name || "Anonymous"}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(review.created_at), "MMM d, yyyy")}
                  </span>
                </div>

                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "w-4 h-4",
                        star <= review.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground"
                      )}
                    />
                  ))}
                </div>

                {review.review_text && (
                  <p className="text-sm mt-2 text-muted-foreground">
                    {review.review_text}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdvisorReviews;
