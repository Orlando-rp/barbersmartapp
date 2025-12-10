import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useSharedBarbershopId } from "@/hooks/useSharedBarbershopId";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import * as XLSX from "xlsx";

interface ImportResult {
  success: number;
  errors: string[];
}

interface ClientImportDialogProps {
  onSuccess: () => void;
  children: React.ReactNode;
}

export function ClientImportDialog({ onSuccess, children }: ClientImportDialogProps) {
  const { sharedBarbershopId } = useSharedBarbershopId();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    // Create template data
    const templateData = [
      {
        nome: "João Silva",
        telefone: "11999998888",
        email: "joao@email.com",
        aniversario: "1990-05-15",
        tags: "VIP, Frequente",
        notas: "Cliente preferencial"
      },
      {
        nome: "Maria Santos",
        telefone: "11987654321",
        email: "maria@email.com",
        aniversario: "1985-10-20",
        tags: "Novo",
        notas: ""
      }
    ];

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");

    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // nome
      { wch: 15 }, // telefone
      { wch: 25 }, // email
      { wch: 12 }, // aniversario
      { wch: 20 }, // tags
      { wch: 30 }, // notas
    ];

    // Download
    XLSX.writeFile(wb, "modelo_importacao_clientes.xlsx");

    toast({
      title: "Modelo baixado",
      description: "O arquivo modelo foi baixado com sucesso.",
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        throw new Error("O arquivo está vazio ou não possui dados válidos.");
      }

      const importResult: ImportResult = { success: 0, errors: [] };

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNum = i + 2; // Excel rows start at 1, plus header

        try {
          // Validate required fields
          const nome = row.nome || row.Nome || row.NOME;
          const telefone = row.telefone || row.Telefone || row.TELEFONE;

          if (!nome || !telefone) {
            importResult.errors.push(`Linha ${rowNum}: Nome e telefone são obrigatórios.`);
            continue;
          }

          // Parse optional fields
          const email = row.email || row.Email || row.EMAIL || null;
          const aniversario = row.aniversario || row.Aniversario || row.ANIVERSARIO || null;
          const tagsStr = row.tags || row.Tags || row.TAGS || "";
          const notas = row.notas || row.Notas || row.NOTAS || null;

          // Parse tags
          const tags = tagsStr
            ? tagsStr.split(",").map((t: string) => t.trim()).filter((t: string) => t)
            : [];

          // Check for duplicate phone in shared barbershop
          const { data: childUnits } = await supabase
            .from('barbershops')
            .select('id')
            .eq('parent_id', sharedBarbershopId);
          
          const allBarbershopIds = [sharedBarbershopId, ...(childUnits?.map(u => u.id) || [])];
          
          const { data: existing } = await supabase
            .from('clients')
            .select('id')
            .in('barbershop_id', allBarbershopIds)
            .eq('phone', String(telefone).replace(/\D/g, ''))
            .maybeSingle();

          if (existing) {
            importResult.errors.push(`Linha ${rowNum}: Cliente com telefone ${telefone} já existe.`);
            continue;
          }

          // Insert client
          const clientData: any = {
            barbershop_id: sharedBarbershopId,
            name: nome,
            phone: String(telefone).replace(/\D/g, ''),
            email: email,
            tags: tags,
            notes: notas,
            active: true,
          };
          
          // Only add birth_date if provided
          if (aniversario) {
            clientData.birth_date = aniversario;
          }
          
          const { error } = await supabase
            .from('clients')
            .insert(clientData);

          if (error) {
            importResult.errors.push(`Linha ${rowNum}: ${error.message}`);
          } else {
            importResult.success++;
          }
        } catch (err: any) {
          importResult.errors.push(`Linha ${rowNum}: ${err.message}`);
        }
      }

      setResult(importResult);

      if (importResult.success > 0) {
        toast({
          title: "Importação concluída",
          description: `${importResult.success} cliente(s) importado(s) com sucesso.`,
        });
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClose = () => {
    setOpen(false);
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(v); }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Clientes
          </DialogTitle>
          <DialogDescription>
            Importe clientes de uma planilha Excel (.xlsx) ou CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template */}
          <div className="p-4 border border-dashed border-border rounded-lg bg-muted/30">
            <div className="flex items-start gap-3">
              <Download className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-sm">Arquivo Modelo</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Baixe o modelo e preencha com os dados dos clientes.
                </p>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Modelo
                </Button>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="p-4 border border-dashed border-border rounded-lg bg-muted/30">
            <div className="flex items-start gap-3">
              <Upload className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-sm">Enviar Arquivo</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Selecione o arquivo preenchido para importar.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={importing}
                />
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  {importing ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Selecionar Arquivo
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="space-y-2">
              {result.success > 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <AlertTitle className="text-success">Sucesso</AlertTitle>
                  <AlertDescription>
                    {result.success} cliente(s) importado(s) com sucesso.
                  </AlertDescription>
                </Alert>
              )}
              
              {result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erros encontrados</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside text-xs mt-1 max-h-32 overflow-y-auto">
                      {result.errors.slice(0, 10).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                      {result.errors.length > 10 && (
                        <li>... e mais {result.errors.length - 10} erro(s)</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Campos obrigatórios:</strong> nome, telefone</p>
            <p><strong>Campos opcionais:</strong> email, aniversario (AAAA-MM-DD), tags (separadas por vírgula), notas</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
