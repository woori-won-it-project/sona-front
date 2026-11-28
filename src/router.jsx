import { createBrowserRouter, replace } from 'react-router';
import AppLayout from '@/components/layout/AppLayout';
import HomePage from '@/pages/HomePage';
import NotFoundPage from '@/pages/NotFoundPage';
import LoginPage from '@/pages/LoginPage';
import DocumentRegistrationPage from '@/pages/DocumentRegistrationPage';
import QuestionSelectionPage from '@/pages/QuestionSelectionPage';
import PersonaConfigurationPage from '@/pages/PersonaConfigurationPage';

export const router = createBrowserRouter([
  { path: '/', loader: () => replace('/login') },
  { path: '/login', element: <LoginPage /> },
  { path: '/documents', element: <DocumentRegistrationPage /> },
  { path: '/documents/:reviewId', element: <DocumentRegistrationPage /> },
  { path: '/questions/:reviewId', element: <QuestionSelectionPage /> },
  { path: '/personas/:reviewId', element: <PersonaConfigurationPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: '/health', element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
