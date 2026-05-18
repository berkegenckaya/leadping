import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="text-center">
        <p className="text-5xl font-bold text-zinc-200">403</p>
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">Erişim Reddedildi</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Bu sayfaya erişim yetkiniz bulunmuyor.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block text-sm font-medium text-zinc-700 underline underline-offset-4"
        >
          Dashboard&apos;a dön
        </Link>
      </div>
    </main>
  );
}
