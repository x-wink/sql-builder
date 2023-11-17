import type { ISqlify } from './builder';
import { concat } from '@xwink/utils';
/**
 * 分页截取
 */
export class Limit implements ISqlify {
    private start: number;
    private end: number;
    /**
     * @param start 起始下标
     * @param end 结束下标
     */
    constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
    }
    /**
     * 分页查询
     * @param pageNo 页码，从1开始
     * @param pageSize 页容量
     */
    static page(pageNo: number, pageSize: number) {
        const start = pageSize * (pageNo - 1),
            end = start + pageSize;
        return new Limit(start, end);
    }
    toSql(): string {
        return concat(['limit', '?, ?']);
    }
    getValues(): unknown[] {
        return [this.start, this.end];
    }
}
