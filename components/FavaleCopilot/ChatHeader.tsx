import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  FileText, 
  Mic, 
  Settings, 
  Sun, 
  Moon, 
  Sparkles,
  Menu,
  X,
  Sidebar,
  PanelRightOpen,
  PanelRightClose
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';

interface ChatHeaderProps {
  onHistoryToggle: () => void;
  isHistoryOpen?: boolean;
  isArtifactsOpen?: boolean;
  onArtifactsToggle?: () => void;
}

export function ChatHeader({ 
  onHistoryToggle, 
  isHistoryOpen = false,
  isArtifactsOpen = false,
  onArtifactsToggle 
}: ChatHeaderProps) {
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-between p-3 md:p-4 border-b bg-card/80 backdrop-blur-sm relative z-10">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-ping" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Favale Copilot
            </h1>
            <Badge variant="secondary" className="text-xs px-2 py-0 mt-0.5">
              AI Pro
            </Badge>
          </div>
        </div>
      </div>

      {/* Center Section - Hidden on mobile */}
      <div className="hidden md:flex items-center gap-1">
        <Button 
          variant={isHistoryOpen ? "default" : "ghost"} 
          size="sm" 
          onClick={onHistoryToggle}
          className="gap-2"
        >
          <Sidebar className="h-4 w-4" />
          <span className="hidden lg:inline">Histórico</span>
        </Button>
        {onArtifactsToggle && (
          <Button 
            variant={isArtifactsOpen ? "default" : "ghost"} 
            size="sm" 
            onClick={onArtifactsToggle}
            className="gap-2"
          >
            {isArtifactsOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            <span className="hidden lg:inline">Artefatos</span>
          </Button>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Mic className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-8 w-8"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        {/* User Avatar */}
        <Avatar className="h-8 w-8 ring-2 ring-primary/20">
          <AvatarImage src="/placeholder-avatar.jpg" />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">FC</AvatarFallback>
        </Avatar>

        {/* Mobile Menu Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden h-8 w-8"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-card/95 backdrop-blur-sm border-b md:hidden z-50">
          <div className="p-3 space-y-2">
            <Button 
              variant={isHistoryOpen ? "default" : "ghost"} 
              size="sm" 
              onClick={() => {
                onHistoryToggle();
                setIsMobileMenuOpen(false);
              }}
              className="w-full justify-start gap-2"
            >
              <Sidebar className="h-4 w-4" />
              Histórico
            </Button>
            {onArtifactsToggle && (
              <Button 
                variant={isArtifactsOpen ? "default" : "ghost"} 
                size="sm" 
                onClick={() => {
                  onArtifactsToggle();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full justify-start gap-2"
              >
                {isArtifactsOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                Artefatos
              </Button>
            )}
            <div className="border-t pt-2 mt-2">
              <div className="flex items-center justify-around">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <FileText className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Mic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="h-8 w-8"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}