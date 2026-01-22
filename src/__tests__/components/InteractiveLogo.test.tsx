import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import InteractiveLogo from '@/components/InteractiveLogo';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('InteractiveLogo', () => {
  it('renders the logo image', () => {
    render(
      <BrowserRouter>
        <InteractiveLogo />
      </BrowserRouter>
    );

    const logo = screen.getByAltText('Claude Logo');
    expect(logo).toBeInTheDocument();
  });

  it('navigates to /auth when clicked', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <InteractiveLogo />
      </BrowserRouter>
    );

    const logo = screen.getByAltText('Claude Logo');
    const logoContainer = logo.closest('div.cursor-pointer');

    if (logoContainer) {
      await user.click(logoContainer);
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/auth');
      });
    }
  });

  it('shows "Click to login" hint', () => {
    render(
      <BrowserRouter>
        <InteractiveLogo />
      </BrowserRouter>
    );

    const hint = screen.getByText('Click to login');
    expect(hint).toBeInTheDocument();
  });
});