import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-secondary)',
    }}>
      <SignIn
        fallbackRedirectUrl="/dashboard"
        appearance={{
          elements: {
            card: {
              boxShadow: 'var(--shadow-md)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              padding: 32,
            },
            headerTitle: { fontSize: 20, fontWeight: 600 },
            headerSubtitle: { color: 'var(--text-secondary)' },
            formButtonPrimary: {
              background: 'var(--accent)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14,
              fontWeight: 500,
              padding: '10px 20px',
              '&:hover': { background: 'var(--accent-hover)' },
            },
            socialButtonsBlockButton: {
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              fontSize: 14,
              fontWeight: 500,
              '&:hover': { background: 'var(--bg-secondary)' },
            },
            formFieldLabel: { fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' },
            formFieldInput: {
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              fontSize: 14,
              padding: '10px 12px',
              '&:focus': { borderColor: 'var(--accent)', boxShadow: '0 0 0 2px rgba(0,0,0,0.05)' },
            },
            footerActionLink: { color: 'var(--accent)' },
            footer: { '& > :last-child': { display: 'none' } },
          },
        }}
      />
    </div>
  );
}
