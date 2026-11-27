import { createBrowserRouter, replace } from 'react-router';
import AppLayout from '@/components/layout/AppLayout';
import HomePage from '@/pages/HomePage';
import NotFoundPage from '@/pages/NotFoundPage';
import LoginPage from '@/pages/LoginPage';
import DocumentRegistrationPage from '@/pages/DocumentRegistrationPage';
import QuestionSelectionPage from '@/pages/QuestionSelectionPage';

export const router = createBrowserRouter([
  { path: '/', loader: () => replace('/login') },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/documents',
    loader: ({ request }) =>
      replace(`/documents/${crypto.randomUUID()}${new URL(request.url).search}`),
  },
  { path: '/documents/:reviewId', element: <DocumentRegistrationPage /> },
  { path: '/questions/:reviewId', element: <QuestionSelectionPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: '/health', element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
