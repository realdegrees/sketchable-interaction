import Icons from 'unplugin-icons/webpack';

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    webpack(config) {
        config.plugins.push(
            Icons({
                compiler: 'jsx',
                jsx: 'react',
                autoInstall: true
            })
        );
        return config;
    }
};

export default nextConfig;
