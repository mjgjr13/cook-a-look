import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, MessageSquare, Send, Check, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface AdminMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
}

export const AdminMessagesInbox = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<AdminMessage | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadMessages();
      
      // Subscribe to new messages
      const channel = supabase
        .channel("advisor-messages")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "admin_messages",
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            loadMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadMessages = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("admin_messages")
        .select("*")
        .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setMessages((data as AdminMessage[]) || []);
      setUnreadCount((data as AdminMessage[])?.filter(m => m.recipient_id === user.id && !m.read_at).length || 0);
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenMessage = async (message: AdminMessage) => {
    setSelectedMessage(message);
    setReplyContent("");

    // Mark as read if it's addressed to the user and unread
    if (message.recipient_id === user?.id && !message.read_at) {
      try {
        await supabase
          .from("admin_messages")
          .update({ read_at: new Date().toISOString() })
          .eq("id", message.id);

        setMessages(prev =>
          prev.map(m => (m.id === message.id ? { ...m, read_at: new Date().toISOString() } : m))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Error marking message as read:", err);
      }
    }
  };

  const handleSendReply = async () => {
    if (!replyContent.trim() || !user) return;
    setIsSending(true);

    try {
      // Get admin user ID - we'll send to the original message's sender
      // For now, we'll use a simple approach where replies go back to the sender
      const recipientId = selectedMessage?.sender_id;

      if (!recipientId) {
        toast.error("Unable to determine recipient");
        return;
      }

      const { error } = await supabase.from("admin_messages").insert({
        sender_id: user.id,
        recipient_id: recipientId,
        subject: `Re: ${selectedMessage?.subject || "Admin Message"}`,
        message: replyContent.trim(),
      });

      if (error) throw error;

      toast.success("Reply sent!");
      setReplyContent("");
      loadMessages();
    } catch (err) {
      console.error("Error sending reply:", err);
      toast.error("Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const receivedMessages = messages.filter(m => m.recipient_id === user?.id);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Admin Messages
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount} new
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Messages from Cook a Look administration
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {receivedMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No messages yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {receivedMessages.map(message => (
                <div
                  key={message.id}
                  onClick={() => handleOpenMessage(message)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${
                    !message.read_at ? "border-primary/50 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {!message.read_at && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                        <span className="font-medium">
                          {message.subject || "Message from Admin"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {message.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(message.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Detail Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {selectedMessage?.subject || "Admin Message"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>From: Cook a Look Admin</span>
              <span>
                {selectedMessage &&
                  format(new Date(selectedMessage.created_at), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>

            <ScrollArea className="max-h-[200px]">
              <div className="bg-muted/50 p-4 rounded-lg whitespace-pre-wrap">
                {selectedMessage?.message}
              </div>
            </ScrollArea>

            {selectedMessage?.read_at && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Check className="w-3 h-3" />
                Read {format(new Date(selectedMessage.read_at), "MMM d 'at' h:mm a")}
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Reply</p>
              <Textarea
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMessage(null)}>
              Close
            </Button>
            <Button
              onClick={handleSendReply}
              disabled={!replyContent.trim() || isSending}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              {isSending ? "Sending..." : "Send Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminMessagesInbox;
