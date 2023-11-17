<template>
    {{ lib }}
</template>

<script setup lang="ts">
    import { useMyLibary } from '../../src/index';
    const lib = useMyLibary();
</script>

<style scoped lang="less"></style>
