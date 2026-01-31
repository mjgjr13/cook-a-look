import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Mail, 
  MessageSquare, 
  Send, 
  ChevronRight, 
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
}

interface ProfileInfo {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface ConversationGroup {
  advisorId: string;
  advisorName: string;
  advisorEmail: string;
  avatarUrl: string | null;
  messages: Message[];
  unreadCount: number;
  lastMessage: Message;
}

export const AdminInbox = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ConversationGroup | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [profilesMap, setProfilesMap] = useState<Map<string, ProfileInfo>>(new Map());

  const currentUserId = user?.id;

  useEffect(() => {
    if (currentUserId) {
      loadConversations();

      // Subscribe to new messages
      const channel = supabase
        .channel("admin-messages-inbox")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "admin_messages",
          },
          () => {
            loadConversations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId]);

  const loadConversations = async () => {
    if (!currentUserId) return;

    try {
      // Fetch all messages where the current admin is either sender or recipient
      const { data: messagesData, error: messagesError } = await supabase
        .from("admin_messages")
        .select("*")
        .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false });

      if (messagesError) throw messagesError;

      // Get unique user IDs (the OTHER party in conversations, not the admin)
      const otherPartyIds = new Set<string>();
      (messagesData || []).forEach(msg => {
        // The other party is whoever is NOT the current admin
        const otherParty = msg.sender_id === currentUserId ? msg.recipient_id : msg.sender_id;
        // Only add if it's not the admin themselves (prevent self-conversations)
        if (otherParty !== currentUserId) {
          otherPartyIds.add(otherParty);
        }
      });

      // Fetch profile info for all other parties
      if (otherPartyIds.size > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, avatar_url")
          .in("user_id", Array.from(otherPartyIds));

        const profileMap = new Map<string, ProfileInfo>();
        (profilesData || []).forEach(p => {
          profileMap.set(p.user_id!, {
            user_id: p.user_id!,
            full_name: p.full_name,
            email: p.email,
            avatar_url: p.avatar_url,
          });
        });
        setProfilesMap(profileMap);

        // Group messages by conversation partner (advisor)
        const conversationMap = new Map<string, Message[]>();

        (messagesData || []).forEach(msg => {
          // Determine the advisor ID (the party that is NOT the admin)
          const advisorId = msg.sender_id === currentUserId ? msg.recipient_id : msg.sender_id;
          
          // Skip self-messages (admin messaging themselves - should never happen)
          if (advisorId === currentUserId) return;

          if (!conversationMap.has(advisorId)) {
            conversationMap.set(advisorId, []);
          }
          conversationMap.get(advisorId)!.push(msg);
        });

        // Convert to conversation groups
        const groups: ConversationGroup[] = [];
        conversationMap.forEach((messages, advisorId) => {
          const profile = profileMap.get(advisorId);
          if (messages.length > 0) {
            const sortedMessages = messages.sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            
            // Count unread messages FROM the advisor TO the admin
            const unreadCount = messages.filter(m => 
              m.sender_id === advisorId && m.recipient_id === currentUserId && !m.read_at
            ).length;

            groups.push({
              advisorId,
              advisorName: profile?.full_name || "Unknown Advisor",
              advisorEmail: profile?.email || "",
              avatarUrl: profile?.avatar_url || null,
              messages: sortedMessages,
              unreadCount,
              lastMessage: sortedMessages[0],
            });
          }
        });

        // Sort by last message date
        groups.sort((a, b) => 
          new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
        );

        setConversations(groups);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.error("Error loading conversations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenConversation = async (conversation: ConversationGroup) => {
    setSelectedConversation(conversation);
    setReplyContent("");

    // Mark all unread messages FROM this advisor as read
    const unreadMessages = conversation.messages.filter(
      m => m.sender_id === conversation.advisorId && m.recipient_id === currentUserId && !m.read_at
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
        loadConversations();
      } catch (err) {
        console.error("Error marking messages as read:", err);
      }
    }
  };

  const handleSendReply = async () => {
    if (!replyContent.trim() || !selectedConversation || !currentUserId) return;
    setIsSending(true);

    try {
      const { error } = await supabase.from("admin_messages").insert({
        sender_id: currentUserId,
        recipient_id: selectedConversation.advisorId,
        subject: `Re: Conversation with ${selectedConversation.advisorName}`,
        message: replyContent.trim(),
      });

      if (error) throw error;

      toast.success("Reply sent!");
      setReplyContent("");
      loadConversations();
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
            Admin Inbox
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Admin Inbox
                {totalUnread > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {totalUnread} new
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                All conversations with advisors
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No conversations yet</p>
              <p className="text-sm mt-1">
                Send a message to an advisor from the Advisor Management page
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map(conversation => (
                <div
                  key={conversation.advisorId}
                  onClick={() => handleOpenConversation(conversation)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${
                    conversation.unreadCount > 0 ? "border-primary/50 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={conversation.avatarUrl || undefined} />
                      <AvatarFallback>
                        {conversation.advisorName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {conversation.unreadCount > 0 && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                        <span className="font-medium truncate">
                          {conversation.advisorName}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {conversation.unreadCount} new
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {conversation.lastMessage.sender_id === currentUserId ? "You: " : ""}
                        {conversation.lastMessage.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(conversation.lastMessage.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation Detail Dialog */}
      <Dialog open={!!selectedConversation} onOpenChange={() => setSelectedConversation(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={selectedConversation?.avatarUrl || undefined} />
                <AvatarFallback>
                  {(selectedConversation?.advisorName || "A").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <span>{selectedConversation?.advisorName}</span>
                <p className="text-sm font-normal text-muted-foreground">
                  {selectedConversation?.advisorEmail}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[400px] pr-4">
            <div className="space-y-4 py-2">
              {selectedConversation?.messages
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map(msg => {
                  // Message is from advisor if sender is the advisor (not the admin)
                  const isFromAdvisor = msg.sender_id === selectedConversation.advisorId;
                  const senderProfile = isFromAdvisor 
                    ? profilesMap.get(selectedConversation.advisorId) 
                    : null;
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${isFromAdvisor ? "justify-start" : "justify-end"}`}
                    >
                      {/* Avatar for advisor messages (left side) */}
                      {isFromAdvisor && (
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={senderProfile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {(senderProfile?.full_name || "A").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div
                        className={`max-w-[75%] rounded-lg p-3 ${
                          isFromAdvisor
                            ? "bg-muted"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <div className={`flex items-center gap-1 mt-1 text-xs ${
                          isFromAdvisor ? "text-muted-foreground" : "text-primary-foreground/70"
                        }`}>
                          <span>
                            {format(new Date(msg.created_at), "MMM d 'at' h:mm a")}
                          </span>
                          {!isFromAdvisor && msg.read_at && (
                            <CheckCircle className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                      
                      {/* Avatar placeholder for admin messages (right side) - optional */}
                      {!isFromAdvisor && (
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
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
              <Button variant="outline" onClick={() => setSelectedConversation(null)}>
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminInbox;
