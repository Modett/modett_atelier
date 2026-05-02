import type { Metadata } from 'next'
import { BrandPhilosophyClient } from './BrandPhilosophyClient'

export const metadata: Metadata = {
  title: 'Brand Philosophy — Modett',
  description:
    'Quiet luxury, defined by intention. Discover the principles behind every Modett piece — natural fabrics, timeless silhouettes, and conscious production.',
}

export default function BrandPhilosophyPage() {
  return <BrandPhilosophyClient />
}
