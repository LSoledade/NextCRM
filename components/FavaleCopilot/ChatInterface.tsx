"use client";

import { useState } from 'react';
import { ChatArea } from './ChatArea';
import { ChatInput } from './ChatInput'; // Alterado de PromptInputBox para ChatInput

export interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  thinkingSteps?: string[];
  isThinking?: boolean;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = (content: string) => {
    const userMessage: Message = { id: Date.now().toString(), type: 'user', content };
    setMessages(prev => [...prev, userMessage]);

    const aiThinkingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: '',
      isThinking: true,
      thinkingSteps: [],
    };
    setMessages(prev => [...prev, aiThinkingMessage]);

    const thinkingSteps = [
      "Analisando sua pergunta...",
      "Processando informações...",
      "Gerando resposta..."
    ];

    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < thinkingSteps.length) {
        setMessages(prev => prev.map(m =>
          m.id === aiThinkingMessage.id
            ? { ...m, thinkingSteps: [...(m.thinkingSteps || []), thinkingSteps[stepIndex]] }
            : m
        ));
        stepIndex++;
      } else {
        clearInterval(interval);
        const finalContent = `Entendi sua pergunta: "${content}". Aqui está uma resposta detalhada que demonstra como posso ajudá-lo com suas necessidades.`;
        setMessages(prev => prev.map(m =>
          m.id === aiThinkingMessage.id
            ? { ...m, content: finalContent, isThinking: false }
            : m
        ));
      }
    }, 500);
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <div className="flex-1 overflow-y-auto">
        <ChatArea messages={messages} />
      </div>
      <div className="sticky bottom-0 pb-4">
        <ChatInput onSendMessage={addMessage} />
      </div>
    </div>
  );
}