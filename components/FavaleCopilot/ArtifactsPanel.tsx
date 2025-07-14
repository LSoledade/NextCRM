import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Code, 
  Image, 
  Download, 
  Copy, 
  ExternalLink,
  Search,
  Sparkles,
  FileCode,
  Database,
  Globe,
  Palette,
  MoreHorizontal,
  Eye,
  Edit3
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface Artifact {
  id: string;
  title: string;
  type: 'code' | 'document' | 'image' | 'data' | 'web' | 'design';
  content: string;
  language?: string;
  size?: string;
  createdAt: Date;
  isActive?: boolean;
}

const mockArtifacts: Artifact[] = [
  {
    id: '1',
    title: 'API de Autenticação',
    type: 'code',
    language: 'typescript',
    content: `import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password } = req.body;
  
  // Validate credentials
  const user = await validateUser(email, password);
  
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );

  res.status(200).json({ token, user });
}`,
    size: '1.2 KB',
    createdAt: new Date(Date.now() - 1000 * 60 * 15),
    isActive: true
  },
  {
    id: '2',
    title: 'Relatório de Vendas',
    type: 'document',
    content: `# Relatório de Vendas - Q4 2024

## Resumo Executivo

O quarto trimestre de 2024 apresentou resultados excepcionais, com um crescimento de 35% em relação ao mesmo período do ano anterior.

### Principais Métricas

- **Receita Total**: R$ 2.450.000
- **Novos Clientes**: 1.247
- **Taxa de Conversão**: 12.8%
- **Ticket Médio**: R$ 1.965

### Análise por Segmento

#### Enterprise
- Crescimento de 42%
- Principais drivers: automação e IA

#### SMB
- Crescimento de 28%
- Foco em soluções cloud

## Recomendações

1. Expandir equipe de vendas enterprise
2. Investir em marketing digital
3. Desenvolver parcerias estratégicas`,
    size: '3.4 KB',
    createdAt: new Date(Date.now() - 1000 * 60 * 30)
  },
  {
    id: '3',
    title: 'Consulta SQL Otimizada',
    type: 'data',
    language: 'sql',
    content: `-- Consulta otimizada para relatório de vendas
WITH monthly_sales AS (
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    SUM(amount) as total_amount,
    COUNT(*) as order_count,
    COUNT(DISTINCT customer_id) as unique_customers
  FROM orders 
  WHERE created_at >= '2024-01-01'
    AND status = 'completed'
  GROUP BY DATE_TRUNC('month', created_at)
),
running_totals AS (
  SELECT 
    month,
    total_amount,
    order_count,
    unique_customers,
    SUM(total_amount) OVER (ORDER BY month) as cumulative_revenue
  FROM monthly_sales
)
SELECT 
  month,
  total_amount,
  order_count,
  unique_customers,
  cumulative_revenue,
  ROUND(
    (total_amount - LAG(total_amount) OVER (ORDER BY month)) / 
    LAG(total_amount) OVER (ORDER BY month) * 100, 2
  ) as growth_rate
FROM running_totals
ORDER BY month;`,
    size: '892 B',
    createdAt: new Date(Date.now() - 1000 * 60 * 45)
  }
];

const getArtifactIcon = (type: Artifact['type']) => {
  switch (type) {
    case 'code': return FileCode;
    case 'document': return FileText;
    case 'image': return Image;
    case 'data': return Database;
    case 'web': return Globe;
    case 'design': return Palette;
    default: return FileText;
  }
};

const getArtifactColor = (type: Artifact['type']) => {
  switch (type) {
    case 'code': return 'text-blue-500';
    case 'document': return 'text-green-500';
    case 'image': return 'text-purple-500';
    case 'data': return 'text-orange-500';
    case 'web': return 'text-cyan-500';
    case 'design': return 'text-pink-500';
    default: return 'text-gray-500';
  }
};

export function ArtifactsPanel() {
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(
    mockArtifacts.find(a => a.isActive)?.id || null
  );
  const [activeTab, setActiveTab] = useState('all');

  const filteredArtifacts = mockArtifacts.filter(artifact => {
    if (activeTab === 'all') return true;
    return artifact.type === activeTab;
  });

  const selectedArtifactData = mockArtifacts.find(a => a.id === selectedArtifact);

  return (
    <div className="h-full flex flex-col bg-card/30 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Artefatos
          </h2>
          <Badge variant="secondary" className="text-xs">
            {filteredArtifacts.length}
          </Badge>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-8">
            <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
            <TabsTrigger value="code" className="text-xs">Código</TabsTrigger>
            <TabsTrigger value="document" className="text-xs">Docs</TabsTrigger>
            <TabsTrigger value="data" className="text-xs">Dados</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 flex">
        {/* Artifacts List */}
        <div className="w-1/3 border-r border-border/50">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {filteredArtifacts.map((artifact) => {
                const Icon = getArtifactIcon(artifact.type);
                const isSelected = selectedArtifact === artifact.id;
                
                return (
                  <div
                    key={artifact.id}
                    className={cn(
                      "group relative rounded-lg p-3 cursor-pointer transition-all duration-200",
                      "hover:bg-accent/50 hover:shadow-sm",
                      isSelected && "bg-accent border border-primary/20"
                    )}
                    onClick={() => setSelectedArtifact(artifact.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", getArtifactColor(artifact.type))} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate mb-1">
                          {artifact.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {artifact.language && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {artifact.language}
                            </Badge>
                          )}
                          {artifact.size && (
                            <span>{artifact.size}</span>
                          )}
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="text-xs">
                            <Eye className="h-3 w-3 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs">
                            <Copy className="h-3 w-3 mr-2" />
                            Copiar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs">
                            <Download className="h-3 w-3 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-xs">
                            <Edit3 className="h-3 w-3 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
              
              {filteredArtifacts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Nenhum artefato encontrado
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Artefatos aparecerão aqui conforme você conversa
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Artifact Preview */}
        <div className="flex-1 flex flex-col">
          {selectedArtifactData ? (
            <>
              {/* Preview Header */}
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = getArtifactIcon(selectedArtifactData.type);
                      return <Icon className={cn("h-4 w-4", getArtifactColor(selectedArtifactData.type))} />;
                    })()}
                    <h3 className="font-medium">{selectedArtifactData.title}</h3>
                    {selectedArtifactData.language && (
                      <Badge variant="outline" className="text-xs">
                        {selectedArtifactData.language}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Preview Content */}
              <ScrollArea className="flex-1">
                <div className="p-4">
                  <pre className="text-sm bg-muted/30 rounded-lg p-4 overflow-x-auto">
                    <code>{selectedArtifactData.content}</code>
                  </pre>
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1">
                  Selecione um artefato
                </p>
                <p className="text-xs text-muted-foreground">
                  Escolha um artefato da lista para visualizar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}