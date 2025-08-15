'use client';

import { CheckIcon, CopyIcon } from 'lucide-react';
import type { ComponentProps, HTMLAttributes, ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: '',
});

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  children?: ReactNode;
};

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: CodeBlockProps) => {
  // Split code into lines for line numbering
  const lines = code.split('\n');

  return (
    <CodeBlockContext.Provider value={{ code }}>
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-md border bg-background text-foreground',
          className,
        )}
        {...props}
      >
        <div className="relative">
          {/* Replace react-syntax-highlighter with simple pre/code block */}
          <div className="relative overflow-x-auto">
            <pre className="m-0 p-4 text-sm bg-background text-foreground overflow-x-auto">
              <code className={`language-${language} font-mono text-sm block`}>
                {showLineNumbers ? (
                  <div className="flex">
                    <div className="select-none text-muted-foreground pr-4 text-right min-w-[2.5rem] flex-shrink-0">
                      {lines.map((_, index) => (
                        <div key={index + 1} className="leading-6">
                          {index + 1}
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 overflow-x-auto">
                      {lines.map((line, index) => (
                        <div key={index} className="leading-6">
                          {line || '\u00A0'}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  code
                )}
              </code>
            </pre>
          </div>
          {children && (
            <div className="absolute right-2 top-2 flex items-center gap-2">
              {children}
            </div>
          )}
        </div>
      </div>
    </CodeBlockContext.Provider>
  );
};


export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const { code } = useContext(CodeBlockContext);

  const copyToClipboard = async () => {
    if (typeof window === 'undefined' || !navigator.clipboard.writeText) {
      onError?.(new Error('Clipboard API not available'));
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      onCopy?.();
      setTimeout(() => setIsCopied(false), timeout);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      className={cn('shrink-0', className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  );
};
