<template>
    {{ query.toSql() }}
    {{ query.getValues() }}
</template>

<script setup lang="ts">
    import { QueryBuilder, OnBuilder, Field } from '../../src/index';
    const query = new QueryBuilder()
        .select('count(1) count')
        .from('t_sign', 's')
        .leftJoin('t_user', 'u', new OnBuilder().equal('u.id', Field.parse('s.user_id')))
        .equal('s.del_flag', 0)
        .equal('s.type', 0)
        .equal('u.username', '0001')
        .isNull('u.id');
</script>

<style scoped lang="less"></style>
