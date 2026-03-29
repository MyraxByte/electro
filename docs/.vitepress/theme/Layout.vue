<script setup>
import DefaultTheme from "vitepress/theme";

const { Layout } = DefaultTheme;
</script>

<template>
    <Layout>
        <template #home-hero-before>
            <div class="hero-orbs">
                <div class="orb-3"></div>
            </div>
        </template>
    </Layout>
</template>

<style scoped>
/* Warm amber + red orbs — Rolldown-inspired */
.hero-orbs {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
}

/* Amber orb — left */
.hero-orbs::before {
    content: "";
    position: absolute;
    width: 640px;
    height: 640px;
    border-radius: 50%;
    filter: blur(140px);
    background: radial-gradient(circle, rgba(251, 191, 36, 0.42) 0%, transparent 70%);
    top: -140px;
    left: 5%;
    animation: orb-drift-1 20s ease-in-out infinite;
    opacity: 0.3;
}

/* Red orb — right */
.hero-orbs::after {
    content: "";
    position: absolute;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    filter: blur(130px);
    background: radial-gradient(circle, rgba(239, 68, 68, 0.38) 0%, transparent 70%);
    top: 40px;
    right: 6%;
    animation: orb-drift-2 24s ease-in-out infinite;
    opacity: 0.2;
}

/* Orange orb — center bottom */
.orb-3 {
    position: absolute;
    width: 420px;
    height: 420px;
    border-radius: 50%;
    filter: blur(120px);
    background: radial-gradient(circle, rgba(249, 115, 22, 0.35) 0%, transparent 70%);
    bottom: -60px;
    left: 38%;
    animation: orb-drift-3 28s ease-in-out infinite;
    opacity: 0.15;
}

@keyframes orb-drift-1 {
    0%,
    100% {
        transform: translate(0, 0) scale(1);
        opacity: 0.3;
    }
    33% {
        transform: translate(28px, -44px) scale(1.07);
        opacity: 0.4;
    }
    66% {
        transform: translate(-18px, -60px) scale(0.93);
        opacity: 0.25;
    }
}
@keyframes orb-drift-2 {
    0%,
    100% {
        transform: translate(0, 0) scale(1);
        opacity: 0.2;
    }
    33% {
        transform: translate(-32px, 22px) scale(0.91);
        opacity: 0.28;
    }
    66% {
        transform: translate(44px, 48px) scale(1.07);
        opacity: 0.18;
    }
}
@keyframes orb-drift-3 {
    0%,
    100% {
        transform: translate(0, 0) scale(1);
        opacity: 0.15;
    }
    50% {
        transform: translate(22px, -28px) scale(1.08);
        opacity: 0.22;
    }
}
</style>
