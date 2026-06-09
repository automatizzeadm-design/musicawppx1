import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, MessageSquare, Plus, Settings } from "lucide-react";

export const Route = createFileRoute("/chat")({
  component: TypebotManagerPage,
});

function TypebotManagerPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bot className="h-7 w-7 text-primary" /> Typebot Manager
            </h1>
            <p className="text-muted-foreground">Crie e gerencie seus fluxos de conversa inteligentes.</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Novo Bot
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center">
            <Bot className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
            <CardTitle className="text-lg">Nenhum Typebot criado</CardTitle>
            <CardDescription className="mb-4">
              Você ainda não possui fluxos de conversa configurados.
            </CardDescription>
            <Button variant="outline">Começar agora</Button>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" /> Configurações Globais
              </CardTitle>
              <CardDescription>Configure a conexão com seu servidor Typebot.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">URL do Servidor Typebot</label>
                <input 
                  type="url" 
                  placeholder="https://typebot.io"
                  className="w-full p-2 border rounded-md bg-background"
                />
              </div>
              <Button className="w-full">Salvar Conexão</Button>
            </CardContent>
          </Card>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg dark:bg-amber-900/20 dark:border-amber-900/30">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Em breve:</strong> Esta área será utilizada para integrar seus fluxos do Typebot diretamente com o agente de WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}
