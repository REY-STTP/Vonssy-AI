import type { Metadata } from "next";
import AboutContent from "./AboutContent";

export const metadata: Metadata = {
  title: "About",
  description:
    "What VonssyAI is: a BYOK multi-model chat app. Bring your own OpenAI-compatible API keys; they are stored encrypted.",
};

const FAQS_EN = [
  {
    q: "What is VonssyAI?",
    a: "VonssyAI is a chat app that talks to multiple AI models through one unified interface. Chat history, settings, and model configurations are stored in your account.",
  },
  {
    q: "What does BYOK mean here?",
    a: "Bring Your Own Key. You supply your own OpenAI-compatible API endpoint: a base URL, an API key, and a model ID. Add as many configurations as you like under Settings → AI Gateways.",
  },
  {
    q: "Which models are supported?",
    a: "Any endpoint that speaks the OpenAI Chat Completions format over HTTPS, for example OpenAI-compatible gateways and self-hosted servers.",
  },
  {
    q: "Where is my API key stored?",
    a: "In Postgres, encrypted at rest with AES-256-GCM. The app only ever displays the last four characters (for example ****abcd). Keys are never logged, never exported, and never sent anywhere except your own configured endpoint.",
  },
  {
    q: "Do I need an account?",
    a: "Yes. Sign in with Google or GitHub. Chat sessions are private to your account and are explicitly excluded from search indexing.",
  },
  {
    q: "Is VonssyAI free?",
    a: "The app itself is free. Model usage is billed by your own AI provider according to your key.",
  },
];

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "VonssyAI",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description:
    "BYOK multi-model chat — bring your own OpenAI-compatible keys.",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS_EN.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <AboutContent />
    </>
  );
}
