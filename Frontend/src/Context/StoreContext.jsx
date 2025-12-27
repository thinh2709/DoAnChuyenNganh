import { createContext, useEffect, useState } from "react";
import api from "../utils/axios";

export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  const [cartItems, setCartItems] = useState({});
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [foodList, setFoodList] = useState([]);
  const [showLoginPopup, setShowLoginPopup] = useState(false); // ✅ NEW: Global login popup state

  // ✅ FIXED: Load token và user từ localStorage khi app mount
  useEffect(() => {
    const loadUserFromStorage = () => {
      try {
        const savedToken = localStorage.getItem("token");
        const savedUserStr = localStorage.getItem("user");

        if (savedToken && savedUserStr) {
          // ✅ Parse user JSON
          const savedUser = JSON.parse(savedUserStr);

          // ✅ Set vào state
          setToken(savedToken);
          setUser(savedUser);

          console.log("✅ Loaded user from localStorage:", savedUser);
        }
      } catch (error) {
        console.error("❌ Error loading user from localStorage:", error);
        // ✅ Clear corrupted data
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    };

    loadUserFromStorage();
  }, []); // ✅ Chỉ chạy 1 lần khi mount

  // ✅ Fetch menu items
  useEffect(() => {
    const fetchFoods = async () => {
      try {
        const response = await api.get("/menu");
        const formattedFoods = (response.data.data || []).map((item) => ({
          _id: item.MaMon || item.maMon,
          MaMon: item.MaMon || item.maMon,
          name: item.TenMon || item.tenMon,
          TenMon: item.TenMon || item.tenMon,
          price: parseFloat(item.Gia || item.gia || 0),
          Gia: parseFloat(item.Gia || item.gia || 0),
          category: item.loaiMon?.TenLoai || item.loaiMon?.tenLoai || "",
          loaiMon: item.loaiMon,
          image: item.HinhAnh || item.hinhAnh,
          HinhAnh: item.HinhAnh || item.hinhAnh,
        }));
        setFoodList(formattedFoods);
      } catch (error) {
        console.error("Error fetching foods:", error);
      }
    };

    fetchFoods();
  }, []);

  // ✅ FIXED: Login function
  const login = (tokenValue, userData) => {
    try {
      // ✅ Set state
      setToken(tokenValue);
      setUser(userData);

      // ✅ Save to localStorage
      localStorage.setItem("token", tokenValue); // String
      localStorage.setItem("user", JSON.stringify(userData)); // JSON

      console.log("✅ Login successful:", { token: tokenValue, user: userData });
    } catch (error) {
      console.error("❌ Error saving to localStorage:", error);
    }
  };

  // ✅ FIXED: Logout function
  const logout = () => {
    try {
      // ✅ Clear state
      setToken(null);
      setUser(null);
      setCartItems({});

      // ✅ Clear localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      console.log("✅ Logout successful");
    } catch (error) {
      console.error("❌ Error during logout:", error);
    }
  };

  // Add to cart
  const addToCart = (itemId) => {
    setCartItems((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  // Remove from cart
  const removeFromCart = (itemId) => {
    setCartItems((prev) => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId] = newCart[itemId] - 1;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  // Get total cart amount
  const getTotalCartAmount = () => {
    let totalAmount = 0;
    for (const itemId in cartItems) {
      if (cartItems[itemId] > 0) {
        // ✅ Parse itemId to number for comparison
        const numericItemId = parseInt(itemId);

        const itemInfo = foodList.find(
          (product) =>
            product.MaMon === numericItemId ||
            product._id === numericItemId
        );

        if (itemInfo) {
          // ✅ Ensure price is number
          const price = parseFloat(itemInfo.price) || 0;
          const quantity = parseInt(cartItems[itemId]) || 0;
          totalAmount += price * quantity;
        }
      }
    }
    return totalAmount;
  };

  // Get cart items with details
  const getCartItemsWithDetails = () => {
    const items = [];
    for (const itemId in cartItems) {
      if (cartItems[itemId] > 0) {
        // ✅ Parse itemId to number
        const numericItemId = parseInt(itemId);

        const itemInfo = foodList.find(
          (product) =>
            product.MaMon === numericItemId ||
            product._id === numericItemId
        );

        if (itemInfo) {
          items.push({
            ...itemInfo,
            quantity: parseInt(cartItems[itemId]) || 0,
          });
        }
      }
    }
    return items;
  };

  const contextValue = {
    foodList,
    cartItems,
    setCartItems,
    addToCart,
    removeFromCart,
    getTotalCartAmount,
    getCartItemsWithDetails,
    token,
    setToken,
    user,
    setUser,
    login,
    logout,
    showLoginPopup, // ✅ NEW
    setShowLoginPopup, // ✅ NEW
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreContextProvider;
