'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Image from 'next/image';

function CustomInput({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Para efeito 3D do card - reduzindo sensibilidade
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [3, -3]); // Reduzido de 10/-10 para 3/-3
  const rotateY = useTransform(mouseX, [-300, 300], [-3, 3]); // Reduzido de -10/10 para -3/3

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set((e.clientX - centerX) * 0.5); // Reduzindo sensibilidade
    mouseY.set((e.clientY - centerY) * 0.5); // Reduzindo sensibilidade
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Removido signUp, só login
      const response = await supabase.auth.signInWithPassword({ email, password });
      const { data, error: authError } = response;

      if (authError) {
        setError(authError.message || 'Email ou senha incorretos.');
        return;
      }

      if (data.user) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-background relative overflow-hidden flex items-center justify-center">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-primary/20 to-background" />
      
      {/* Subtle noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.02] mix-blend-soft-light" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px'
        }}
      />

      {/* Top radial glow */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[120vh] h-[60vh] rounded-b-[50%] bg-primary/15 blur-[80px]" />
      <motion.div 
        className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[100vh] h-[60vh] rounded-b-full bg-primary/10 blur-[60px]"
        animate={{ 
          opacity: [0.1, 0.2, 0.1],
          scale: [0.98, 1.02, 0.98]
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity,
          repeatType: "mirror"
        }}
      />
      <motion.div 
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[90vh] h-[90vh] rounded-t-full bg-primary/15 blur-[60px]"
        animate={{ 
          opacity: [0.15, 0.25, 0.15],
          scale: [1, 1.05, 1]
        }}
        transition={{ 
          duration: 6, 
          repeat: Infinity,
          repeatType: "mirror",
          delay: 1
        }}
      />

      {/* Animated glow spots */}
      <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] animate-pulse opacity-30" />
      <div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] animate-pulse delay-1000 opacity-30" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-sm relative z-10"
        style={{ perspective: 1500 }}
      >
        <motion.div
          className="relative"
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileHover={{ z: 5 }} // Reduzido de 10 para 5
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="relative group/card">
            {/* Traveling light beam effect - simplificado e menos conflitante */}
            <div className="absolute -inset-[1px] rounded-2xl overflow-hidden opacity-40 pointer-events-none">
              {/* Top light beam */}
              <motion.div 
                className="absolute top-0 left-0 h-[1px] w-[30%] bg-gradient-to-r from-transparent via-primary to-transparent"
                animate={{ 
                  left: ["-30%", "100%"]
                }}
                transition={{ 
                  duration: 4, 
                  ease: "easeInOut", 
                  repeat: Infinity,
                  repeatDelay: 3
                }}
              />
              
              {/* Right light beam */}
              <motion.div 
                className="absolute top-0 right-0 h-[30%] w-[1px] bg-gradient-to-b from-transparent via-primary to-transparent"
                animate={{ 
                  top: ["-30%", "100%"]
                }}
                transition={{ 
                  duration: 4, 
                  ease: "easeInOut", 
                  repeat: Infinity,
                  repeatDelay: 3,
                  delay: 1
                }}
              />
              
              {/* Bottom light beam */}
              <motion.div 
                className="absolute bottom-0 right-0 h-[1px] w-[30%] bg-gradient-to-r from-transparent via-primary to-transparent"
                animate={{ 
                  right: ["-30%", "100%"]
                }}
                transition={{ 
                  duration: 4, 
                  ease: "easeInOut", 
                  repeat: Infinity,
                  repeatDelay: 3,
                  delay: 2
                }}
              />
              
              {/* Left light beam */}
              <motion.div 
                className="absolute bottom-0 left-0 h-[30%] w-[1px] bg-gradient-to-b from-transparent via-primary to-transparent"
                animate={{ 
                  bottom: ["-30%", "100%"]
                }}
                transition={{ 
                  duration: 4, 
                  ease: "easeInOut", 
                  repeat: Infinity,
                  repeatDelay: 3,
                  delay: 3
                }}
              />
            </div>

            {/* Card glow effect unificado */}
            <motion.div 
              className="absolute -inset-[1px] rounded-2xl pointer-events-none"
              animate={{
                boxShadow: [
                  "0 0 10px 2px hsl(var(--primary) / 0.05)",
                  "0 0 20px 4px hsl(var(--primary) / 0.1)",
                  "0 0 10px 2px hsl(var(--primary) / 0.05)"
                ]
              }}
              transition={{ 
                duration: 6, 
                repeat: Infinity, 
                ease: "easeInOut", 
                repeatType: "mirror" 
              }}
            />

            {/* Card border glow - apenas no hover */}
            <div className="absolute -inset-[0.5px] rounded-2xl bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            {/* Glass card background */}
            <div className="relative bg-card/60 backdrop-blur-xl rounded-2xl p-6 border border-border/50 shadow-2xl overflow-hidden">
              {/* Subtle card inner patterns */}
              <div className="absolute inset-0 opacity-[0.03]" 
                style={{
                  backgroundImage: `linear-gradient(135deg, hsl(var(--foreground)) 0.5px, transparent 0.5px), linear-gradient(45deg, hsl(var(--foreground)) 0.5px, transparent 0.5px)`,
                  backgroundSize: '30px 30px'
                }}
              />

              {/* Logo and header */}
              <div className="text-center space-y-1 mb-5">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", duration: 0.8 }}
                  className="mx-auto w-16 h-16 rounded-full border border-border flex items-center justify-center relative overflow-hidden bg-primary/10"
                >
                  {/* Logotipo Favale */}
                  <Image
                    src="/logotipofavale.svg"
                    alt="Favale Logotipo"
                    width={48}
                    height={48}
                    className="object-contain"
                    priority
                  />
                  {/* Inner lighting effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50" />
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl font-bold text-foreground"
                >
                  FavaleTrainer CRM
                </motion.h1>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-muted-foreground text-xs"
                >
                  Entre com sua conta para acessar o sistema
                </motion.p>
              </div>

              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-destructive text-sm">{error}</span>
                </motion.div>
              )}

              {/* Login form */}
              <form onSubmit={handleSubmit}>
                <motion.div className="space-y-3">
                  {/* Email input */}
                  <motion.div 
                    className={`relative ${focusedInput === "email" ? 'z-10' : ''}`}
                    whileHover={{ scale: 1.005 }} // Reduzido de 1.01
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <div className="absolute -inset-[0.5px] bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 rounded-lg opacity-0 hover:opacity-100 transition-all duration-300 pointer-events-none" />
                    
                    <div className="relative flex items-center overflow-hidden rounded-lg">
                      <Mail className={`absolute left-3 w-4 h-4 transition-all duration-300 ${
                        focusedInput === "email" ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      
                      <CustomInput
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedInput("email")}
                        onBlur={() => setFocusedInput(null)}
                        className="w-full bg-background/50 border-border focus:border-primary text-foreground placeholder:text-muted-foreground h-10 transition-all duration-300 pl-10 pr-3 focus:bg-background/70"
                        required
                        disabled={loading}
                      />
                      
                      {/* Input highlight effect */}
                      {focusedInput === "email" && (
                        <motion.div 
                          layoutId="input-highlight"
                          className="absolute inset-0 bg-primary/5 -z-10 pointer-events-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </div>
                  </motion.div>

                  {/* Password input */}
                  <motion.div 
                    className={`relative ${focusedInput === "password" ? 'z-10' : ''}`}
                    whileHover={{ scale: 1.005 }} // Reduzido de 1.01
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <div className="absolute -inset-[0.5px] bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 rounded-lg opacity-0 hover:opacity-100 transition-all duration-300 pointer-events-none" />
                    
                    <div className="relative flex items-center overflow-hidden rounded-lg">
                      <Lock className={`absolute left-3 w-4 h-4 transition-all duration-300 ${
                        focusedInput === "password" ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      
                      <CustomInput
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedInput("password")}
                        onBlur={() => setFocusedInput(null)}
                        className="w-full bg-background/50 border-border focus:border-primary text-foreground placeholder:text-muted-foreground h-10 transition-all duration-300 pl-10 pr-10 focus:bg-background/70"
                        required
                        disabled={loading}
                      />
                      
                      {/* Toggle password visibility */}
                      <div 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-3 cursor-pointer z-10"
                      >
                        {showPassword ? (
                          <Eye className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors duration-300" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors duration-300" />
                        )}
                      </div>
                      
                      {/* Input highlight effect */}
                      {focusedInput === "password" && (
                        <motion.div 
                          layoutId="input-highlight"
                          className="absolute inset-0 bg-primary/5 -z-10 pointer-events-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </div>
                  </motion.div>
                </motion.div>

                {/* Submit button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={loading}
                  className="w-full relative group/button mt-5"
                >
                  {/* Button glow effect */}
                  <div className="absolute inset-0 bg-primary/10 rounded-lg blur-lg opacity-0 group-hover/button:opacity-50 transition-opacity duration-300 pointer-events-none" />
                  
                  <div className="relative overflow-hidden bg-primary text-primary-foreground font-medium h-10 rounded-lg transition-all duration-300 flex items-center justify-center hover:bg-primary/90">
                    {/* Button background animation */}
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary-foreground/10 to-primary/0 -z-10 pointer-events-none"
                      animate={{ 
                        x: ['-100%', '100%'],
                      }}
                      transition={{ 
                        duration: 2, 
                        ease: "easeInOut", 
                        repeat: Infinity,
                        repeatDelay: 2
                      }}
                      style={{ 
                        opacity: loading ? 1 : 0,
                        transition: 'opacity 0.3s ease'
                      }}
                    />
                    
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-center"
                        >
                          <div className="w-4 h-4 border-2 border-primary-foreground/70 border-t-transparent rounded-full animate-spin" />
                        </motion.div>
                      ) : (
                        <motion.span
                          key="button-text"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-center gap-1 text-sm font-medium"
                        >
                          Entrar
                          <ArrowRight className="w-3 h-3 group-hover/button:translate-x-1 transition-transform duration-300" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              </form>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}