import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

import AdminLayout from "./components/Layout/AdminLayout";
import Login from "./pages/Login/Login";

// Pages
import Dashboard from "./pages/Dashboard/Dashboard";
import Foods from "./pages/Foods/Foods";
import Categories from "./pages/Categories/Categories";
import Order from "./pages/Order/Order";
import Departments from "./pages/Departments/Departments";
import Shifts from "./pages/Shifts/Shifts";
import Storage from "./pages/Storage/Storage";
import Employees from "./pages/Employees/Employees";
import Tables from "./pages/Tables/Tables";
import Reservations from "./pages/Reservations/Reservations";
import Customers from "./pages/Customers/Customers";
import Suppliers from "./pages/Suppliers/Suppliers";
import Promotions from "./pages/Promotions/Promotions";
import HumanResources from "./pages/HumanResources/HumanResources";
import WorkSchedule from "./pages/WorkSchedule/WorkSchedule";
import Statistics from "./pages/Statistics/Statistics";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => {
  const token = localStorage.getItem("token");
  const isAuthenticated = !!token;

  return (
    <div className="admin-app">
      <ToastContainer />
      <Routes>
        {/* Public route: Login */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
          }
        />

        {/* Protected routes: Dashboard và các trang khác */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Navigate to="/dashboard" replace />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Dashboard />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/foods"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Foods />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/categories"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Categories />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/order"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Order />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/departments"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Departments />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/shifts"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Shifts />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/storage"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Storage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Employees />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tables"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Tables />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reservations"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Reservations />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Customers />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/suppliers"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Suppliers />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/promotions"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Promotions />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/statistics"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Statistics />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/workschedule"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <WorkSchedule />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/human-resources"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <HumanResources />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
};

export default App;
