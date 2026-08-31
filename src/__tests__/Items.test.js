import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Items from '../pages/Items';

function renderItems() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <Items />
      </MemoryRouter>
    </AuthProvider>
  );
}

const mockItem = (id) => ({
  id,
  title: `Item ${id}`,
  price: 1000,
  condition: 'Good',
  image_url: null,
  status: 'active',
  listing_type: 'offering',
  city: 'Berlin',
  category: 'Books',
  created_at: '2026-04-01T00:00:00Z',
  location: 'Berlin',
});

function mockFetch({ items = [], hasMore = false, cities = [] } = {}) {
  global.fetch = jest.fn((url) => {
    if (url.includes('/cities')) {
      return Promise.resolve({ json: async () => cities });
    }
    return Promise.resolve({
      json: async () => ({ items, has_more: hasMore }),
    });
  });
}

describe('Items (Browse)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders both tabs', async () => {
    mockFetch();
    renderItems();
    expect(screen.getByRole('button', { name: /items for sale/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /requests/i })).toBeInTheDocument();
  });

  test('renders filter controls', async () => {
    mockFetch();
    renderItems();
    expect(screen.getByPlaceholderText(/search items/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^search$/i })).toBeInTheDocument();
  });

  test('defaults to Items for Sale tab and fetches offering type', async () => {
    mockFetch({ items: [mockItem(1)] });
    renderItems();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('listing_type=offering'));
    });
  });

  test('switching to Requests tab fetches request type', async () => {
    mockFetch({ items: [] });
    renderItems();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    jest.clearAllMocks();
    mockFetch({ items: [] });
    fireEvent.click(screen.getByRole('button', { name: /requests/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('listing_type=request'));
    });
  });

  test('changing category filter triggers a new fetch', async () => {
    mockFetch({ items: [] });
    renderItems();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    jest.clearAllMocks();
    mockFetch({ items: [] });
    const categorySelect = screen.getAllByRole('combobox')[0];
    userEvent.selectOptions(categorySelect, 'Electronics');
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('category=Electronics'));
    });
  });

  test('changing sort filter triggers a new fetch', async () => {
    mockFetch({ items: [] });
    renderItems();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    jest.clearAllMocks();
    mockFetch({ items: [] });
    const sortSelect = screen.getAllByRole('combobox')[1];
    userEvent.selectOptions(sortSelect, 'price_asc');
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('sort=price_asc'));
    });
  });

  test('submitting search applies query to fetch', async () => {
    mockFetch({ items: [] });
    renderItems();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    jest.clearAllMocks();
    mockFetch({ items: [] });
    userEvent.type(screen.getByPlaceholderText(/search items/i), 'lamp');
    fireEvent.submit(screen.getByPlaceholderText(/search items/i).closest('form'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('q=lamp'));
    });
  });

  test('shows empty state when no items returned', async () => {
    mockFetch({ items: [] });
    renderItems();
    await waitFor(() => expect(screen.getByText(/no listings yet/i)).toBeInTheDocument());
  });

  test('renders item cards when items are returned', async () => {
    mockFetch({ items: [mockItem(1), mockItem(2)] });
    renderItems();
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  test('Load more button appears when has_more is true', async () => {
    mockFetch({ items: [mockItem(1)], hasMore: true });
    renderItems();
    await waitFor(() => expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument());
  });

  test('Load more button is absent when has_more is false', async () => {
    mockFetch({ items: [mockItem(1)], hasMore: false });
    renderItems();
    await waitFor(() => expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument());
  });

  test('clicking Load more appends items', async () => {
    mockFetch({ items: [mockItem(1)], hasMore: true });
    renderItems();
    await waitFor(() => screen.getByText('Item 1'));
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ items: [mockItem(2)], has_more: false }),
    });
    fireEvent.click(screen.getByRole('button', { name: /load more/i }));
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });
});
