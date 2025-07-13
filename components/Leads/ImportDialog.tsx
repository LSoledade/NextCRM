'use client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Clock, Upload, CheckCircle, XCircle } from 'lucide-react';
import { useLeadImport } from '@/hooks/useLeadImport';
import { useAuth } from '@/contexts/AuthContext';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { user } = useAuth();
  const {
    importing,
    importResult,
    importProgress,
    importStatus,
    importErrors,
    totalRows,
    processedRows,
    fileInputRef,
    handleImportCSV,
    resetImportState
  } = useLeadImport();

  const handleCloseDialog = () => {
    if (!importing) {
      onOpenChange(false);
      resetImportState();
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && !importing) {
      onOpenChange(false);
      resetImportState();
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    handleImportCSV(e, user?.id);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Leads via CSV
          </DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV para importar leads em lote. Certifique-se de que o arquivo segue o formato correto.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status do Import */}
          {importStatus !== 'idle' && (
            <div className="p-4 rounded-lg bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-full bg-white dark:bg-slate-700 shadow-sm">
                  {importStatus === 'parsing' && <Clock className="w-5 h-5 text-blue-500" />}
                  {importStatus === 'uploading' && <Upload className="w-5 h-5 text-blue-500" />}
                  {importStatus === 'processing' && <Clock className="w-5 h-5 text-blue-500 animate-spin" />}
                  {importStatus === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {importStatus === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {importStatus === 'parsing' && 'Analisando arquivo...'}
                  {importStatus === 'uploading' && 'Preparando importação...'}
                  {importStatus === 'processing' && 'Processando leads...'}
                  {importStatus === 'completed' && 'Importação concluída!'}
                  {importStatus === 'error' && 'Erro na importação'}
                </span>
              </div>
              
              {/* Barra de Progresso */}
              {(importStatus === 'processing' || importStatus === 'completed') && (
                <div className="space-y-3">
                  <Progress value={importProgress} className="w-full h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="font-medium">{processedRows} de {totalRows} processados</span>
                    <span className="font-bold">{Math.round(importProgress)}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form de Upload */}
          {importStatus === 'idle' && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                    <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      Selecione um arquivo CSV para importar
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Arquivos CSV até 50MB. Suporte para até 50.000 leads.
                    </p>
                  </div>
                  <form onSubmit={handleFormSubmit} className="w-full space-y-4">
                    <input 
                      type="file" 
                      accept=".csv" 
                      ref={fileInputRef} 
                      required 
                      disabled={importing}
                      className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-400"
                    />
                    <div className="text-center">
                      <a href="/leads_template.csv" download className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline text-sm font-medium">
                        <Upload className="w-4 h-4 mr-1" />
                        Baixar template CSV
                      </a>
                    </div>
                    <Button type="submit" disabled={importing} className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                      {importing ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Iniciar Importação
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Resultado da Importação */}
          {importResult && (
            <div className={`p-4 rounded-lg border ${
              importStatus === 'error' 
                ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800' 
                : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
            }`}>
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  importStatus === 'error' 
                    ? 'bg-red-100 dark:bg-red-800' 
                    : 'bg-green-100 dark:bg-green-800'
                }`}>
                  {importStatus === 'error' ? (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    importStatus === 'error' ? 'text-red-900 dark:text-red-100' : 'text-green-900 dark:text-green-100'
                  }`}>
                    {importResult}
                  </p>
                  {importStatus === 'error' && (
                    <div className="mt-3">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={resetImportState}
                        className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/20"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Tentar Novamente
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Erros de Importação */}
          {importErrors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <h4 className="text-sm font-semibold text-red-900 dark:text-red-100">
                  Erros encontrados ({importErrors.length}):
                </h4>
              </div>
              <div className="max-h-40 overflow-y-auto bg-white dark:bg-red-900/10 rounded border border-red-200 dark:border-red-700 p-3">
                <div className="text-xs space-y-2">
                  {importErrors.slice(0, 10).map((error, index) => (
                    <div key={index} className="flex items-start space-x-2 text-red-700 dark:text-red-300">
                      <span className="font-medium min-w-0">Linha {error.line}:</span>
                      <span className="flex-1">{error.error}</span>
                    </div>
                  ))}
                  {importErrors.length > 10 && (
                    <div className="text-red-600 dark:text-red-400 font-medium pt-2 border-t border-red-200 dark:border-red-700">
                      ... e mais {importErrors.length - 10} erros
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          {importStatus === 'completed' && (
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleCloseDialog}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Fechar
              </Button>
              <Button 
                size="lg" 
                onClick={resetImportState}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Nova Importação
              </Button>
            </div>
          )}

          {importStatus === 'error' && (
            <div className="pt-2">
              <Button 
                variant="outline" 
                size="lg" 
                onClick={resetImportState}
                className="w-full border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                <Upload className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}