import React, { useEffect, useState } from 'react';
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Thermometer, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function getWeatherIcon(code: string, size = 'w-4 h-4') {
  const baseClass = `${size} transition-colors duration-200`;
  if (code.includes('rain') || code.includes('chuva')) return <CloudRain className={`${baseClass} text-blue-500`} />;
  if (code.includes('snow') || code.includes('neve')) return <CloudSnow className={`${baseClass} text-sky-400`} />;
  if (code.includes('cloud') || code.includes('nuvem') || code.includes('nublado')) return <Cloud className={`${baseClass} text-slate-500 dark:text-slate-400`} />;
  if (code.includes('storm') || code.includes('tempestade') || code.includes('trovão')) return <CloudLightning className={`${baseClass} text-yellow-500`} />;
  return <Sun className={`${baseClass} text-amber-500`} />;
}

// A chave da API deve ser fornecida via variável de ambiente
const WEATHER_API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY || '';

export default function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!WEATHER_API_KEY) {
      setError('API de clima não configurada');
      setLoading(false);
      return;
    }
    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            const res = await fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&lang=pt`);
            const data = await res.json();
            setWeather(data);
          } catch (e) {
            setError('Erro ao buscar clima');
          } finally {
            setLoading(false);
          }
        },
        () => {
          setError('Localização não permitida');
          setLoading(false);
        },
        { timeout: 5000 }
      );
    } else {
      setError('Sem suporte à localização');
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/60 border border-border/50 min-w-[100px] animate-pulse">
              <Thermometer className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col gap-1">
                <div className="h-3 w-8 bg-muted rounded" />
                <div className="h-2 w-12 bg-muted/50 rounded" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Carregando clima...</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (error || !weather) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 min-w-[100px]">
              <Thermometer className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">Erro</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{error || 'Erro ao carregar clima'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const icon = getWeatherIcon(weather.current.condition.text.toLowerCase());
  const temp = Math.round(weather.current.temp_c);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-background/80 to-accent/20 border border-border/50 hover:border-border transition-all duration-200 cursor-pointer group min-w-[100px] shadow-sm hover:shadow-md">
            <div className="flex-shrink-0">
              {icon}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-bold text-foreground leading-none">{temp}°C</span>
              <span className="text-xs text-muted-foreground leading-none flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />
                {weather.location.name.length > 8 ? weather.location.name.substring(0, 8) + '...' : weather.location.name}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-center">
            <p className="font-medium">{weather.current.condition.text}</p>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3" />
              {weather.location.name}
            </p>
            <p className="text-lg font-bold">{temp}°C</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
