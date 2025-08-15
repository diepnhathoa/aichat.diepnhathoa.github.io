'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageAvatar, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { useState, useRef } from 'react';
import Image from 'next/image';
import { useChat } from '@ai-sdk/react';
import { Response } from '@/components/ai-elements/response';
import { GlobeIcon, MicIcon, PlusIcon } from 'lucide-react';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/source';
// Reasoning component removed for test page to keep UI simple
import { Loader } from '@/components/ai-elements/loader';

const models = [
  // Default first: GPT-5 Mini
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'openai' },
  { id: 'gpt-5', name: 'GPT-5', provider: 'openai' },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', provider: 'openai' },
  // Anthropic
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'anthropic' },
  // Groq
  { id: 'mixtral-8x7b-32768', name: 'Mixtral-8x7b', provider: 'groq' },
  { id: 'llama2-70b-4096', name: 'Llama2-70B', provider: 'groq' },
];

const ChatBotDemo = () => {
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>(models[0].id);
  const [webSearch, setWebSearch] = useState(false);
  const currentProvider = models.find((m) => m.id === model)?.provider || 'openai';
  const { messages, sendMessage, status } = useChat();

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const suggestions = [
    'What are the latest trends in AI?',
    'How does machine learning work?',
    'Explain quantum computing',
    'Best practices for React development',
    'Tell me about TypeScript benefits',
    'How to optimize database queries?',
  ];

  const handleSuggestionClick = (suggestion: string) => {
    const provider = models.find((m) => m.id === model)?.provider || 'openai';
    const effectiveWebSearch = provider === 'openai' ? webSearch : false;
    sendMessage({ text: suggestion, metadata: { useWebSearch: effectiveWebSearch, modelId: model, provider } });
  };

  const handleFileInput = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      sendMessage({
        // @ts-ignore
        parts: [
          {
            type: 'file',
            data: dataUrl,
            mediaType: file.type,
            filename: file.name,
          } as any,
        ],
        metadata: { modelId: model, provider: models.find((m) => m.id === model)?.provider || 'openai' },
      } as any);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      const effectiveWebSearch = currentProvider === 'openai' ? webSearch : false;
      sendMessage(
        { text: input, metadata: { useWebSearch: effectiveWebSearch, modelId: model, provider: currentProvider } },
        {
          body: {
            model: model,
            webSearch: webSearch,
          },
        },
      );
      setInput('');
    }
  };

  // Handle microphone recording (transcription)
  const handleMicClick = async () => {
    if (!recording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');
          try {
            setTranscribing(true);
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              body: formData,
            });
            const data = await res.json();
            if (data.text) {
              setInput(data.text);
            }
            setTranscribing(false);
          } catch (error) {
            console.error('Transcription error', error);
            setTranscribing(false);
          }
        };
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setRecording(true);
      } catch (err) {
        console.error('Could not start recording', err);
      }
    } else {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full h-screen">
      <div className="flex flex-col h-full">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.map((message) => {
              // Extract sources from 'source' parts
              const sourceParts = message.parts.filter(
                (part) => part.type === 'source-url' || part.type === 'source-document',
              );
              const streamedSources = sourceParts
                .map((part: any) => ({
                  title: part.title || part.source?.title || part.url || part.source?.url,
                  href: part.url || part.source?.url,
                }))
                .filter((s) => !!s.href);

              // Extract sources from tool results (web_search_preview)
              const toolSources = message.parts
                .filter((part) => part.type === 'tool-result')
                .flatMap((part) => {
                  if (part.type === 'tool-result') {
                    const toolResult = part as any;
                    if (toolResult.toolName === 'web_search_preview' && toolResult.result) {
                      let parsed = toolResult.result;
                      if (typeof parsed === 'string') {
                        try {
                          parsed = JSON.parse(parsed);
                        } catch {
                          return [];
                        }
                      }
                      return (
                        parsed.results?.map((r: any) => ({
                          title: r.title,
                          href: r.url,
                        })) || []
                      );
                    }
                  }
                  return [];
                });

              // Merge and deduplicate sources by href
              const sourcesMap = new Map<string, { title: string; href: string }>();
              ;[...streamedSources, ...toolSources].forEach((s) => {
                if (s && s.href && !sourcesMap.has(s.href)) {
                  sourcesMap.set(s.href, s as { title: string; href: string });
                }
              });
              const sources = Array.from(sourcesMap.values());

              return (
                <div key={message.id}>
                  {message.role === 'assistant' && sources.length > 0 && (
                    <Sources>
                      <SourcesTrigger count={sources.length} />
                      <SourcesContent>
                        {sources.map((source, index) => (
                          <Source key={index} href={source.href} title={source.title} />
                        ))}
                      </SourcesContent>
                    </Sources>
                  )}
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      {message.parts.map((part, i) => {
                        switch (part.type) {
                          case 'text':
                            return (
                              <Response key={`${message.id}-${i}`}>
                                {part.text}
                              </Response>
                            );
                          case 'reasoning':
                            return (
                              <Response key={`${message.id}-${i}`}>
                                {part.text}
                              </Response>
                            );
                          default:
                            return null;
                        }
                      })}
                    </MessageContent>
                    <MessageAvatar
                      name={message.role === 'user' ? 'User' : 'AI'}
                      src={
                        message.role === 'user'
                          ? 'https://github.com/haydenbleasel.png'
                          : 'https://github.com/openai.png'
                      }
                    />
                  </Message>
                </div>
              );
            })}
            {status === 'submitted' && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <Suggestions className="px-4">
          {suggestions.map((s) => (
            <Suggestion key={s} suggestion={s} onClick={() => handleSuggestionClick(s)} />
          ))}
        </Suggestions>

        <PromptInput onSubmit={handleSubmit} className="mt-4">
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            value={input}
            disabled={transcribing}
            placeholder={transcribing ? 'Transcribing audio...' : undefined}
          />
            <PromptInputToolbar>
              <PromptInputTools>
                <PromptInputButton onClick={handleFileInput}>
                  <PlusIcon size={16} />
                  <span className="sr-only">Add image</span>
                </PromptInputButton>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onFileSelected} />
                <PromptInputButton onClick={handleMicClick} variant={recording ? 'default' : 'ghost'}>
                  <MicIcon size={16} />
                  <span className="sr-only">Microphone</span>
                </PromptInputButton>
                <PromptInputButton
                  onClick={() => currentProvider === 'openai' && setWebSearch(!webSearch)}
                  variant={webSearch && currentProvider === 'openai' ? 'default' : 'ghost'}
                  disabled={currentProvider !== 'openai'}
                >
                  <GlobeIcon size={16} />
                  <span>Search</span>
                </PromptInputButton>
              <PromptInputModelSelect
                onValueChange={(value) => {
                  setModel(value);
                }}
                value={model}
              >
                  <PromptInputModelSelectTrigger>
                    <PromptInputModelSelectValue />
                  </PromptInputModelSelectTrigger>
                  <PromptInputModelSelectContent>
                    {models.map((m) => (
                      <PromptInputModelSelectItem key={m.id} value={m.id} className="flex items-center gap-2">
                        {/* provider logos */}
                        {m.provider === 'openai' && (
                          <Image src="https://github.com/openai.png" alt="OpenAI" width={16} height={16} className="rounded" />
                        )}
                        {m.provider === 'anthropic' && (
                          <Image src="https://github.com/anthropics.png" alt="Anthropic" width={16} height={16} className="rounded" />
                        )}
                        {/* google provider removed from test page */}
                        {m.provider === 'groq' && (
                          <Image src="https://github.com/groq.png" alt="Groq" width={16} height={16} className="rounded" />
                        )}
                        {m.name}
                      </PromptInputModelSelectItem>
                    ))}
                  </PromptInputModelSelectContent>
              </PromptInputModelSelect>
            </PromptInputTools>
            <PromptInputSubmit disabled={!input || transcribing} status={transcribing ? 'submitted' : status} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
};

export default ChatBotDemo;
