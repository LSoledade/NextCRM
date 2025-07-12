import React, { useEffect, useState } from 'react';
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Thermometer, MapPin, Droplets, Wind, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function getWeatherIcon(code: string, size = 'w-5 h-5') {
  const baseClass = `${size} drop-shadow-sm`;
  if (code.includes('rain') || code.includes('chuva')) return <CloudRain className={`${baseClass} text-blue-400`} />;
  if (code.includes('snow') || code.includes('neve')) return <CloudSnow className={`${baseClass} text-blue-200`} />;
  if (code.includes('cloud') || code.includes('nuvem') || code.includes('nublado')) return <Cloud className={`${baseClass} text-gray-300`} />;
  if (code.includes('storm') || code.includes('tempestade') || code.includes('trovão')) return <CloudLightning className={`${baseClass} text-yellow-300`} />;
  return <Sun className={`${baseClass} text-yellow-300`} />;
}

function getWeatherGradient(code: string) {
  if (code.includes('rain') || code.includes('chuva')) return 'from-blue-500 via-blue-600 to-blue-700';
  if (code.includes('snow') || code.includes('neve')) return 'from-blue-300 via-blue-400 to-blue-500';
  if (code.includes('cloud') || code.includes('nuvem') || code.includes('nublado')) return 'from-gray-400 via-gray-500 to-gray-600';
  if (code.includes('storm') || code.includes('tempestade') || code.includes('trovão')) return 'from-purple-500 via-purple-600 to-pink-500';
  return 'from-cyan-400 via-blue-500 to-blue-600'; // sunny
}

// A chave da API deve ser fornecida via variável de ambiente
const WEATHER_API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY || '';

