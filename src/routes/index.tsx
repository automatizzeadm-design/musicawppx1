import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { evolutionService } from "@/lib/api/evolution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: instances, isLoading, refetch } = useQuery({
    queryKey: ["instances"],
    queryFn: evolutionService.getInstances,
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">WhatsApp Manager</h1>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {instances?.map((instance: any) => (
            <Card key={instance.instanceName}>
              <CardHeader>
                <CardTitle className="text-lg">{instance.instanceName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">Status: {instance.status}</p>
                <Button className="w-full">
                  <MessageSquare className="mr-2 h-4 w-4" /> Open Chats
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
