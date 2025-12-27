import React from 'react';

const Loading = ({ message = "Đang chuẩn bị món ngon..." }) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center bg-white">
      {/* ✅ Spinner (Vòng xoay) */}
      <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4"></div>

      {/* ✅ Tên thương hiệu */}
      <h2 className="text-2xl font-bold text-orange-600 tracking-wider mb-2">
        TECHZY RESTAURANT
      </h2>

      {/* ✅ Dòng trạng thái */}
      <p className="text-sm text-gray-500 animate-pulse">
        {message}
      </p>
    </div>
  );
};

export default Loading;
