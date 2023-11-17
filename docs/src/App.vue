<template>
    {{ query }}
</template>

<script setup lang="ts">
    import { QueryBuilder } from '../../src/index';
    const query = new QueryBuilder().from('user').equal('username', 'admin').toSql();
</script>

<style scoped lang="less"></style>
