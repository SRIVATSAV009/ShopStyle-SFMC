# Einstein Content Selection

Einstein Content Selection is enabled for the Welcome Journey's Email 2 and the Post-Purchase
Cross-Sell email as an **A/B-tested enhancement** layered on top of the existing rule-based AMPscript
recommendation logic — not a replacement for it, since Content Selection needs a minimum interaction
history per product to rank confidently, and the manual `Shared_ProductCatalog` rule (top-rated,
in-stock, category-matched) remains the fallback for new/low-history SKUs.

## Configuration

| Email | Content Selection Rule | Fallback |
|---|---|---|
| Welcome Email 2 (Browse) | `Ruleset_Welcome_CategoryPersonalized` — ranks products within the subscriber's top preferred category by predicted click-through, drawing from `Shared_ProductCatalog` | AMPscript `LookupOrderedRows` by `AvgRating DESC` (see [`../ampscript/email/welcome-product-recommendations.amp`](../ampscript/email/welcome-product-recommendations.amp)) |
| Post-Purchase Cross-Sell | `Ruleset_CrossSell_Complementary` — ranks complementary (not duplicate) products by predicted co-purchase likelihood, informed by `TopCategory`/`SecondCategory` from Data Cloud's [`../data-cloud/calculated-insights/category-affinity.sql`](../data-cloud/calculated-insights/category-affinity.sql) | AMPscript category-match logic in [`../ampscript/email/cross-sell-recommendations.amp`](../ampscript/email/cross-sell-recommendations.amp) |

## Content Block Integration

Einstein Content Selection is invoked via the `%%=Einstein_ContentBlock(...)%%` AMPscript function
inside a Content Builder content block, which internally falls back to the block's default content
(the existing manual AMPscript logic) whenever Einstein has insufficient confidence for a given
subscriber/product pairing — this is native Einstein Content Selection behavior, not custom fallback
code.

## Rollout

Content Selection runs in **shadow mode** (scored but not yet serving) for the first 30 days against a
10% holdout, compared against the rule-based baseline via
[`../sql/reporting/content-selection-performance.sql`](../sql/reporting/content-selection-performance.sql)
before being promoted to the full send.
