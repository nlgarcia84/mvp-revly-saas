import { signOut } from '@/actions/auth';

const Navbar = () => {
  return (
    <header className="h-14 border-b border-neutral-200 flex items-center px-6 bg-white">
      <span className="font-semibold text-base">Revly</span>
      <div className="ml-auto">
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-neutral-500 hover:text-neutral-950 transition-colors"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </header>
  );
};

export default Navbar;
