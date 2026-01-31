import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  Check, 
  ChevronRight, 
  User, 
  CheckCircle,
  Archive
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
  const [conversations, setConversations] = useState<ConversationGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ConversationGroup | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [advisorProfiles, setAdvisorProfiles] = useState<Map<string, { name: string; email: string; avatar: string | null }>>(new Map());

  useEffect(() => {
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
  }, []);

  const loadConversations = async () => {
    try {
      // Fetch all messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("admin_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (messagesError) throw messagesError;

      // Get unique user IDs (advisors) from messages
      const userIds = new Set<string>();
      (messagesData || []).forEach(msg => {
        // Get the advisor ID (the one who is not the admin sender in initial messages)
        // For simplicity, we track both sender and recipient
        userIds.add(msg.sender_id);
        userIds.add(msg.recipient_id);
      });

      // Fetch profile info for all users
      if (userIds.size > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, avatar_url")
          .in("user_id", Array.from(userIds));

        const profileMap = new Map();
        (profilesData || []).forEach(p => {
          profileMap.set(p.user_id, {
            name: p.full_name || "Unknown",
            email: p.email || "",
            avatar: p.avatar_url,
          });
        });
        setAdvisorProfiles(profileMap);

        // Group messages by conversation (by advisor)
        // We need to identify who the "advisor" is in each conversation
        // The admin sends to advisors, advisors reply back
        const conversationMap = new Map<string, Message[]>();

        (messagesData || []).forEach(msg => {
          // Determine the advisor ID (the non-admin party)
          // We'll use the recipient when admin sends, or sender when advisor replies
          // For now, group by the "other party" that appears in conversations
          const otherPartyId = msg.sender_id !== msg.recipient_id ? 
            (profileMap.has(msg.sender_id) && profileMap.get(msg.sender_id)?.name !== "Admin" ? msg.sender_id : msg.recipient_id) :
            msg.recipient_id;

          if (!conversationMap.has(otherPartyId)) {
            conversationMap.set(otherPartyId, []);
          }
          conversationMap.get(otherPartyId)!.push(msg);
        });

        // Convert to conversation groups
        const groups: ConversationGroup[] = [];
        conversationMap.forEach((messages, advisorId) => {
          const profile = profileMap.get(advisorId);
          if (profile && messages.length > 0) {
            const sortedMessages = messages.sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            
            // Count unread messages that were sent TO admin (by advisor)
            const unreadCount = messages.filter(m => 
              m.recipient_id !== advisorId && !m.read_at
            ).length;

            groups.push({
              advisorId,
              advisorName: profile.name,
              advisorEmail: profile.email,
              avatarUrl: profile.avatar,
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

    // Mark all unread messages from this advisor as read
    const unreadMessages = conversation.messages.filter(
      m => m.sender_id === conversation.advisorId && !m.read_at
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
    if (!replyContent.trim() || !selectedConversation) return;
    setIsSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("admin_messages").insert({
        sender_id: user.id,
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
            <div className="space-y-4">
              {selectedConversation?.messages
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map(msg => {
                  const isFromAdvisor = msg.sender_id === selectedConversation.advisorId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isFromAdvisor ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
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
