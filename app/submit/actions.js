"use server";

import supabase from "@/lib/supabase";
import { CATEGORIES } from "@/lib/constants";

const VALID_CATEGORIES = new Set(CATEGORIES.map((c) => c.name));

function normalizeWhatsApp(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("27")) return digits;
  if (digits.startsWith("0")) return "27" + digits.slice(1);
  return "27" + digits;
}

export async function submitBusiness(formData) {
  const name        = formData.get("name")?.toString().trim();
  const category    = formData.get("category")?.toString().trim();
  const town        = formData.get("town")?.toString().trim();
  const whatsapp    = formData.get("whatsapp")?.toString().trim();
  const website     = formData.get("website")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const owner_name  = formData.get("owner_name")?.toString().trim();
  const owner_email = formData.get("owner_email")?.toString().trim();
  const logo_url    = formData.get("logo_url")?.toString().trim();

  if (!name || !category || !town || !whatsapp || !description || !owner_name) {
    return { success: false, error: "Please fill in all required fields." };
  }
  if (!VALID_CATEGORIES.has(category)) {
    return { success: false, error: "Invalid category selected." };
  }
  if (description.length > 200) {
    return { success: false, error: "Description must be 200 characters or fewer." };
  }

  const normalized = normalizeWhatsApp(whatsapp);
  if (!normalized) {
    return { success: false, error: "Please enter a valid WhatsApp number." };
  }

  const { error } = await supabase.from("businesses").insert({
    name,
    category,
    town,
    province:    "KwaZulu-Natal",
    whatsapp:    normalized,
    website:     website || null,
    description,
    owner_name,
    owner_email: owner_email || null,
    logo_url:    logo_url || null,
    status:      "pending",
  });

  if (error) {
    console.error("submitBusiness error:", error);
    return { success: false, error: "Submission failed. Please try again." };
  }

  return { success: true };
}
