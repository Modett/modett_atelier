'use client'

import { useState } from 'react'
import { GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { AdminCategory } from '@modett/types'
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/useAdminCatalog'

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export interface CategoryManagerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CategoryManagerSheet({
  open,
  onOpenChange,
}: CategoryManagerSheetProps) {
  const { data: categories = [], isLoading } = useAdminCategories()
  const createMut = useCreateCategory()
  const updateMut = useUpdateCategory()
  const deleteMut = useDeleteCategory()

  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newActive, setNewActive] = useState(true)
  const [newSort, setNewSort] = useState(0)
  const [slugTouched, setSlugTouched] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [editSort, setEditSort] = useState(0)
  const [editSlugTouched, setEditSlugTouched] = useState(false)

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const resetAddForm = () => {
    setNewName('')
    setNewSlug('')
    setNewActive(true)
    setNewSort(0)
    setSlugTouched(false)
  }

  const startEdit = (c: AdminCategory) => {
    setEditingId(c.id)
    setEditName(c.name)
    setEditSlug(c.slug)
    setEditActive(c.active)
    setEditSort(c.sortOrder)
    setEditSlugTouched(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col gap-4">
        <SheetHeader>
          <SheetTitle>Categories</SheetTitle>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            categories.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-gray-200 bg-white p-3 text-sm"
              >
                {editingId === c.id ? (
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor={`edit-name-${c.id}`}>Name</Label>
                      <Input
                        id={`edit-name-${c.id}`}
                        value={editName}
                        onChange={(e) => {
                          setEditName(e.target.value)
                          if (!editSlugTouched) {
                            setEditSlug(slugFromName(e.target.value))
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`edit-slug-${c.id}`}>Slug</Label>
                      <Input
                        id={`edit-slug-${c.id}`}
                        value={editSlug}
                        onChange={(e) => {
                          setEditSlugTouched(true)
                          setEditSlug(e.target.value)
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editActive}
                        onCheckedChange={setEditActive}
                        aria-label="Active"
                      />
                      <span>Active</span>
                    </div>
                    <div>
                      <Label htmlFor={`edit-sort-${c.id}`}>Sort order</Label>
                      <Input
                        id={`edit-sort-${c.id}`}
                        type="number"
                        value={editSort}
                        onChange={(e) =>
                          setEditSort(Number.parseInt(e.target.value, 10) || 0)
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          void updateMut.mutateAsync({
                            id: c.id,
                            data: {
                              name: editName,
                              slug: editSlug,
                              active: editActive,
                              sortOrder: editSort,
                            },
                          }).then(() => {
                            toast.success('Category updated.')
                            cancelEdit()
                          }).catch((err: { message?: string }) => {
                            toast.error(err?.message ?? 'Update failed')
                          })
                        }}
                        disabled={updateMut.isPending}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-gray-900">{c.name}</span>
                          <span className="text-xs text-gray-500">/{c.slug}</span>
                          {c.active ? (
                            <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">sort: {c.sortOrder}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(c)}>
                        Edit
                      </Button>
                      {confirmDeleteId === c.id ? (
                        <>
                          <span className="self-center text-xs text-amber-700">
                            Products become uncategorised.
                          </span>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              void deleteMut.mutateAsync({ id: c.id }).then(() => {
                                toast.success('Category deleted.')
                                setConfirmDeleteId(null)
                              }).catch((err: { message?: string }) => {
                                toast.error(err?.message ?? 'Delete failed')
                              })
                            }}
                            disabled={deleteMut.isPending}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => setConfirmDeleteId(c.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <p className="mb-2 text-sm font-medium text-gray-900">Add category</p>
          <div className="space-y-2">
            <div>
              <Label htmlFor="new-cat-name">Name *</Label>
              <Input
                id="new-cat-name"
                placeholder="e.g. Dresses"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value)
                  if (!slugTouched) setNewSlug(slugFromName(e.target.value))
                }}
              />
            </div>
            <div>
              <Label htmlFor="new-cat-slug">Slug *</Label>
              <Input
                id="new-cat-slug"
                placeholder="e.g. dresses"
                value={newSlug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setNewSlug(e.target.value)
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newActive}
                onCheckedChange={setNewActive}
                aria-label="Active"
              />
              <span className="text-sm">Active</span>
            </div>
            <div>
              <Label htmlFor="new-cat-sort">Sort order</Label>
              <Input
                id="new-cat-sort"
                type="number"
                value={newSort}
                onChange={(e) =>
                  setNewSort(Number.parseInt(e.target.value, 10) || 0)
                }
              />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (!newName.trim() || !newSlug.trim()) {
                  toast.error('Name and slug are required.')
                  return
                }
                void createMut
                  .mutateAsync({
                    name: newName.trim(),
                    slug: newSlug.trim(),
                    active: newActive,
                    sortOrder: newSort,
                  })
                  .then(() => {
                    toast.success('Category added.')
                    resetAddForm()
                  })
                  .catch((err: { message?: string }) => {
                    toast.error(err?.message ?? 'Create failed')
                  })
              }}
              disabled={createMut.isPending}
            >
              Add category
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
