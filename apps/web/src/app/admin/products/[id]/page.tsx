'use client'

import { useParams } from 'next/navigation'
import { ProductEditClient } from './product-edit-client'

export default function AdminEditProductPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''
  if (!id) return null
  return <ProductEditClient productId={id} />
}
