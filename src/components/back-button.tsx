'use client';

import { useRouter } from 'next/navigation';

type BackButtonProps = {
  label?: string;
  href?: string;
};

const BackButton = ({ label = 'Volver', href }: BackButtonProps) => {
  const router = useRouter();

  return (
    <button
      onClick={() => (href ? router.push(href) : router.back())}
      className="my-1 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#202020] bg-[#0B0B0B] px-4 py-2.5 text-xs font-medium text-neutral-300 shadow-[4px_4px_10px_#000,-3px_-3px_8px_#151515] transition-all duration-150 hover:text-white active:shadow-[inset_3px_3px_7px_#000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] cursor-pointer"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </svg>
      {label}
    </button>
  );
};

export default BackButton;
