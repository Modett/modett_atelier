import { requireAuth } from '@/lib/requireAuth'
import { AccountSidebar } from '@/components/account/AccountSidebar'
import { AccountMobileNav } from '@/components/account/AccountMobileNav'

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-page mx-auto px-5 md:px-10 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row lg:gap-16 lg:items-start">
          <aside
            className={[
              'hidden lg:block w-52 flex-shrink-0',
              'sticky top-[180px] self-start',
            ].join(' ')}
          >
            <AccountSidebar />
          </aside>

          <div className="lg:hidden mb-6">
            <AccountMobileNav />
          </div>

          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
