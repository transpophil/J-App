import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink } from "lucide-react";

type DocRow = {
  id: string;
  name: string;
  file_url: string;
  created_at: string;
};

export default function DocsTab() {
  const [docs, setDocs] = useState<DocRow[]>([]);

  async function loadDocs() {
    const { data, error } = await supabase
      .from("documents")
      .select("id,name,file_url,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load documents", error);
      return;
    }

    setDocs((data ?? []) as DocRow[]);
  }

  useEffect(() => {
    loadDocs();

    const channel = supabase
      .channel("documents_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () => loadDocs())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-4">
      <Card className="p-6 shadow-elevated bg-card/80 backdrop-blur-md border-border/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Docs</h2>
            <p className="text-sm text-muted-foreground">Open documents uploaded by the admin</p>
          </div>
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
      </Card>

      {docs.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">No documents uploaded yet.</Card>
      ) : (
        <div className="space-y-3">
          {docs.map((d) => (
            <Card key={d.id} className="p-4 bg-card/80 backdrop-blur-md border-border/50">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground truncate">{d.name}</div>
                </div>
                <Button asChild variant="outline" className="gap-2 shrink-0">
                  <a href={d.file_url} target="_blank" rel="noreferrer">
                    Open
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
