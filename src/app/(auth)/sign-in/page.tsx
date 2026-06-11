export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm w-[420px] p-8">
        <h1 className="text-xl font-semibold mb-1">Iniciar sesión</h1>
        <p className="text-sm text-neutral-500 mb-6">accede a tu cuenta de Revly</p>
        {/* Aquí irá el formulario con Supabase */}
      </div>
    </div>
  );
}
