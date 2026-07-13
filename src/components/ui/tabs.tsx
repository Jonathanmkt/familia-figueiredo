'use client';

import * as React from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

// Mola do deslize da pílula (suave). Inspirado no Idealis, mas token-driven.
const springSoft = { type: 'spring' as const, stiffness: 400, damping: 32 };

// Contexto: espelha o valor ativo + um layoutId único por grupo de abas
// (evita que a pílula "pule" entre dois <Tabs> na mesma tela).
type TabsCtx = { value?: string; layoutId: string };
const TabsContext = React.createContext<TabsCtx>({ layoutId: 'tabs' });

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const layoutId = React.useId();
  const [internal, setInternal] = React.useState<string | undefined>(
    value ?? (typeof defaultValue === 'string' ? defaultValue : undefined)
  );
  const active = value ?? internal;

  const handleValueChange = React.useCallback(
    (v: string) => {
      setInternal(v);
      onValueChange?.(v);
    },
    [onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value: active, layoutId }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        className={cn('flex flex-col gap-2', className)}
        {...props}
      />
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex h-auto w-fit items-center justify-center gap-1 rounded-lg border border-primary/50 bg-foreground/5 p-1 shadow-[0_0_10px_-3px_var(--primary)] backdrop-blur-md',
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  children,
  value,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { value: active, layoutId } = React.useContext(TabsContext);
  const isActive = active !== undefined && active === value;

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-primary-foreground',
        className
      )}
      {...props}
    >
      {/* Pílula que desliza da aba antiga pra nova (shared layout). */}
      {isActive && (
        <motion.span
          layoutId={`${layoutId}-tab-pill`}
          transition={springSoft}
          className="absolute inset-0 z-0 rounded-md bg-primary shadow-[0_0_14px_-3px_var(--primary)]"
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content data-slot="tabs-content" className={cn('outline-none', className)} {...props}>
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {children}
      </motion.div>
    </TabsPrimitive.Content>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
