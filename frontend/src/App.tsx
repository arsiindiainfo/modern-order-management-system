import { Navigate, Route, Routes } from 'react-router-dom';
import { AppProviders } from './app/providers';
import { ProtectedRoute } from './app/ProtectedRoute';
import { DashboardPage } from './app/DashboardPage';
import { AuthLayout } from './layouts/AuthLayout';
import { AppShell } from './layouts/AppShell';
import { LoginPage } from './features/auth/pages/LoginPage';
import { CustomersListPage } from './features/customers/pages/CustomersListPage';
import { CustomerFormPage } from './features/customers/pages/CustomerFormPage';
import { ProductsListPage } from './features/products/pages/ProductsListPage';
import { ProductFormPage } from './features/products/pages/ProductFormPage';
import { OrdersListPage } from './features/orders/pages/OrdersListPage';
import { OrderCreatePage } from './features/orders/pages/OrderCreatePage';
import { OrderDetailPage } from './features/orders/pages/OrderDetailPage';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersListPage />} />
          <Route path="/customers/new" element={<CustomerFormPage />} />
          <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
          <Route path="/products" element={<ProductsListPage />} />
          <Route path="/products/new" element={<ProductFormPage />} />
          <Route path="/products/:id/edit" element={<ProductFormPage />} />
          <Route path="/orders" element={<OrdersListPage />} />
          <Route path="/orders/new" element={<OrderCreatePage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}

export default App;
