import type { Metadata } from 'next'
import { CollectionPage } from '@/components/storefront/CollectionPage'

interface Props {
  params:       Promise<{ category: string }>
  searchParams: Promise<{ sort?: string; size?: string }>
}

function formatCategoryTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const title = formatCategoryTitle(category)

  return {
    title:       `${title} | Modett`,
    description: `Shop Modett\u2019s ${title.toLowerCase()} collection.`,
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params
  const search       = await searchParams
  const title        = formatCategoryTitle(category)

  return (
    <CollectionPage
      initialCategory={category}
      initialSort={search.sort}
      initialSizes={search.size?.split(',') ?? []}
      pageTitle={title}
    />
  )
}
