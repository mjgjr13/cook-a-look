import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, MessageSquare, Send, CheckCircle } from "lucide-react";
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
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  const currentUserId = user?.id;

  useEffect(() => {
    if (currentUserId) {
      loadMessages();
      
      // Subscribe to new messages for this user
      const channel = supabase
        .channel("advisor-admin-messages")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "admin_messages",
          },
          (payload) => {
            // Only reload if message involves this user
            const newMsg = payload.new as AdminMessage | undefined;
            const oldMsg = payload.old as AdminMessage | undefined;
            if (
              newMsg?.sender_id === currentUserId || 
              newMsg?.recipient_id === currentUserId ||
              oldMsg?.sender_id === currentUserId ||
              oldMsg?.recipient_id === currentUserId
            ) {
              loadMessages();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId]);

  const loadMessages = async () => {
    if (!currentUserId) return;

    try {
      // Fetch all messages where the advisor is sender or recipient
      const { data, error } = await supabase
        .from("admin_messages")
        .select("*")
        .or(`recipient_id.eq.${currentUserId},sender_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const allMessages = (data as AdminMessage[]) || [];
      setMessages(allMessages);
      
      // Count unread messages sent TO this advisor (from admin)
      const unread = allMessages.filter(m => 
        m.recipient_id === currentUserId && !m.read_at
      ).length;
      setUnreadCount(unread);

      // Determine the admin user ID (the other party in the conversation)
      if (allMessages.length > 0) {
        const firstMsg = allMessages[0];
        const otherParty = firstMsg.sender_id === currentUserId 
          ? firstMsg.recipient_id 
          : firstMsg.sender_id;
        setAdminUserId(otherParty);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenConversation = async () => {
    setIsConversationOpen(true);
    setReplyContent("");

    // Mark all unread messages TO this advisor as read
    const unreadMessages = messages.filter(
      m => m.recipient_id === currentUserId && !m.read_at
    );

    if (unreadMessages.length > 0) {
      try {
        await Promise.all(
          unreadMessages.map(msg =>
            supabase
              .from("admin_messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", msg.id)
          )
        );
        
        // Update local state
        setMessages(prev =>
          prev.map(m => 
            m.recipient_id === currentUserId && !m.read_at 
              ? { ...m, read_at: new Date().toISOString() } 
              : m
          )
        );
        setUnreadCount(0);
      } catch (err) {
        console.error("Error marking messages as read:", err);
      }
    }
  };

  const handleSendReply = async () => {
    if (!replyContent.trim() || !currentUserId || !adminUserId) return;
    setIsSending(true);

    try {
      const { error } = await supabase.from("admin_messages").insert({
        sender_id: currentUserId,
        recipient_id: adminUserId,
        subject: "Re: Admin Conversation",
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

  // Check if there's any conversation with admin
  const hasConversation = messages.length > 0;
  const lastMessage = messages[0];

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
          {!hasConversation ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No messages yet</p>
              <p className="text-sm mt-1">
                You'll see messages from Cook a Look admin here
              </p>
            </div>
          ) : (
            <div
              onClick={handleOpenConversation}
              className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${
                unreadCount > 0 ? "border-primary/50 bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    CL
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {unreadCount > 0 && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                    <span className="font-medium">Cook a Look Admin</span>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {unreadCount} new
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {lastMessage.sender_id === currentUserId ? "You: " : ""}
                    {lastMessage.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(lastMessage.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation Dialog */}
      <Dialog open={isConversationOpen} onOpenChange={setIsConversationOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  CL
                </AvatarFallback>
              </Avatar>
              <div>
                <span>Cook a Look Admin</span>
                <p className="text-sm font-normal text-muted-foreground">
                  Platform Administration
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[400px] pr-4">
            <div className="space-y-4 py-2">
              {messages
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map(msg => {
                  // Message is from ME (advisor) if I'm the sender
                  const isFromMe = msg.sender_id === currentUserId;
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${isFromMe ? "justify-end" : "justify-start"}`}
                    >
                      {/* Avatar for admin messages (left side) */}
                      {!isFromMe && (
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            CL
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div
                        className={`max-w-[75%] rounded-lg p-3 ${
                          isFromMe
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <div className={`flex items-center gap-1 mt-1 text-xs ${
                          isFromMe ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}>
                          <span>
                            {format(new Date(msg.created_at), "MMM d 'at' h:mm a")}
                          </span>
                          {isFromMe && msg.read_at && (
                            <CheckCircle className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                      
                      {/* Avatar for my messages (right side) */}
                      {isFromMe && (
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="bg-secondary text-xs">
                            You
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })}
            </div>
          </ScrollArea>

          <div className="border-t pt-4 mt-4">
            <Textarea
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              placeholder="Type your reply..."
              rows={3}
              className="mb-3"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConversationOpen(false)}>
                Close
              </Button>
              <Button
                onClick={handleSendReply}
                disabled={!replyContent.trim() || isSending || !adminUserId}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                {isSending ? "Sending..." : "Send Reply"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminMessagesInbox;
