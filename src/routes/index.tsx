import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { evolutionService } from "@/lib/api/evolution";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare, RefreshCw, Plus, Key, Link as LinkIcon, Smartphone } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newInstance, setNewInstance] = useState({ name: "", token: "" });
  const [qrCode, setQrCode] = useState<string | null>(null);

  const { data: instances, isLoading, refetch } = useQuery({
    queryKey: ["instances"],
    queryFn: evolutionService.getInstances,
  });

  const createMutation = useMutation({
    mutationFn: (data: { instanceName: string; token: string }) => 
      evolutionService.createInstance(data),
    onSuccess: (data) => {
      toast.success("Instância criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["instances"] });
      setIsCreateModalOpen(false);
      // Se a API retornar dados de conexão/QR, poderíamos mostrar aqui
    },
    onError: () => {
      toast.error("Erro ao criar instância. Verifique as configurações.");
    }
  });

  const connectMutation = useMutation({
    mutationFn: (name: string) => evolutionService.connectInstance(name),
    onSuccess: (data) => {
      if (data.code) {
        setQrCode(data.code);
        toast.info("QR Code gerado! Escaneie no seu WhatsApp.");
      } else {
        toast.success("Solicitação de conexão enviada.");
      }
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstance.name) return;
    createMutation.mutate({ 
      instanceName: newInstance.name, 
      token: newInstance.token || "global" 
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-center border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evolution API</h1>
          <p className="text-muted-foreground">Gerencie suas instâncias e conexões do WhatsApp.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> 
            Atualizar
          </Button>
          
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Nova Instância
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Instância</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome da Instância</label>
                  <Input 
                    placeholder="ex: vendas-whatsapp" 
                    value={newInstance.name}
                    onChange={(e) => setNewInstance({...newInstance, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Token Interno (Opcional)</label>
                  <Input 
                    placeholder="Deixe em branco para padrão" 
                    value={newInstance.token}
                    onChange={(e) => setNewInstance({...newInstance, token: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  Criar Instância
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Configurações da API */}
      <section className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-primary" /> Configuração API
            </CardTitle>
            <CardDescription>Dados de conexão com o servidor Evolution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">Endpoint</p>
              <p className="text-sm font-mono truncate bg-muted p-2 rounded">
                {import.meta.env.VITE_EVOLUTION_API_URL || "http://localhost:8080"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">API Key</p>
              <p className="text-sm font-mono truncate bg-muted p-2 rounded flex justify-between items-center">
                <span>••••••••••••</span>
                <Key className="h-3 w-3 opacity-50" />
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Edite o arquivo .env para alterar estas chaves.
            </p>
          </CardContent>
        </Card>

        {/* Lista de Instâncias */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Smartphone className="h-5 w-5" /> Instâncias Ativas
          </h2>
          
          {isLoading ? (
            <div className="flex justify-center p-12 bg-muted/20 rounded-lg border">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : instances && Array.isArray(instances) && instances.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {instances.map((instance: any) => (
                <Card key={instance.instanceName} className="overflow-hidden">
                  <div className={`h-1 w-full ${instance.status === 'open' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex justify-between items-center">
                      {instance.instanceName}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        instance.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {instance.status === 'open' ? 'Conectado' : 'Aguardando'}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {instance.status !== 'open' && (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full"
                        onClick={() => connectMutation.mutate(instance.instanceName)}
                        disabled={connectMutation.isPending}
                      >
                        {connectMutation.isPending ? <Loader2 className="animate-spin mr-2 h-3 w-3" /> : <LinkIcon className="mr-2 h-3 w-3" />}
                        Gerar QR Code
                      </Button>
                    )}
                    <Link to="/chats/$instanceName" params={{ instanceName: instance.instanceName }}>
                      <Button variant={instance.status === 'open' ? 'default' : 'outline'} className="w-full" size="sm">
                        <MessageSquare className="mr-2 h-4 w-4" /> 
                        {instance.status === 'open' ? 'Abrir Conversas' : 'Ver Histórico'}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Smartphone className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg">Nenhuma instância</CardTitle>
              <CardDescription className="max-w-[250px] mt-2">
                Você ainda não criou nenhuma instância na Evolution API.
              </CardDescription>
              <Button variant="outline" size="sm" className="mt-6" onClick={() => setIsCreateModalOpen(true)}>
                Começar agora
              </Button>
            </Card>
          )}
        </div>
      </section>

      {/* QR Code Modal Display */}
      {qrCode && (
        <Card className="border-primary bg-primary/5 max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Escaneie o QR Code</CardTitle>
            <CardDescription className="text-center">Abra o WhatsApp > Aparelhos Conectados > Conectar um Aparelho</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-6">
            <div className="bg-white p-4 rounded-lg shadow-inner mb-4">
              <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setQrCode(null)}>Fechar</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
