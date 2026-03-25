# Feature-Based Architecture — Admin & Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize both frontends from layer-based (`routes/`, `components/`, `lib/`) to feature-based (`features/<name>/`, `shared/`, `lib/`) structure, making route files thin shells.

**Architecture:** Each feature owns its components and hooks. Shared app-shell components (layout, header, loader) live in `shared/components/`. Infrastructure (Eden client, auth client, query client) stays in `lib/` unchanged. TanStack Router's `routes/` directory structure is immutable — route files become thin delegates that import from features.

**Tech Stack:** TypeScript, React, TanStack Router (admin: SPA; storefront: SSR/TanStack Start), TanStack Query (admin only), Eden treaty client, Better Auth, Tailwind CSS

---

## Context

Both `apps/admin` and `apps/storefront` are currently organized by technical layer. As more features are added, this makes it hard to find all code related to a feature. Feature-Based Architecture co-locates everything about a feature (components, hooks, API calls) in one directory, making features independently navigable and maintainable.

**Constraint:** TanStack Router file-based routing requires route files to stay in `routes/`. The solution is to make route files thin shells that delegate to `features/<name>/` components.

**No tests to update** — frontends have no unit tests (per CLAUDE.md).

---

## Final Structure

### Admin (`apps/admin/src/`)

```
features/
  auth/
    components/login-page.tsx       ← extracted from routes/login.tsx
    index.ts
  products/
    components/
      product-form.tsx              ← moved from components/product-form.tsx
      product-list-page.tsx         ← extracted from routes/products/index.tsx
      product-new-page.tsx          ← extracted from routes/products/new.tsx
      product-edit-page.tsx         ← extracted from routes/products/$productId.tsx
    hooks/
      use-products.ts               ← extracted useQuery from routes/products/index.tsx
      use-product.ts                ← extracted useQuery from routes/products/$productId.tsx
      use-create-product.ts         ← extracted useMutation from routes/products/new.tsx
      use-update-product.ts         ← extracted useMutation from routes/products/$productId.tsx
    index.ts
shared/
  components/
    admin-layout.tsx                ← moved from components/admin-layout.tsx
lib/                                ← UNCHANGED
routes/                             ← thin shells, structure unchanged
components/                         ← DELETED after migration
```

### Storefront (`apps/storefront/src/`)

```
features/
  auth/
    components/
      auth-page.tsx                 ← extracted toggle logic from routes/login.tsx
      sign-in-form.tsx              ← moved from components/ (update Loader import)
      sign-up-form.tsx              ← moved from components/ (update Loader import)
    index.ts
  products/
    components/
      product-list-page.tsx         ← extracted from routes/products/index.tsx
      product-detail-page.tsx       ← extracted from routes/products/$productId.tsx
    index.ts
shared/
  components/
    header.tsx                      ← moved from components/ (update user-menu import)
    user-menu.tsx                   ← moved from components/
    loader.tsx                      ← moved from components/
lib/                                ← UNCHANGED
routes/                             ← thin shells, structure unchanged
components/                         ← DELETED after migration
```

---

## Part 1 — Admin App

### Task A-1: Create `shared/components/admin-layout.tsx`

**Files:**

- Create: `apps/admin/src/shared/components/admin-layout.tsx`

- [ ] Create the file — exact copy of `components/admin-layout.tsx` (all internal imports already use `@/lib/` which resolves correctly):

```tsx
import { Button } from "@nexa/ui/components/button.tsx";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Package } from "lucide-react";

import { authClient } from "@/lib/auth-client.ts";

export default function AdminLayout() {
 const navigate = useNavigate();
 const { data: session } = authClient.useSession();

 const navItems = [
  { to: "/products", label: "Products", icon: Package },
 ] as const;

 return (
  <div className="grid h-svh grid-cols-[240px_1fr]">
   <aside className="flex flex-col border-r bg-card p-4">
    <div className="mb-6">
     <h1 className="font-bold text-lg">PXBR Admin</h1>
     <p className="text-muted-foreground text-xs">{session?.user.email}</p>
    </div>
    <nav className="flex flex-1 flex-col gap-1">
     {navItems.map(({ to, label, icon: Icon }) => (
      <Link
       key={to}
       to={to}
       className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted [&.active]:bg-muted [&.active]:font-medium"
      >
       <Icon size={16} />
       {label}
      </Link>
     ))}
    </nav>
    <Button
     variant="outline"
     onClick={() => {
      authClient.signOut({
       fetchOptions: {
        onSuccess: () => navigate({ to: "/login" }),
       },
      });
     }}
    >
     Sign Out
    </Button>
   </aside>
   <main className="overflow-y-auto p-6">
    <Outlet />
   </main>
  </div>
 );
}
```

- [ ] Commit: `git add apps/admin/src/shared/components/admin-layout.tsx && git commit -m "refactor(admin): add shared/components/admin-layout"`

---

### Task A-2: Update `routes/__root.tsx` import

**Files:**

