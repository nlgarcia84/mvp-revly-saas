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
      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-xs font-medium text-neutral-500 transition-all duration-150 hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-950 focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-[#191a1d] dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 sm:min-h-9 sm:px-3.5 sm:py-2 cursor-pointer"
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
