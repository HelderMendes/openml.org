import type React from "react";

/**
 * Minimal props accepted by any icon component used in the app.
 * Covers both lucide-react icons and FontAwesome inline wrappers.
 */
export type IconProps = {
  className?: string;
  style?: React.CSSProperties;
};

/**
 * A renderable icon component that accepts IconProps.
 * Use this as the type for `icon` fields in data structures (e.g. entity stat arrays).
 *
 * Trade-off: intentionally minimal — it doesn't constrain FontAwesome-specific
 * props (size, spin, etc.), but that's fine since call sites only pass
 * className and style.
 */
export type IconComponent = React.ComponentType<IconProps>;