- Modify: `apps/admin/src/routes/__root.tsx` (line 14)

- [ ] Change the import from:

  ```tsx
  import AdminLayout from "@/components/admin-layout.tsx";
  ```

  To:

  ```tsx
  import AdminLayout from "@/shared/components/admin-layout.tsx";
  ```

- [ ] Commit: `git add apps/admin/src/routes/__root.tsx && git commit -m "refactor(admin): point __root to shared AdminLayout"`

---

### Task A-3: Create `features/products/components/product-form.tsx`

**Files:**

- Create: `apps/admin/src/features/products/components/product-form.tsx`

- [ ] Create the file — exact copy of `components/product-form.tsx` (all internal imports already correct):

```tsx
import { Button } from "@nexa/ui/components/button.tsx";
import { Input } from "@nexa/ui/components/input.tsx";
import { Label } from "@nexa/ui/components/label.tsx";
import { useForm } from "@tanstack/react-form";

export interface ProductFormValues {
 name: string;
 description: string;
 priceInCents: number;
}

interface ProductFormProps {
 defaultValues?: ProductFormValues;
 onSubmit: (values: ProductFormValues) => Promise<void>;
 submitLabel: string;
}

export default function ProductForm({
 defaultValues,
 onSubmit,
 submitLabel,
}: ProductFormProps) {
 const form = useForm({
  defaultValues: defaultValues ?? {
   name: "",
   description: "",
   priceInCents: 0,
  },
  onSubmit: async ({ value }) => {
   await onSubmit(value);
  },
 });

 return (
  <form
   onSubmit={(e) => {
    e.preventDefault();
    form.handleSubmit();
   }}
   className="max-w-lg space-y-4"
  >
   <form.Field name="name">
    {(field) => (
     <div className="space-y-2">
      <Label htmlFor="name">Name</Label>
      <Input
       id="name"
       value={field.state.value}
       onChange={(e) => field.handleChange(e.currentTarget.value)}
       required
      />
     </div>
    )}
   </form.Field>
   <form.Field name="description">
    {(field) => (
     <div className="space-y-2">
      <Label htmlFor="description">Description</Label>
      <Input
       id="description"
       value={field.state.value}
       onChange={(e) => field.handleChange(e.currentTarget.value)}
      />
     </div>
    )}
   </form.Field>
   <form.Field name="priceInCents">
    {(field) => (
     <div className="space-y-2">
      <Label htmlFor="priceInCents">Price (cents)</Label>
      <Input
       id="priceInCents"
       type="number"
       min={0}
       value={field.state.value}
       onChange={(e) =>
        field.handleChange(Number(e.currentTarget.value))
       }
       required
      />
     </div>
    )}
   </form.Field>
   <form.Subscribe selector={(state) => state.isSubmitting}>
    {(isSubmitting) => (
     <Button type="submit" disabled={isSubmitting}>
      {isSubmitting ? "Saving..." : submitLabel}
     </Button>
    )}
   </form.Subscribe>
  </form>
 );
}
```

- [ ] Commit: `git add apps/admin/src/features/products/components/product-form.tsx && git commit -m "refactor(admin): move ProductForm to features/products"`

---

### Task A-4: Create product query hooks

**Files:**

- Create: `apps/admin/src/features/products/hooks/use-products.ts`
- Create: `apps/admin/src/features/products/hooks/use-product.ts`

- [ ] Create `use-products.ts` — extracts the `useQuery` from `routes/products/index.tsx`:

```ts
import { useQuery } from "@tanstack/react-query";

import { api, edenFetch } from "@/lib/eden.ts";

export function useProducts() {
 return useQuery({
  queryKey: ["admin", "products"],
  queryFn: () => edenFetch(() => api.api.products.get()),
 });
}
```

- [ ] Create `use-product.ts` — extracts the `useQuery` from `routes/products/$productId.tsx`:

```ts
import { useQuery } from "@tanstack/react-query";

import { api, edenFetch } from "@/lib/eden.ts";

export function useProduct(productId: string) {
 return useQuery({
  queryKey: ["admin", "products", productId],
  queryFn: () => edenFetch(() => api.api.products({ id: productId }).get()),
 });
}
```

- [ ] Commit: `git add apps/admin/src/features/products/hooks/ && git commit -m "refactor(admin): extract product query hooks"`

---

### Task A-5: Create product mutation hooks

**Files:**

- Create: `apps/admin/src/features/products/hooks/use-create-product.ts`
- Create: `apps/admin/src/features/products/hooks/use-update-product.ts`

- [ ] Create `use-create-product.ts` — extracts the `useMutation` from `routes/products/new.tsx`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { api, edenFetch } from "@/lib/eden.ts";
import type { ProductFormValues } from "@/features/products/components/product-form.tsx";

