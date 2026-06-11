import { UserButton } from '@clerk/nextjs';

export default function Navbar() {
  return (
    <header className="h-14 border-b border-neutral-200 flex items-center px-6 bg-white">
      <span className="font-semibold text-base">Revly</span>
      <div className="ml-auto">
        <UserButton />
      </div>
    </header>
  );
}
