import { CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ListingRequirement {
  id: string;
  label: string;
  completed: boolean;
  description?: string;
}

interface ListingStatusPanelProps {
  requirements: ListingRequirement[];
  isListed: boolean;
  canToggleListing: boolean;
  onToggleListing: (listed: boolean) => void;
  isLoading?: boolean;
}

const ListingStatusPanel = ({
  requirements,
  isListed,
  canToggleListing,
  onToggleListing,
  isLoading = false,
}: ListingStatusPanelProps) => {
  const completedCount = requirements.filter((r) => r.completed).length;
  const allComplete = completedCount === requirements.length;

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            {isListed ? (
              <>
                <Eye className="w-5 h-5 text-primary" />
                Profile is Live
              </>
            ) : (
              <>
                <EyeOff className="w-5 h-5 text-muted-foreground" />
                Profile Not Listed
              </>
            )}
          </CardTitle>
          {canToggleListing && (
            <div className="flex items-center gap-2">
              <Label htmlFor="listing-toggle" className="text-sm text-muted-foreground">
                {isListed ? "Visible to clients" : "Hidden from clients"}
              </Label>
              <Switch
                id="listing-toggle"
                checked={isListed}
                onCheckedChange={onToggleListing}
                disabled={isLoading || !allComplete}
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground mb-4">
            {allComplete
              ? isListed
                ? "Your profile is visible in the Style Advisors directory."
                : "All requirements met. Toggle the switch to go live!"
              : `Complete all requirements to enable public listing (${completedCount}/${requirements.length})`}
          </p>

          <div className="space-y-2">
            {requirements.map((req) => (
              <div
                key={req.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  req.completed
                    ? "bg-primary/5 border-primary/20"
                    : "bg-muted/30 border-border"
                )}
              >
                {req.completed ? (
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      req.completed ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {req.label}
                  </p>
                  {req.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {req.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!allComplete && (
            <div className="flex items-start gap-2 mt-4 p-3 bg-accent/50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Complete all requirements above to become visible to clients and start receiving bookings.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ListingStatusPanel;