export function useCreateProduct() {
 const navigate = useNavigate();
 const queryClient = useQueryClient();

 return useMutation({
  mutationFn: (values: ProductFormValues) =>
   edenFetch(() => api.api.products.post(values)),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
   toast.success("Product created");
   navigate({ to: "/products" });
  },
  onError: (error) => {
   toast.error(
    error instanceof Error ? error.message : "Failed to create product",
   );
  },
 });
}
```

- [ ] Create `use-update-product.ts` — extracts the `useMutation` from `routes/products/$productId.tsx`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { api, edenFetch } from "@/lib/eden.ts";
import type { ProductFormValues } from "@/features/products/components/product-form.tsx";

export function useUpdateProduct(productId: string) {
 const navigate = useNavigate();
 const queryClient = useQueryClient();

 return useMutation({
  mutationFn: (values: ProductFormValues) =>
   edenFetch(() => api.api.products({ id: productId }).put(values)),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
   toast.success("Product updated");
   navigate({ to: "/products" });
  },
  onError: (error) => {
   toast.error(
    error instanceof Error ? error.message : "Failed to update product",
   );
  },
 });
}
```

- [ ] Commit: `git add apps/admin/src/features/products/hooks/ && git commit -m "refactor(admin): extract product mutation hooks"`

---

### Task A-6: Create `features/products/components/product-list-page.tsx`

**Files:**

- Create: `apps/admin/src/features/products/components/product-list-page.tsx`

- [ ] Create the file — extracts `ProductListPage` body from `routes/products/index.tsx`, replacing inline `useQuery` with the `useProducts` hook:

```tsx
import { Button } from "@nexa/ui/components/button.tsx";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { useProducts } from "@/features/products/hooks/use-products.ts";

export function ProductListPage() {
 const { data: products, isLoading } = useProducts();

 if (isLoading) {
  return <p className="text-muted-foreground">Loading products...</p>;
 }

 return (
  <div>
   <div className="mb-6 flex items-center justify-between">
    <h1 className="font-bold text-2xl">Products</h1>
    <Link to="/products/new">
     <Button>
      <Plus size={16} />
      New Product
     </Button>
    </Link>
   </div>
   <div className="rounded-lg border">
    <table className="w-full">
     <thead>
      <tr className="border-b bg-muted/50">
       <th className="px-4 py-3 text-left font-medium text-sm">Name</th>
       <th className="px-4 py-3 text-left font-medium text-sm">Price</th>
       <th className="px-4 py-3 text-left font-medium text-sm">
        Status
       </th>
       <th className="px-4 py-3 text-right font-medium text-sm">
        Actions
       </th>
      </tr>
     </thead>
     <tbody>
      {products?.map((product) => (
       <tr key={product.id} className="border-b last:border-0">
        <td className="px-4 py-3 text-sm">{product.name}</td>
        <td className="px-4 py-3 text-sm">
         {(product.priceInCents / 100).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
         })}
        </td>
        <td className="px-4 py-3 text-sm">
         <span
          className={
           product.active
            ? "text-green-500"
            : "text-muted-foreground"
          }
         >
          {product.active ? "Active" : "Inactive"}
         </span>
        </td>
        <td className="px-4 py-3 text-right text-sm">
         <Link
          to="/products/$productId"
          params={{ productId: product.id }}
          className="text-primary hover:underline"
         >
          Edit
         </Link>
        </td>
       </tr>
      ))}
     </tbody>
    </table>
   </div>
  </div>
 );
}
```

- [ ] Commit: `git add apps/admin/src/features/products/components/product-list-page.tsx && git commit -m "refactor(admin): extract ProductListPage to feature"`

---

### Task A-7: Create `features/products/components/product-new-page.tsx`

**Files:**

- Create: `apps/admin/src/features/products/components/product-new-page.tsx`

- [ ] Create the file — extracts `NewProductPage` body from `routes/products/new.tsx`, using the `useCreateProduct` hook:

```tsx
import ProductForm from "@/features/products/components/product-form.tsx";
import { useCreateProduct } from "@/features/products/hooks/use-create-product.ts";

export function ProductNewPage() {
 const createProduct = useCreateProduct();

 return (
  <div>
   <h1 className="mb-6 font-bold text-2xl">New Product</h1>
   <ProductForm
    onSubmit={async (values) => {
     await createProduct.mutateAsync(values);
    }}
    submitLabel="Create Product"
   />
  </div>
 );
}
```

- [ ] Commit: `git add apps/admin/src/features/products/components/product-new-page.tsx && git commit -m "refactor(admin): extract ProductNewPage to feature"`

---

### Task A-8: Create `features/products/components/product-edit-page.tsx`

**Files:**

- Create: `apps/admin/src/features/products/components/product-edit-page.tsx`

- [ ] Create the file — extracts `EditProductPage` body from `routes/products/$productId.tsx`. Receives `productId` as a prop (the route wrapper will call `Route.useParams()` and pass it through):

