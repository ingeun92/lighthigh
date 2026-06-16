import { login } from "../actions";

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-xl font-bold">lighthigh 관리자</h1>
      <p className="mb-6 text-sm text-neutral-500">ADMIN_TOKEN 을 입력하세요.</p>
      <form action={login} className="space-y-3">
        <input
          name="token"
          type="password"
          autoFocus
          placeholder="ADMIN_TOKEN"
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm"
        />
        {error && <p className="text-sm text-red-600">토큰이 올바르지 않습니다.</p>}
        <button className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white">
          로그인
        </button>
      </form>
      <p className="mt-4 text-xs text-neutral-400">
        로컬 개발 환경에서 ADMIN_TOKEN 이 설정되지 않았다면 인증 없이 접근됩니다.
      </p>
    </div>
  );
}
