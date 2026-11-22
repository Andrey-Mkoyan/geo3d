'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, PrintMaterialType, Product } from '../types';
import { Plus, Pencil, Copy, Trash2, Upload, ExternalLink, EyeOff, Star, X, ChevronLeft, ChevronRight } from 'lucide-react';

const MATERIALS: PrintMaterialType[] = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Resin'];
const LOCALES = ['en', 'ka', 'ru'] as const;

async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(body.issues) ? `: ${body.issues.map((i: { path: string; message: string }) => `${i.path} ${i.message}`).join('; ')}` : '';
    throw new Error((body.error || `Request failed (${res.status})`) + detail);
  }
  return body as T;
}
const send = (url: string, method: string, data?: unknown) =>
  api(url, { method, headers: { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const input =
  'w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500';
const label = 'block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1';
const btn = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50';

interface ProductForm {
  id?: string;
  slug: string;
  slugTouched: boolean;
  title: Record<'en' | 'ka' | 'ru', string>;
  description: Record<'en' | 'ka' | 'ru', string>;
  category: string;
  priceGel: string;
  images: string[];
  x: string;
  y: string;
  z: string;
  weightGrams: string;
  materials: PrintMaterialType[];
  leadTimeHours: string;
  inStock: boolean;
  published: boolean;
  featured: boolean;
  tags: string;
  modelUrl: string;
}

const MAX_IMAGES = 12;

const emptyForm = (category: string): ProductForm => ({
  slug: '',
  slugTouched: false,
  title: { en: '', ka: '', ru: '' },
  description: { en: '', ka: '', ru: '' },
  category,
  priceGel: '',
  images: [],
  x: '100',
  y: '100',
  z: '100',
  weightGrams: '50',
  materials: ['PLA'],
  leadTimeHours: '24',
  inStock: true,
  published: true,
  featured: false,
  tags: '',
  modelUrl: '',
});

const toForm = (p: Product): ProductForm => ({
  id: p.id,
  slug: p.slug ?? p.id,
  slugTouched: true,
  title: { ...p.title },
  description: { ...p.description },
  category: p.category,
  priceGel: String(p.priceGel),
  images: p.images?.length ? p.images : [p.imageUrl],
  x: String(p.dimensionsMm.x),
  y: String(p.dimensionsMm.y),
  z: String(p.dimensionsMm.z),
  weightGrams: String(p.weightGrams),
  materials: p.materials,
  leadTimeHours: String(p.leadTimeHours),
  inStock: p.inStock,
  published: p.published !== false,
  featured: !!p.featured,
  tags: p.tags.join(', '),
  modelUrl: p.modelUrl ?? '',
});

export function AdminCatalog() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<ProductForm | null>(null);
  const [catForm, setCatForm] = useState<{ id: string; isNew: boolean; name: Record<'en' | 'ka' | 'ru', string>; sortOrder: string; active: boolean } | null>(null);
  const [filterCat, setFilterCat] = useState('all');
  const [imageUrlInput, setImageUrlInput] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([api<Category[]>('/api/admin/categories'), api<Product[]>('/api/admin/products')]);
      setCategories(c);
      setProducts(p);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Runs an action, reloads the admin lists and refreshes the shop data that the layout loaded. */
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
      router.refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const catName = (id: string) => categories.find((c) => c.id === id)?.name.en ?? id;

  // ----------------------------------------------------------------- products
  /** Opens the form pre-filled with a copy of a product; it is saved as a new product. */
  const duplicateProduct = (p: Product) => {
    const taken = new Set(products.map((x) => x.slug ?? x.id));
    const base = `${p.slug ?? p.id}-copy`;
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    const f = toForm(p);
    setForm({
      ...f,
      id: undefined,
      slug,
      slugTouched: true,
      title: { en: `${f.title.en} (copy)`, ka: `${f.title.ka} (ასლი)`, ru: `${f.title.ru} (копия)` },
      published: true,
    });
  };

  const saveProduct = async () => {
    if (!form) return;
    const payload = {
      slug: form.slug,
      title: form.title,
      description: form.description.en.trim() ? form.description : { ...form.description, en: form.title.en },
      category: form.category,
      priceGel: Number(form.priceGel),
      images: form.images,
      dimensionsMm: { x: Number(form.x), y: Number(form.y), z: Number(form.z) },
      weightGrams: Math.round(Number(form.weightGrams)),
      materials: form.materials,
      leadTimeHours: Math.round(Number(form.leadTimeHours)),
      inStock: form.inStock,
      published: form.published,
      featured: form.featured,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      modelUrl: form.modelUrl.trim() || null,
    };
    const ok = await run(() => (form.id ? send(`/api/admin/products/${form.id}`, 'PATCH', payload) : send('/api/admin/products', 'POST', payload)));
    if (ok) setForm(null);
  };

  const uploadImages = async (files: File[]) => {
    setBusy(true);
    setError(null);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await api<{ url: string }>('/api/admin/uploads/product-image', { method: 'POST', body: fd });
        setForm((f) => (f && f.images.length < MAX_IMAGES ? { ...f, images: [...f.images, res.url] } : f));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setError('Photo links must start with http:// or https://');
      return;
    }
    setForm((f) => (f && f.images.length < MAX_IMAGES && !f.images.includes(url) ? { ...f, images: [...f.images, url] } : f));
    setImageUrlInput('');
  };

  const moveImage = (from: number, to: number) =>
    setForm((f) => {
      if (!f || to < 0 || to >= f.images.length) return f;
      const next = [...f.images];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...f, images: next };
    });

  const removeImage = (i: number) => setForm((f) => (f ? { ...f, images: f.images.filter((_, k) => k !== i) } : f));

  const deleteProduct = (p: Product) => {
    if (!window.confirm(`Delete "${p.title.en}"? This cannot be undone.`)) return;
    run(() => send(`/api/admin/products/${p.id}`, 'DELETE'));
  };

  // --------------------------------------------------------------- categories
  const saveCategory = async () => {
    if (!catForm) return;
    const name = catForm.name;
    const ok = await run(() =>
      catForm.isNew
        ? send('/api/admin/categories', 'POST', { id: catForm.id, name, sortOrder: Number(catForm.sortOrder) || 0, active: catForm.active })
        : send(`/api/admin/categories/${catForm.id}`, 'PATCH', { name, sortOrder: Number(catForm.sortOrder) || 0, active: catForm.active })
    );
    if (ok) setCatForm(null);
  };

  const deleteCategory = (c: Category) => {
    if (!window.confirm(`Delete category "${c.name.en}"?`)) return;
    run(() => send(`/api/admin/categories/${c.id}`, 'DELETE'));
  };

  const visible = products.filter((p) => filterCat === 'all' || p.category === filterCat);

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-sm text-rose-700 dark:text-rose-300">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------- Categories */}
      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Categories</h3>
          <button
            onClick={() => setCatForm({ id: '', isNew: true, name: { en: '', ka: '', ru: '' }, sortOrder: String(categories.length + 1), active: true })}
            className={`${btn} bg-amber-500 text-neutral-950 hover:bg-amber-400 flex items-center gap-1`}
          >
            <Plus className="w-3.5 h-3.5" /> Add category
          </button>
        </div>

        {catForm && (
          <div className="mb-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LOCALES.map((l) => (
                <div key={l}>
                  <label className={label}>
                    Name ({l.toUpperCase()}){l === 'en' && ' *'}
                  </label>
                  <input
                    className={input}
                    value={catForm.name[l]}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCatForm((f) =>
                        f ? { ...f, name: { ...f.name, [l]: v }, id: f.isNew && l === 'en' && f.id === slugify(f.name.en) ? slugify(v) : f.id } : f
                      );
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className={label}>Id (slug)</label>
                <input
                  className={input}
                  disabled={!catForm.isNew}
                  value={catForm.id}
                  onChange={(e) => setCatForm({ ...catForm, id: slugify(e.target.value) })}
                />
              </div>
              <div>
                <label className={label}>Order</label>
                <input className={input} type="number" value={catForm.sortOrder} onChange={(e) => setCatForm({ ...catForm, sortOrder: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm pb-2">
                <input type="checkbox" checked={catForm.active} onChange={(e) => setCatForm({ ...catForm, active: e.target.checked })} /> Visible in shop
              </label>
            </div>
            <div className="flex gap-2">
              <button disabled={busy || !catForm.id || !catForm.name.en.trim()} onClick={saveCategory} className={`${btn} bg-neutral-900 dark:bg-white text-white dark:text-neutral-900`}>
                Save
              </button>
              <button onClick={() => setCatForm(null)} className={`${btn} border border-neutral-300 dark:border-neutral-700`}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <span className="font-semibold">{c.name.en}</span>
                <span className="text-neutral-400 ml-2 text-xs">
                  {c.name.ka} · {c.name.ru}
                </span>
                {!c.active && <span className="ml-2 text-[10px] uppercase font-bold text-neutral-500">hidden</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-neutral-500">{c.productCount ?? 0} products</span>
                <button
                  title="Edit"
                  onClick={() => setCatForm({ id: c.id, isNew: false, name: { ...c.name }, sortOrder: String(c.sortOrder), active: c.active })}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button title="Delete" onClick={() => deleteCategory(c)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- Products */}
      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-lg">Products ({visible.length})</h3>
          <div className="flex items-center gap-2">
            <select className={`${input} !w-auto`} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name.en}
                </option>
              ))}
            </select>
            <button
              disabled={categories.length === 0}
              onClick={() => setForm(emptyForm(categories[0]?.id ?? ''))}
              className={`${btn} bg-amber-500 text-neutral-950 hover:bg-amber-400 flex items-center gap-1`}
            >
              <Plus className="w-3.5 h-3.5" /> Add product
            </button>
          </div>
        </div>

        {form && (
          <div className="mb-5 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <h4 className="font-bold">{form.id ? 'Edit product' : 'New product'}</h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LOCALES.map((l) => (
                <div key={l}>
                  <label className={label}>
                    Title ({l.toUpperCase()}){l === 'en' && ' *'}
                  </label>
                  <input
                    className={input}
                    value={form.title[l]}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) =>
                        f ? { ...f, title: { ...f.title, [l]: v }, slug: !f.slugTouched && l === 'en' ? slugify(v) : f.slug } : f
                      );
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LOCALES.map((l) => (
                <div key={l}>
                  <label className={label}>Description ({l.toUpperCase()})</label>
                  <textarea
                    rows={3}
                    className={input}
                    value={form.description[l]}
                    onChange={(e) => setForm({ ...form, description: { ...form.description, [l]: e.target.value } })}
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-neutral-500 -mt-2">Empty KA / RU texts fall back to English.</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className={label}>Category *</label>
                <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name.en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Price (GEL) *</label>
                <input className={input} type="number" min="0" step="0.1" value={form.priceGel} onChange={(e) => setForm({ ...form, priceGel: e.target.value })} />
              </div>
              <div>
                <label className={label}>Slug *</label>
                <input className={input} value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value), slugTouched: true })} />
              </div>
              <div>
                <label className={label}>Lead time (h)</label>
                <input className={input} type="number" min="0" value={form.leadTimeHours} onChange={(e) => setForm({ ...form, leadTimeHours: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['x', 'y', 'z'] as const).map((a) => (
                <div key={a}>
                  <label className={label}>Size {a.toUpperCase()} (mm)</label>
                  <input className={input} type="number" min="0" value={form[a]} onChange={(e) => setForm({ ...form, [a]: e.target.value })} />
                </div>
              ))}
              <div>
                <label className={label}>Weight (g)</label>
                <input className={input} type="number" min="0" value={form.weightGrams} onChange={(e) => setForm({ ...form, weightGrams: e.target.value })} />
              </div>
            </div>
            <p className="text-[11px] text-neutral-500 -mt-2">Weight is deducted from warehouse stock when a payment is approved.</p>

            <div>
              <label className={label}>Materials * (colours come from warehouse stock)</label>
              <div className="flex flex-wrap gap-3">
                {MATERIALS.map((m) => (
                  <label key={m} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={form.materials.includes(m)}
                      onChange={(e) =>
                        setForm({ ...form, materials: e.target.checked ? [...form.materials, m] : form.materials.filter((x) => x !== m) })
                      }
                    />
                    {m}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={label}>
                Photos * <span className="font-normal text-neutral-500">({form.images.length}/{MAX_IMAGES}, the first one is the cover)</span>
              </label>
              {form.images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                  {form.images.map((src, i) => (
                    <div key={`${src}-${i}`} className="relative group rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 aspect-square bg-neutral-100 dark:bg-neutral-800">
                      <img src={src} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {i === 0 && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-neutral-950 text-[10px] font-bold">Cover</span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 p-1 bg-neutral-950/70 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button type="button" disabled={i === 0} onClick={() => moveImage(i, i - 1)} className="p-1 text-white disabled:opacity-30 cursor-pointer" title="Move earlier">
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => removeImage(i)} className="p-1 text-rose-300 hover:text-rose-200 cursor-pointer" title="Remove">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" disabled={i === form.images.length - 1} onClick={() => moveImage(i, i + 1)} className="p-1 text-white disabled:opacity-30 cursor-pointer" title="Move later">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <label className={`${btn} border border-neutral-300 dark:border-neutral-700 flex items-center gap-1 cursor-pointer`}>
                  <Upload className="w-3.5 h-3.5" /> Upload photos
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={busy || form.images.length >= MAX_IMAGES}
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []).slice(0, MAX_IMAGES - form.images.length);
                      if (files.length) uploadImages(files);
                      e.target.value = '';
                    }}
                  />
                </label>
                <div className="flex flex-1 min-w-[240px] gap-2">
                  <input
                    className={`${input} flex-1`}
                    placeholder="...or paste an image link"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addImageUrl();
                      }
                    }}
                  />
                  <button type="button" onClick={addImageUrl} className={`${btn} border border-neutral-300 dark:border-neutral-700`}>
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className={label}>Model link (MakerWorld, Printables, ...)</label>
              <input
                className={input}
                placeholder="https://makerworld.com/en/models/..."
                value={form.modelUrl}
                onChange={(e) => setForm({ ...form, modelUrl: e.target.value })}
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Internal only: shown to staff here and on orders containing this product. Customers do not see it.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={label}>Tags (comma separated)</label>
                <input className={input} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </div>
              <div className="flex flex-wrap items-end gap-4 pb-2 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={form.inStock} onChange={(e) => setForm({ ...form, inStock: e.target.checked })} /> In stock
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Visible in shop
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                disabled={busy || !form.title.en.trim() || !form.slug || !form.priceGel || form.images.length === 0 || form.materials.length === 0 || !form.category}
                onClick={saveProduct}
                className={`${btn} bg-neutral-900 dark:bg-white text-white dark:text-neutral-900`}
              >
                {busy ? 'Saving...' : 'Save product'}
              </button>
              <button onClick={() => setForm(null)} className={`${btn} border border-neutral-300 dark:border-neutral-700`}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {visible.length === 0 && <p className="py-6 text-sm text-neutral-500 text-center">No products here yet.</p>}
          {visible.map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-3">
              <img src={p.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-neutral-100 dark:bg-neutral-800 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">{p.title.en}</div>
                <div className="text-xs text-neutral-500 flex flex-wrap gap-x-2">
                  <span>{catName(p.category)}</span>
                  <span>{p.priceGel} ₾</span>
                  <span>{p.materials.join('/')}</span>
                  {p.featured && (
                    <span className="flex items-center gap-0.5 font-semibold text-amber-600 dark:text-amber-400">
                      <Star className="w-3 h-3 fill-current" /> featured
                    </span>
                  )}
                  {!p.inStock && <span className="text-amber-600">out of stock</span>}
                  {p.published === false && (
                    <span className="flex items-center gap-0.5 text-neutral-500">
                      <EyeOff className="w-3 h-3" /> hidden
                    </span>
                  )}
                </div>
              </div>
              {p.modelUrl && (
                <a href={p.modelUrl} target="_blank" rel="noopener noreferrer" title="Open model page" className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button title="Duplicate" onClick={() => duplicateProduct(p)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <Copy className="w-4 h-4" />
              </button>
              <button title="Edit" onClick={() => setForm(toForm(p))} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <Pencil className="w-4 h-4" />
              </button>
              <button title="Delete" onClick={() => deleteProduct(p)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
