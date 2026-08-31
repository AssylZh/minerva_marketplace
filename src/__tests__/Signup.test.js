import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Signup from '../pages/Signup';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

function renderSignup() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    </AuthProvider>
  );
}

const CITIES = ['San Francisco', 'Buenos Aires', 'Hyderabad', 'Taipei', 'Seoul', 'Tokyo', 'Berlin'];

describe('Signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders all form fields', () => {
    renderSignup();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/minerva email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/current city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cohort/i)).toBeInTheDocument();
  });

  test('city dropdown contains all Minerva cities', () => {
    renderSignup();
    const select = screen.getByLabelText(/current city/i);
    CITIES.forEach((city) => {
      expect(select).toHaveTextContent(city);
    });
  });

  test('submits all fields to the API', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 2, first_name: 'Ada' }, token: 'tok' }),
    });
    renderSignup();
    userEvent.type(screen.getByLabelText(/first name/i), 'Ada');
    userEvent.type(screen.getByLabelText(/last name/i), 'Lovelace');
    userEvent.type(screen.getByLabelText(/minerva email/i), 'ada@uni.minerva.edu');
    userEvent.type(screen.getByLabelText(/^password$/i), 'secret123');
    userEvent.selectOptions(screen.getByLabelText(/current city/i), 'Berlin');
    userEvent.type(screen.getByLabelText(/cohort/i), 'M27');
    fireEvent.submit(screen.getByRole('button', { name: /^sign up$/i }).closest('form'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/signup'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'ada@uni.minerva.edu',
            password: 'secret123',
            first_name: 'Ada',
            last_name: 'Lovelace',
            city: 'Berlin',
            cohort: 'M27',
          }),
        })
      );
    });
  });

  test('navigates to / on successful signup', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 2 }, token: 'tok' }),
    });
    renderSignup();
    userEvent.type(screen.getByLabelText(/first name/i), 'Ada');
    userEvent.type(screen.getByLabelText(/last name/i), 'L');
    userEvent.type(screen.getByLabelText(/minerva email/i), 'ada@uni.minerva.edu');
    userEvent.type(screen.getByLabelText(/^password$/i), 'pass');
    userEvent.selectOptions(screen.getByLabelText(/current city/i), 'Tokyo');
    userEvent.type(screen.getByLabelText(/cohort/i), 'M28');
    fireEvent.submit(screen.getByRole('button', { name: /^sign up$/i }).closest('form'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  test('shows API error on failed signup', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Email already in use' }),
    });
    renderSignup();
    userEvent.type(screen.getByLabelText(/minerva email/i), 'dup@uni.minerva.edu');
    fireEvent.submit(screen.getByRole('button', { name: /^sign up$/i }).closest('form'));
    await waitFor(() => expect(screen.getByText(/email already in use/i)).toBeInTheDocument());
  });

  test('shows fallback error on network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error());
    renderSignup();
    fireEvent.submit(screen.getByRole('button', { name: /^sign up$/i }).closest('form'));
    await waitFor(() => expect(screen.getByText(/something went wrong/i)).toBeInTheDocument());
  });

  test('disables button and shows loading text while submitting', async () => {
    let resolveRequest;
    global.fetch = jest.fn().mockReturnValue(new Promise((r) => { resolveRequest = r; }));
    renderSignup();
    fireEvent.submit(screen.getByRole('button', { name: /^sign up$/i }).closest('form'));
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /signing up/i });
      expect(btn).toBeDisabled();
    });
    resolveRequest({ ok: false, json: async () => ({ error: 'err' }) });
  });
});