```tsx
import ProductForm from "@/features/products/components/product-form.tsx";
import { useProduct } from "@/features/products/hooks/use-product.ts";
import { useUpdateProduct } from "@/features/products/hooks/use-update-product.ts";

interface ProductEditPageProps {
 productId: string;
}

export function ProductEditPage({ productId }: ProductEditPageProps) {
 const { data: product, isLoading } = useProduct(productId);
 const updateProduct = useUpdateProduct(productId);

 if (isLoading) {
  return <p className="text-muted-foreground">Loading product...</p>;
 }

 if (!product) {
  return <p className="text-destructive">Product not found.</p>;
 }

 return (
  <div>
   <h1 className="mb-6 font-bold text-2xl">Edit Product</h1>
   <ProductForm
    defaultValues={{
     name: product.name,
     description: product.description ?? "",
     priceInCents: product.priceInCents,
    }}
    onSubmit={async (values) => {
     await updateProduct.mutateAsync(values);
    }}
    submitLabel="Save Changes"
   />
  </div>
 );
}
```

- [ ] Commit: `git add apps/admin/src/features/products/components/product-edit-page.tsx && git commit -m "refactor(admin): extract ProductEditPage to feature"`

---

### Task A-9: Create `features/auth/components/login-page.tsx`

**Files:**

- Create: `apps/admin/src/features/auth/components/login-page.tsx`

- [ ] Create the file — extracts `LoginPage` body from `routes/login.tsx` verbatim (all imports already use `@/lib/`):

```tsx
import { Button } from "@nexa/ui/components/button.tsx";
import { Input } from "@nexa/ui/components/input.tsx";
import { Label } from "@nexa/ui/components/label.tsx";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client.ts";

export function LoginPage() {
 const navigate = useNavigate();
 const { data: session } = authClient.useSession();

 useEffect(() => {
  if (session?.user.role === "admin") {
   navigate({ to: "/products" });
  }
 }, [session, navigate]);

 if (session?.user.role === "admin") return null;

 const form = useForm({
  defaultValues: {
   email: "",
   password: "",
  },
  onSubmit: async ({ value }) => {
   await authClient.signIn.email(
    {
     email: value.email,
     password: value.password,
    },
    {
     onSuccess: () => {
      navigate({ to: "/products" });
     },
     onError: (ctx) => {
      toast.error(ctx.error.message);
     },
    },
   );
  },
 });

 return (
  <div className="flex h-svh items-center justify-center">
   <div className="w-full max-w-sm space-y-6 rounded-lg border p-6">
    <div className="text-center">
     <h1 className="font-bold text-2xl">PXBR Admin</h1>
     <p className="text-muted-foreground text-sm">
      Sign in with your admin account
     </p>
    </div>
    <form
     onSubmit={(e) => {
      e.preventDefault();
      form.handleSubmit();
     }}
     className="space-y-4"
    >
     <form.Field name="email">
      {(field) => (
       <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
         id="email"
         type="email"
         value={field.state.value}
         onChange={(e) => field.handleChange(e.currentTarget.value)}
         required
        />
       </div>
      )}
     </form.Field>
     <form.Field name="password">
      {(field) => (
       <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
         id="password"
         type="password"
         value={field.state.value}
         onChange={(e) => field.handleChange(e.currentTarget.value)}
         required
        />
       </div>
      )}
     </form.Field>
     <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
       <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign In"}
       </Button>
      )}
     </form.Subscribe>
    </form>
    {session && session.user.role !== "admin" && (
     <p className="text-center text-destructive text-sm">
      Your account does not have admin access.
     </p>
    )}
   </div>
  </div>
 );
}
```

- [ ] Commit: `git add apps/admin/src/features/auth/components/login-page.tsx && git commit -m "refactor(admin): extract LoginPage to feature"`

---

### Task A-10: Create barrel files and update admin route files

**Files:**

- Create: `apps/admin/src/features/auth/index.ts`
- Create: `apps/admin/src/features/products/index.ts`
- Modify: `apps/admin/src/routes/login.tsx`
- Modify: `apps/admin/src/routes/products/index.tsx`
- Modify: `apps/admin/src/routes/products/new.tsx`
- Modify: `apps/admin/src/routes/products/$productId.tsx`

- [ ] Create `features/auth/index.ts`:

```ts
export { LoginPage } from "./components/login-page.tsx";
```

- [ ] Create `features/products/index.ts`:

```ts
export { ProductListPage } from "./components/product-list-page.tsx";
export { ProductNewPage } from "./components/product-new-page.tsx";
export { ProductEditPage } from "./components/product-edit-page.tsx";
export type { ProductFormValues } from "./components/product-form.tsx";
```

- [ ] Replace `routes/login.tsx` entirely:

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { LoginPage } from "@/features/auth/index.ts";

export const Route = createFileRoute("/login")({
 component: LoginPage,
});
```

- [ ] Replace `routes/products/index.tsx` entirely:

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { ProductListPage } from "@/features/products/index.ts";

export const Route = createFileRoute("/products/")({
 component: ProductListPage,
});
```

- [ ] Replace `routes/products/new.tsx` entirely:

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { ProductNewPage } from "@/features/products/index.ts";

