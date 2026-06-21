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
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100 dark:hover:border-neutral-600 transition-all duration-150 cursor-pointer"
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
