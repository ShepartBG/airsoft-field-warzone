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

  // Записване за игри – профилът на терена в BattleBooking
  booking: 'https://www.battlebooking.bg/field/warzone',

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
  // wide: true = хоризонтален клип
  actionClips: [
    { id: 'promo', title: 'Избягай от скучното ежедневие', tag: 'ВИДЕО ОБРЪЩЕНИЕ' },
    { id: 'cqb', title: 'Залавяне на заложник' },
    { id: 'open', title: 'Атака през откритото', wide: true },
    { id: 'mg', title: 'Картечно гнездо' },
    { id: 'pointa', title: 'Превземане на точка А' },
    { id: 'hall', title: 'Бой в халето' },
    { id: 'ambush', title: 'Засада в руините' },
    { id: 'heavy', title: 'Патрул с картечница' },
    { id: 'patrol', title: 'Отрядът настъпва' },
    { id: 'black', title: 'Операторът в черно' },
    { id: 'push', title: 'Пробив през храстите' },
    { id: 'crowd', title: 'Голямата игра' },
  ],
  // По желание: пълни линкове към TikTok видеа, напр.
  // 'https://www.tiktok.com/@airsoft.field.war/video/7312345678901234567'
  tiktokVideos: [],
};
