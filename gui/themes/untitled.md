# Untitled

Generated from the current project, including edits awaiting autosave. Return to the [theme index](../themes.md). Install the selected fonts and icons using the setup below; assets are acquired separately from their official sources.

## Font and icon setup

Follow [asset installation](../assets.md) when implementing this theme. Download and configure the selected free assets from their official sources; no font files or icon artwork are bundled. Weights below are the authored requests: load matching static faces or a variable range and report any unavailable weight. Register the exact family aliases below, or map the role tokens to the loader’s actual family.

| Selected font | Roles | Weights | Family stack | Setup |
| --- | --- | --- | --- | --- |
| <code>GT Standard</code> (paid) | brand, ui, editorial, data | 400, 500, 600 | <code>"GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif</code> | Use supplied licensed webfonts if available. Otherwise install the free fallback below and tell the user how to add [GT Standard](https://www.grillitype.com/shops/gt-standard) later. |

### Free fallbacks for unavailable paid fonts

Install these only for the listed paid selections when licensed files are unavailable. Keep the paid family first, insert the installed free family before generic/system fallbacks, and preserve the authored weights. Leave other selected free families in place. Tell the user which fallback is active, link the vendor above, and explain where to add licensed webfont files and their font declarations to restore the selection.

| Paid selection | Roles | Free fallback | Weights | Fallback family stack | Setup |
| --- | --- | --- | --- | --- | --- |
| <code>GT Standard</code> | brand, ui, editorial, data | <code>Timeless Grotesk</code> | 400, 500, 600 | <code>"Timeless Grotesk", sans-serif</code> | Download and load [Timeless Grotesk](https://timeless.co/type) in the app. Use the vendor’s Grotesk cut; if using Timeless Sans variable files, pin STYL to 0, with ital 0 for upright or 100 for required italic faces. |

### Icons

Selected: [Lucide](https://lucide.dev/guide/react/getting-started), outlined. Install and wire the selected free pack (React: <code>lucide-react</code>); reuse it if already installed. Use the official adapter for other frameworks.

Preserve icon size, color, weight, style, and accessible names. Match the selected style only where the pack supports it; Lucide’s official pack supplies outlines, so report a filled-style gap rather than claiming exact filled artwork. Keep existing package versions and add only missing packages using the receiving project’s package manager.

## Foundations

```json
{
  "name": "Untitled",
  "primaryForeground": {
    "light": "neutral-9",
    "dark": "neutral-2"
  },
  "iconFamily": "Lucide",
  "animation": {
    "duration": 200,
    "easing": [
      0.16,
      1,
      0.3,
      1
    ],
    "large": {
      "duration": 360,
      "easing": [
        0.22,
        1,
        0.36,
        1
      ]
    },
    "popupScale": 0.96,
    "pressDistance": 1
  },
  "spacing": {
    "zero": 0,
    "xxs": 4,
    "xs": 8,
    "s": 12,
    "m": 16,
    "l": 24,
    "xl": 32,
    "xxl": 48
  },
  "text": {
    "xxs": {
      "size": 10,
      "lineHeight": 14
    },
    "xs": {
      "size": 12,
      "lineHeight": 16
    },
    "s": {
      "size": 14,
      "lineHeight": 20
    },
    "m": {
      "size": 16,
      "lineHeight": 24
    },
    "l": {
      "size": 24,
      "lineHeight": 32
    },
    "xl": {
      "size": 36,
      "lineHeight": 40
    },
    "xxl": {
      "size": 48,
      "lineHeight": 52
    }
  },
  "fonts": {
    "ui": {
      "family": "\"GT Standard L\", -apple-system, BlinkMacSystemFont, sans-serif",
      "weights": {
        "regular": 400,
        "medium": 500,
        "heavy": 600
      }
    },
    "brand": {
      "family": "\"GT Standard L\", -apple-system, BlinkMacSystemFont, sans-serif",
      "weights": {
        "regular": 400,
        "medium": 500,
        "heavy": 600
      }
    },
    "editorial": {
      "family": "\"GT Standard L\", -apple-system, BlinkMacSystemFont, sans-serif",
      "weights": {
        "regular": 400,
        "medium": 500,
        "heavy": 600
      }
    },
    "data": {
      "family": "\"GT Standard L\", -apple-system, BlinkMacSystemFont, sans-serif",
      "weights": {
        "regular": 400,
        "medium": 500,
        "heavy": 600
      }
    }
  },
  "radius": {
    "zero": 0,
    "xs": 4,
    "s": 8,
    "m": 12,
    "l": 18,
    "xl": 28,
    "full": 9999
  },
  "border": {
    "none": 0,
    "s": 0,
    "m": 0,
    "l": 0
  },
  "shadows": {
    "s": {
      "x": 0,
      "y": 2,
      "blur": 4,
      "spread": 0,
      "opacity": 0,
      "color": {
        "light": "neutral-10",
        "dark": "neutral-1"
      }
    },
    "m": {
      "x": 0,
      "y": 8,
      "blur": 24,
      "spread": 0,
      "opacity": 12,
      "color": {
        "light": "neutral-10",
        "dark": "neutral-1"
      }
    },
    "l": {
      "x": 0,
      "y": 16,
      "blur": 48,
      "spread": 0,
      "opacity": 0,
      "color": {
        "light": "neutral-10",
        "dark": "neutral-1"
      }
    }
  },
  "iconStyle": "outlined",
  "buttonRadius": "s",
  "primaryActionColor": "neutral-10",
  "colorEmphasis": 52,
  "neutralTone": "neutral",
  "letterSpacing": {
    "xs": -0.02,
    "s": -0.01,
    "m": 0,
    "l": 0.01,
    "xl": 0.02
  }
}
```

## light CSS variables

Define these in the app’s existing theme scope for this mode. Keep component styles linked to the variables.

| Variable | Value |
| --- | --- |
| `--theme-name` | Untitled |
| `--theme-icon-family` | Lucide |
| `--theme-icon-style` | outlined |
| `--toolbar-divider-bleed` | 0 |
| `--focus-ring-outline` | initial |
| `--icon-stroke-width` | 2 |
| `--icon-light-display` | none |
| `--icon-regular-display` | inline |
| `--icon-bold-display` | none |
| `--motion-duration` | 200ms |
| `--motion-easing` | cubic-bezier(0.16, 1, 0.3, 1) |
| `--motion-type` | easing |
| `--motion-visual-duration` | 0.2 |
| `--motion-bounce` | 0.2 |
| `--motion-enabled` | 1 |
| `--motion-small-iterations` | infinite |
| `--motion-large-duration` | 360ms |
| `--motion-large-easing` | cubic-bezier(0.22, 1, 0.36, 1) |
| `--motion-large-type` | easing |
| `--motion-large-visual-duration` | 0.36 |
| `--motion-large-bounce` | 0.2 |
| `--motion-large-iterations` | infinite |
| `--motion-popup-scale` | 0.96 |
| `--motion-press-distance` | 1px |
| `--option-badge-background` | #d4b441 |
| `--option-badge-foreground` | #333333 |
| `--navigation-active-foreground` | #333333 |
| `--emphasis-chart-fill` | #d4b44133 |
| `--emphasis-balance-background` | #cdcdcd |
| `--emphasis-rewards-background` | #f4f4f4 |
| `--emphasis-icon-background` | #f4f4f4 |
| `--emphasis-icon-foreground` | #000000 |
| `--emphasis-type-background` | #f4f4f4 |
| `--emphasis-type-foreground` | #000000 |
| `--navigation-active-background` | #d4b441 |
| `--surface-raised-image` | none |
| `--surface-raised-shadow` | 0 0 0 0 transparent |
| `--surface-recessed-image` | none |
| `--surface-recessed-shadow` | 0 0 0 0 transparent |
| `--space-zero` | 0px |
| `--space-xxs` | 4px |
| `--space-xs` | 8px |
| `--space-s` | 12px |
| `--space-m` | 16px |
| `--space-l` | 24px |
| `--space-xl` | 32px |
| `--space-xxl` | 48px |
| `--tracking-xs` | -0.02em |
| `--tracking-s` | -0.01em |
| `--tracking-m` | 0em |
| `--tracking-l` | 0.01em |
| `--tracking-xl` | 0.02em |
| `--size-xxs` | 10px |
| `--line-xxs` | 14px |
| `--letter-spacing-xxs` | 0.02em |
| `--size-xs` | 12px |
| `--line-xs` | 16px |
| `--letter-spacing-xs` | 0.01em |
| `--size-s` | 14px |
| `--line-s` | 20px |
| `--letter-spacing-s` | 0.01em |
| `--size-m` | 16px |
| `--line-m` | 24px |
| `--letter-spacing-m` | 0em |
| `--size-l` | 24px |
| `--line-l` | 32px |
| `--letter-spacing-l` | -0.01em |
| `--size-xl` | 36px |
| `--line-xl` | 40px |
| `--letter-spacing-xl` | -0.01em |
| `--size-xxl` | 48px |
| `--line-xxl` | 52px |
| `--letter-spacing-xxl` | -0.02em |
| `--radius-zero` | 0px |
| `--radius-xs` | 4px |
| `--radius-s` | 8px |
| `--radius-m` | 12px |
| `--radius-l` | 18px |
| `--radius-xl` | 28px |
| `--radius-full` | 9999px |
| `--border-none` | 0px |
| `--border-s` | 0px |
| `--border-m` | 0px |
| `--border-l` | 0px |
| `--border-default-color` | #e7e7e733 |
| `--border-shadow-none` | 0 0 0 0 transparent |
| `--border-shadow-s` | 0 0 0 0 transparent |
| `--border-shadow-m` | 0 0 0 0 transparent |
| `--border-shadow-l` | 0 0 0 0 transparent |
| `--font-ui` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-ui-regular` | 400 |
| `--weight-ui-medium` | 500 |
| `--weight-ui-heavy` | 600 |
| `--font-brand` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-brand-regular` | 400 |
| `--weight-brand-medium` | 500 |
| `--weight-brand-heavy` | 600 |
| `--font-editorial` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-editorial-regular` | 400 |
| `--weight-editorial-medium` | 500 |
| `--weight-editorial-heavy` | 600 |
| `--font-data` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-data-regular` | 400 |
| `--weight-data-medium` | 500 |
| `--weight-data-heavy` | 600 |
| `--color-none` | transparent |
| `--color-1` | #d4b441 |
| `--color-1-transparent` | #d4b44133 |
| `--color-2` | #085e55 |
| `--color-2-transparent` | #085e5533 |
| `--color-3` | #91b9fa |
| `--color-3-transparent` | #91b9fa33 |
| `--color-4` | #fff0b8 |
| `--color-4-transparent` | #fff0b833 |
| `--neutral-1` | #ffffff |
| `--neutral-1-transparent` | #ffffff33 |
| `--neutral-2` | #fbfbfb |
| `--neutral-2-transparent` | #fbfbfb33 |
| `--neutral-3` | #f4f4f4 |
| `--neutral-3-transparent` | #f4f4f433 |
| `--neutral-4` | #e7e7e7 |
| `--neutral-4-transparent` | #e7e7e733 |
| `--neutral-5` | #cdcdcd |
| `--neutral-5-transparent` | #cdcdcd33 |
| `--neutral-6` | #a1a1a1 |
| `--neutral-6-transparent` | #a1a1a133 |
| `--neutral-7` | #7d7d7d |
| `--neutral-7-transparent` | #7d7d7d33 |
| `--neutral-8` | #555555 |
| `--neutral-8-transparent` | #55555533 |
| `--neutral-9` | #333333 |
| `--neutral-9-transparent` | #33333333 |
| `--neutral-10` | #000000 |
| `--neutral-10-transparent` | #00000033 |
| `--success` | #00906c |
| `--success-transparent` | #00906c33 |
| `--warning` | #ffea00 |
| `--warning-transparent` | #ffea0033 |
| `--error` | #fc032d |
| `--error-transparent` | #fc032d33 |
| `--shadow-none` | none |
| `--shadow-s` | 0px 2px 4px 0px #00000000 |
| `--shadow-m` | 0px 2px 6px 0px #0000000d, 0px 8px 24px 0px #00000013 |
| `--shadow-l` | 0px 16px 48px 0px #00000000 |
| `--cte-canvas` | #ffffff |
| `--cte-surface` | #fbfbfb |
| `--cte-surface-muted` | #f4f4f4 |
| `--cte-text` | #000000 |
| `--cte-text-muted` | #7d7d7d |
| `--cte-border` | #e7e7e733 |
| `--cte-accent` | #d4b441 |
| `--cte-accent-text` | #333333 |
| `--cte-danger` | #fc032d |
| `--cte-focus` | #d4b441 |
| `--cte-font` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--cte-font-size` | 14px |
| `--cte-font-weight` | 400 |
| `--cte-line-height` | 20px |
| `--cte-letter-spacing` | 0.01em |
| `--cte-detail-font-size` | 12px |
| `--cte-detail-line-height` | 16px |
| `--cte-detail-letter-spacing` | 0.01em |

## dark CSS variables

Define these in the app’s existing theme scope for this mode. Keep component styles linked to the variables.

| Variable | Value |
| --- | --- |
| `--theme-name` | Untitled |
| `--theme-icon-family` | Lucide |
| `--theme-icon-style` | outlined |
| `--toolbar-divider-bleed` | 0 |
| `--focus-ring-outline` | initial |
| `--icon-stroke-width` | 2 |
| `--icon-light-display` | none |
| `--icon-regular-display` | inline |
| `--icon-bold-display` | none |
| `--motion-duration` | 200ms |
| `--motion-easing` | cubic-bezier(0.16, 1, 0.3, 1) |
| `--motion-type` | easing |
| `--motion-visual-duration` | 0.2 |
| `--motion-bounce` | 0.2 |
| `--motion-enabled` | 1 |
| `--motion-small-iterations` | infinite |
| `--motion-large-duration` | 360ms |
| `--motion-large-easing` | cubic-bezier(0.22, 1, 0.36, 1) |
| `--motion-large-type` | easing |
| `--motion-large-visual-duration` | 0.36 |
| `--motion-large-bounce` | 0.2 |
| `--motion-large-iterations` | infinite |
| `--motion-popup-scale` | 0.96 |
| `--motion-press-distance` | 1px |
| `--option-badge-background` | #d4b441 |
| `--option-badge-foreground` | #333333 |
| `--navigation-active-foreground` | #333333 |
| `--emphasis-chart-fill` | #d4b44133 |
| `--emphasis-balance-background` | #565656 |
| `--emphasis-rewards-background` | #2b2b2b |
| `--emphasis-icon-background` | #2b2b2b |
| `--emphasis-icon-foreground` | #ffffff |
| `--emphasis-type-background` | #2b2b2b |
| `--emphasis-type-foreground` | #ffffff |
| `--navigation-active-background` | #d4b441 |
| `--surface-raised-image` | none |
| `--surface-raised-shadow` | 0 0 0 0 transparent |
| `--surface-recessed-image` | none |
| `--surface-recessed-shadow` | 0 0 0 0 transparent |
| `--space-zero` | 0px |
| `--space-xxs` | 4px |
| `--space-xs` | 8px |
| `--space-s` | 12px |
| `--space-m` | 16px |
| `--space-l` | 24px |
| `--space-xl` | 32px |
| `--space-xxl` | 48px |
| `--tracking-xs` | -0.02em |
| `--tracking-s` | -0.01em |
| `--tracking-m` | 0em |
| `--tracking-l` | 0.01em |
| `--tracking-xl` | 0.02em |
| `--size-xxs` | 10px |
| `--line-xxs` | 14px |
| `--letter-spacing-xxs` | 0.02em |
| `--size-xs` | 12px |
| `--line-xs` | 16px |
| `--letter-spacing-xs` | 0.01em |
| `--size-s` | 14px |
| `--line-s` | 20px |
| `--letter-spacing-s` | 0.01em |
| `--size-m` | 16px |
| `--line-m` | 24px |
| `--letter-spacing-m` | 0em |
| `--size-l` | 24px |
| `--line-l` | 32px |
| `--letter-spacing-l` | -0.01em |
| `--size-xl` | 36px |
| `--line-xl` | 40px |
| `--letter-spacing-xl` | -0.01em |
| `--size-xxl` | 48px |
| `--line-xxl` | 52px |
| `--letter-spacing-xxl` | -0.02em |
| `--radius-zero` | 0px |
| `--radius-xs` | 4px |
| `--radius-s` | 8px |
| `--radius-m` | 12px |
| `--radius-l` | 18px |
| `--radius-xl` | 28px |
| `--radius-full` | 9999px |
| `--border-none` | 0px |
| `--border-s` | 0px |
| `--border-m` | 0px |
| `--border-l` | 0px |
| `--border-default-color` | #3d3d3d33 |
| `--border-shadow-none` | 0 0 0 0 transparent |
| `--border-shadow-s` | 0 0 0 0 transparent |
| `--border-shadow-m` | 0 0 0 0 transparent |
| `--border-shadow-l` | 0 0 0 0 transparent |
| `--font-ui` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-ui-regular` | 400 |
| `--weight-ui-medium` | 500 |
| `--weight-ui-heavy` | 600 |
| `--font-brand` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-brand-regular` | 400 |
| `--weight-brand-medium` | 500 |
| `--weight-brand-heavy` | 600 |
| `--font-editorial` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-editorial-regular` | 400 |
| `--weight-editorial-medium` | 500 |
| `--weight-editorial-heavy` | 600 |
| `--font-data` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-data-regular` | 400 |
| `--weight-data-medium` | 500 |
| `--weight-data-heavy` | 600 |
| `--color-none` | transparent |
| `--color-1` | #d4b441 |
| `--color-1-transparent` | #d4b44133 |
| `--color-2` | #085e55 |
| `--color-2-transparent` | #085e5533 |
| `--color-3` | #91b9fa |
| `--color-3-transparent` | #91b9fa33 |
| `--color-4` | #fff0b8 |
| `--color-4-transparent` | #fff0b833 |
| `--neutral-1` | #000000 |
| `--neutral-1-transparent` | #00000033 |
| `--neutral-2` | #202020 |
| `--neutral-2-transparent` | #20202033 |
| `--neutral-3` | #2b2b2b |
| `--neutral-3-transparent` | #2b2b2b33 |
| `--neutral-4` | #3d3d3d |
| `--neutral-4-transparent` | #3d3d3d33 |
| `--neutral-5` | #565656 |
| `--neutral-5-transparent` | #56565633 |
| `--neutral-6` | #838383 |
| `--neutral-6-transparent` | #83838333 |
| `--neutral-7` | #ababab |
| `--neutral-7-transparent` | #ababab33 |
| `--neutral-8` | #cfcfcf |
| `--neutral-8-transparent` | #cfcfcf33 |
| `--neutral-9` | #f4f4f4 |
| `--neutral-9-transparent` | #f4f4f433 |
| `--neutral-10` | #ffffff |
| `--neutral-10-transparent` | #ffffff33 |
| `--success` | #00906c |
| `--success-transparent` | #00906c33 |
| `--warning` | #ffea00 |
| `--warning-transparent` | #ffea0033 |
| `--error` | #fc032d |
| `--error-transparent` | #fc032d33 |
| `--shadow-none` | none |
| `--shadow-s` | 0px 2px 4px 0px #00000000 |
| `--shadow-m` | 0px 2px 6px 0px #0000000d, 0px 8px 24px 0px #00000013 |
| `--shadow-l` | 0px 16px 48px 0px #00000000 |
| `--cte-canvas` | #000000 |
| `--cte-surface` | #202020 |
| `--cte-surface-muted` | #2b2b2b |
| `--cte-text` | #ffffff |
| `--cte-text-muted` | #ababab |
| `--cte-border` | #3d3d3d33 |
| `--cte-accent` | #d4b441 |
| `--cte-accent-text` | #202020 |
| `--cte-danger` | #fc032d |
| `--cte-focus` | #d4b441 |
| `--cte-font` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--cte-font-size` | 14px |
| `--cte-font-weight` | 400 |
| `--cte-line-height` | 20px |
| `--cte-letter-spacing` | 0.01em |
| `--cte-detail-font-size` | 12px |
| `--cte-detail-line-height` | 16px |
| `--cte-detail-letter-spacing` | 0.01em |

## Authored component assignments

These are project edits. The [component reference](untitled-components.md) includes the effective assignments with defaults and shared parts resolved.

```json
{
  "componentTokens": {
    "button:primary:rest": {
      "paddingTop": "s",
      "paddingBottom": "s",
      "paddingX": "l"
    },
    "button:secondary:rest": {
      "paddingTop": "s",
      "paddingBottom": "s",
      "paddingX": "l"
    },
    "button:outline:rest": {
      "paddingTop": "s",
      "paddingBottom": "s",
      "paddingX": "l"
    },
    "button:ghost:rest": {
      "paddingTop": "s",
      "paddingBottom": "s",
      "paddingX": "l"
    },
    "button:danger:rest": {
      "paddingTop": "s",
      "paddingBottom": "s",
      "paddingX": "l"
    },
    "input:default:rest": {
      "background": "neutral-3",
      "paddingTop": "s",
      "paddingBottom": "s",
      "paddingX": "m"
    },
    "select:default:rest": {
      "background": "neutral-3",
      "paddingTop": "s",
      "paddingBottom": "s",
      "paddingX": "m"
    },
    "combobox:default:rest": {
      "background": "neutral-3",
      "paddingTop": "s",
      "paddingBottom": "s",
      "paddingX": "m"
    },
    "autocomplete:default:part:popover:rest": {
      "radius": "s"
    },
    "autocomplete:default:part:input:rest": {
      "paddingTop": "s",
      "paddingRight": "s",
      "paddingBottom": "s",
      "paddingLeft": "s",
      "paddingX": "s"
    },
    "autocomplete:default:part:option:selected": {
      "paddingTop": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs",
      "paddingLeft": "xs",
      "paddingX": "xs"
    },
    "autocomplete:default:part:option:rest": {
      "paddingTop": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs",
      "paddingLeft": "xs",
      "paddingX": "xs"
    },
    "checkbox:default:part:control:rest": {
      "controlSize": "l"
    },
    "combobox:default:part:option:selected": {
      "paddingTop": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs",
      "paddingLeft": "xs",
      "paddingX": "xs"
    },
    "combobox:default:part:option:rest": {
      "paddingTop": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs",
      "paddingLeft": "xs",
      "paddingX": "xs"
    },
    "menu:default:part:option:selected": {
      "paddingTop": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs",
      "paddingLeft": "xs",
      "paddingX": "xs"
    },
    "menu:default:part:option:rest": {
      "paddingTop": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs",
      "paddingLeft": "xs",
      "paddingX": "xs"
    },
    "otp-field:default:part:input:rest": {
      "paddingTop": "xs",
      "paddingRight": "s",
      "paddingBottom": "xs",
      "paddingLeft": "s",
      "paddingX": "s"
    },
    "slider:default:part:track:rest": {
      "controlSize": "xl"
    },
    "slider:default:part:thumb:rest": {
      "controlSize": "l"
    },
    "switch:default:part:control:rest": {
      "controlSize": "xl"
    }
  },
  "componentVariants": {}
}
```
