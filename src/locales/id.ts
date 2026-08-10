import type { LocaleKeys } from "./en";

const id: Record<LocaleKeys, string> = {
  // Sidebar
  "sidebar.newChat": "Chat Baru",
  "sidebar.noConversations": "Belum ada percakapan.",
  "sidebar.rename": "Ubah Nama",
  "sidebar.pin": "Sematkan",
  "sidebar.unpin": "Lepas Sematan",
  "sidebar.delete": "Hapus",
  "sidebar.collapse": "Tutup bilah sisi",
  "sidebar.close": "Tutup bilah sisi",
  "sidebar.expand": "Buka bilah sisi",
  "sidebar.open": "Buka bilah sisi",
  "sidebar.options": "Opsi sesi",
  "sidebar.pinned": "Disematkan",

  // ChatHeader
  "chatHeader.newChat": "Chat Baru",
  "chatHeader.renameChatLabel": "Ubah nama chat",
  "chatHeader.chatOptions": "Opsi chat",

  // Composer
  "composer.placeholder": "Kirim pesan...",
  "composer.stopLabel": "Hentikan pembuatan",
  "composer.sendLabel": "Kirim pesan",
  "composer.messagesToday": "pesan hari ini",
  "composer.inputLabel": "Input pesan",

  // MessageThread
  "message.cancel": "Batal",
  "message.save": "Simpan",
  "message.regenerate": "Buat ulang respons",
  "message.edit": "Edit pesan",
  "message.copyMessage": "Salin pesan",
  "message.copyResponse": "Salin respons",
  "message.scrollToBottom": "Gulir ke bawah",

  // Settings
  "settings.title": "Pengaturan",
  "settings.profile": "Profil",
  "settings.appearance": "Tampilan",
  "settings.dataUsage": "Data & Penggunaan",
  "settings.close": "Tutup pengaturan",
  "settings.confirmDelete": "Konfirmasi hapus akun",

  // Settings — Profile
  "profile.name": "Nama",
  "profile.preferredName": "Nama panggilan",
  "profile.preferredNamePlaceholder": "Nama Anda",
  "profile.dateOfBirth": "Tanggal lahir",
  "profile.email": "Email",
  "profile.signedInWith": "Masuk dengan",
  "profile.memberSince": "Anggota sejak",
  "profile.signOut": "Keluar",

  // Settings — Appearance
  "appearance.theme": "Tema",
  "appearance.light": "Terang",
  "appearance.dark": "Gelap",
  "appearance.system": "Sistem",
  "appearance.themeHelper": "Sistem otomatis mengikuti pengaturan perangkat Anda.",
  "appearance.messageFont": "Huruf pesan",
  "appearance.fontDefault": "Default (Inter)",
  "appearance.fontSerif": "Serif (Source Serif 4)",
  "appearance.fontMono": "Mono (JetBrains Mono)",
  "appearance.fontHelper": "Mengubah tampilan huruf pesan Anda. Blok kode selalu menggunakan huruf monospace.",
  "appearance.language": "Bahasa",
  "appearance.langEn": "English",
  "appearance.langId": "Indonesia",

  // Settings — Data & Usage
  "data.usageToday": "Penggunaan hari ini",
  "data.messages": "pesan",
  "data.resetsAt": "Reset pukul 00:00 UTC.",
  "data.yourData": "Data Anda",
  "data.exportTitle": "Ekspor riwayat chat",
  "data.exportDesc": "Unduh semua percakapan Anda sebagai file",
  "data.export": "Ekspor",
  "data.exporting": "Mengekspor…",
  "data.deleteAccountTitle": "Hapus akun",
  "data.deleteAccountDesc": "Hapus akun dan semua data Anda secara permanen",
  "data.deleteAccount": "Hapus Akun",
  "data.deleteConfirmTitle": "Hapus Akun",
  "data.deleteConfirmDesc": "Ini akan menghapus akun dan semua riwayat chat Anda secara permanen. Tindakan ini tidak dapat dibatalkan.",
  "data.deleteConfirmBtn": "Hapus Akun Saya",
  "data.deleting": "Menghapus…",

  // Login
  "login.tagline": "Jelajahi berbagai model AI. Satu antarmuka terpadu.",
  "login.google": "Lanjutkan dengan Google",
  "login.github": "Lanjutkan dengan GitHub",
  "login.footer": "Dibuat oleh Vonssy — Heavenly Demon King",

  // Welcome / Empty state
  "welcome.greeting": "Hai {name}, ada yang bisa saya bantu?",
  "welcome.greetingAnon": "Ada yang bisa saya bantu?",
  "welcome.subtitle": "Pilih model menggunakan ikon di bawah, lalu ketik pesan Anda.",

  // Not Found
  "notFound.code": "404",
  "notFound.title": "Halaman Tidak Ditemukan",
  "notFound.description": "Halaman yang Anda cari tidak ada atau telah dipindahkan.",
  "notFound.goHome": "Kembali ke Chat",

  // Rate limit errors
  "error.dailyLimit": "Batas pesan harian tercapai ({limit} pesan/hari). Reset besok tengah malam (UTC).",
  "error.rateLimit": "Batas penggunaan tercapai ({limit} pesan/hari). Reset besok tengah malam (UTC).",
  "error.serverError": "Terjadi kesalahan saat terhubung ke AI. Silakan coba lagi.",
  "error.dailyLimitGeneric": "Batas pesan harian tercapai. Reset besok tengah malam (UTC).",

  // Model Dropdown
  "model.select": "Pilih model",

  // Code Blocks
  "code.copy": "Salin",
  "code.copied": "Tersalin!",
  "code.copyLabel": "Salin kode",
  "code.copiedLabel": "Tersalin",
};

export default id;
