import { cookies } from 'next/headers';

import { createClient } from '@/lib/supabase/server';
import { AppSidebar } from '@/components/app-sidebar';
import { AppMobileShell } from '@/components/app-mobile-shell';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  // Estado aberto/fechado persistido em cookie (padrão do sidebar shadcn) — sem "pulo" no SSR.
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = (data?.claims?.email as string | undefined) ?? null;

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar email={email} />
      {/* bg-transparent: nos presets glass o fundo mora no body (ver globals.css) */}
      <SidebarInset className="bg-transparent">
        {/* Header com o toggle só no desktop; no mobile a navegação é a bottom bar */}
        <header className="hidden h-12 shrink-0 items-center gap-2 px-4 md:flex">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
        </header>
        <AppMobileShell>{children}</AppMobileShell>
      </SidebarInset>
    </SidebarProvider>
  );
}
