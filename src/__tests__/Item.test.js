import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Item from '../pages/Item';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

function renderItem({ currentUserId = null, token = null } = {}) {
  if (currentUserId) {
    localStorage.setItem('mm_auth_user', JSON.stringify({ id: currentUserId, token }));
  } else {
    localStorage.removeItem('mm_auth_user');
  }
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/items/42']}>
        <Routes>
          <Route path="/items/:itemID" element={<Item />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

const baseItem = {
  id: 42,
  title: 'Vintage Lamp',
  price: 2500,
  condition: 'Good',
  description: 'A nice lamp',
  image_url: null,
  location: 'Berlin',
  status: 'active',
  category: 'Furniture',
  seller_id: 7,
  seller: {
    first_name: 'Jane',
    last_name: 'Doe',
    city: 'Berlin',
    cohort: 'M27',
    created_at: '2023-01-15T00:00:00Z',
  },
};

describe('Item detail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    window.confirm = jest.fn().mockReturnValue(true);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => baseItem,
    });
  });

  afterEach(() => localStorage.clear());

  test('shows item title and price', async () => {
    renderItem();
    await waitFor(() => expect(screen.getByText('Vintage Lamp')).toBeInTheDocument());
    expect(screen.getByText(/\$25\.00/)).toBeInTheDocument();
  });

  test('shows seller profile card', async () => {
    renderItem();
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    expect(screen.getByText(/cohort m27/i)).toBeInTheDocument();
    expect(screen.getByText(/member since/i)).toBeInTheDocument();
  });

  test('non-owner sees Contact Seller button', async () => {
    renderItem({ currentUserId: 99, token: 'tok' });
    await waitFor(() => expect(screen.getByRole('button', { name: /contact seller/i })).toBeInTheDocument());
  });

  test('non-owner does not see Edit or Delete buttons', async () => {
    renderItem({ currentUserId: 99, token: 'tok' });
    await waitFor(() => screen.getByText('Vintage Lamp'));
    expect(screen.queryByRole('button', { name: /edit listing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete listing/i })).not.toBeInTheDocument();
  });

  test('owner sees Edit listing, Mark as sold, and Delete listing buttons', async () => {
    renderItem({ currentUserId: 7, token: 'tok' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit listing/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /mark as sold/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete listing/i })).toBeInTheDocument();
    });
  });

  test('owner does not see Contact Seller button', async () => {
    renderItem({ currentUserId: 7, token: 'tok' });
    await waitFor(() => screen.getByRole('button', { name: /edit listing/i }));
    expect(screen.queryByRole('button', { name: /contact seller/i })).not.toBeInTheDocument();
  });

  test('sold item hides Contact Seller for non-owner', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...baseItem, status: 'sold' }),
    });
    renderItem({ currentUserId: 99, token: 'tok' });
    await waitFor(() => screen.getByText('Vintage Lamp'));
    expect(screen.queryByRole('button', { name: /contact seller/i })).not.toBeInTheDocument();
  });

  test('sold item hides Mark as sold for owner', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...baseItem, status: 'sold' }),
    });
    renderItem({ currentUserId: 7, token: 'tok' });
    await waitFor(() => screen.getByRole('button', { name: /edit listing/i }));
    expect(screen.queryByRole('button', { name: /mark as sold/i })).not.toBeInTheDocument();
  });

  test('clicking Edit listing navigates to edit page', async () => {
    renderItem({ currentUserId: 7, token: 'tok' });
    await waitFor(() => screen.getByRole('button', { name: /edit listing/i }));
    fireEvent.click(screen.getByRole('button', { name: /edit listing/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/items/42/edit');
  });

  test('delete calls confirm and navigates to /dashboard on success', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => baseItem })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    renderItem({ currentUserId: 7, token: 'tok' });
    await waitFor(() => screen.getByRole('button', { name: /delete listing/i }));
    fireEvent.click(screen.getByRole('button', { name: /delete listing/i }));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
  });

  test('delete shows error message when API returns failure', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => baseItem })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Not authorized' }) });
    renderItem({ currentUserId: 7, token: 'tok' });
    await waitFor(() => screen.getByRole('button', { name: /delete listing/i }));
    fireEvent.click(screen.getByRole('button', { name: /delete listing/i }));
    await waitFor(() => expect(screen.getByText(/not authorized/i)).toBeInTheDocument());
  });
});
