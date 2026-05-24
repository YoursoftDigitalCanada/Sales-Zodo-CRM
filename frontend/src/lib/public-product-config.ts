export type PublicProductVariant = "sales-crm" | "roofing";

export const PUBLIC_PRODUCT_VARIANT: PublicProductVariant =
  import.meta.env.VITE_PUBLIC_PRODUCT_VARIANT === "roofing" ? "roofing" : "sales-crm";

export const isRoofingPublicMarketingEnabled = PUBLIC_PRODUCT_VARIANT === "roofing";
