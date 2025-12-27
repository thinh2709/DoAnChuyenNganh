
require("dotenv").config();

module.exports = {
  // Cấu hình database
  database: {
    url: process.env.DATABASE_URL || process.env.DB_URL,
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "RestaurantDb",
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },

  // Cấu hình JWT
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      "your-256-bit-secret-key-here-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  },

  // Cấu hình server
  server: {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || "development",
  },

  // Cấu hình CORS
  cors: {
    origin: function (origin, callback) {
      // ✅ Whitelist domains
      const whitelist = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174", // ✅ Admin port
        "https://techzy-restaurant.com",
      ];

      // ✅ Allow requests with no origin (mobile apps, Postman, same-origin)
      if (!origin || whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },

  // Cấu hình upload
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
    ],
  },
};
