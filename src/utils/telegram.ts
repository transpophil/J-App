import { supabase } from "@/integrations/supabase/client";

interface TemplateVariables {
  driver?: string;
  passenger?: string;
  eta?: string;
  delay?: string;
  location?: string;
}

export async function sendTelegramTemplate(templateKey: string, variables: TemplateVariables) {
  try {
    // Fetch Telegram settings and template
    const [settingsRes, templateRes] = await Promise.all([
      supabase
        .from("app_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["telegram_bot_token", "telegram_chat_id"]),
      supabase
        .from("message_templates")
        .select("template_text")
        .eq("template_key", templateKey)
        .single()
    ]);

    if (!settingsRes.data || settingsRes.data.length < 2) {
      console.error("Telegram settings not configured");
      return;
    }

    if (!templateRes.data) {
      console.error("Template not found:", templateKey);
      return;
    }

    const botToken = settingsRes.data.find((s) => s.setting_key === "telegram_bot_token")?.setting_value;
    const chatId = settingsRes.data.find((s) => s.setting_key === "telegram_chat_id")?.setting_value;

    if (!botToken || !chatId) {
      console.error("Missing Telegram credentials");
      return;
    }

    // Replace template variables
    let message = templateRes.data.template_text;
    Object.entries(variables).forEach(([key, value]) => {
      if (value) {
        message = message.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
      }
    });
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send Telegram message:", error);
    }
  } catch (error) {
    console.error("Error sending Telegram message:", error);
  }
}

export async function sendTelegramMessage(driverName: string, statusUpdate: string, passengerName: string) {
  try {
    // Fetch Telegram settings from database
    const { data: settings } = await supabase
      .from("app_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["telegram_bot_token", "telegram_chat_id"]);

    if (!settings || settings.length < 2) {
      console.error("Telegram settings not configured");
      return;
    }

    const botToken = settings.find((s) => s.setting_key === "telegram_bot_token")?.setting_value;
    const chatId = settings.find((s) => s.setting_key === "telegram_chat_id")?.setting_value;

    if (!botToken || !chatId) {
      console.error("Missing Telegram credentials");
      return;
    }

    const message = `Driver ${driverName}: ${statusUpdate} - Passenger ${passengerName}`;
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send Telegram message:", error);
    }
  } catch (error) {
    console.error("Error sending Telegram message:", error);
  }
}
