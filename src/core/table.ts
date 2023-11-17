import type { ISqlify, OnBuilder } from './builder';
import { concat } from '@xwink/utils';
import { parseAliasExpress, secureName } from '../utils';
/**
 * 数据表
 */
export class Table implements ISqlify {
    protected alias?: string;
    protected name: string;
    /**
     * @param name 表名
     * @param alias 别名
     */
    constructor(name: string, alias?: string) {
        this.name = name;
        this.alias = alias;
    }
    static parse(express: string) {
        const { name, alias } = parseAliasExpress(express);
        return new Table(name, alias);
    }
    toSql(): string {
        return concat([secureName(this.name), secureName(this.alias)], ' as ');
    }
    getValues(): unknown[] {
        return [];
    }
}
/**
 * 表连接方式
 */
export enum JoinTableType {
    /**
     * 主表
     */
    PRIMARY = 'from',
    /**
     * 左外连接
     */
    LEFT = 'left outer join',
    /**
     * 右外连接
     */
    RIGHT = 'right outer join',
    /**
     * 全外连接
     */
    FULL = 'full outer join',
    /**
     * 内连接
     */
    INNER = 'inner join',
}
/**
 * 连接表
 */
export class JoinTable extends Table implements ISqlify {
    private type: JoinTableType;
    private on?: OnBuilder;
    /**
     * @param name 表名
     * @param alias 别名
     * @param on 连接条件
     * @param type 连接类型
     */
    constructor(name: string, alias?: string, on?: OnBuilder, type = JoinTableType.INNER) {
        super(name, alias);
        this.type = type;
        this.on = on;
    }
    toSql(): string {
        return concat(
            [this.type, super.toSql(), this.type !== JoinTableType.PRIMARY && this.on ? this.on.toSql() : ''],
            false
        );
    }
    getValues(): unknown[] {
        return this.on?.getValues() ?? [];
    }
}