export const Route = createFileRoute("/products/new")({
 component: ProductNewPage,
});
```

- [ ] Replace `routes/products/$productId.tsx` entirely. Note: `Route.useParams()` must be called inside the route's component scope, so a thin wrapper passes `productId` as a prop to `ProductEditPage`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { ProductEditPage } from "@/features/products/index.ts";

export const Route = createFileRoute("/products/$productId")({
 component: function EditProductRoute() {
  const { productId } = Route.useParams();
  return <ProductEditPage productId={productId} />;
 },
});
```

- [ ] Commit: `git add apps/admin/src/features/ apps/admin/src/routes/ && git commit -m "refactor(admin): make route files thin shells"`

---

### Task A-11: Delete old `components/` in admin

**Files:**

- Delete: `apps/admin/src/components/admin-layout.tsx`
- Delete: `apps/admin/src/components/product-form.tsx`

- [ ] Delete both files:

```bash
rm apps/admin/src/components/admin-layout.tsx
rm apps/admin/src/components/product-form.tsx
```

- [ ] Verify `components/` directory is now empty and can be removed:

```bash
ls apps/admin/src/components/
# Expected: empty or directory not found
```

- [ ] Commit: `git add -A && git commit -m "refactor(admin): delete old components/ directory"`

---

## Part 2 — Storefront App

### Task S-1: Create `shared/components/` in storefront

**Files:**

- Create: `apps/storefront/src/shared/components/loader.tsx`
- Create: `apps/storefront/src/shared/components/user-menu.tsx`
- Create: `apps/storefront/src/shared/components/header.tsx`

- [ ] Create `shared/components/loader.tsx` — exact copy of `components/loader.tsx`:

```tsx
import { Loader2 } from "lucide-react";

export default function Loader() {
 return (
  <div className="flex h-full items-center justify-center pt-8">
   <Loader2 className="animate-spin" />
  </div>
 );
}
```

- [ ] Create `shared/components/user-menu.tsx` — exact copy of `components/user-menu.tsx` (all imports use `@/lib/` which still resolves correctly):

```tsx
import { Button } from "@nexa/ui/components/button.tsx";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuGroup,
 DropdownMenuItem,
 DropdownMenuLabel,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "@nexa/ui/components/dropdown-menu.tsx";
import { Skeleton } from "@nexa/ui/components/skeleton.tsx";
import { Link, useNavigate } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client.ts";

export default function UserMenu() {
 const navigate = useNavigate();
 const { data: session, isPending } = authClient.useSession();

 if (isPending) {
  return <Skeleton className="h-9 w-24" />;
 }

 if (!session) {
  return (
   <Link to="/login">
    <Button variant="outline">Sign In</Button>
   </Link>
  );
 }

 return (
  <DropdownMenu>
   <DropdownMenuTrigger render={<Button variant="outline" />}>
    {session.user.name}
   </DropdownMenuTrigger>
   <DropdownMenuContent className="bg-card">
    <DropdownMenuGroup>
     <DropdownMenuLabel>My Account</DropdownMenuLabel>
     <DropdownMenuSeparator />
     <DropdownMenuItem>{session.user.email}</DropdownMenuItem>
     <DropdownMenuItem
      onClick={() => {
       authClient.signOut({
        fetchOptions: {
         onSuccess: () => {
          navigate({ to: "/" });
         },
        },
       });
      }}
      variant="destructive"
     >
      Sign Out
     </DropdownMenuItem>
    </DropdownMenuGroup>
   </DropdownMenuContent>
  </DropdownMenu>
 );
}
```

- [ ] Create `shared/components/header.tsx` — copy of `components/header.tsx` with the `UserMenu` import updated to the new path:

```tsx
import { Link } from "@tanstack/react-router";

import UserMenu from "./user-menu.tsx";

export default function Header() {
 const links = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
 ] as const;

 return (
  <div>
   <div className="flex flex-row items-center justify-between px-2 py-1">
    <nav className="flex gap-4 text-lg">
     {links.map(({ to, label }) => {
      return (
       <Link key={to} to={to}>
        {label}
       </Link>
      );
     })}
    </nav>
    <div className="flex items-center gap-2">
     <UserMenu />
    </div>
   </div>
   <hr />
  </div>
 );
}
```

Note: `UserMenu` is imported via relative path `./user-menu.tsx` since both are in `shared/components/`. The original `components/header.tsx` used the same relative pattern.

- [ ] Commit: `git add apps/storefront/src/shared/ && git commit -m "refactor(storefront): add shared/components (header, user-menu, loader)"`

---

### Task S-2: Update `routes/__root.tsx` import in storefront

**Files:**

- Modify: `apps/storefront/src/routes/__root.tsx` (line 13)

- [ ] Change the import from:

  ```tsx
  import Header from "../components/header.tsx";
  ```

  To:

  ```tsx
  import Header from "@/shared/components/header.tsx";
  ```

- [ ] Commit: `git add apps/storefront/src/routes/__root.tsx && git commit -m "refactor(storefront): point __root to shared Header"`

