import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ProviderSetting {
  enabled: boolean;
  apiKey: string;
  baseUrl?: string;
}

export interface LLMSetting {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  visionModel?: string;
}

export interface ImageGenSetting {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface TTSSetting {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  voice: string;
}

interface SettingsState {
  providers: Record<string, ProviderSetting>;
  llm: LLMSetting;
  imageGen: ImageGenSetting;
  tts: TTSSetting;
  defaultStyle: string;
  setProvider: (name: string, setting: ProviderSetting) => void;
  setLLM: (setting: LLMSetting) => void;
  setImageGen: (setting: ImageGenSetting) => void;
  setTTS: (setting: TTSSetting) => void;
  setDefaultStyle: (style: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      providers: {},
      llm: {
        provider: "openai",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "",
        model: "gpt-4o-mini",
        visionModel: "gpt-4o",
      },
      imageGen: {
        provider: "openai",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "",
        model: "dall-e-3",
      },
      tts: {
        provider: "openai",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "",
        model: "tts-1",
        voice: "alloy",
      },
      defaultStyle: "anime",
      setProvider: (name, setting) =>
        set((s) => ({ providers: { ...s.providers, [name]: setting } })),
      setLLM: (setting) => set({ llm: setting }),
      setImageGen: (setting) => set({ imageGen: setting }),
      setTTS: (setting) => set({ tts: setting }),
      setDefaultStyle: (style) => set({ defaultStyle: style }),
    }),
    { name: "mangaforge-settings" }
  )
);
