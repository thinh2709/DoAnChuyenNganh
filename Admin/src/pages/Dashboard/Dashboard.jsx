import React, { useState, useEffect, useMemo } from "react";
import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import api from "../../utils/axios";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import {
  FiTrendingUp,
  FiShoppingBag,
  FiUsers,
  FiCalendar,
  FiDollarSign,
  FiUser,
  FiAlertCircle,
  FiClock,
  FiPackage,
} from "react-icons/fi";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Select, Card, Tag, Space, Typography, Button, Modal, DatePicker } from "antd";
import { BellOutlined, CalendarOutlined } from "@ant-design/icons";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const { Text } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("week");
  const [loading, setLoading] = useState(false);
  const [isCustomRangeModalOpen, setIsCustomRangeModalOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: null,
    endDate: null,
  });
  const getDateRange = (range) => {
    const now = new Date();
    let endDate = new Date(now);
    let startDate = new Date(now);

    switch (range) {
      case "week":
        startDate.setDate(startDate.getDate() - startDate.getDay());
        startDate.setHours(0, 0, 0, 0);
        break;
      case "last7days":
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "lastMonth":
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "year":
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "custom":
        if (customDateRange.startDate && customDateRange.endDate) {
          startDate = new Date(customDateRange.startDate);
          endDate = new Date(customDateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
        }
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    return { startDate, endDate };
  };
  // KPI Data
  const [kpiData, setKpiData] = useState({
    totalRevenue: 0,
    todayOrders: 0,
    todayCustomers: 0,
    todayReservations: 0,
    totalEmployees: 0,
  });

  // Charts Data
  const [revenueData, setRevenueData] = useState({
    labels: [],
    datasets: [],
  });
  const [topProductsData, setTopProductsData] = useState({
    labels: [],
    datasets: [],
  });
  const [orderStatusData, setOrderStatusData] = useState({
    labels: [],
    datasets: [],
  });

  // Recent Orders
  const [recentOrders, setRecentOrders] = useState([]);

  // All Orders (for revenue calculation)
  const [allOrders, setAllOrders] = useState([]);

  // All Reservations (for filtered calculation)
  const [allReservations, setAllReservations] = useState([]);

  // Notifications
  const [notifications, setNotifications] = useState({
    pendingOrders: 0,
    upcomingReservations: 0,
    lowStockItems: [],
  });

  // Calculate total revenue based on time filter using useMemo
  const calculatedTotalRevenue = useMemo(() => {
    console.log("\n============ BẮT ĐẦU TÍNH TOÁN DOANH THU ============");

    if (!allOrders || allOrders.length === 0) {
      console.log("Không có đơn hàng nào để tính toán");
      return 0;
    }

    console.log(`Tổng số đơn hàng: ${allOrders.length}`);

    // Get date range based on current filter
    const { startDate, endDate } = getDateRange(timeRange);
    console.log(`Khoảng thời gian lọc: ${startDate.toLocaleString('vi-VN')} đến ${endDate.toLocaleString('vi-VN')}`);
    console.log(`Filter type: ${timeRange}`);

    // DEBUG: Log đơn hàng đầu tiên để xem cấu trúc dữ liệu
    if (allOrders.length > 0) {
      console.log("\ ==== DEBUG ĐƠN HÀNG ĐẦU TIÊN ====");
      const firstOrder = allOrders[0];
      console.log("Toàn bộ object đơn hàng đầu tiên:", firstOrder);
      console.log("\nCác trường ngày tháng có sẵn:");
      console.log("  - NgayDat:", firstOrder.NgayDat);
      console.log("  - NgayTao:", firstOrder.NgayTao);
      console.log("  - ThoiGianTao:", firstOrder.ThoiGianTao);
      console.log("  - createdAt:", firstOrder.createdAt);
      console.log("\nCác trường trạng thái có sẵn:");
      console.log("  - TrangThai:", firstOrder.TrangThai);
      console.log("  - trangThai:", firstOrder.trangThai);
      console.log("  - status:", firstOrder.status);
      console.log("\nCác trường tiền có sẵn:");
      console.log("  - TongTien:", firstOrder.TongTien);
      console.log("  - tongTien:", firstOrder.tongTien);
      console.log("  - totalAmount:", firstOrder.totalAmount);
      console.log("==================================\n");
    }

    // Counters for debugging
    let includedCount = 0;
    let excludedByInvalidDate = 0;
    let excludedByDateRange = 0;
    let excludedByCancelled = 0;
    let excludedByInvalidAmount = 0;

    // Valid statuses (exclude cancelled orders)
    const cancelledStatuses = ["DaHuy", "Đã hủy", "Cancelled", "Canceled"];

    // Filter and sum orders
    const totalRevenue = allOrders.reduce((sum, order, index) => {
      try {
        // Try all possible date field names (ưu tiên NgayDat từ API)
        const dateValue = order.NgayDat || order.NgayTao || order.ThoiGianTao || order.createdAt || order.created_at || order.ngayTao || order.orderDate;

        if (!dateValue) {
          excludedByInvalidDate++;
          if (index < 3) {
            console.log(`❌ Đơn ${index + 1}: Không tìm thấy trường ngày tháng`);
          }
          return sum;
        }

        // Get order date
        const orderDate = new Date(dateValue);

        // Check if date is valid
        if (isNaN(orderDate.getTime())) {
          excludedByInvalidDate++;
          if (index < 3) {
            console.log(`❌ Đơn ${index + 1}: Ngày không hợp lệ (${dateValue})`);
          }
          return sum;
        }

        // Check if order is within date range
        if (orderDate < startDate || orderDate > endDate) {
          excludedByDateRange++;
          if (index < 3) {
            console.log(`❌ Đơn ${index + 1}: Ngoài khoảng thời gian (${orderDate.toLocaleString('vi-VN')})`);
          }
          return sum;
        }

        // Get order status - try all possible field names
        const orderStatus = order.TrangThai || order.trangThai || order.status || order.orderStatus || "";

        // Check if status is cancelled
        if (cancelledStatuses.includes(orderStatus)) {
          excludedByCancelled++;
          if (index < 3) {
            console.log(`🚫 Đơn ${index + 1}: Đã bị hủy (Status: "${orderStatus}")`);
          }
          return sum;
        }

        // Get order total - try all possible field names
        const orderTotal = parseFloat(
          order.TongTien || order.tongTien || order.totalAmount ||
          order.total || order.amount || order.tongTienThanhToan || 0
        );

        // Add to sum if valid
        if (!isNaN(orderTotal) && orderTotal > 0) {
          includedCount++;
          if (index < 3) {
            console.log(`✅ Đơn ${index + 1}: Được tính - ${orderTotal.toLocaleString('vi-VN')} VNĐ (Status: "${orderStatus}", Ngày: ${orderDate.toLocaleDateString('vi-VN')})`);
          }
          return sum + orderTotal;
        } else {
          excludedByInvalidAmount++;
          if (index < 3) {
            console.log(`❌ Đơn ${index + 1}: Số tiền không hợp lệ (${orderTotal})`);
          }
          return sum;
        }
      } catch (error) {
        console.error(`❌ Lỗi khi xử lý đơn ${index + 1}:`, error);
        return sum;
      }
    }, 0);

    // Summary log
    console.log("\n📊 ==== TỔNG KẾT TÍNH TOÁN ====");
    console.log(`✅ Số đơn được tính: ${includedCount}`);
    console.log(`❌ Loại trừ do ngày không hợp lệ: ${excludedByInvalidDate}`);
    console.log(`❌ Loại trừ do ngoài khoảng thời gian: ${excludedByDateRange}`);
    console.log(`🚫 Loại trừ do đã hủy: ${excludedByCancelled}`);
    console.log(`❌ Loại trừ do số tiền không hợp lệ: ${excludedByInvalidAmount}`);
    console.log(`💰 Tổng doanh thu: ${totalRevenue.toLocaleString('vi-VN')} VNĐ`);
    console.log("================================\n");
    console.log(`  [Revenue Calculation] Filter: ${timeRange}, Total: ${totalRevenue.toLocaleString('vi-VN')} VNĐ`);
    return totalRevenue;
  }, [allOrders, timeRange, customDateRange]);

  // Calculate filtered orders count based on time filter
  const calculatedOrdersCount = useMemo(() => {
    if (!allOrders || allOrders.length === 0) return 0;

    const { startDate, endDate } = getDateRange(timeRange);
    const cancelledStatuses = ["DaHuy", "Đã hủy", "Cancelled", "Canceled"];

    return allOrders.filter((order) => {
      const dateValue = order.NgayDat || order.NgayTao || order.ThoiGianTao || order.createdAt;
      if (!dateValue) return false;

      const orderDate = new Date(dateValue);
      if (isNaN(orderDate.getTime())) return false;
      if (orderDate < startDate || orderDate > endDate) return false;

      const orderStatus = order.TrangThai || order.trangThai || order.status || "";
      if (cancelledStatuses.includes(orderStatus)) return false;

      return true;
    }).length;
  }, [allOrders, timeRange, customDateRange]);

  // Calculate filtered customers count based on time filter
  const calculatedCustomersCount = useMemo(() => {
    if (!allOrders || allOrders.length === 0) return 0;

    const { startDate, endDate } = getDateRange(timeRange);
    const cancelledStatuses = ["DaHuy", "Đã hủy", "Cancelled", "Canceled"];

    // Get unique customers from filtered orders
    const uniqueCustomers = new Set();

    allOrders.forEach((order) => {
      const dateValue = order.NgayDat || order.NgayTao || order.ThoiGianTao || order.createdAt;
      if (!dateValue) return;

      const orderDate = new Date(dateValue);
      if (isNaN(orderDate.getTime())) return;
      if (orderDate < startDate || orderDate > endDate) return;

      const orderStatus = order.TrangThai || order.trangThai || order.status || "";
      if (cancelledStatuses.includes(orderStatus)) return;

      // Get customer ID
      const customerId = order.MaKhachHang || order.maKhachHang || order.khachHang?.MaKhachHang || order.khachHang?.maKhachHang;
      if (customerId) {
        uniqueCustomers.add(customerId);
      }
    });

    return uniqueCustomers.size;
  }, [allOrders, timeRange, customDateRange]);

  // Calculate filtered reservations count based on time filter
  const calculatedReservationsCount = useMemo(() => {
    if (!allReservations || allReservations.length === 0) return 0;

    const { startDate, endDate } = getDateRange(timeRange);

    return allReservations.filter((reservation) => {
      const dateValue = reservation.ThoiGianBatDau || reservation.thoiGianBatDau || reservation.NgayDat || reservation.ngayDat;
      if (!dateValue) return false;

      const reservationDate = new Date(dateValue);
      if (isNaN(reservationDate.getTime())) return false;
      if (reservationDate < startDate || reservationDate > endDate) return false;

      // Exclude cancelled reservations
      const status = reservation.TrangThai || reservation.trangThai || "";
      if (status === "DaHuy" || status === "Đã hủy") return false;

      return true;
    }).length;
  }, [allReservations, timeRange, customDateRange]);

  // Utility function to calculate date range


  // Get display text for time range
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "week":
        return "Tuần này";
      case "last7days":
        return "7 ngày qua";
      case "month":
        return "Tháng này";
      case "lastMonth":
        return "Tháng trước";
      case "year":
        return "Năm nay";
      case "custom":
        if (customDateRange.startDate && customDateRange.endDate) {
          return `${new Date(customDateRange.startDate).toLocaleDateString("vi-VN")} - ${new Date(customDateRange.endDate).toLocaleDateString("vi-VN")}`;
        }
        return "Tùy chỉnh";
      default:
        return "Tuần này";
    }
  };

  // Handle time range change
  const handleTimeRangeChange = (value) => {
    if (value === "custom") {
      setIsCustomRangeModalOpen(true);
    } else {
      setTimeRange(value);
    }
  };

  // Handle custom range submit
  const handleCustomRangeSubmit = () => {
    if (customDateRange.startDate && customDateRange.endDate) {
      setTimeRange("custom");
      setIsCustomRangeModalOpen(false);
    } else {
      toast.error("Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc");
    }
  };

  // Process hourly data from orders (for today/yesterday)
  const processHourlyData = (orders, targetType) => {
    // Initialize 24 hours array with 0
    const hourlyData = Array(24).fill(0);

    if (!orders || orders.length === 0) {
      console.log("⚠️ [processHourlyData] No orders data received");
      const labels = [];
      for (let h = 0; h < 24; h++) {
        labels.push(`${h.toString().padStart(2, '0')}:00`);
      }
      return { labels, data: hourlyData, tooltipFormat: "hour" };
    }

    // Get target date for comparison
    const now = new Date();
    const targetDate = new Date(now);
    if (targetType === "yesterday") {
      targetDate.setDate(targetDate.getDate() - 1);
    }

    // Extract target date components for robust comparison
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth(); // 0-11
    const targetDay = targetDate.getDate(); // 1-31

    console.log(`  [processHourlyData] Target Date: ${targetDay}/${targetMonth + 1}/${targetYear} (${targetType})`);
    console.log(`📦 [processHourlyData] Total orders to process: ${orders.length}`);

    // Counters for debugging
    let processedCount = 0;
    let excludedByStatusCount = 0;
    let excludedByDateCount = 0;
    let totalRevenueCalculated = 0;

    // Process orders
    orders.forEach((order, index) => {
      try {
        // Get order creation time (use local time)
        const orderTime = new Date(order.createdAt || order.NgayTao || order.ThoiGianTao);

        // Check if date is valid
        if (isNaN(orderTime.getTime())) {
          console.warn(`⚠️ [Order ${index}] Invalid date:`, order);
          return; // Skip invalid dates
        }

        // Extract order date components for robust comparison
        const orderYear = orderTime.getFullYear();
        const orderMonth = orderTime.getMonth(); // 0-11
        const orderDay = orderTime.getDate(); // 1-31

        // Robust date comparison: compare year, month, day components
        const isSameDay = (orderYear === targetYear && orderMonth === targetMonth && orderDay === targetDay);

        if (!isSameDay) {
          excludedByDateCount++;
          if (index < 3) { // Log first 3 mismatches for debugging
            console.log(`❌ [Order ${index}] Date mismatch: ${orderDay}/${orderMonth + 1}/${orderYear} !== ${targetDay}/${targetMonth + 1}/${targetYear}`);
          }
          return; // Skip orders from different dates
        }

        // Get order status (handle different field names)
        const orderStatus = order.TrangThai || order.trangThai || order.status || "";

        // Filter: Exclude ONLY cancelled orders, include ALL other statuses
        // Cancelled statuses: "Đã hủy", "DaHuy", "Cancelled", "Canceled"
        const cancelledStatuses = ["Đã hủy", "DaHuy", "Cancelled", "Canceled"];
        const isCancelled = cancelledStatuses.includes(orderStatus);

        if (isCancelled) {
          excludedByStatusCount++;
          console.log(`🚫 [Order ${index}] Excluded (Cancelled): Status="${orderStatus}", Total=${order.TongTien}`);
          return; // Skip cancelled orders
        }

        // Get hour in local timezone (0-23)
        const hour = orderTime.getHours();

        // Get order total (handle different field names)
        const orderTotal = parseFloat(order.TongTien || order.tongTien || order.totalAmount || 0);

        // Validate and aggregate revenue by hour
        if (!isNaN(orderTotal) && hour >= 0 && hour < 24) {
          hourlyData[hour] += orderTotal;
          processedCount++;
          totalRevenueCalculated += orderTotal;

          // Log first 5 processed orders for debugging
          if (processedCount <= 5) {
            console.log(`✅ [Order ${index}] Processed: Date=${orderDay}/${orderMonth + 1}/${orderYear}, Hour=${hour}, Status="${orderStatus}", Total=${orderTotal.toLocaleString('vi-VN')} VNĐ`);
          }
        } else {
          console.warn(`⚠️ [Order ${index}] Invalid total or hour: Total=${orderTotal}, Hour=${hour}`);
        }
      } catch (error) {
        console.error(`❌ [Order ${index}] Error processing order:`, error, order);
      }
    });

    // Summary log
    console.log(`\n📊 [processHourlyData] Summary:`);
    console.log(`   ✅ Processed: ${processedCount} orders`);
    console.log(`   ❌ Excluded by date: ${excludedByDateCount} orders`);
    console.log(`   🚫 Excluded by status (Cancelled): ${excludedByStatusCount} orders`);
    console.log(`   💰 Total Revenue: ${totalRevenueCalculated.toLocaleString('vi-VN')} VNĐ`);
    console.log(`   📈 Hourly Distribution:`, hourlyData.map((val, h) => val > 0 ? `${h}h: ${val.toLocaleString('vi-VN')}` : null).filter(Boolean).join(', ') || 'No data');

    // Generate labels
    const labels = [];
    for (let h = 0; h < 24; h++) {
      labels.push(`${h.toString().padStart(2, '0')}:00`);
    }

    return { labels, data: hourlyData, tooltipFormat: "hour" };
  };

  // Process chart data based on time range with proper data filling
  const processChartData = (rawData, range) => {
    const { startDate, endDate } = getDateRange(range);

    switch (range) {
      case "week": {
        // Group by day of week (Monday - Sunday) - Always 7 data points
        const weekDays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
        const dailyData = {};

        // Initialize all 7 days with 0
        const weekStart = new Date(startDate);
        for (let i = 0; i < 7; i++) {
          const dayKey = new Date(weekStart);
          dayKey.setDate(weekStart.getDate() + i);
          const dateKey = dayKey.toISOString().split('T')[0];
          dailyData[dateKey] = 0;
        }

        // Aggregate raw data by date
        if (rawData && rawData.length > 0) {
          rawData.forEach((item) => {
            const dateKey = new Date(item.date).toISOString().split('T')[0];
            if (dailyData.hasOwnProperty(dateKey)) {
              dailyData[dateKey] += item.revenue || 0;
            }
          });
        }

        const labels = [];
        const data = [];
        const currentWeekStart = new Date(startDate);
        for (let i = 0; i < 7; i++) {
          const currentDay = new Date(currentWeekStart);
          currentDay.setDate(currentWeekStart.getDate() + i);
          const dateKey = currentDay.toISOString().split('T')[0];

          labels.push(weekDays[i]);
          data.push(dailyData[dateKey] || 0);
        }

        return { labels, data, tooltipFormat: "weekday" };
      }

      case "year": {
        // Group by month (Tháng 1 - Tháng 12) - Always 12 data points
        const monthlyData = {};

        // Initialize all 12 months with 0
        for (let m = 1; m <= 12; m++) {
          monthlyData[m] = 0;
        }

        // Aggregate raw data by month
        if (rawData && rawData.length > 0) {
          rawData.forEach((item) => {
            const date = new Date(item.date);
            const month = date.getMonth() + 1; // 1-12
            monthlyData[month] += item.revenue || 0;
          });
        }

        const labels = [];
        const data = [];
        for (let m = 1; m <= 12; m++) {
          labels.push(`T${m}`);
          data.push(monthlyData[m]);
        }

        return { labels, data, tooltipFormat: "month" };
      }

      default: {
        // Daily (for last7days, month, lastMonth, custom)
        if (!rawData || rawData.length === 0) {
          return { labels: [], data: [], tooltipFormat: "date" };
        }

        const labels = rawData.map((item) => {
          const date = new Date(item.date);
          return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
        });
        const data = rawData.map((item) => item.revenue || 0);

        return { labels, data, tooltipFormat: "date" };
      }
    }
  };

  // Get tooltip label based on format
  const getTooltipLabel = (context, format, labelValue) => {
    const value = context.parsed.y.toLocaleString("vi-VN");

    switch (format) {
      case "hour":
        return `${labelValue}: ${value} VNĐ`;
      case "weekday":
        return `${labelValue}: ${value} VNĐ`;
      case "month":
        const monthNumber = labelValue.replace("T", "");
        return `Tháng ${monthNumber}: ${value} VNĐ`;
      case "date":
      default:
        return `Doanh thu: ${value} VNĐ`;
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange, customDateRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch KPI stats
      const statsRes = await api.get("/statistics/dashboard");
      if (statsRes.data.success) {
        setKpiData({
          totalRevenue: statsRes.data.data.totalRevenue || 0,
          todayOrders: statsRes.data.data.todayOrders || 0,
          todayCustomers: statsRes.data.data.todayCustomers || 0,
          todayReservations: 0, // Will be fetched separately
          totalEmployees: 0, // Will be fetched separately
        });
      }

      // Fetch employees count
      try {
        const employeesRes = await api.get("/employees");
        if (employeesRes.data.success) {
          setKpiData((prev) => ({
            ...prev,
            totalEmployees: employeesRes.data.data?.length || 0,
          }));
        }
      } catch (err) {
        console.error("Error fetching employees:", err);
      }

      // Fetch all reservations for filtered calculation
      try {
        const reservationsRes = await api.get(`/reservations`);
        if (reservationsRes.data.success) {
          setAllReservations(reservationsRes.data.data || []);
        }
      } catch (err) {
        console.error("Error fetching reservations:", err);
      }

      // Fetch revenue over time
      const { startDate: rangeStart, endDate: rangeEnd } = getDateRange(timeRange);

      // Use aggregated revenue data for all time ranges
      const revenueRes = await api.get(
        `/statistics/revenue?startDate=${rangeStart.toISOString().split("T")[0]}&endDate=${rangeEnd.toISOString().split("T")[0]}&groupBy=day`
      );
      if (revenueRes.data.success) {
        const rawData = revenueRes.data.data;
        const { labels, data, tooltipFormat } = processChartData(rawData, timeRange);

        setRevenueData({
          labels,
          datasets: [
            {
              label: "Doanh thu (VNĐ)",
              data,
              borderColor: "rgb(255, 107, 53)",
              backgroundColor: "rgba(255, 107, 53, 0.1)",
              tension: 0.4,
              fill: true,
              tooltipFormat,
            },
          ],
        });
      }

      // Fetch top products
      const topProductsRes = await api.get("/statistics/top-products?limit=5");
      if (topProductsRes.data.success) {
        const products = topProductsRes.data.data;
        setTopProductsData({
          labels: products.map((p) => p.tenMon),
          datasets: [
            {
              label: "Số lượng bán",
              data: products.map((p) => p.totalQuantity),
              backgroundColor: [
                "rgba(93, 135, 255, 0.8)",
                "rgba(74, 198, 255, 0.8)",
                "rgba(127, 229, 201, 0.8)",
                "rgba(255, 214, 153, 0.8)",
                "rgba(255, 169, 169, 0.8)",
              ],
            },
          ],
        });
      }

      // Fetch orders for status distribution and revenue calculation
      const ordersRes = await api.get("/orders");
      if (ordersRes.data.success) {
        const orders = ordersRes.data.data || [];

        // Store all orders for revenue calculation
        setAllOrders(orders);

        const statusCounts = {};
        orders.forEach((order) => {
          const status = order.TrangThai || order.trangThai;
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const statusLabels = {
          ChoXacNhan: "Chờ xác nhận",
          DangChuanBi: "Đang chuẩn bị",
          HoanThanh: "Hoàn thành",
          DaThanhToan: "Đã thanh toán",
          DaHuy: "Đã hủy",
        };

        setOrderStatusData({
          labels: Object.keys(statusCounts).map((key) => statusLabels[key] || key),
          datasets: [
            {
              data: Object.values(statusCounts),
              backgroundColor: [
                "rgba(255, 214, 153, 0.8)",
                "rgba(93, 135, 255, 0.8)",
                "rgba(127, 229, 201, 0.8)",
                "rgba(74, 198, 255, 0.8)",
                "rgba(255, 169, 169, 0.8)",
              ],
            },
          ],
        });

        // Set recent orders (last 5)
        setRecentOrders(orders.slice(0, 5));
      }

      // Fetch notifications
      await fetchNotifications();
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Lỗi khi tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      // Fetch pending orders
      const ordersRes = await api.get("/orders");
      if (ordersRes.data.success) {
        const orders = ordersRes.data.data || [];
        const pendingCount = orders.filter(
          (o) => (o.TrangThai || o.trangThai) === "ChoXacNhan"
        ).length;
        setNotifications((prev) => ({ ...prev, pendingOrders: pendingCount }));
      }

      // Fetch upcoming reservations (next 1-2 hours)
      const now = new Date();
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const reservationsRes = await api.get("/reservations");
      if (reservationsRes.data.success) {
        const reservations = reservationsRes.data.data || [];
        const upcoming = reservations.filter((r) => {
          const startTime = new Date(r.ThoiGianBatDau || r.thoiGianBatDau);
          return startTime >= now && startTime <= twoHoursLater;
        }).length;
        setNotifications((prev) => ({ ...prev, upcomingReservations: upcoming }));
      }

      // Fetch low stock items
      const storageRes = await api.get("/storage");
      if (storageRes.data.success) {
        const materials = storageRes.data.data || [];
        const lowStock = materials
          .filter((m) => {
            const quantity = parseFloat(m.SoLuongTon || m.soLuongTon || 0);
            return quantity < 10; // Threshold: less than 10
          })
          .slice(0, 3)
          .map((m) => ({
            name: m.TenNguyenVatLieu || m.tenNguyenVatLieu,
            quantity: parseFloat(m.SoLuongTon || m.soLuongTon || 0),
          }));
        setNotifications((prev) => ({ ...prev, lowStockItems: lowStock }));
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleExportExcel = () => {
    try {
      // Chuẩn bị dữ liệu xuất báo cáo
      const exportData = [];

      // 1. Thông tin chung
      exportData.push(["BÁO CÁO THỐNG KÊ DASHBOARD - TECHZY RESTAURANT"]);
      exportData.push([]);
      exportData.push([`Thời gian xuất: ${new Date().toLocaleString("vi-VN")}`]);
      exportData.push([`Khoảng thời gian: ${getTimeRangeLabel()}`]);
      exportData.push([]);

      // 2. Chỉ số KPI
      exportData.push(["CHỈ SỐ KPI"]);
      exportData.push(["Tên chỉ số", "Giá trị", "Khoảng thời gian"]);
      exportData.push(["Tổng doanh thu", `${calculatedTotalRevenue.toLocaleString("vi-VN")} VNĐ`, getTimeRangeLabel()]);
      exportData.push(["Số đơn hàng", calculatedOrdersCount, getTimeRangeLabel()]);
      exportData.push(["Số khách hàng", calculatedCustomersCount, getTimeRangeLabel()]);
      exportData.push(["Số đặt bàn", calculatedReservationsCount, getTimeRangeLabel()]);
      exportData.push(["Tổng số nhân viên", kpiData.totalEmployees, "Hiện tại"]);
      exportData.push([]);

      // 3. Doanh thu theo ngày
      exportData.push(["DOANH THU THEO NGÀY"]);
      exportData.push(["Ngày", "Doanh thu (VNĐ)"]);
      if (revenueData.labels && revenueData.datasets && revenueData.datasets[0]) {
        revenueData.labels.forEach((label, index) => {
          exportData.push([label, revenueData.datasets[0].data[index]]);
        });
      }
      exportData.push([]);

      // 4. Top 5 món ăn bán chạy
      exportData.push(["TOP 5 MÓN ĂN BÁN CHẠY NHẤT"]);
      exportData.push(["Tên món", "Số lượng đã bán"]);
      if (topProductsData.labels && topProductsData.datasets && topProductsData.datasets[0]) {
        topProductsData.labels.forEach((label, index) => {
          exportData.push([label, topProductsData.datasets[0].data[index]]);
        });
      }
      exportData.push([]);

      // 5. Phân bổ đơn hàng theo trạng thái
      exportData.push(["PHÂN BỔ ĐƠN HÀNG THEO TRẠNG THÁI"]);
      exportData.push(["Trạng thái", "Số lượng"]);
      if (orderStatusData.labels && orderStatusData.datasets && orderStatusData.datasets[0]) {
        orderStatusData.labels.forEach((label, index) => {
          exportData.push([label, orderStatusData.datasets[0].data[index]]);
        });
      }
      exportData.push([]);

      // 6. Đơn hàng gần đây
      exportData.push(["ĐƠN HÀNG GẦN ĐÂY"]);
      exportData.push(["Mã đơn hàng", "Tên khách hàng", "Trạng thái", "Tổng tiền (VNĐ)"]);
      recentOrders.forEach((order) => {
        const status = order.TrangThai || order.trangThai;
        exportData.push([
          order.MaDonHang || order.maDonHang,
          order.khachHang?.HoTen || order.khachHang?.hoTen || "N/A",
          getStatusText(status),
          (order.TongTien || order.tongTien || 0).toLocaleString("vi-VN"),
        ]);
      });
      exportData.push([]);

      // 7. Thông báo
      exportData.push(["THÔNG BÁO & NHẮC NHỞ"]);
      exportData.push(["Loại thông báo", "Chi tiết"]);
      exportData.push(["Đơn hàng chờ xác nhận", notifications.pendingOrders]);
      exportData.push(["Đặt bàn sắp đến giờ (1-2h tới)", notifications.upcomingReservations]);
      if (notifications.lowStockItems.length > 0) {
        exportData.push([]);
        exportData.push(["NGUYÊN VẬT LIỆU SẮP HẾT"]);
        exportData.push(["Tên nguyên vật liệu", "Số lượng còn lại"]);
        notifications.lowStockItems.forEach((item) => {
          exportData.push([item.name, item.quantity]);
        });
      }

      // Tạo workbook và worksheet
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Thống Kê");

      // Tạo tên file với ngày hiện tại
      const today = new Date();
      const dateStr = `${today.getDate().toString().padStart(2, "0")}_${(today.getMonth() + 1).toString().padStart(2, "0")}_${today.getFullYear()}`;
      const fileName = `BaoCao_ThongKe_${dateStr}.xlsx`;

      // Xuất file
      XLSX.writeFile(wb, fileName);
      toast.success("Xuất báo cáo Excel thành công!");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Lỗi khi xuất báo cáo Excel");
    }
  };

  const statCards = [
    {
      label: "Tổng doanh thu",
      value: calculatedTotalRevenue.toLocaleString("vi-VN") + "₫",
      change: `Thời gian: ${getTimeRangeLabel()}`,
      icon: <FiTrendingUp />,
    },
    {
      label: "Số đơn hàng",
      value: calculatedOrdersCount.toString(),
      change: getTimeRangeLabel(),
      icon: <FiShoppingBag />,
    },
    {
      label: "Khách hàng",
      value: calculatedCustomersCount.toString(),
      change: getTimeRangeLabel(),
      icon: <FiUsers />,
    },
    {
      label: "Đặt bàn",
      value: calculatedReservationsCount.toString(),
      change: getTimeRangeLabel(),
      icon: <FiCalendar />,
    },
    {
      label: "Tổng số Nhân viên",
      value: kpiData.totalEmployees.toString(),
      change: "Đang hoạt động",
      icon: <FiUser />,
      action: {
        label: "Xem danh sách",
        onClick: () => navigate("/employees"),
      },
    },
  ];

  const getStatusText = (status) => {
    const statusMap = {
      ChoXacNhan: "Chờ xác nhận",
      DangChuanBi: "Đang chuẩn bị",
      HoanThanh: "Hoàn thành",
      DaThanhToan: "Đã thanh toán",
      DaHuy: "Đã hủy",
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      ChoXacNhan: "orange",
      DangChuanBi: "blue",
      HoanThanh: "green",
      DaThanhToan: "cyan",
      DaHuy: "red",
    };
    return colorMap[status] || "default";
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-page__header">
        <div>
          <p className="eyebrow">Techzy Restaurant</p>
          <h1>Dashboard</h1>
          <span className="subtitle">
            Thống kê tổng quan hoạt động kinh doanh trong tuần gần nhất
          </span>
        </div>
        <button className="export-btn" onClick={handleExportExcel}>
          <FiDollarSign />
          Xuất báo cáo
        </button>
      </header>

      <div className="time-filter-container">
        <Select
          value={timeRange}
          onChange={handleTimeRangeChange}
          style={{ width: 240 }}
          size="large"
          suffixIcon={<CalendarOutlined style={{ fontSize: "16px", color: "#ff6b35" }} />}
        >
          <Select.Option value="week">
            <CalendarOutlined style={{ marginRight: "8px" }} />
            Tuần này
          </Select.Option>
          <Select.Option value="last7days">
            <CalendarOutlined style={{ marginRight: "8px" }} />
            7 ngày qua
          </Select.Option>
          <Select.Option value="month">
            <CalendarOutlined style={{ marginRight: "8px" }} />
            Tháng này
          </Select.Option>
          <Select.Option value="lastMonth">
            <CalendarOutlined style={{ marginRight: "8px" }} />
            Tháng trước
          </Select.Option>
          <Select.Option value="year">
            <CalendarOutlined style={{ marginRight: "8px" }} />
            Năm nay
          </Select.Option>
          <Select.Option value="custom">
            <CalendarOutlined style={{ marginRight: "8px" }} />
            Tùy chọn ngày...
          </Select.Option>
        </Select>
      </div>

      {/* Custom Date Range Modal */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CalendarOutlined style={{ color: "#ff6b35" }} />
            <span>Chọn khoảng thời gian</span>
          </div>
        }
        open={isCustomRangeModalOpen}
        onOk={handleCustomRangeSubmit}
        onCancel={() => setIsCustomRangeModalOpen(false)}
        okText="Áp dụng"
        cancelText="Hủy"
        okButtonProps={{
          style: {
            background: "linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)",
            border: "none",
          },
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "20px 0" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
              Ngày bắt đầu:
            </label>
            <DatePicker
              style={{ width: "100%" }}
              placeholder="Chọn ngày bắt đầu"
              onChange={(date) =>
                setCustomDateRange((prev) => ({ ...prev, startDate: date ? date.toDate() : null }))
              }
              format="DD/MM/YYYY"
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
              Ngày kết thúc:
            </label>
            <DatePicker
              style={{ width: "100%" }}
              placeholder="Chọn ngày kết thúc"
              onChange={(date) =>
                setCustomDateRange((prev) => ({ ...prev, endDate: date ? date.toDate() : null }))
              }
              format="DD/MM/YYYY"
              disabledDate={(current) => {
                if (!customDateRange.startDate) return false;
                return current && current < customDateRange.startDate;
              }}
            />
          </div>
        </div>
      </Modal>

      <section className="stats-grid">
        {statCards.map((card) => (
          <article key={card.label} className="stat-card">
            <div className="stat-icon">{card.icon}</div>
            <p className="stat-label">{card.label}</p>
            <h3>{card.value}</h3>
            <span className="stat-change">{card.change}</span>
            {card.action && (
              <button className="stat-action-link" onClick={card.action.onClick}>
                {card.action.label}
              </button>
            )}
          </article>
        ))}
      </section>

      <section className="dashboard-panels">
        <article className="panel chart-card">
          <div className="panel-header">
            <div>
              <h2>Doanh thu {getTimeRangeLabel().toLowerCase()}</h2>
              <p>Thống kê theo giá trị thực thu (VNĐ)</p>
            </div>
          </div>
          <div className="chart-wrapper">
            {revenueData.labels.length > 0 ? (
              <Line
                data={revenueData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      backgroundColor: "rgba(0, 0, 0, 0.8)",
                      padding: 12,
                      titleFont: {
                        size: 14,
                        weight: "bold",
                      },
                      bodyFont: {
                        size: 13,
                      },
                      callbacks: {
                        label: function (context) {
                          const tooltipFormat = context.dataset.tooltipFormat || "date";
                          const labelValue = context.label;
                          return getTooltipLabel(context, tooltipFormat, labelValue);
                        },
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function (value) {
                          if (value >= 1000000) {
                            return (value / 1000000).toFixed(1) + "M";
                          } else if (value >= 1000) {
                            return (value / 1000).toFixed(0) + "K";
                          }
                          return value;
                        },
                      },
                    },
                    x: {
                      ticks: {
                        maxRotation: 45,
                        minRotation: 0,
                      },
                    },
                  },
                }}
              />
            ) : (
              <div className="chart-placeholder">Đang tải dữ liệu...</div>
            )}
          </div>
        </article>

        <article className="panel notifications-card">
          <div className="panel-header">
            <h2>
              Thông báo & Nhắc nhở
            </h2>
          </div>
          <div className="notifications-list">
            {notifications.pendingOrders > 0 && (
              <div className="notification-item warning">
                <FiAlertCircle />
                <div>
                  <Text strong>{notifications.pendingOrders} đơn hàng</Text>
                  <Text type="secondary"> đang chờ xác nhận</Text>
                </div>
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate("/order?tab=ChoXacNhan")}
                >
                  Xem
                </Button>
              </div>
            )}
            {notifications.upcomingReservations > 0 && (
              <div className="notification-item info">
                <FiClock />
                <div>
                  <Text strong>{notifications.upcomingReservations} đặt bàn</Text>
                  <Text type="secondary"> sắp đến giờ (1-2 giờ tới)</Text>
                </div>
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate("/reservations")}
                >
                  Xem
                </Button>
              </div>
            )}
            {notifications.lowStockItems.length > 0 && (
              <div className="notification-item danger">
                <FiPackage />
                <div>
                  <Text strong>Nguyên vật liệu sắp hết:</Text>
                  <ul style={{ margin: "8px 0 0 20px", padding: 0 }}>
                    {notifications.lowStockItems.map((item, idx) => (
                      <li key={idx}>
                        <Text>
                          {item.name}: còn <Text strong style={{ color: "#ff4d4f" }}>{item.quantity}</Text>
                        </Text>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate("/storage")}
                >
                  Xem
                </Button>
              </div>
            )}
            {notifications.pendingOrders === 0 &&
              notifications.upcomingReservations === 0 &&
              notifications.lowStockItems.length === 0 && (
                <div className="notification-item success">
                  <Text type="secondary">Không có thông báo nào</Text>
                </div>
              )}
          </div>
        </article>
      </section>

      <section className="dashboard-charts-row">
        <article className="panel chart-card">
          <div className="panel-header">
            <h2>Top 5 Món Ăn Bán Chạy Nhất</h2>
            <p>Theo số lượng đã bán</p>
          </div>
          <div className="chart-wrapper">
            {topProductsData.labels.length > 0 ? (
              <Bar
                data={topProductsData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          return `Đã bán: ${context.parsed.y} phần`;
                        },
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                      },
                    },
                  },
                }}
              />
            ) : (
              <div className="chart-placeholder">Đang tải dữ liệu...</div>
            )}
          </div>
        </article>

        <article className="panel chart-card">
          <div className="panel-header">
            <h2>Phân bổ Đơn hàng theo Trạng thái</h2>
            <p>Tổng quan trạng thái đơn hàng</p>
          </div>
          <div className="chart-wrapper">
            {orderStatusData.labels.length > 0 ? (
              <Pie
                data={orderStatusData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "right",
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = ((context.parsed / total) * 100).toFixed(1);
                          return `${context.label}: ${context.parsed} đơn (${percentage}%)`;
                        },
                      },
                    },
                  },
                }}
              />
            ) : (
              <div className="chart-placeholder">Đang tải dữ liệu...</div>
            )}
          </div>
        </article>
      </section>

      <article className="panel orders-card">
        <div className="panel-header">
          <h2>Các đơn hàng gần đây</h2>
          <button className="link-button" onClick={() => navigate("/order")}>
            Xem tất cả
          </button>
        </div>

        <div className="orders-table">
          <div className="orders-table__head">
            <span>ID Đơn hàng</span>
            <span>Tên khách hàng</span>
            <span>Trạng thái</span>
            <span className="text-right">Tổng tiền</span>
          </div>
          <div className="orders-table__body">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => {
                const status = order.TrangThai || order.trangThai;
                return (
                  <div key={order.MaDonHang || order.maDonHang} className="orders-row">
                    <span>#{order.MaDonHang || order.maDonHang}</span>
                    <span>
                      {order.khachHang?.HoTen || order.khachHang?.hoTen || "N/A"}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Tag
                        color={getStatusColor(status)}
                        style={{
                          width: 'fit-content',   // Ngăn bị kéo giãn
                          borderRadius: '20px',   // Bo tròn kiểu viên thuốc (Soft Pill)
                          fontWeight: '600',      // Chữ đậm hơn chút cho dễ đọc
                          border: 'none',         // Bỏ viền nếu muốn style hiện đại (tùy chọn)
                          padding: '4px 12px'     // Tăng khoảng cách cho thoáng
                        }}
                      >
                        {getStatusText(status)}
                      </Tag>
                    </div>
                    <span className="text-right">
                      {(order.TongTien || order.tongTien || 0).toLocaleString("vi-VN")}₫
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="orders-empty">Chưa có đơn hàng nào</div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
};

export default Dashboard;
