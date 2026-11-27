import { createBrowserRouter, replace } from 'react-router';
import AppLayout from '@/components/layout/AppLayout';
import HomePage from '@/pages/HomePage';
import NotFoundPage from '@/pages/NotFoundPage';
import LoginPage from '@/pages/LoginPage';

export const router = createBrowserRouter([
  { path: '/', loader: () => replace('/login') },
  { path: '/login', element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: '/health', element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
