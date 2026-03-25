import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { t } from '@/i18n';
import { Search, Plus, CreditCard, LayoutDashboard, Settings, Receipt, Target, BarChart3 } from 'lucide-react';

export function CommandPalette({ onNavigate, onNewTransaction }: { onNavigate: (tab: string) => void, onNewTransaction: () => void }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-background/80 backdrop-blur-sm px-4">
            <div
                className="fixed inset-0 z-40"
                onClick={() => setOpen(false)}
                aria-hidden="true"
            />
            <Command
                className="relative z-50 w-full max-w-lg overflow-hidden rounded-xl border border-border/50 bg-card/90 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onKeyDown={(e) => {
                    if (e.key === 'Escape') setOpen(false);
                }}
            >
                <div className="flex items-center border-b border-border/50 px-3 overflow-hidden">
                    <Search className="h-5 w-5 shrink-0 text-muted-foreground mr-2" />
                    <Command.Input
                        autoFocus
                        placeholder="Digite um comando ou busque..."
                        className="flex h-14 w-full rounded-md bg-transparent py-3 text-sm font-medium outline-none placeholder:text-muted-foreground text-foreground"
                    />
                </div>

                <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 space-y-1">
                    <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum resultado encontrado.
                    </Command.Empty>

                    <Command.Group heading="Ações Rápidas" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        <Command.Item
                            onSelect={() => { setOpen(false); onNewTransaction(); }}
                            className="flex cursor-default items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-primary/20 aria-selected:text-primary data-[selected]:bg-primary/20 data-[selected]:text-primary transition-colors"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            <span>{t('actions.newTransaction')}</span>
                        </Command.Item>
                    </Command.Group>

                    <Command.Separator className="h-px bg-border/50 my-1 -mx-2" />

                    <Command.Group heading="Navegação" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {[
                            { id: 'dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
                            { id: 'transactions', icon: Receipt, label: t('nav.transactions') },
                            { id: 'invoices', icon: CreditCard, label: t('nav.cards') },
                            { id: 'budget', icon: Target, label: t('nav.budget') },
                            { id: 'analysis', icon: BarChart3, label: t('nav.analysis') },
                            { id: 'settings', icon: Settings, label: t('nav.settings') },
                        ].map((nav) => (
                            <Command.Item
                                key={nav.id}
                                onSelect={() => { setOpen(false); onNavigate(nav.id); }}
                                className="flex cursor-default items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-muted aria-selected:text-foreground data-[selected]:bg-muted data-[selected]:text-foreground transition-colors"
                            >
                                <nav.icon className="mr-2 h-4 w-4" />
                                <span>Ir para {nav.label}</span>
                            </Command.Item>
                        ))}
                    </Command.Group>
                </Command.List>
            </Command>
        </div>
    );
}
