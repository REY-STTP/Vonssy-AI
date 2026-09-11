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
  "sidebar.allChats": "All chats",

  // All Chats overlay
  "allChats.title": "All Chats",
  "allChats.search": "Search chats...",
  "allChats.filterAll": "All",
  "allChats.filterPinned": "Pinned",
  "allChats.noResults": "No chats found",
  "allChats.close": "Close",

  // ChatHeader
  "chatHeader.newChat": "New Chat",
  "chatHeader.renameChatLabel": "Rename chat",
  "chatHeader.chatOptions": "Chat options",

  // Composer
  "composer.placeholder": "Send a message...",
  "composer.inputLabel": "Message input",
  "composer.sendLabel": "Send message",
  "composer.stopLabel": "Stop generating",
  "composer.reasoningLabel": "Reasoning Effort",

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
  "message.thinking": "thinking...",

  // Settings
  "settings.title": "Settings",
  "settings.profile": "Profile",
  "settings.aiModels": "AI Gateways",
  "settings.appearance": "Appearance",
  "settings.dataUsage": "Data",
  "settings.close": "Close settings",
  "settings.confirmDelete": "Confirm account deletion",

  // Settings — Profile
  "profile.name": "Name",
  "profile.preferredName": "Preferred name",
  "profile.preferredNamePlaceholder": "Your name",
  "profile.dateOfBirth": "Date of birth",
  "profile.datePicker": "Show date picker",
  "profile.email": "Email",
  "profile.signedInWith": "Signed in with",
  "profile.memberSince": "Member since",
  "profile.signOut": "Sign Out",

  // Avatar Picker
  "avatar.changeAvatar": "Change avatar",
  "avatar.useProfilePhoto": "Use profile photo",
  "avatar.generatedAvatar": "Generated avatar",
  "avatar.shuffle": "Shuffle",
  "avatar.save": "Save",
  "avatar.cancel": "Cancel",
  "avatar.styleCroodles": "Croodles",
  "avatar.styleLorelei": "Lorelei",
  "avatar.styleNotionists": "Notionists",

  // Settings — Appearance
  "appearance.theme": "Theme",
  "appearance.light": "Light",
  "appearance.dark": "Dark",
  "appearance.system": "System",
  "appearance.themeHelper": "System matches your device settings automatically.",
  "appearance.messageFont": "Font",
  "appearance.fontDefault": "Default (Inter)",
  "appearance.fontSerif": "Serif (Source Serif 4)",
  "appearance.fontMono": "Mono (JetBrains Mono)",
  "appearance.fontHelper": "Changes how your messages are displayed. Code blocks always use a fixed-width font.",
  "appearance.language": "Language",
  "appearance.langEn": "English",
  "appearance.langId": "Indonesia",

  // Settings — Data & Usage
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
  "login.tagline": "Bring your own keys. One unified interface.",
  "login.google": "Continue with Google",
  "login.github": "Continue with GitHub",
  "login.footer": "Built by Vonssy — Heavenly Demon King",

  // Welcome / Empty state
  "welcome.greeting": "Hi {name}, how can I help you today?",
  "welcome.greetingAnon": "How can I help you today?",
  "welcome.subtitle": "Select your model above, then type your message.",

  // AI Models (BYOK)
  "models.title": "AI Gateways",
  "models.description": "Add your own OpenAI-compatible endpoints. Keys are encrypted.",
  "models.label": "Label",
  "models.labelPlaceholder": "My GPT",
  "models.baseUrl": "API URL",
  "models.baseUrlPlaceholder": "https://api.openai.com/v1",
  "models.baseUrlHelp": "Base URL of an OpenAI-compatible API, e.g. https://api.openai.com/v1",
  "models.apiKey": "API key",
  "models.apiKeyPlaceholder": "sk-...",
  "models.apiKeyHelp": "Stored encrypted. Leave empty when editing to keep the current key.",
  "models.modelId": "Model ID",
  "models.modelIdPlaceholder": "gpt-4o-mini",
  "models.modelIdHelp": "Model ID as sent to the API.",
  "models.addFirst": "Add your first model",
  "models.addNew": "Add model",
  "models.edit": "Edit",
  "models.delete": "Delete",
  "models.deleteConfirm": "Delete this model?",
  "models.save": "Save",
  "models.cancel": "Cancel",
  "models.test": "Test",
  "models.testing": "Testing…",
  "models.testOk": "Connection OK",
  "models.testFail": "Connection failed",
  "models.empty": "No models yet. Add one to start chatting.",
  "models.emptyWelcome": "Add your own model to start chatting.",
  "models.loading": "Loading models…",
  "models.manage": "Manage gateways",
  "models.needModel": "Add a model in Settings → AI Models to start…",
  "models.selectModel": "Select model",

  // Not Found
  "notFound.code": "404",
  "notFound.title": "Page Not Found",
  "notFound.description": "The page you're looking for doesn't exist or has been moved.",
  "notFound.goHome": "Return to Chat",

  // Rate limit errors
  "error.rateLimit": "Too many requests. Please try again later.",
  "error.serverError": "An error occurred while connecting to the AI. Please try again.",

  // Code Blocks
  "code.copy": "Copy",
  "code.copied": "Copied!",
  "code.copyLabel": "Copy code",
  "code.copiedLabel": "Copied",

  // Model Dropdown (legacy alias)
  "model.select": "Select model",
} as const;

export type LocaleKeys = keyof typeof en;
export default en;