---

### Task S-3: Create `features/auth/` in storefront

**Files:**

- Create: `apps/storefront/src/features/auth/components/sign-in-form.tsx`
- Create: `apps/storefront/src/features/auth/components/sign-up-form.tsx`
- Create: `apps/storefront/src/features/auth/components/auth-page.tsx`
- Create: `apps/storefront/src/features/auth/index.ts`

- [ ] Create `features/auth/components/sign-in-form.tsx` — copy of `components/sign-in-form.tsx` with one import updated (`./loader.tsx` → `@/shared/components/loader.tsx`):

```tsx
import { Button } from "@nexa/ui/components/button.tsx";
import { Input } from "@nexa/ui/components/input.tsx";
import { Label } from "@nexa/ui/components/label.tsx";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client.ts";
import Loader from "@/shared/components/loader.tsx";

export default function SignInForm({
 onSwitchToSignUp,
}: {
 onSwitchToSignUp: () => void;
}) {
 const navigate = useNavigate({
  from: "/",
 });
 const { isPending } = authClient.useSession();

 const form = useForm({
  defaultValues: {
   email: "",
   password: "",
  },
  onSubmit: async ({ value }) => {
   await authClient.signIn.email(
    {
     email: value.email,
     password: value.password,
    },
    {
     onSuccess: () => {
      navigate({
       to: "/products",
      });
      toast.success("Sign in successful");
     },
     onError: (error) => {
      toast.error(error.error.message || error.error.statusText);
     },
    },
   );
  },
  validators: {
   onSubmit: z.object({
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
   }),
  },
 });

 if (isPending) {
  return <Loader />;
 }

 return (
  <div className="mx-auto mt-10 w-full max-w-md p-6">
   <h1 className="mb-6 text-center font-bold text-3xl">Welcome Back</h1>

   <form
    className="space-y-4"
    onSubmit={(e) => {
     e.preventDefault();
     e.stopPropagation();
     form.handleSubmit();
    }}
   >
    <div>
     <form.Field name="email">
      {(field) => (
       <div className="space-y-2">
        <Label htmlFor={field.name}>Email</Label>
        <Input
         id={field.name}
         name={field.name}
         onBlur={field.handleBlur}
         onChange={(e) => field.handleChange(e.target.value)}
         type="email"
         value={field.state.value}
        />
        {field.state.meta.errors.map((error) => (
         <p className="text-red-500" key={error?.message}>
          {error?.message}
         </p>
        ))}
       </div>
      )}
     </form.Field>
    </div>

    <div>
     <form.Field name="password">
      {(field) => (
       <div className="space-y-2">
        <Label htmlFor={field.name}>Password</Label>
        <Input
         id={field.name}
         name={field.name}
         onBlur={field.handleBlur}
         onChange={(e) => field.handleChange(e.target.value)}
         type="password"
         value={field.state.value}
        />
        {field.state.meta.errors.map((error) => (
         <p className="text-red-500" key={error?.message}>
          {error?.message}
         </p>
        ))}
       </div>
      )}
     </form.Field>
    </div>

    <form.Subscribe
     selector={(state) => ({
      canSubmit: state.canSubmit,
      isSubmitting: state.isSubmitting,
     })}
    >
     {({ canSubmit, isSubmitting }) => (
      <Button
       className="w-full"
       disabled={!canSubmit || isSubmitting}
       type="submit"
      >
       {isSubmitting ? "Submitting..." : "Sign In"}
      </Button>
     )}
    </form.Subscribe>
   </form>

   <div className="mt-4 text-center">
    <Button
     className="text-indigo-600 hover:text-indigo-800"
     onClick={onSwitchToSignUp}
     variant="link"
    >
     Need an account? Sign Up
    </Button>
   </div>
  </div>
 );
}
```

- [ ] Create `features/auth/components/sign-up-form.tsx` — copy of `components/sign-up-form.tsx` with one import updated (`./loader.tsx` → `@/shared/components/loader.tsx`):

