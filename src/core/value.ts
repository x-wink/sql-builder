import type { ISqlify } from './builder';
import { concat } from '@xwink/utils';
/**
 * 字段值
 */
export class Value implements ISqlify {
    private data: object;
    constructor(data: object) {
        this.data = data;
    }
    toSql(fieldCount = Object.keys(this.data).length): string {
        return concat(['( ', concat(new Array(fieldCount).fill('?'), ', '), ' )']);
    }
    getValues(fields: string[] = []): unknown[] {
        return fields.map((field) => (this.data as Record<string, unknown>)[field]);
    }
}
