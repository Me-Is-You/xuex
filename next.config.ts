import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许 Arena 预览代理主机访问 dev 资源（字体/HMR），避免跨域拦截导致预览异常
  allowedDevOrigins: ["*.e2b.app", "3000-ixu0ch6y5q4n25g3rozz1.e2b.app"],
};

export default nextConfig;
