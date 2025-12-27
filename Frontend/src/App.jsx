import { Routes, Route } from "react-router-dom";
import { useContext } from "react";
import HomePage from "./pages/HomePage/HomePage";
import MenuPage from "./pages/MenuPage/MenuPage";
import ReservationPage from "./pages/ReservationPage/ReservationPage";
import PlaceOrderPage from "./pages/PlaceOrderPage/PlaceOrderPage";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import LoginPopup from "./components/LoginPopup/LoginPopup"; // ✅ NEW
import { StoreContext } from "./Context/StoreContext"; // ✅ NEW
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import MyOrders from "./pages/MyOrders/MyOrders";

function App() {
  const { showLoginPopup, setShowLoginPopup } = useContext(StoreContext); // ✅ NEW

  return (
    <>
      {/* ✅ NEW: Global Login Popup */}
      {showLoginPopup && <LoginPopup setShowLogin={setShowLoginPopup} />}
      
      <Navbar />
      <div style={{ paddingTop: '80px', minHeight: '100vh' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/reservation" element={<ReservationPage />} />

          <Route
            path="/myorders"
            element={
              <ProtectedRoute>
                <MyOrders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/order"
            element={
              <ProtectedRoute>
                <PlaceOrderPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
      <Footer />
      <ToastContainer />
    </>
  );
}

export default App;
