import { checkDiscountCode, redeemDiscountCode } from '@/actions/redeem';
import { redirect } from 'next/navigation';
import Button from '@/components/ui/button';

const VerifyPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; code: string }>;
  searchParams: Promise<{ error?: string; redeemed?: string; newCode?: string }>;
}) => {
  const { slug, code } = await params;
  const { error, redeemed, newCode } = await searchParams;

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 p-4 flex flex-col items-center justify-center">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-sm p-8">
        <p className="text-xs text-neutral-400 uppercase tracking-wider text-center mb-1">
          Verificación
        </p>
        <h1 className="text-xl font-semibold text-center mb-2">{slug}</h1>

        {redeemed ? (
          <>
            <p className="text-emerald-600 dark:text-emerald-400 font-medium text-center mb-2">
              ✅ Descuento canjeado
            </p>
            <p className="text-xs text-neutral-500 text-center mb-4">
              Nuevo código del cliente: <strong className="font-mono">{newCode}</strong>
            </p>
            <Button as="a" variant="primary" href={`/${slug}/verificar/${code}`} className="w-full">
              Verificar otro
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-500 text-center mb-4">
              Código: <strong className="font-mono text-neutral-950 dark:text-neutral-100">{code}</strong>
            </p>

            {error && (
              <p className="text-sm text-red-500 text-center mb-4">{error}</p>
            )}

            <form
              action={async (formData: FormData) => {
                'use server';
                const pin = formData.get('pin') as string;

                if (!pin || pin.length !== 4) {
                  redirect(`/${slug}/verificar/${code}?error=El PIN debe tener 4 dígitos`);
                }

                try {
                  const result = await checkDiscountCode(code, pin, slug);
                  // Valid — now redeem
                  const redeemResult = await redeemDiscountCode(code, pin, slug);
                  redirect(
                    `/${slug}/verificar/${code}?redeemed=1&newCode=${redeemResult.newCode}`,
                  );
                } catch (e) {
                  const msg = e instanceof Error ? e.message : 'Error';
                  redirect(`/${slug}/verificar/${code}?error=${encodeURIComponent(msg)}`);
                }
              }}
              className="flex flex-col gap-3"
            >
              <div>
                <label className="block text-xs font-medium mb-[6px] text-neutral-500">
                  PIN del negocio
                </label>
                <input
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  required
                  placeholder="****"
                  className="w-full px-3 py-2.5 text-center text-2xl tracking-[0.5em] border border-neutral-200 dark:border-neutral-700 rounded-md text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none transition-all duration-150 focus:border-neutral-950 dark:focus:border-neutral-400 placeholder:text-neutral-300 dark:placeholder:text-neutral-600"
                />
              </div>

              <Button type="submit" variant="primary" className="w-full">
                Verificar y canjear
              </Button>
            </form>

            <p className="text-xs text-neutral-400 text-center mt-4">
              El código se marcará como usado y se descontarán 5 puntos al cliente
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyPage;
