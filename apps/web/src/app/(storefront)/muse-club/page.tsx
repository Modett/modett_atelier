import type { Metadata } from 'next'
import { MuseClubClient } from './MuseClubClient'

export const metadata: Metadata = {
  title: 'Modett Muse Club — Earn Rewards, Unlock Benefits',
  description:
    'Join Modett Muse Club. Earn points with every purchase, unlock exclusive tier benefits, and invite friends to earn together. Three tiers — Bronze, Silver, Gold.',
}

export default function MuseClubPage() {
  return <MuseClubClient />
}
