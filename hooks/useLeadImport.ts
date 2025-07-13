'use client';

import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

type ImportStatus = 'idle' | 'parsing' | 'uploading' | 'processing' | 'completed' | 'error';

interface ImportError {
  line: number;
  error: string;
}

export function useLeadImport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [processedRows, setProcessedRows] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Função para processar chunk com retry
  const processChunkWithRetry = async (chunk: any[], jobId: string, chunkIndex: number, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Enviando chunk ${chunkIndex}, tentativa ${attempt}`);
        const response = await fetch('/api/leads/import/batch/chunk', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jobId,
            chunkIndex,
            data: chunk
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`Chunk ${chunkIndex} processado com sucesso:`, result);
          return; // Sucesso
        }

        const errorData = await response.json();
        console.error(`Erro no chunk ${chunkIndex}, tentativa ${attempt}:`, errorData);
        if (attempt === maxRetries) {
          throw new Error(errorData.error || 'Falha ao processar chunk');
        }

        // Backoff exponencial
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      } catch (error) {
        console.error(`Erro no chunk ${chunkIndex}, tentativa ${attempt}:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  };

  // Polling para acompanhar progresso do job
  const startPolling = (jobId: string) => {
    console.log('Iniciando polling para jobId:', jobId);
    let pollCount = 0;
    const maxPolls = 150; // 5 minutos máximo (150 * 2s = 300s)
    
    pollingIntervalRef.current = setInterval(async () => {
      pollCount++;
      
      if (pollCount > maxPolls) {
        console.error('Timeout do polling atingido');
        setImportStatus('error');
        setImportResult('Timeout: A importação demorou mais que o esperado. Verifique o console para mais detalhes.');
        toast({ 
          title: 'Timeout da importação', 
          description: 'A importação demorou mais que o esperado. Verifique se os dados foram importados.',
          variant: 'destructive' 
        });
        setImporting(false);
        stopPolling();
        return;
      }
      
      try {
        console.log(`Verificando status do job (${pollCount}/${maxPolls}):`, jobId);
        const response = await fetch(`/api/leads/import/batch/status/${jobId}`);
        if (!response.ok) {
          console.error('Erro ao buscar status:', response.status, response.statusText);
          if (response.status === 401) {
            setImportStatus('error');
            setImportResult('Erro de autenticação. Faça login novamente.');
            toast({ title: 'Erro de autenticação', description: 'Faça login novamente.', variant: 'destructive' });
            setImporting(false);
            stopPolling();
          }
          return;
        }

        const status = await response.json();
        console.log('Status atual do job:', status);
        
        setProcessedRows(status.processedRows);
        setImportProgress((status.processedRows / status.totalRows) * 100);

        if (status.errors && status.errors.length > 0) {
          setImportErrors(status.errors);
        }

        if (status.status === 'completed') {
          console.log('Importação concluída!');
          setImportStatus('completed');
          setImportResult(`Importação concluída: ${status.successCount} leads importados com sucesso.`);
          toast({ 
            title: 'Importação concluída!', 
            description: `${status.successCount} leads importados. ${status.errorCount || 0} erros.`,
            variant: 'default' 
          });
          setImporting(false);
          stopPolling();
          
          // Invalidar cache de leads para recarregar a lista
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        } else if (status.status === 'failed') {
          console.log('Importação falhou!');
          setImportStatus('error');
          setImportResult(`Erro na importação: ${status.error || 'Erro desconhecido'}`);
          toast({ title: 'Erro na importação', description: status.error || 'Erro desconhecido', variant: 'destructive' });
          setImporting(false);
          stopPolling();
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
        if (pollCount > 5) { // Só mostrar erro após algumas tentativas
          setImportStatus('error');
          setImportResult(`Erro de comunicação: ${error}`);
          setImporting(false);
          stopPolling();
        }
      }
    }, 2000); // Poll a cada 2 segundos
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Função principal para importar leads via CSV
  const handleImportCSV = async (e: React.FormEvent<HTMLFormElement>, userId?: string) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.[0]) return;
    
    const file = fileInputRef.current.files[0];
    setImporting(true);
    setImportResult(null);
    setImportErrors([]);
    setImportProgress(0);
    setProcessedRows(0);
    setTotalRows(0);
    setImportStatus('parsing');

    try {
      // Step 1: Parse CSV com streaming para não travar UI
      const csvData: any[] = [];
      let rowCount = 0;

      await new Promise<void>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          step: (row: any) => {
            rowCount++;
            if (row.data && Object.keys(row.data).length > 0) {
              csvData.push(row.data);
            }
            // Update progress durante parsing
            if (rowCount % 100 === 0) {
              setTotalRows(rowCount);
            }
          },
          complete: () => {
            setTotalRows(csvData.length);
            resolve();
          },
          error: (error: any) => {
            reject(new Error(`Erro ao processar CSV: ${error.message}`));
          }
        });
      });

      setImportStatus('uploading');

      // Step 2: Enviar para processamento assíncrono em chunks
      const CHUNK_SIZE = 1000;
      const chunks = [];
      
      for (let i = 0; i < csvData.length; i += CHUNK_SIZE) {
        chunks.push(csvData.slice(i, i + CHUNK_SIZE));
      }

      // Iniciar job de importação
      console.log('Iniciando job de importação...', { totalRows: csvData.length, totalChunks: chunks.length, userId });
      const initResponse = await fetch('/api/leads/import/batch', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          totalRows: csvData.length,
          totalChunks: chunks.length,
          userId
        })
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        console.error('Erro ao inicializar importação:', errorData);
        throw new Error(errorData.error || 'Falha ao inicializar importação');
      }

      const { jobId } = await initResponse.json();
      console.log('Job criado com ID:', jobId);
      setImportJobId(jobId);
      setImportStatus('processing');

      // Enviar chunks sequencialmente com retry
      console.log('Enviando chunks...', chunks.length);
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Processando chunk ${i + 1}/${chunks.length}`);
        await processChunkWithRetry(chunks[i], jobId, i);
        setProcessedRows((i + 1) * CHUNK_SIZE);
        setImportProgress(((i + 1) / chunks.length) * 100);
      }

      console.log('Finalizando job...');
      // Finalizar job
      const completeResponse = await fetch('/api/leads/import/batch/complete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobId })
      });

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json();
        console.error('Erro ao finalizar job:', errorData);
      }

      console.log('Iniciando polling...');
      // Iniciar polling para status final
      startPolling(jobId);

    } catch (error: any) {
      setImportStatus('error');
      setImportResult(`Erro: ${error.message}`);
      toast({ title: 'Erro ao importar leads', description: error.message, variant: 'destructive' });
      setImporting(false);
    }
  };

  // Reset import state
  const resetImportState = () => {
    setImportStatus('idle');
    setImportResult(null);
    setImportErrors([]);
    setImportProgress(0);
    setProcessedRows(0);
    setTotalRows(0);
    setImportJobId(null);
    stopPolling();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    importing,
    importResult,
    importProgress,
    importJobId,
    importStatus,
    importErrors,
    totalRows,
    processedRows,
    fileInputRef,
    handleImportCSV,
    resetImportState,
    stopPolling
  };
}