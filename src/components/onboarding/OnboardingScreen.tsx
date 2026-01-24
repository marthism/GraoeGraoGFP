import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

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
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md border border-white/10 bg-slate-900/70 backdrop-blur">
        {step === 1 ? (
          <>
            <CardHeader>
              <CardTitle>Ola, como gostaria de ser chamado?</CardTitle>
              <CardDescription>Voce pode alterar isso depois nas configuracoes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                ref={inputRef}
                placeholder="Ex.: Lucas"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
              />
              {!isNameValid && nameInput.length > 0 && (
                <p className="text-xs text-destructive">Digite ao menos 2 caracteres.</p>
              )}
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleContinue} disabled={!isNameValid}>
                Continuar
              </Button>
            </CardFooter>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Deseja usar dados demonstrativos?</CardTitle>
              <CardDescription>
                Voce pode comecar com exemplos prontos ou iniciar em branco para personalizar.
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
              Ja existem movimentacoes salvas. Deseja substituir pelo conjunto demonstrativo?
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
