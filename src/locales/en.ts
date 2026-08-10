const en = {
  // Sidebar
  "sidebar.newChat": "New Chat",
  "sidebar.noConversations": "No conversations yet.",
  "sidebar.rename": "Rename",
  "sidebar.pin": "Pin",
  "sidebar.unpin": "Unpin",
  "sidebar.delete": "Delete",
  "sidebar.collapse": "Collapse sidebar",
  "sidebar.close": "Close sidebar",
  "sidebar.expand": "Expand sidebar",
  "sidebar.open": "Open sidebar",
  "sidebar.options": "Session options",
  "sidebar.pinned": "Pinned",

  // ChatHeader
  "chatHeader.newChat": "New Chat",
  "chatHeader.renameChatLabel": "Rename chat",
  "chatHeader.chatOptions": "Chat options",

  // Composer
  "composer.placeholder": "Send a message...",
  "composer.messagesToday": "messages today",
  "composer.inputLabel": "Message input",
  "composer.sendLabel": "Send message",
  "composer.stopLabel": "Stop generating",

  // MessageThread
  "message.cancel": "Cancel",
  "message.save": "Save",
  "message.regenerate": "Regenerate response",
  "message.edit": "Edit prompt",
  "message.copyMessage": "Copy prompt",
  "message.copyResponse": "Copy response",
  "message.like": "Like",
  "message.dislike": "Dislike",
  "message.scrollToBottom": "Scroll to bottom",

  // Settings
  "settings.title": "Settings",
  "settings.profile": "Profile",
  "settings.appearance": "Appearance",
  "settings.dataUsage": "Data & Usage",
  "settings.close": "Close settings",
  "settings.confirmDelete": "Confirm account deletion",

  // Settings — Profile
  "profile.name": "Name",
  "profile.preferredName": "Preferred name",
  "profile.preferredNamePlaceholder": "Your name",
  "profile.dateOfBirth": "Date of birth",
  "profile.email": "Email",
  "profile.signedInWith": "Signed in with",
  "profile.memberSince": "Member since",
  "profile.signOut": "Sign Out",

  // Settings — Appearance
  "appearance.theme": "Theme",
  "appearance.light": "Light",
  "appearance.dark": "Dark",
  "appearance.system": "System",
  "appearance.themeHelper": "System matches your device settings automatically.",
  "appearance.messageFont": "Message font",
  "appearance.fontDefault": "Default (Inter)",
  "appearance.fontSerif": "Serif (Source Serif 4)",
  "appearance.fontMono": "Mono (JetBrains Mono)",
  "appearance.fontHelper": "Changes how your messages are displayed. Code blocks always use a fixed-width font.",
  "appearance.language": "Language",
  "appearance.langEn": "English",
  "appearance.langId": "Indonesia",

  // Settings — Data & Usage
  "data.usageToday": "Usage today",
  "data.messages": "messages",
  "data.resetsAt": "Resets at 00:00 UTC.",
  "data.yourData": "Your data",
  "data.exportTitle": "Export chat history",
  "data.exportDesc": "Download all your conversations as a file",
  "data.export": "Export",
  "data.exporting": "Exporting…",
  "data.deleteAccountTitle": "Delete account",
  "data.deleteAccountDesc": "Permanently delete your account and all data",
  "data.deleteAccount": "Delete Account",
  "data.deleteConfirmTitle": "Delete Account",
  "data.deleteConfirmDesc": "This permanently deletes your account and all chat history. This cannot be undone.",
  "data.deleteConfirmBtn": "Delete My Account",
  "data.deleting": "Deleting…",

  // Login
  "login.tagline": "Unleash the full spectrum of models. One unified interface.",
  "login.google": "Continue with Google",
  "login.github": "Continue with GitHub",
  "login.footer": "Built by Vonssy — Heavenly Demon King",

  // Welcome / Empty state
  "welcome.greeting": "Hi {name}, how can I help you today?",
  "welcome.greetingAnon": "How can I help you today?",
  "welcome.subtitle": "Select a model using the sigils below, then type your message.",

  // Not Found
  "notFound.code": "404",
  "notFound.title": "Page Not Found",
  "notFound.description": "The page you're looking for doesn't exist or has been moved.",
  "notFound.goHome": "Return to Chat",

  // Rate limit errors
  "error.dailyLimit": "Daily message limit reached ({limit} messages/day). Resets tomorrow at midnight (UTC).",
  "error.rateLimit": "Too many requests. Please try again later.",
  "error.serverError": "An error occurred while connecting to the AI. Please try again.",

  // Model Dropdown
  "model.select": "Select model",

  // Code Blocks
  "code.copy": "Copy",
  "code.copied": "Copied!",
  "code.copyLabel": "Copy code",
  "code.copiedLabel": "Copied",

  "error.dailyLimitGeneric": "Daily message limit reached. Resets tomorrow at midnight (UTC).",
} as const;

export type LocaleKeys = keyof typeof en;
export default en;
