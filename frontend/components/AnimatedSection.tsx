"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Animated Section — fade + slide up with spring ──

interface AnimatedSectionProps {
    children: React.ReactNode;
    delay?: number;
    className?: string;
    direction?: "up" | "down" | "left" | "right";
}

const directionMap = {
    up: { y: 24, x: 0 },
    down: { y: -24, x: 0 },
    left: { x: 24, y: 0 },
    right: { x: -24, y: 0 },
};

export function AnimatedSection({
    children,
    delay = 0,
    className = "",
    direction = "up",
}: AnimatedSectionProps) {
    const offset = directionMap[direction];

    return (
        <motion.div
            initial={{ opacity: 0, ...offset }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{
                duration: 0.5,
                delay,
                ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// ── Animated List — staggered children ──

interface AnimatedListProps {
    children: React.ReactNode;
    className?: string;
    staggerDelay?: number;
}

export function AnimatedList({
    children,
    className = "",
    staggerDelay = 0.06,
}: AnimatedListProps) {
    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={{
                hidden: {},
                visible: { transition: { staggerChildren: staggerDelay } },
            }}
            className={className}
        >
            {React.Children.map(children, (child) => (
                <motion.div
                    variants={{
                        hidden: { opacity: 0, y: 16 },
                        visible: {
                            opacity: 1,
                            y: 0,
                            transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
                        },
                    }}
                >
                    {child}
                </motion.div>
            ))}
        </motion.div>
    );
}

// ── Fade transition wrapper for data changes ──

interface FadeTransitionProps {
    children: React.ReactNode;
    transitionKey: string;
    className?: string;
}

export function FadeTransition({
    children,
    transitionKey,
    className = "",
}: FadeTransitionProps) {
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={transitionKey}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className={className}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
