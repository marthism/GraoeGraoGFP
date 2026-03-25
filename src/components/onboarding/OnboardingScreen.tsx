import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { isTauri } from '@/desktop/env';
import { OnboardingTitleBar } from './OnboardingTitleBar';

interface OnboardingScreenProps {
  hasExistingData: boolean;
  onSaveName: (name: string) => void;
  onUseDemo: () => void | Promise<void>;
  onStartBlank: () => void | Promise<void>;
  onComplete: () => void;
}

export function OnboardingScreen({
  hasExistingData,
  onSaveName,
  onUseDemo,
  onStartBlank,
  onComplete,
}: OnboardingScreenProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [nameInput, setNameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const normalizedName = useMemo(() => nameInput.trim().replace(/\s+/g, ' '), [nameInput]);
  const isNameValid = normalizedName.length >= 2;

  useEffect(() => {
    if (step === 1) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [step]);

  const handleContinue = () => {
    if (!isNameValid) return;
    onSaveName(normalizedName);
    setStep(2);
  };

  const completeWith = async (mode: 'demo' | 'blank') => {
    setIsLoading(true);
    if (mode === 'demo') {
      await Promise.resolve(onUseDemo());
    } else {
      await Promise.resolve(onStartBlank());
    }
    onComplete();
  };

  const handleUseDemo = () => {
    if (hasExistingData) {
      setShowOverwriteConfirm(true);
      return;
    }
    void completeWith('demo');
  };

  const handleStartBlank = () => {
    void completeWith('blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 z-[9999] rounded-xl overflow-hidden border border-white/5 shadow-2xl">
      <OnboardingTitleBar 
        showBack={step === 2} 
        onBack={() => setStep(1)} 
      />

      <Card className="w-full max-w-[380px] border border-white/10 bg-slate-900 shadow-2xl relative">
        {step === 1 ? (
          <>
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-center">
                Bem-vindo(a) ao Grão&Grão
              </CardTitle>
              <CardDescription className="text-center pt-2 text-balance text-sm text-muted-foreground">
                <span className="text-sm opacity-80 block mb-2">
                  O app que de grão em grão vai te levar lá!
                </span>
                Antes de começar, como você gostaria de ser chamado(a)?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Input
                  id="name"
                  ref={inputRef}
                  placeholder="Ex.: Lucas"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  className="bg-slate-950/50"
                />
                {!isNameValid && nameInput.length > 0 && (
                  <p className="text-[10px] text-destructive">Digite ao menos 2 caracteres.</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleContinue} disabled={!isNameValid}>
                Começar
              </Button>
            </CardFooter>
          </>
        ) : (
          <>
            <CardHeader className="pb-4">
              <CardTitle>Deseja usar dados demonstrativos?</CardTitle>
              <CardDescription>
                Você pode começar com exemplos prontos ou iniciar em branco para personalizar.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Button variant="secondary" onClick={handleUseDemo} disabled={isLoading}>
                Usar dados demonstrativos
              </Button>
              <Button variant="outline" onClick={handleStartBlank} disabled={isLoading}>
                Comecar em branco
              </Button>
            </CardContent>
            {isLoading && (
              <CardFooter className="justify-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </div>
              </CardFooter>
            )}
          </>
        )}
      </Card>

      <AlertDialog open={showOverwriteConfirm} onOpenChange={setShowOverwriteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir dados existentes?</AlertDialogTitle>
            <AlertDialogDescription>
              Já existem movimentações salvas. Deseja substituir pelo conjunto demonstrativo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowOverwriteConfirm(false);
                void completeWith('demo');
              }}
            >
              Usar dados demonstrativos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
