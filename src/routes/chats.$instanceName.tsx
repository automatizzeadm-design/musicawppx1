import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { evolutionService } from "@/lib/api/evolution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, RefreshCw, LogOut } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

export const Route = createFileRoute("/chats/$instanceName")({
  component: ChatView,
});

function ChatView() {
  const { instanceName } = Route.useParams();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  const { data: chats, isLoading: loadingChats } = useQuery({
    queryKey: ["chats", instanceName],
    queryFn: () => evolutionService.getChats(instanceName),
  });

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ["messages", instanceName, selectedChat],
    queryFn: () => evolutionService.getMessages(instanceName, selectedChat!),
    enabled: !!selectedChat,
  });

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar: Chat List */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Conversas</h2>
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {loadingChats ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
          ) : (
            chats?.map((chat: any) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat.id)}
                className={`w-full text-left p-4 hover:bg-accent transition-colors border-b ${
                  selectedChat === chat.id ? "bg-accent" : ""
                }`}
              >
                <div className="font-medium truncate">{chat.name || chat.id}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {chat.lastMessage?.message?.conversation || "Sem mensagens"}
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Main: Messages */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 border-b">
              <h2 className="font-semibold">{selectedChat}</h2>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {loadingMessages ? (
                  <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                ) : (
                  messages?.map((msg: any) => (
                    <div
                      key={msg.key.id}
                      className={`flex ${msg.key.fromMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          msg.key.fromMe
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">
                          {msg.message?.conversation || msg.message?.extendedTextMessage?.text || "[Mídia]"}
                        </p>
                        <div className="text-[10px] opacity-70 mt-1">
                          {msg.messageTimestamp && format(new Date(msg.messageTimestamp * 1000), "HH:mm")}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Envie uma mensagem (Apenas leitura no momento)..."
                  disabled
                  className="flex-1 p-2 border rounded-md bg-muted cursor-not-allowed"
                />
                <Button disabled>Enviar</Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Selecione uma conversa para começar
          </div>
        )}
      </div>
    </div>
  );
}
