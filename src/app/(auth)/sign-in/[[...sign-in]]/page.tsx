import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <SignIn
        fallbackRedirectUrl="/dashboard"
        appearance={{
          elements: {
            card: {
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              borderRadius: 12,
              border: '1px solid #e8e8e8',
              padding: 32,
            },
            headerTitle: { fontSize: 20, fontWeight: 600 },
            headerSubtitle: { color: '#6b6b6b' },
            formButtonPrimary: {
              background: '#0a0a0a',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              padding: '10px 20px',
              '&:hover': { background: '#272727' },
            },
            socialButtonsBlockButton: {
              borderRadius: 6,
              border: '1px solid #e8e8e8',
              fontSize: 14,
              fontWeight: 500,
              '&:hover': { background: '#f7f7f7' },
            },
            formFieldLabel: { fontSize: 13, fontWeight: 500, color: '#6b6b6b' },
            formFieldInput: {
              borderRadius: 6,
              border: '1px solid #e8e8e8',
              fontSize: 14,
              padding: '10px 12px',
              '&:focus': { borderColor: '#0a0a0a', boxShadow: '0 0 0 2px rgba(0,0,0,0.05)' },
            },
            footerActionLink: { color: '#0a0a0a' },
            footer: { '& > :last-child': { display: 'none' } },
          },
        }}
      />
    </div>
  );
}
