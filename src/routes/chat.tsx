import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { evolutionService } from "@/lib/api/evolution";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare, Bot, PlusCircle, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/chat")({
  component: ChatInstancesPage,
});

function ChatInstancesPage() {
  const [apiKey, setApiKey] = useState(localStorage.getItem("evolution_api_key") || "");
  
  const { data: instances, isLoading, refetch, error } = useQuery({
    queryKey: ["instances", apiKey],
    queryFn: async () => {
      if (!apiKey) return [];
      localStorage.setItem("evolution_api_key", apiKey);
      return evolutionService.getInstances();
    },
    enabled: !!apiKey,
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col gap-2 border-b pb-4">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" /> Central de Chat
          </h1>
          <p className="text-muted-foreground">Gerencie suas instâncias da Evolution API e visualize conversas.</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Configuração de Acesso</CardTitle>
            <CardDescription>Insira sua API Key da Evolution API para listar as instâncias.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Evolution API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button onClick={() => refetch()}>Conectar</Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : instances && instances.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {instances.map((instance: any) => (
              <Card key={instance.instanceName} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg truncate">{instance.instanceName}</CardTitle>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      instance.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {instance.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      ID: {instance.owner || 'N/A'}
                    </div>
                    <Link to="/chats/$instanceName" params={{ instanceName: instance.instanceName }}>
                      <Button className="w-full gap-2" variant={instance.status === 'open' ? 'default' : 'outline'}>
                        <MessageSquare className="h-4 w-4" /> Abrir Chats
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : apiKey ? (
          <Card className="p-12 text-center border-dashed">
            <div className="flex flex-col items-center gap-2">
              <PlusCircle className="h-10 w-10 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">Nenhuma instância encontrada ou chave inválida.</p>
              <Button variant="link" onClick={() => refetch()}>Tentar novamente</Button>
            </div>
          </Card>
        ) : (
          <div className="p-12 text-center text-muted-foreground border rounded-lg bg-muted/20">
            Conecte sua API Key acima para ver as instâncias disponíveis.
          </div>
        )}
      </div>
    </div>
  );
}
