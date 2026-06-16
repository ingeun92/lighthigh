import { login } from "../actions";

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const configured = Boolean(process.env.ADMIN_TOKEN);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-xl font-bold">lighthigh 관리자</h1>
      <p className="mb-6 text-sm text-neutral-500">관리자 암호를 입력하세요.</p>

      {!configured && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          관리자 암호가 아직 설정되지 않았습니다. 환경 변수 <code>ADMIN_TOKEN</code> 에 원하는 암호를
          설정한 뒤 다시 시도하세요. (설정 전에는 누구도 접근할 수 없습니다.)
        </p>
      )}

      <form action={login} className="space-y-3">
        <input
          name="token"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="암호"
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm"
        />
        {error && <p className="text-sm text-red-600">암호가 올바르지 않습니다.</p>}
        <button className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white">
          로그인
        </button>
      </form>
    </div>
  );
}
