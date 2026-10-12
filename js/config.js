// ============================================================
//  НАСТРОЙКИ НА САЙТА – редактирайте само този файл
// ============================================================
export const CONFIG = {
  phone: '+359897047668',
  phoneDisplay: '+359 897 047 668',
  email: 'airsoft.field.warzone@abv.bg',
  facebook: 'https://www.facebook.com/airsoft.warzonee',
  instagram: 'https://www.instagram.com/airsoft.warzonee',
  tiktokProfile: 'https://www.tiktok.com/@airsoft.field.war',

  // Локация на терена
  address: 'Бутан 3326, обл. Враца',
  mapUrl: 'https://share.google/nJLW5PIzwf6ET7Qwc',
  mapCoords: [43.6519587, 23.7632835],

  // ---------------- СЪБИТИЯ ОТ GOOGLE ТАБЛИЦА ----------------
  // Поставете тук линка на таблицата (виж README.md).
  // Работи и с „Публикуване в мрежата → CSV“, и с обикновен линк
  // за споделяне („Всеки с линка може да преглежда“).
  // Празно = показват се примерните събития от data/events.csv
  eventsSheetUrl: '',

  // ---------------- ФОНОВО ВИДЕО ----------------
  // Празно = вместо видео се показва снимка.
  heroVideo: {
    desktop: 'assets/video/hero-desktop.mp4',
    mobile: 'assets/video/hero-mobile.mp4',
  },

  // ---------------- „ВИЖ НИ В ДЕЙСТВИЕ“ ----------------
  // Клипове от assets/video (правят се с: node tools/build-clips.mjs action)
  actionClips: [
    { id: 'cqb', title: 'Щурм на руините' },
    { id: 'mg', title: 'Картечно гнездо' },
    { id: 'hall', title: 'Бой в халето' },
    { id: 'patrol', title: 'Отрядът настъпва' },
    { id: 'push', title: 'Пробив през храстите' },
    { id: 'crowd', title: 'Голямата игра' },
  ],
  // По желание: пълни линкове към TikTok видеа, напр.
  // 'https://www.tiktok.com/@airsoft.field.war/video/7312345678901234567'
  tiktokVideos: [],
};