```tsx
import { Button } from "@nexa/ui/components/button.tsx";
import { Input } from "@nexa/ui/components/input.tsx";
import { Label } from "@nexa/ui/components/label.tsx";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client.ts";
import Loader from "@/shared/components/loader.tsx";

export default function SignUpForm({
 onSwitchToSignIn,
}: {
 onSwitchToSignIn: () => void;
}) {
 const navigate = useNavigate({
  from: "/",
 });
 const { isPending } = authClient.useSession();

 const form = useForm({
  defaultValues: {
   email: "",
   password: "",
   name: "",
  },
  onSubmit: async ({ value }) => {
   await authClient.signUp.email(
    {
     email: value.email,
     password: value.password,
     name: value.name,
    },
    {
     onSuccess: () => {
      navigate({
       to: "/products",
      });
      toast.success("Sign up successful");
     },
     onError: (error) => {
      toast.error(error.error.message || error.error.statusText);
     },
    },
   );
  },
  validators: {
   onSubmit: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
   }),
  },
 });

 if (isPending) {
  return <Loader />;
 }

 return (
  <div className="mx-auto mt-10 w-full max-w-md p-6">
   <h1 className="mb-6 text-center font-bold text-3xl">Create Account</h1>

   <form
    className="space-y-4"
    onSubmit={(e) => {
     e.preventDefault();
     e.stopPropagation();
     form.handleSubmit();
    }}
   >
    <div>
     <form.Field name="name">
      {(field) => (
       <div className="space-y-2">
        <Label htmlFor={field.name}>Name</Label>
        <Input
         id={field.name}
         name={field.name}
         onBlur={field.handleBlur}
         onChange={(e) => field.handleChange(e.target.value)}
         value={field.state.value}
        />
        {field.state.meta.errors.map((error) => (
         <p className="text-red-500" key={error?.message}>
          {error?.message}
         </p>
        ))}
       </div>
      )}
     </form.Field>
    </div>

    <div>
     <form.Field name="email">
      {(field) => (
       <div className="space-y-2">
        <Label htmlFor={field.name}>Email</Label>
        <Input
         id={field.name}
         name={field.name}
         onBlur={field.handleBlur}
         onChange={(e) => field.handleChange(e.target.value)}
         type="email"
         value={field.state.value}
        />
        {field.state.meta.errors.map((error) => (
         <p className="text-red-500" key={error?.message}>
          {error?.message}
         </p>
        ))}
       </div>
      )}
     </form.Field>
    </div>

    <div>
     <form.Field name="password">
      {(field) => (
       <div className="space-y-2">
        <Label htmlFor={field.name}>Password</Label>
        <Input
         id={field.name}
         name={field.name}
         onBlur={field.handleBlur}
         onChange={(e) => field.handleChange(e.target.value)}
         type="password"
         value={field.state.value}
        />
        {field.state.meta.errors.map((error) => (
         <p className="text-red-500" key={error?.message}>
          {error?.message}
         </p>
        ))}
       </div>
      )}
     </form.Field>
    </div>

    <form.Subscribe
     selector={(state) => ({
      canSubmit: state.canSubmit,
      isSubmitting: state.isSubmitting,
     })}
    >
     {({ canSubmit, isSubmitting }) => (
      <Button
       className="w-full"
       disabled={!canSubmit || isSubmitting}
       type="submit"
      >
       {isSubmitting ? "Submitting..." : "Sign Up"}
      </Button>
     )}
    </form.Subscribe>
   </form>

   <div className="mt-4 text-center">
    <Button
     className="text-indigo-600 hover:text-indigo-800"
     onClick={onSwitchToSignIn}
     variant="link"
    >
     Already have an account? Sign In
    </Button>
   </div>
  </div>
 );
}
```

- [ ] Create `features/auth/components/auth-page.tsx` — extracts the `RouteComponent` body from `routes/login.tsx`:

```tsx
import { useState } from "react";

import SignInForm from "@/features/auth/components/sign-in-form.tsx";
import SignUpForm from "@/features/auth/components/sign-up-form.tsx";

export function AuthPage() {
 const [showSignIn, setShowSignIn] = useState(false);

 return showSignIn ? (
  <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
 ) : (
  <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
 );
}
```

- [ ] Create `features/auth/index.ts`:

```ts
export { AuthPage } from "./components/auth-page.tsx";
```

- [ ] Commit: `git add apps/storefront/src/features/auth/ && git commit -m "refactor(storefront): add features/auth with AuthPage and forms"`

---

### Task S-4: Create `features/products/` in storefront

**Files:**

- Create: `apps/storefront/src/features/products/components/product-list-page.tsx`
- Create: `apps/storefront/src/features/products/components/product-detail-page.tsx`
- Create: `apps/storefront/src/features/products/index.ts`

Note: Storefront uses SSR loaders (not TanStack Query). Loaders **must** stay in route files (TanStack Start requirement). The feature components receive loader data as plain props — TypeScript structural typing ensures the prop shape matches what the loader returns.

- [ ] Create `features/products/components/product-list-page.tsx` — extracts `ProductsPage` JSX from `routes/products/index.tsx`, receiving products as a prop:

```tsx
interface Product {
 id: string;
 name: string;
 description?: string | null;
 priceInCents: number;
}

interface ProductListPageProps {
 products: Product[];
}

export function ProductListPage({ products }: ProductListPageProps) {
 return (
  <div className="container mx-auto max-w-4xl px-4 py-6">
   <h1 className="mb-6 font-bold text-2xl">Products</h1>
   {products.length === 0 ? (
    <p className="text-muted-foreground">No products available.</p>
   ) : (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
     {products.map((product) => (
      <a
       key={product.id}
       href={`/products/${product.id}`}
       className="rounded-lg border p-4 transition-colors hover:bg-muted"
      >
       <h2 className="font-medium">{product.name}</h2>
       {product.description && (
        <p className="mt-1 text-muted-foreground text-sm">
         {product.description}
        </p>
       )}
       <p className="mt-2 font-semibold">
        {(product.priceInCents / 100).toLocaleString("pt-BR", {
         style: "currency",
         currency: "BRL",
        })}
       </p>
      </a>
     ))}
    </div>
   )}
  </div>
 );
}
```

