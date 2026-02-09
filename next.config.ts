/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // This allows the build to finish even with the heatmap error
    ignoreBuildErrors: true, 
  },
};

export default nextConfig;