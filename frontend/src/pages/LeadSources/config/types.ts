// Shared types for source configuration panels
export interface SourceConfigProps {
    formData: any;
    setFormData: (data: any) => void;
    sourceId?: string;
}

export const referralTypeOptions = [
    { value: "customer", label: "Customer Referral", desc: "Existing customers referring friends/family" },
    { value: "partner", label: "Partner Referral", desc: "Contractors, suppliers" },
    { value: "insurance_agent", label: "Insurance Agent Referral" },
    { value: "real_estate_agent", label: "Real Estate Agent Referral" },
    { value: "employee", label: "Employee Referral" },
    { value: "other", label: "Other" },
];

export const rewardTriggerOptions = [
    { value: "qualified", label: "When lead is qualified" },
    { value: "appointment_set", label: "When appointment is set" },
    { value: "proposal_accepted", label: "When proposal is accepted" },
    { value: "job_completed", label: "When job is completed" },
    { value: "payment_received", label: "When payment is received" },
];

export const giftCardOptions = [
    "Amazon", "Visa", "Home Depot", "Lowe's", "Restaurant", "Other",
];

export const usStates = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

export const emailPlatformOptions = [
    { value: "mailchimp", label: "Mailchimp", icon: "📧", color: "#FFE01B" },
    { value: "constant_contact", label: "Constant Contact", icon: "📮", color: "#0076BE" },
    { value: "sendgrid", label: "SendGrid", icon: "🔷", color: "#1A82E2" },
    { value: "hubspot", label: "HubSpot", icon: "🟠", color: "#FF7A59" },
    { value: "activecampaign", label: "ActiveCampaign", icon: "💙", color: "#356AE6" },
    { value: "other", label: "Other / Webhook", icon: "🔗", color: "#64748B" },
];

export const socialPlatformOptions = [
    { value: "facebook", label: "Facebook" },
    { value: "instagram", label: "Instagram" },
    { value: "tiktok", label: "TikTok" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "twitter", label: "Twitter/X" },
    { value: "other", label: "Other" },
];

export const defaultIntegrationConfig: Record<string, any> = {
    REFERRAL: {
        referral_types: ["customer"],
        rewards_enabled: false,
        reward_type: "fixed",
        reward_amount: "",
        reward_percentage: "",
        gift_card_value: "",
        gift_card_type: "Amazon",
        discount_type: "fixed",
        discount_value: "",
        reward_trigger: "payment_received",
        referral_links_enabled: true,
        landing_page_url: "",
    },
    TRADE_SHOW: {
        event_name: "",
        event_start_date: "",
        event_end_date: "",
        venue_name: "",
        venue_address: "",
        venue_city: "",
        venue_state: "",
        venue_zip: "",
        booth_number: "",
        collection_method: "manual",
        track_budget: false,
        total_cost: "",
        lead_goal: "",
        revenue_goal: "",
    },
    WEBSITE: {
        website_url: "",
        field_mapping: {},
        custom_fields: [],
    },
    GOOGLE_ADS: {
        connection_method: "webhook",
        cost_tracking_enabled: true,
        cost_input_method: "manual",
    },
    SOCIAL_MEDIA: {
        connection_method: "webhook",
        platforms: ["facebook", "instagram"],
        cost_tracking_enabled: true,
    },
    EMAIL_CAMPAIGN: {
        platform: "other",
        lead_triggers: ["form_submit"],
        track_link_clicks: false,
        link_identifier: "",
        track_campaigns: true,
    },
};