- [ ] Create `features/products/components/product-detail-page.tsx` — extracts `ProductDetailPage` JSX from `routes/products/$productId.tsx`, receiving product as a prop:

```tsx
interface Product {
 id: string;
 name: string;
 description?: string | null;
 priceInCents: number;
}

interface ProductDetailPageProps {
 product: Product | null | undefined;
}

export function ProductDetailPage({ product }: ProductDetailPageProps) {
 if (!product) {
  return (
   <div className="container mx-auto max-w-2xl px-4 py-6">
    <p className="text-destructive">Product not found.</p>
   </div>
  );
 }

 return (
  <div className="container mx-auto max-w-2xl px-4 py-6">
   <a
    href="/products"
    className="mb-4 inline-block text-muted-foreground text-sm hover:underline"
   >
    &larr; Back to products
   </a>
   <h1 className="mb-2 font-bold text-3xl">{product.name}</h1>
   {product.description && (
    <p className="mb-4 text-muted-foreground">{product.description}</p>
   )}
   <p className="font-semibold text-2xl">
    {(product.priceInCents / 100).toLocaleString("pt-BR", {
     style: "currency",
     currency: "BRL",
    })}
   </p>
  </div>
 );
}
```

- [ ] Create `features/products/index.ts`:

```ts
export { ProductListPage } from "./components/product-list-page.tsx";
export { ProductDetailPage } from "./components/product-detail-page.tsx";
```

- [ ] Commit: `git add apps/storefront/src/features/products/ && git commit -m "refactor(storefront): add features/products with page components"`

---

### Task S-5: Update storefront route files and delete old `components/`

**Files:**

- Modify: `apps/storefront/src/routes/login.tsx`
- Modify: `apps/storefront/src/routes/products/index.tsx`
- Modify: `apps/storefront/src/routes/products/$productId.tsx`
- Delete: `apps/storefront/src/components/header.tsx`
- Delete: `apps/storefront/src/components/user-menu.tsx`
- Delete: `apps/storefront/src/components/loader.tsx`
- Delete: `apps/storefront/src/components/sign-in-form.tsx`
- Delete: `apps/storefront/src/components/sign-up-form.tsx`

- [ ] Replace `routes/login.tsx` entirely:

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { AuthPage } from "@/features/auth/index.ts";

export const Route = createFileRoute("/login")({
 component: AuthPage,
});
```

- [ ] Replace `routes/products/index.tsx` entirely. Loader and `head` stay here (TanStack Start requirement); the route component becomes a thin wrapper:

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { ProductListPage } from "@/features/products/index.ts";
import { api, edenFetch } from "@/lib/eden.ts";

export const Route = createFileRoute("/products/")({
 component: function ProductsRoute() {
  const products = Route.useLoaderData() ?? [];
  return <ProductListPage products={products} />;
 },
 loader: () => edenFetch(() => api.api.products.feed.get()),
 head: () => ({
  meta: [{ title: "Products — PXBR" }],
 }),
});
```

- [ ] Replace `routes/products/$productId.tsx` entirely:

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { ProductDetailPage } from "@/features/products/index.ts";
import { api, edenFetch } from "@/lib/eden.ts";

export const Route = createFileRoute("/products/$productId")({
 component: function ProductDetailRoute() {
  const product = Route.useLoaderData();
  return <ProductDetailPage product={product} />;
 },
 loader: ({ params }) =>
  edenFetch(() => api.api.products.feed({ id: params.productId }).get()),
 head: ({ loaderData }) => ({
  meta: [{ title: `${loaderData?.name ?? "Product"} — PXBR` }],
 }),
});
```

- [ ] Delete old component files:

```bash
rm apps/storefront/src/components/header.tsx
rm apps/storefront/src/components/user-menu.tsx
rm apps/storefront/src/components/loader.tsx
rm apps/storefront/src/components/sign-in-form.tsx
rm apps/storefront/src/components/sign-up-form.tsx
```

- [ ] Commit: `git add -A && git commit -m "refactor(storefront): make route files thin shells, delete old components/"`

---

## Task VERIFY: Run typecheck

- [ ] From the monorepo root, run the full typecheck pipeline:

```bash
bun run check-types
```

Expected: zero TypeScript errors across all packages. If errors appear, they will be import path mistakes — find the file referenced in the error and correct the import path.

- [ ] If the typecheck passes, commit is already done. Final structure is complete.

---

## Summary of Changes

| App | Files Created | Files Modified | Files Deleted |
|-----|--------------|----------------|---------------|
| admin | 12 | 5 | 2 |
| storefront | 10 | 4 | 5 |

All changes are purely structural — no behavior changes, no new dependencies, no API changes. The `routeTree.gen.ts` files in both apps are unaffected.
