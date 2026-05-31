import type { NextConfig } from 'next'

const isGithubPages = process.env.GITHUB_PAGES === 'true'

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  basePath: isGithubPages ? '/SoftPage' : undefined,
  assetPrefix: isGithubPages ? '/SoftPage/' : undefined,
}

export default nextConfig
