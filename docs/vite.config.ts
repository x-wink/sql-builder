import Vue from '@vitejs/plugin-vue';
import { ConfigEnv, UserConfig, loadEnv } from 'vite';
import { resolve } from 'path';
const resolvePath = (str: string) => resolve(process.cwd(), str);
export default (configEnv: ConfigEnv) => {
    const env = loadEnv(configEnv.mode, resolvePath('docs'));
    console.info(configEnv);
    console.table(env);
    return {
        base: env.VITE_BASE_URL,
        plugins: [Vue()],
        server: {
            host: '0.0.0.0',
            open: true,
        },
    } as UserConfig;
};
