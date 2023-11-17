import type { ConditionArray } from '../types';

/**
 * 解析名字和别名
 * @param express sql名称表达式
 */
export const parseAliasExpress = (express: string) => {
    const arr = express.split(/\s+(as\s+)?/),
        name = arr[0],
        alias = arr[2];
    return { name, alias };
};
/**
 * 获取使用反引号包裹的名称，防止名称为数据库保留关键字
 * @example secureName('name') === '`name`'
 */
export const secureName = (name?: string) => (name ? `\`${name}\`` : '');

/**
 * 解析条件数组，没有条件或条件满足时返回所有数组元素，否则返回空数组
 * @param arr 条件数组
 */
export const parseConditionArray = <T>(arr: ConditionArray<T>) => {
    const lastIndex = arr.length - 1,
        last = arr[lastIndex];
    const condition = last instanceof Function ? last : void 0;
    arr = (condition ? arr.slice(0, lastIndex) : arr) as T[];
    return condition?.() !== false ? arr : [];
};
