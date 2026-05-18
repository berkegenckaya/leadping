/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@leadping/db", "@leadping/types"],
  async headers() {
    return [
      {
        source: "/api/widget/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin",  value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
};

export default nextConfig;
