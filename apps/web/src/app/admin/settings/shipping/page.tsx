import { redirect } from 'next/navigation'

export default function AdminShippingSettingsRedirectPage() {
  redirect('/admin/settings?tab=shipping')
}
