import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { evolutionService } from "@/lib/api/evolution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, RefreshCw, LogOut, Settings, Bot } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar: Chat List */}
      <div className="w-80 border-r flex flex-col bg-muted/30">
        <div className="p-4 border-b flex justify-between items-center bg-background">
          <h2 className="font-semibold">Conversas</h2>
          <div className="flex gap-1">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <LogOut className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loadingChats ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
          ) : (
            chats && Array.isArray(chats) ? chats.map((chat: any) => (
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
            )) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhuma conversa encontrada.
              </div>
            )
          )}
        </ScrollArea>
      </div>

      {/* Main Content Area with Tabs */}
      <div className="flex-1 flex flex-col min-w-0">
        <Tabs defaultValue="chat" className="flex-1 flex flex-col">
          <div className="px-4 border-b flex justify-between items-center h-14 bg-background">
            <TabsList className="grid w-[400px] grid-cols-2">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="agent">Agente IA</TabsTrigger>
            </TabsList>
            <div className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
              Instância: {instanceName}
            </div>
          </div>

          <TabsContent value="chat" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
            {selectedChat ? (
              <>
                <div className="p-4 border-b bg-background/50 backdrop-blur">
                  <h2 className="font-semibold truncate">{selectedChat}</h2>
                </div>
                <ScrollArea className="flex-1 p-4 bg-muted/10">
                  <div className="space-y-4 max-w-4xl mx-auto">
                    {loadingMessages ? (
                      <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                    ) : (
                      messages && Array.isArray(messages) ? messages.map((msg: any) => (
                        <div
                          key={msg.key.id}
                          className={`flex ${msg.key.fromMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-2xl ${
                              msg.key.fromMe
                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                : "bg-background border rounded-tl-none shadow-sm"
                            }`}
                          >
                            <p className="text-sm break-words">
                              {msg.message?.conversation || msg.message?.extendedTextMessage?.text || "[Mídia não suportada]"}
                            </p>
                            <div className={`text-[10px] mt-1 text-right ${msg.key.fromMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {msg.messageTimestamp && format(new Date(msg.messageTimestamp * 1000), "HH:mm")}
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground italic">
                          Histórico de mensagens vazio ou indisponível
                        </div>
                      )
                    )}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t bg-background">
                  <div className="flex gap-2 max-w-4xl mx-auto w-full">
                    <input
                      type="text"
                      placeholder="As mensagens são apenas para visualização neste modo..."
                      disabled
                      className="flex-1 p-2 border rounded-md bg-muted cursor-not-allowed outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button disabled size="default">Enviar</Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-2">
                <MessageSquare className="h-12 w-12 opacity-20" />
                <p>Selecione uma conversa para visualizar as mensagens</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="agent" className="flex-1 m-0 p-8 overflow-auto">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Configuração do Agente IA</h2>
                  <p className="text-sm text-muted-foreground">Conecte sua instância a um cérebro inteligente.</p>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4" /> Webhook de Integração
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">URL do Webhook (Dify, Typebot, n8n, etc.)</label>
                    <input 
                      type="url" 
                      placeholder="https://sua-api.com/webhook"
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Ativar Resposta Automática</p>
                      <p className="text-xs text-muted-foreground">O agente responderá a todas as novas mensagens.</p>
                    </div>
                    <Button variant="outline" size="sm">Habilitar</Button>
                  </div>
                  <Button className="w-full">Salvar Configurações</Button>
                </CardContent>
              </Card>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg dark:bg-blue-900/20 dark:border-blue-900/30">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Dica:</strong> Para conectar um agente, você também pode configurar as Webhooks diretamente no painel da Evolution API apontando para o seu serviço de IA.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
