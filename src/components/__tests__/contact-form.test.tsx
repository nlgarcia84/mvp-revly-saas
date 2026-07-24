import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactForm from '@/components/contact-form';

describe('ContactForm', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('envía el formulario y muestra el mensaje de confirmación', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, message: 'Mensaje enviado correctamente' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ContactForm />);

    await userEvent.type(screen.getByLabelText(/nombre/i), 'Ana');
    await userEvent.type(screen.getByLabelText(/email/i), 'ana@example.com');
    await userEvent.type(screen.getByLabelText(/tu duda/i), 'Quiero probar la plataforma');

    await userEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }));

    await waitFor(() => {
      expect(screen.getByText(/mensaje enviado correctamente/i)).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/contact', expect.objectContaining({ method: 'POST' }));
  });
});
