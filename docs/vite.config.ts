/* eslint-disable no-console */
import Vue from '@vitejs/plugin-vue';
import { loadEnv, type ConfigEnv, type UserConfig } from 'vite';
// https://vitejs.dev/config/
export default (configEnv: ConfigEnv) => {
    const env = loadEnv(configEnv.mode, process.cwd());
    console.info(configEnv);
    console.table(env);
    return {
        base: env.VITE_BASE_URL,
        server: {
            host: '0.0.0.0',
            open: true,
        },
        plugins: [Vue()],
    } as UserConfig;
};
