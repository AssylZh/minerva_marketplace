import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Login from '../pages/Login';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

function renderLogin() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders email and password fields', () => {
    renderLogin();
    expect(screen.getByLabelText(/minerva email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  test('renders Log in button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /^log in$/i })).toBeInTheDocument();
  });

  test('submits email and password to the API', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 1, first_name: 'Ada' }, token: 'tok123' }),
    });
    renderLogin();
    userEvent.type(screen.getByLabelText(/minerva email/i), 'ada@uni.minerva.edu');
    userEvent.type(screen.getByLabelText(/^password$/i), 'password123');
    fireEvent.submit(screen.getByRole('button', { name: /^log in$/i }).closest('form'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'ada@uni.minerva.edu', password: 'password123' }),
        })
      );
    });
  });

  test('navigates to /items on successful login', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 1, first_name: 'Ada' }, token: 'tok123' }),
    });
    renderLogin();
    userEvent.type(screen.getByLabelText(/minerva email/i), 'ada@uni.minerva.edu');
    userEvent.type(screen.getByLabelText(/^password$/i), 'secret');
    fireEvent.submit(screen.getByRole('button', { name: /^log in$/i }).closest('form'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/items'));
  });

  test('shows API error on failed login', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    });
    renderLogin();
    userEvent.type(screen.getByLabelText(/minerva email/i), 'bad@uni.minerva.edu');
    userEvent.type(screen.getByLabelText(/^password$/i), 'wrong');
    fireEvent.submit(screen.getByRole('button', { name: /^log in$/i }).closest('form'));
    await waitFor(() => expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument());
  });

  test('shows fallback error on network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error());
    renderLogin();
    userEvent.type(screen.getByLabelText(/minerva email/i), 'a@uni.minerva.edu');
    userEvent.type(screen.getByLabelText(/^password$/i), 'pass');
    fireEvent.submit(screen.getByRole('button', { name: /^log in$/i }).closest('form'));
    await waitFor(() => expect(screen.getByText(/something went wrong/i)).toBeInTheDocument());
  });

  test('disables button and shows loading text while submitting', async () => {
    let resolveRequest;
    global.fetch = jest.fn().mockReturnValue(
      new Promise((r) => { resolveRequest = r; })
    );
    renderLogin();
    userEvent.type(screen.getByLabelText(/minerva email/i), 'a@uni.minerva.edu');
    userEvent.type(screen.getByLabelText(/^password$/i), 'pass');
    fireEvent.submit(screen.getByRole('button', { name: /^log in$/i }).closest('form'));
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /logging in/i });
      expect(btn).toBeDisabled();
    });
    resolveRequest({ ok: false, json: async () => ({ error: 'err' }) });
  });
});