export default function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  const fetchWeatherByLocation = async (query: string) => {
    try {
      const res = await fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(query)}&lang=pt`);
      if (!res.ok) throw new Error('Falha na requisição');
      const data = await res.json();
      
      // Debug: log do nome original retornado pela API
      console.log('Nome original da API:', data.location?.name, 'Região:', data.location?.region);
      
      // Corrigir nomes de cidades com caracteres especiais
      if (data.location) {
        // Se a localização está próxima de São Paulo, corrigir o nome
        const lat = data.location.lat;
        const lon = data.location.lon;
        
        // Verificar se está na região metropolitana de São Paulo
        if (lat >= -24.0 && lat <= -23.0 && lon >= -47.0 && lon <= -46.0) {
          data.location.name = 'São Paulo';
          data.location.region = 'São Paulo';
          data.location.country = 'Brasil';
        }
        
        // Outras correções comuns para cidades brasileiras
        const corrections: { [key: string]: { name: string; region?: string; country?: string } } = {
          'Sao Paulo': { name: 'São Paulo', region: 'São Paulo', country: 'Brasil' },
          'San Paulo': { name: 'São Paulo', region: 'São Paulo', country: 'Brasil' },
          'Brasilia': { name: 'Brasília', region: 'Distrito Federal', country: 'Brasil' },
          'Rio de Janeiro': { name: 'Rio de Janeiro', region: 'Rio de Janeiro', country: 'Brasil' },
          'Belo Horizonte': { name: 'Belo Horizonte', region: 'Minas Gerais', country: 'Brasil' },
          'Curitiba': { name: 'Curitiba', region: 'Paraná', country: 'Brasil' },
          'Porto Alegre': { name: 'Porto Alegre', region: 'Rio Grande do Sul', country: 'Brasil' },
          'Salvador': { name: 'Salvador', region: 'Bahia', country: 'Brasil' },
          'Fortaleza': { name: 'Fortaleza', region: 'Ceará', country: 'Brasil' },
          'Recife': { name: 'Recife', region: 'Pernambuco', country: 'Brasil' },
          'Manaus': { name: 'Manaus', region: 'Amazonas', country: 'Brasil' }
        };
        
        if (corrections[data.location.name]) {
          const correction = corrections[data.location.name];
          data.location.name = correction.name;
          if (correction.region) data.location.region = correction.region;
          if (correction.country) data.location.country = correction.country;
        }
        
        // Debug: log do nome após correções
        console.log('Nome após correções:', data.location?.name, 'Região:', data.location?.region);
      }
      
      setWeather(data);
      setError(null);
    } catch (e) {
      throw new Error('Erro ao buscar clima');
    }
  };

  const getLocationByIP = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error('Falha na geolocalização por IP');
      const data = await res.json();
      return `${data.latitude},${data.longitude}`;
    } catch (e) {
      return '-23.5505,-46.6333'; // São Paulo coordinates fallback
    }
  };

  // Set client-side flag after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only run on client-side after hydration
    if (!isClient) return;
    
    if (!WEATHER_API_KEY) {
      setError('API de clima não configurada');
      setLoading(false);
      return;
    }

    const detectLocation = async () => {
      try {
        // Primeiro, tentar GPS para maior precisão
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              { 
                timeout: 3000, 
                enableHighAccuracy: true,
                maximumAge: 300000 // 5 minutos de cache
              }
            );
          });
          
          const { latitude, longitude } = position.coords;
          await fetchWeatherByLocation(`${latitude},${longitude}`);
        } else {
          throw new Error('GPS não disponível');
        }
      } catch (gpsError) {
        // Se GPS falhar, usar geolocalização por IP
        try {
          const location = await getLocationByIP();
          await fetchWeatherByLocation(location);
        } catch (ipError) {
          setError('Erro ao detectar localização');
        }
      } finally {
        setLoading(false);
      }
    };

    detectLocation();
  }, [isClient]);

  // Show loading state during SSR and initial client load
  if (!isClient || loading) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-400 via-slate-500 to-slate-600 min-w-[120px] shadow-lg animate-pulse overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
              <Thermometer className="w-5 h-5 text-white/80 drop-shadow-sm" />
              <div className="flex flex-col gap-1">
                <div className="h-4 w-10 bg-white/20 rounded-md" />
                <div className="h-3 w-14 bg-white/10 rounded-md" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-xl">
            <p className="text-gray-800 font-medium">Carregando clima...</p>
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
            <div className="relative flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-400 via-red-500 to-red-600 min-w-[120px] shadow-lg overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <Thermometer className="w-5 h-5 text-white drop-shadow-sm" />
              <span className="text-sm text-white font-semibold drop-shadow-sm">Erro</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-xl">
            <p className="text-gray-800 font-medium">{error || 'Erro ao carregar clima'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const icon = getWeatherIcon(weather.current.condition.text.toLowerCase());
  const temp = Math.round(weather.current.temp_c);
  const gradient = getWeatherGradient(weather.current.condition.text.toLowerCase());
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r ${gradient} min-w-[120px] shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex-shrink-0 relative z-10">
              {icon}
            </div>
            <div className="flex flex-col items-start relative z-10">
              <span className="text-lg font-bold text-white leading-none drop-shadow-sm">{temp}°</span>
              <span className="text-xs text-white/90 leading-none flex items-center gap-1 drop-shadow-sm">
                <MapPin className="w-3 h-3" />
                {weather.location.name.length > 10 ? weather.location.name.substring(0, 10) + '...' : weather.location.name}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-xl p-4 rounded-xl">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              {getWeatherIcon(weather.current.condition.text.toLowerCase(), 'w-8 h-8')}
              <span className="text-2xl font-bold text-gray-800">{temp}°C</span>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-gray-800">{weather.current.condition.text}</p>
              <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                <MapPin className="w-4 h-4" />
                {weather.location.name}, {weather.location.region}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-200">
              <div className="text-center">
                <Droplets className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                <p className="text-xs text-gray-600">Umidade</p>
                <p className="text-sm font-semibold text-gray-800">{weather.current.humidity}%</p>
              </div>
              <div className="text-center">
                <Wind className="w-4 h-4 text-gray-500 mx-auto mb-1" />
                <p className="text-xs text-gray-600">Vento</p>
                <p className="text-sm font-semibold text-gray-800">{Math.round(weather.current.wind_kph)} km/h</p>
              </div>
              <div className="text-center">
                <Eye className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                <p className="text-xs text-gray-600">Visibilidade</p>
                <p className="text-sm font-semibold text-gray-800">{weather.current.vis_km} km</p>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
